/**
 * Email service — SMTP not yet configured.
 * All functions log to console and return { queued: true }.
 * Wire up sendEmail() with nodemailer + your SMTP provider when ready.
 */

const log = (to, subject) =>
  console.log(`[Email] To: ${to} | Subject: ${subject}`);

// ── Core transport ────────────────────────────────────────────────────────────
const sendEmail = async ({ to, subject, html }) => {
  log(to, subject);
  // TODO: replace with real transporter:
  // await transporter.sendMail({ from: process.env.EMAIL_FROM, to, subject, html });
  return { queued: true, to, subject };
};

// ── Templates ─────────────────────────────────────────────────────────────────

export const sendWelcomeEmail = ({ restaurantName, email, adminName, trialDays = 30 }) =>
  sendEmail({
    to:      email,
    subject: `Welcome to Bayroute, ${restaurantName}!`,
    html:    `<h2>Welcome, ${adminName}!</h2>
              <p>Your <strong>${restaurantName}</strong> account is active. You have a <strong>${trialDays}-day free trial</strong>.</p>
              <p>– Bayroute Team</p>`,
  });

export const sendTrialReminderEmail = ({ restaurantName, email, daysLeft, trialEnd }) =>
  sendEmail({
    to:      email,
    subject: `${daysLeft <= 3 ? '⚠️ ' : ''}Your trial expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`,
    html:    `<h2>Trial Ending Soon</h2>
              <p>Hi <strong>${restaurantName}</strong>, your free trial ends on <strong>${new Date(trialEnd).toDateString()}</strong>.</p>
              <p>Upgrade now to avoid interruption.</p>`,
  });

export const sendPaymentApprovedEmail = ({ restaurantName, email, amount, currency, invoiceNumber }) =>
  sendEmail({
    to:      email,
    subject: `Payment Approved — Invoice ${invoiceNumber}`,
    html:    `<h2>Payment Confirmed</h2>
              <p>Hi <strong>${restaurantName}</strong>, your payment of <strong>${currency} ${amount.toLocaleString()}</strong> for invoice <strong>${invoiceNumber}</strong> has been approved.</p>
              <p>Your subscription is now active.</p>`,
  });

export const sendPaymentRejectedEmail = ({ restaurantName, email, amount, currency, invoiceNumber, reason }) =>
  sendEmail({
    to:      email,
    subject: `Payment Rejected — Invoice ${invoiceNumber}`,
    html:    `<h2>Payment Rejected</h2>
              <p>Hi <strong>${restaurantName}</strong>, your payment of <strong>${currency} ${amount.toLocaleString()}</strong> was rejected.</p>
              <p><strong>Reason:</strong> ${reason || 'No reason provided.'}</p>
              <p>Please resubmit with a valid receipt.</p>`,
  });

export const sendInvoiceGeneratedEmail = ({ restaurantName, email, invoiceNumber, amount, currency, dueDate }) =>
  sendEmail({
    to:      email,
    subject: `Invoice ${invoiceNumber} — Due ${new Date(dueDate).toDateString()}`,
    html:    `<h2>New Invoice</h2>
              <p>Hi <strong>${restaurantName}</strong>, invoice <strong>${invoiceNumber}</strong> for <strong>${currency} ${amount.toLocaleString()}</strong> is due on ${new Date(dueDate).toDateString()}.</p>
              <p>Log in and submit your payment receipt to keep your subscription active.</p>`,
  });

export const sendSubscriptionRenewedEmail = ({ restaurantName, email, planName, nextBillingDate }) =>
  sendEmail({
    to:      email,
    subject: `Subscription Renewed — ${planName} Plan`,
    html:    `<h2>Subscription Renewed</h2>
              <p>Hi <strong>${restaurantName}</strong>, your <strong>${planName}</strong> plan has been renewed.</p>
              <p><strong>Next billing date:</strong> ${new Date(nextBillingDate).toDateString()}</p>`,
  });

export const sendPlanChangedEmail = ({ restaurantName, email, oldPlan, newPlan, billingCycle, invoiceNumber }) =>
  sendEmail({
    to:      email,
    subject: `Plan Changed to ${newPlan}`,
    html:    `<h2>Plan Updated</h2>
              <p>Hi <strong>${restaurantName}</strong>, your subscription changed from <strong>${oldPlan}</strong> to <strong>${newPlan}</strong> (${billingCycle} billing).</p>
              ${invoiceNumber ? `<p>Invoice <strong>${invoiceNumber}</strong> has been generated.</p>` : ''}`,
  });

export const sendRenewalReminderEmail = ({ restaurantName, email, planName, daysLeft, periodEnd }) =>
  sendEmail({
    to:      email,
    subject: `Renewal Reminder — ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`,
    html:    `<h2>Renewal Reminder</h2>
              <p>Hi <strong>${restaurantName}</strong>, your <strong>${planName}</strong> subscription expires on <strong>${new Date(periodEnd).toDateString()}</strong> (${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining).</p>
              <p>Submit payment to avoid service interruption.</p>`,
  });

export const sendSubscriptionSuspendedEmail = ({ restaurantName, email }) =>
  sendEmail({
    to:      email,
    subject: 'Your Bayroute account has been suspended',
    html:    `<h2>Account Suspended</h2>
              <p>Hi <strong>${restaurantName}</strong>, your account has been suspended due to an unpaid invoice (30+ days overdue).</p>
              <p>Please contact us to reactivate.</p>`,
  });

export default {
  sendWelcomeEmail,
  sendTrialReminderEmail,
  sendPaymentApprovedEmail,
  sendPaymentRejectedEmail,
  sendInvoiceGeneratedEmail,
  sendSubscriptionRenewedEmail,
  sendPlanChangedEmail,
  sendRenewalReminderEmail,
  sendSubscriptionSuspendedEmail,
};
