/**
 * Email Service — provider-independent.
 *
 * Switch providers by setting EMAIL_PROVIDER env var:
 *   console   — development (logs to stdout, default)
 *   sendgrid  — SendGrid (set SENDGRID_API_KEY)
 *   ses       — AWS SES   (set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION)
 *   smtp      — Generic SMTP (set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS)
 *
 * Adding a new payment gateway or communication channel never requires touching
 * the billing or subscription logic — only this file changes.
 */

const PROVIDER   = process.env.EMAIL_PROVIDER    || 'console';
const FROM_NAME  = process.env.EMAIL_FROM_NAME   || 'Restaurant POS Platform';
const FROM_EMAIL = process.env.EMAIL_FROM_ADDRESS || 'noreply@restaurantpos.com';

// ── Low-level send ─────────────────────────────────────────────────────────────
const send = async ({ to, subject, html, text }) => {
  if (!to || !subject) return { sent: false, reason: 'missing to/subject' };

  switch (PROVIDER) {
    case 'console':
      console.log(`[Email:console] To: ${to} | Subject: ${subject}`);
      if (process.env.NODE_ENV === 'development') {
        console.log(`  Preview: ${text?.slice(0, 120) || ''}…`);
      }
      return { sent: false, provider: 'console' };

    case 'sendgrid': {
      // npm install @sendgrid/mail
      const sgMail = (await import('@sendgrid/mail')).default;
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      await sgMail.send({ to, from: { name: FROM_NAME, email: FROM_EMAIL }, subject, html, text });
      return { sent: true, provider: 'sendgrid' };
    }

    case 'ses': {
      // npm install @aws-sdk/client-ses
      const { SESClient, SendEmailCommand } = await import('@aws-sdk/client-ses');
      const client = new SESClient({ region: process.env.AWS_REGION || 'us-east-1' });
      await client.send(new SendEmailCommand({
        Destination: { ToAddresses: [to] },
        Message: {
          Body:    { Html: { Data: html }, Text: { Data: text || '' } },
          Subject: { Data: subject },
        },
        Source: `${FROM_NAME} <${FROM_EMAIL}>`,
      }));
      return { sent: true, provider: 'ses' };
    }

    case 'smtp': {
      // npm install nodemailer
      const nodemailer = (await import('nodemailer')).default;
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
      await transporter.sendMail({
        from:    `"${FROM_NAME}" <${FROM_EMAIL}>`,
        to, subject, html, text,
      });
      return { sent: true, provider: 'smtp' };
    }

    default:
      console.warn(`[Email] Unknown provider "${PROVIDER}" — skipping`);
      return { sent: false, provider: PROVIDER };
  }
};

// ── Shared HTML wrapper ────────────────────────────────────────────────────────
const wrap = (title, body) => `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${title}</title>
<style>
  body{font-family:'Segoe UI',Arial,sans-serif;background:#f4f4f4;margin:0;padding:0}
  .card{max-width:600px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,.08)}
  .header{background:#111;padding:28px 32px;color:#fff}
  .header h1{margin:0;font-size:20px;font-weight:800}
  .header p{margin:4px 0 0;font-size:13px;color:#888}
  .body{padding:32px}
  .body p{margin:0 0 14px;color:#444;font-size:14px;line-height:1.6}
  .badge{display:inline-block;padding:6px 16px;border-radius:20px;font-size:12px;font-weight:700;text-transform:uppercase}
  .badge-paid{background:#D1FAE5;color:#065F46}
  .badge-open{background:#FEF3C7;color:#92400E}
  .badge-rejected{background:#FEE2E2;color:#991B1B}
  table{width:100%;border-collapse:collapse;margin:20px 0}
  th{text-align:left;padding:10px 12px;font-size:11px;font-weight:700;text-transform:uppercase;color:#888;background:#f9f9f9}
  td{padding:12px;font-size:13px;border-bottom:1px solid #f0f0f0;color:#333}
  .total-row td{font-weight:700;font-size:15px;background:#f9f9f9;border-top:2px solid #e5e5e5}
  .btn{display:inline-block;padding:12px 28px;background:#111;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;font-size:14px;margin-top:8px}
  .footer{padding:24px 32px;background:#f9f9f9;text-align:center;font-size:11px;color:#aaa;border-top:1px solid #eee}
</style></head>
<body><div class="card">
  <div class="header"><h1>Restaurant POS Platform</h1><p>Billing & Subscription</p></div>
  <div class="body">${body}</div>
  <div class="footer">© ${new Date().getFullYear()} Restaurant POS Platform · This is an automated message</div>
</div></body></html>`;

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
const fmtAmt  = (amount, currency = 'PKR') => `${currency} ${Number(amount || 0).toLocaleString()}`;

// ── Email templates ───────────────────────────────────────────────────────────

