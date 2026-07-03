/**
 * Billing Engine — provider-independent invoice factory.
 *
 * Every financial event in the system (new subscription, upgrade, downgrade,
 * renewal, reactivation, platform-created) MUST go through createInvoice().
 * This guarantees a complete, searchable audit trail for every billing action.
 *
 * Payment gateway integration (Stripe, JazzCash, Easypaisa, PayPal, etc.)
 * is added by implementing a provider adapter and passing it as `provider`.
 * The billing logic itself never changes when a new gateway is added.
 */

import Invoice      from '../models/Invoice.js';
import Subscription from '../models/Subscription.js';
import { emitNotification } from '../utils/notificationEvents.js';

// ── Invoice factory ───────────────────────────────────────────────────────────
/**
 * @param {Object}   p
 * @param {string}   p.restaurantId
 * @param {string}   [p.subscriptionId]
 * @param {Object}   p.plan              - Populated Plan document
 * @param {string}   [p.billingCycle]    - 'monthly' | 'yearly'
 * @param {string}   [p.invoiceType]     - see Invoice model enum
 * @param {Array}    [p.extraLineItems]  - [{description, quantity, unitPrice}]
 * @param {string}   [p.billingContact]
 * @param {number}   [p.discountAmount]  - Fixed discount (takes precedence over percent)
 * @param {number}   [p.discountPercent]
 * @param {number}   [p.taxPercent]
 * @param {string}   [p.notes]
 * @param {Object}   [p.metadata]        - Extra metadata stored on invoice
 * @param {string}   [p.createdBy]       - 'system' | admin name
 * @param {number}   [p.dueDays]         - Days until due (default 7)
 * @param {Date}     [p.periodStart]
 * @param {Date}     [p.periodEnd]
 * @param {string}   [p.restaurantName]  - For notification events
 * @returns {Promise<Invoice>}
 */
export const createInvoice = async (p) => {
  const {
    restaurantId,
    subscriptionId,
    plan,
    billingCycle  = 'monthly',
    invoiceType   = 'manual',
    extraLineItems = [],
    billingContact = '',
    discountAmount  = 0,
    discountPercent = 0,
    taxPercent      = 0,
    notes           = '',
    metadata        = {},
    createdBy       = 'system',
    dueDays         = 7,
    periodStart,
    periodEnd,
    restaurantName  = '',
  } = p;

  const now   = new Date();
  const price = billingCycle === 'yearly'
    ? (plan.price.yearly  || 0)
    : (plan.price.monthly || 0);

  // ── Build line items ──────────────────────────────────────────────────────
  const cycle = billingCycle === 'yearly' ? 'Annual' : 'Monthly';
  const lineItems = [
    {
      description: `${plan.displayName} Plan — ${cycle} Subscription`,
      quantity:    1,
      unitPrice:   price,
      amount:      price,
    },
    ...extraLineItems.map(li => ({
      description: li.description,
      quantity:    li.quantity  || 1,
      unitPrice:   li.unitPrice,
      amount:      (li.quantity || 1) * li.unitPrice,
    })),
  ];

  // ── Financial calculations ─────────────────────────────────────────────────
  const subtotal = lineItems.reduce((s, li) => s + li.amount, 0);

  const actualDiscount = discountAmount > 0
    ? discountAmount
    : discountPercent > 0
      ? Math.round(subtotal * discountPercent) / 100
      : 0;

  const afterDiscount = subtotal - actualDiscount;
  const taxAmount     = taxPercent > 0
    ? Math.round(afterDiscount * taxPercent) / 100
    : 0;
  const total = afterDiscount + taxAmount;

  // ── Period bounds ──────────────────────────────────────────────────────────
  const start = periodStart || now;
  const end   = periodEnd   || (() => {
    const d = new Date(now);
    if (billingCycle === 'yearly') d.setFullYear(d.getFullYear() + 1);
    else                            d.setMonth(d.getMonth() + 1);
    return d;
  })();

  // ── Determine initial status ──────────────────────────────────────────────
  // Free plans skip the payment step and are auto-paid immediately.
  const status = total === 0 ? 'paid' : 'open';
  const paidAt = total === 0 ? now   : undefined;

  const invoice = await Invoice.create({
    restaurantId,
    subscriptionId,
    planId:             plan._id,
    invoiceType,
    status,
    billingContact,
    subtotal,
    discountAmount:  actualDiscount,
    discountPercent: discountPercent || 0,
    taxPercent:      taxPercent      || 0,
    tax:             taxAmount,
    total,
    currency:           plan.price.currency || 'PKR',
    dueDate:            new Date(now.getTime() + dueDays * 86400_000),
    paidAt,
    billingPeriodStart: start,
    billingPeriodEnd:   end,
    lineItems,
    notes,
    createdBy,
    metadata,
  });

  // Update lastInvoiceId on subscription
  if (subscriptionId) {
    await Subscription.findByIdAndUpdate(subscriptionId, { lastInvoiceId: invoice._id });
  }

  // Emit payment-due notification for non-zero open invoices
  if (total > 0) {
    emitNotification('invoice_created', {
      restaurantId:   restaurantId.toString(),
      restaurantName: restaurantName || '',
      invoiceNumber:  invoice.invoiceNumber,
      amount:         total,
      currency:       invoice.currency,
      dueDate:        invoice.dueDate,
      invoiceType,
      planName:       plan.displayName,
    });
  }

  return invoice;
};

