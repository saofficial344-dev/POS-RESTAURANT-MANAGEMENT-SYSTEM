/**
 * Notification event bus.
 * Handlers are registered at startup. Any handler can be swapped or extended
 * without touching the billing/subscription logic.
 */

import * as email from '../services/emailService.js';
import Restaurant from '../models/Restaurant.js';

const handlers = new Map();

export const onNotification = (event, handler) => {
  if (!handlers.has(event)) handlers.set(event, []);
  handlers.get(event).push(handler);
};

export const emitNotification = (event, data) => {
  const hs = handlers.get(event) || [];
  hs.forEach(h =>
    Promise.resolve(h(data)).catch(err =>
      console.error(`[Notification] Handler "${event}" failed:`, err.message)
    )
  );
  if (process.env.NODE_ENV !== 'test') {
    console.log(`[Notification:${event}]`, JSON.stringify(data));
  }
};

// ── Helper: resolve restaurant email ─────────────────────────────────────────
const getRestaurantEmail = async (restaurantId) => {
  try {
    const r = await Restaurant.findById(restaurantId).select('email').lean();
    return r?.email || null;
  } catch {
    return null;
  }
};

// ── Billing events ────────────────────────────────────────────────────────────

onNotification('invoice_created', async (data) => {
  console.log(`[Invoice] Created ${data.invoiceNumber} for "${data.restaurantName}" — ${data.currency} ${data.amount} (${data.invoiceType})`);
  const to = await getRestaurantEmail(data.restaurantId);
  if (to) {
    await email.sendInvoiceCreated(to, {
      invoiceNumber: data.invoiceNumber,
      restaurantName: data.restaurantName,
      amount: data.amount,
      currency: data.currency,
      dueDate: data.dueDate,
      planName: data.planName,
      billingCycle: data.billingCycle || 'monthly',
      invoiceType: data.invoiceType,
    }).catch(() => {});
  }
});

onNotification('payment_due', async (data) => {
  console.log(`[Payment] Due for "${data.restaurantName}" — ${data.currency} ${data.amount} by ${data.dueDate}`);
});

onNotification('payment_submitted', async (data) => {
  console.log(`[Payment] Manual payment submitted — invoice ${data.invoiceNumber}: ${data.amount}`);
  // Notify platform admin via email (platform admin email from env)
  const adminEmail = process.env.PLATFORM_ADMIN_EMAIL;
  if (adminEmail) {
    await email.sendPaymentReceived(adminEmail, {
      invoiceNumber:  data.invoiceNumber,
      amount:         data.amount,
      currency:       data.currency,
      restaurantName: data.restaurantName || data.restaurantId,
      receiptType:    data.receiptType,
      referenceNumber: data.referenceNumber,
    }).catch(() => {});
  }
});

onNotification('payment_approved', async (data) => {
  console.log(`[Payment] Approved for "${data.restaurantName}" — ${data.currency} ${data.amount}`);
  const to = await getRestaurantEmail(data.restaurantId);
  if (to) {
    await email.sendPaymentApproved(to, {
      invoiceNumber:  data.invoiceNumber || '',
      amount:         data.amount,
      currency:       data.currency,
      restaurantName: data.restaurantName,
      planName:       data.planName || '',
      periodEnd:      data.periodEnd,
    }).catch(() => {});
  }
});

onNotification('payment_rejected', async (data) => {
  console.log(`[Payment] Rejected for "${data.restaurantName}": ${data.reason}`);
  const to = await getRestaurantEmail(data.restaurantId);
  if (to) {
    await email.sendPaymentRejected(to, {
      invoiceNumber:  data.invoiceNumber || '',
      amount:         data.amount,
      currency:       data.currency,
      restaurantName: data.restaurantName,
      reason:         data.reason,
    }).catch(() => {});
  }
});

onNotification('payment_succeeded', async (data) => {
  console.log(`[Payment] Succeeded for "${data.restaurantName}" — ${data.currency} ${data.amount}`);
});

onNotification('payment_failed', async (data) => {
  console.log(`[Payment] Failed for "${data.restaurantName}": ${data.amount}`);
});

// ── Subscription events ────────────────────────────────────────────────────────

onNotification('plan_changed', async (data) => {
  console.log(`[Plan] "${data.restaurantName}": ${data.oldPlan} → ${data.newPlan}`);
  const to = await getRestaurantEmail(data.restaurantId);
  if (to) {
    await email.sendPlanChanged(to, {
      restaurantName: data.restaurantName,
      oldPlan:        data.oldPlan,
      newPlan:        data.newPlan,
      changeType:     data.changeType || 'changed',
      invoiceNumber:  data.invoiceNumber,
      amount:         data.amount,
      currency:       data.currency,
    }).catch(() => {});
  }
});

onNotification('subscription_activated', async (data) => {
  console.log(`[Subscription] Activated for "${data.restaurantName}" — ${data.planName}`);
  const to = await getRestaurantEmail(data.restaurantId);
  if (to) {
    await email.sendSubscriptionActivated(to, {
      restaurantName: data.restaurantName,
      planName:       data.planName,
      billingCycle:   data.billingCycle || 'monthly',
      periodEnd:      data.periodEnd,
    }).catch(() => {});
  }
});

onNotification('subscription_cancelled', async (data) => {
  console.log(`[Subscription] Cancelled for "${data.restaurantName}": ${data.reason}`);
});

onNotification('subscription_past_due', async (data) => {
  console.log(`[Subscription] Past due for "${data.restaurantName}" — period ended ${data.periodEnd}`);
});

onNotification('subscription_suspended', async (data) => {
  console.log(`[Subscription] Suspended for "${data.restaurantName}"`);
});

onNotification('renewal_reminder', async (data) => {
  console.log(`[Renewal] "${data.restaurantName}" — ${data.daysLeft} day(s) left`);
  const to = await getRestaurantEmail(data.restaurantId);
  if (to) {
    await email.sendSubscriptionExpiring(to, {
      restaurantName: data.restaurantName,
      daysLeft:       data.daysLeft,
      periodEnd:      data.periodEnd,
      planName:       data.planName || '',
    }).catch(() => {});
  }
});

// ── Trial events ─────────────────────────────────────────────────────────────

onNotification('trial_ending', async (data) => {
  console.log(`[Trial] "${data.restaurantName}" ends in ${data.daysLeft} day(s)`);
  const to = await getRestaurantEmail(data.restaurantId);
  if (to) {
    await email.sendTrialEnding(to, {
      restaurantName: data.restaurantName,
      daysLeft:       data.daysLeft,
      trialEnd:       data.trialEnd,
    }).catch(() => {});
  }
});

onNotification('trial_expired', async (data) => {
  console.log(`[Trial] "${data.restaurantName}" expired`);
  const to = await getRestaurantEmail(data.restaurantId);
  if (to) {
    await email.sendTrialExpired(to, {
      restaurantName: data.restaurantName,
      trialEnd:       data.trialEnd,
    }).catch(() => {});
  }
});

// ── Invoice events ─────────────────────────────────────────────────────────────

onNotification('invoice_refunded', async (data) => {
  console.log(`[Invoice] Refunded ${data.invoiceNumber}: ${data.currency} ${data.amount} — ${data.reason}`);
  const to = await getRestaurantEmail(data.restaurantId);
  if (to) {
    await email.sendInvoiceRefunded(to, {
      restaurantName: data.restaurantName || data.restaurantId,
      invoiceNumber:  data.invoiceNumber,
      amount:         data.amount,
      currency:       data.currency,
      reason:         data.reason,
    }).catch(() => {});
  }
});