/** Invoice created — restaurant admin notified */
export const sendInvoiceCreated = async (to, {
  invoiceNumber, restaurantName, amount, currency, dueDate, planName, billingCycle, invoiceType,
}) => {
  const typeLabel = {
    new_subscription:  'New Subscription',
    upgrade:           'Plan Upgrade',
    downgrade:         'Plan Downgrade',
    renewal:           'Subscription Renewal',
    reactivation:      'Reactivation',
    trial_conversion:  'Trial Conversion',
    platform_created:  'Platform Subscription',
    manual:            'Invoice',
  }[invoiceType] || 'Invoice';

  return send({
    to,
    subject: `Invoice ${invoiceNumber} — ${typeLabel} (${fmtAmt(amount, currency)})`,
    html: wrap(`Invoice ${invoiceNumber}`, `
      <p>Hi <strong>${restaurantName}</strong>,</p>
      <p>A new invoice has been generated for your <strong>${planName}</strong> plan (${billingCycle}).</p>
      <table>
        <tr><th>Invoice #</th><th>Plan</th><th>Amount Due</th><th>Due Date</th></tr>
        <tr><td>${invoiceNumber}</td><td>${planName} (${billingCycle})</td>
            <td><strong>${fmtAmt(amount, currency)}</strong></td><td>${fmtDate(dueDate)}</td></tr>
      </table>
      <p>Please log in to your dashboard and submit your payment receipt to activate or continue your subscription.</p>
    `),
    text: `Invoice ${invoiceNumber} for ${restaurantName}: ${fmtAmt(amount, currency)} due by ${fmtDate(dueDate)}.`,
  });
};

/** Payment receipt submitted — platform admin notified */
export const sendPaymentReceived = async (to, {
  invoiceNumber, amount, currency, restaurantName, receiptType, referenceNumber,
}) =>
  send({
    to,
    subject: `Payment Submitted — ${restaurantName} (${fmtAmt(amount, currency)})`,
    html: wrap('Payment Received', `
      <p>A payment submission has been received and is awaiting review.</p>
      <table>
        <tr><th>Restaurant</th><th>Invoice #</th><th>Amount</th><th>Receipt Type</th></tr>
        <tr><td>${restaurantName}</td><td>${invoiceNumber}</td>
            <td>${fmtAmt(amount, currency)}</td><td>${receiptType || 'screenshot'}</td></tr>
      </table>
      ${referenceNumber ? `<p>Reference / Transaction ID: <strong>${referenceNumber}</strong></p>` : ''}
      <p>Please review and approve or reject the payment from the Platform Dashboard.</p>
    `),
    text: `Payment submitted by ${restaurantName} for invoice ${invoiceNumber}: ${fmtAmt(amount, currency)}.`,
  });

/** Payment approved — restaurant admin notified */
export const sendPaymentApproved = async (to, {
  invoiceNumber, amount, currency, restaurantName, planName, periodEnd,
}) =>
  send({
    to,
    subject: `Payment Approved — Your subscription is active`,
    html: wrap('Payment Approved', `
      <p>Hi <strong>${restaurantName}</strong>,</p>
      <p>Your payment for invoice <strong>${invoiceNumber}</strong> has been approved.</p>
      <table>
        <tr><th>Invoice #</th><th>Amount Paid</th><th>Plan</th><th>Active Until</th></tr>
        <tr><td>${invoiceNumber}</td><td>${fmtAmt(amount, currency)}</td>
            <td>${planName || '—'}</td><td>${fmtDate(periodEnd)}</td></tr>
      </table>
      <p><span class="badge badge-paid">Subscription Active</span></p>
      <p>Thank you for your payment. Your subscription has been activated.</p>
    `),
    text: `Payment approved for ${restaurantName}. Invoice ${invoiceNumber}: ${fmtAmt(amount, currency)} — Subscription active until ${fmtDate(periodEnd)}.`,
  });

/** Payment rejected — restaurant admin notified */
export const sendPaymentRejected = async (to, {
  invoiceNumber, amount, currency, restaurantName, reason,
}) =>
  send({
    to,
    subject: `Payment Rejected — Action Required`,
    html: wrap('Payment Rejected', `
      <p>Hi <strong>${restaurantName}</strong>,</p>
      <p>Your payment submission for invoice <strong>${invoiceNumber}</strong> was rejected.</p>
      <table>
        <tr><th>Invoice #</th><th>Amount</th><th>Rejection Reason</th></tr>
        <tr><td>${invoiceNumber}</td><td>${fmtAmt(amount, currency)}</td>
            <td><span class="badge badge-rejected">${reason || 'No reason provided'}</span></td></tr>
      </table>
      <p>Please log in to your dashboard and resubmit a valid payment receipt.</p>
    `),
    text: `Payment rejected for ${restaurantName}. Invoice ${invoiceNumber}: ${reason}`,
  });

/** Subscription activated */
export const sendSubscriptionActivated = async (to, {
  restaurantName, planName, billingCycle, periodEnd,
}) =>
  send({
    to,
    subject: `Subscription Activated — ${planName}`,
    html: wrap('Subscription Activated', `
      <p>Hi <strong>${restaurantName}</strong>,</p>
      <p>Your <strong>${planName}</strong> subscription (${billingCycle}) is now active.</p>
      <p>Your access continues until <strong>${fmtDate(periodEnd)}</strong>.</p>
      <p><span class="badge badge-paid">Active</span></p>
    `),
    text: `Subscription activated for ${restaurantName}: ${planName} until ${fmtDate(periodEnd)}.`,
  });