// ── Activate subscription after successful payment ─────────────────────────
/**
 * Called by approvePayment and markInvoicePaid.
 * Centralises the "payment confirmed → activate subscription" logic.
 *
 * @param {Object} invoice   - Populated Invoice document
 * @param {Object} payment   - Payment document (may be null for manual mark-paid)
 * @param {string} adminName - Name of platform admin performing the action
 * @param {Function} changePlanFn - injected to avoid circular imports
 * @param {Function} syncPlanFn
 */
export const activateAfterPayment = async (invoice, payment, adminName, { changePlanFn, syncPlanFn }) => {
  const Subscription_ = (await import('../models/Subscription.js')).default;

  // Mark invoice as paid with audit fields
  invoice.status     = 'paid';
  invoice.paidAt     = new Date();
  invoice.approvedBy = adminName;
  invoice.approvedAt = new Date();
  if (payment?.provider) invoice.paymentMethod = payment.provider;
  await invoice.save();

  const restaurantId = invoice.restaurantId._id || invoice.restaurantId;

  if (invoice.metadata?.targetPlanSlug) {
    // Invoice was for a plan upgrade/downgrade — activate the new plan now
    await changePlanFn(restaurantId, invoice.metadata.targetPlanSlug, {
      billingCycle: invoice.metadata.billingCycle || 'monthly',
      skipInvoice:  true,
    });
  } else if (invoice.subscriptionId) {
    // Standard renewal / reactivation — reset the subscription period
    const sub = await Subscription_.findById(invoice.subscriptionId).populate('planId');
    if (sub && ['past_due', 'expired', 'cancelled', 'suspended'].includes(sub.status)) {
      const now       = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + (sub.billingCycle === 'yearly' ? 12 : 1));

      sub.status             = 'active';
      sub.currentPeriodStart = now;
      sub.currentPeriodEnd   = periodEnd;
      sub.cancelledAt        = undefined;
      sub.cancelReason       = undefined;
      sub.autoRenew          = true;
      await sub.save();

      if (sub.planId) await syncPlanFn(restaurantId, sub.planId, sub);
    }
  }
};

// ── Void an open invoice ──────────────────────────────────────────────────────
export const voidInvoice = async (invoiceId, adminName = 'system') => {
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) throw new Error('Invoice not found');
  if (invoice.status === 'paid') throw new Error('Cannot void a paid invoice');
  invoice.status     = 'void';
  invoice.approvedBy = adminName;
  await invoice.save();
  return invoice;
};

// ── Refund a paid invoice ─────────────────────────────────────────────────────
export const refundInvoice = async (invoiceId, adminName = 'system', reason = '') => {
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) throw new Error('Invoice not found');
  if (invoice.status !== 'paid') throw new Error('Only paid invoices can be refunded');
  invoice.status       = 'refunded';
  invoice.refundedAt   = new Date();
  invoice.refundReason = reason;
  invoice.approvedBy   = adminName;
  await invoice.save();

  emitNotification('invoice_refunded', {
    restaurantId:   invoice.restaurantId.toString(),
    invoiceNumber:  invoice.invoiceNumber,
    amount:         invoice.total,
    currency:       invoice.currency,
    reason,
  });

  return invoice;
};

// ── Cancel an open/draft invoice ──────────────────────────────────────────────
export const cancelInvoice = async (invoiceId, adminName = 'system') => {
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) throw new Error('Invoice not found');
  if (['paid', 'void'].includes(invoice.status)) {
    throw new Error(`Cannot cancel invoice with status "${invoice.status}"`);
  }
  invoice.status      = 'cancelled';
  invoice.cancelledAt = new Date();
  invoice.approvedBy  = adminName;
  await invoice.save();
  return invoice;
};

// ── Billing report helpers ────────────────────────────────────────────────────

/** Aggregate paid invoice revenue for a date range, grouped by month */
export const monthlyRevenueReport = async (fromDate, toDate) =>
  Invoice.aggregate([
    { $match: { status: 'paid', paidAt: { $gte: fromDate, $lte: toDate } } },
    {
      $group: {
        _id:      { year: { $year: '$paidAt' }, month: { $month: '$paidAt' } },
        revenue:  { $sum: '$total' },
        count:    { $sum: 1 },
        tax:      { $sum: '$tax' },
        discount: { $sum: '$discountAmount' },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

/** Outstanding invoice summary (open + overdue) */
export const outstandingReport = async () => {
  const now = new Date();
  return Invoice.aggregate([
    { $match: { status: 'open' } },
    {
      $group: {
        _id:           { overdue: { $lt: ['$dueDate', now] } },
        count:         { $sum: 1 },
        totalAmount:   { $sum: '$total' },
      },
    },
  ]);
};

/** Invoice count and amount grouped by status */
export const statusSummary = async () =>
  Invoice.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$total' } } },
    { $sort: { _id: 1 } },
  ]);