/** Renewal invoice created */
export const sendSubscriptionRenewal = async (to, {
  restaurantName, planName, periodEnd, amount, currency, invoiceNumber,
}) =>
  send({
    to,
    subject: `Subscription Renewal — Invoice ${invoiceNumber}`,
    html: wrap('Subscription Renewal', `
      <p>Hi <strong>${restaurantName}</strong>,</p>
      <p>Your <strong>${planName}</strong> subscription renewal invoice has been generated.</p>
      <table>
        <tr><th>Invoice #</th><th>Amount Due</th><th>Renewal Until</th></tr>
        <tr><td>${invoiceNumber}</td><td>${fmtAmt(amount, currency)}</td><td>${fmtDate(periodEnd)}</td></tr>
      </table>
      <p>Please submit your payment to continue uninterrupted access.</p>
    `),
    text: `Renewal invoice ${invoiceNumber} for ${restaurantName}: ${fmtAmt(amount, currency)} — Active until ${fmtDate(periodEnd)}.`,
  });

/** Subscription expiring soon */
export const sendSubscriptionExpiring = async (to, {
  restaurantName, daysLeft, periodEnd, planName,
}) =>
  send({
    to,
    subject: `Subscription Expiring in ${daysLeft} Day${daysLeft !== 1 ? 's' : ''}`,
    html: wrap('Subscription Expiring Soon', `
      <p>Hi <strong>${restaurantName}</strong>,</p>
      <p>Your <strong>${planName}</strong> subscription expires in <strong>${daysLeft} day${daysLeft !== 1 ? 's' : ''}</strong> on ${fmtDate(periodEnd)}.</p>
      <p>Renew now to keep your access uninterrupted.</p>
      <p><span class="badge badge-open">Expiring Soon</span></p>
    `),
    text: `${restaurantName} subscription expires in ${daysLeft} days (${fmtDate(periodEnd)}).`,
  });

/** Trial ending soon */
export const sendTrialEnding = async (to, {
  restaurantName, daysLeft, trialEnd,
}) =>
  send({
    to,
    subject: `Your Free Trial Ends in ${daysLeft} Day${daysLeft !== 1 ? 's' : ''}`,
    html: wrap('Trial Ending Soon', `
      <p>Hi <strong>${restaurantName}</strong>,</p>
      <p>Your free trial ends in <strong>${daysLeft} day${daysLeft !== 1 ? 's' : ''}</strong> on ${fmtDate(trialEnd)}.</p>
      <p>Upgrade now to continue using all features without interruption.</p>
    `),
    text: `${restaurantName} trial ends in ${daysLeft} days.`,
  });

/** Trial expired */
export const sendTrialExpired = async (to, {
  restaurantName, trialEnd,
}) =>
  send({
    to,
    subject: `Your Free Trial Has Ended`,
    html: wrap('Trial Expired', `
      <p>Hi <strong>${restaurantName}</strong>,</p>
      <p>Your free trial ended on ${fmtDate(trialEnd)}. Your account access has been limited.</p>
      <p>Upgrade to a paid plan to restore full access.</p>
    `),
    text: `${restaurantName} trial expired on ${fmtDate(trialEnd)}.`,
  });

/** Plan changed (upgrade / downgrade) */
export const sendPlanChanged = async (to, {
  restaurantName, oldPlan, newPlan, changeType, invoiceNumber, amount, currency,
}) =>
  send({
    to,
    subject: `Plan ${changeType === 'upgrade' ? 'Upgraded' : 'Changed'} — ${newPlan}`,
    html: wrap(`Plan ${changeType === 'upgrade' ? 'Upgraded' : 'Changed'}`, `
      <p>Hi <strong>${restaurantName}</strong>,</p>
      <p>Your plan has been changed from <strong>${oldPlan}</strong> to <strong>${newPlan}</strong>.</p>
      ${invoiceNumber ? `<p>Invoice <strong>${invoiceNumber}</strong> for ${fmtAmt(amount, currency)} has been generated. Please submit payment to activate.</p>` : ''}
    `),
    text: `${restaurantName} plan changed: ${oldPlan} → ${newPlan}.`,
  });

/** Invoice refunded */
export const sendInvoiceRefunded = async (to, {
  restaurantName, invoiceNumber, amount, currency, reason,
}) =>
  send({
    to,
    subject: `Refund Processed — Invoice ${invoiceNumber}`,
    html: wrap('Refund Processed', `
      <p>Hi <strong>${restaurantName}</strong>,</p>
      <p>A refund of <strong>${fmtAmt(amount, currency)}</strong> has been processed for invoice <strong>${invoiceNumber}</strong>.</p>
      ${reason ? `<p>Reason: ${reason}</p>` : ''}
    `),
    text: `Refund processed for ${restaurantName}: ${fmtAmt(amount, currency)} — Invoice ${invoiceNumber}.`,
  });
