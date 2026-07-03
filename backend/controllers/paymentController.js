import Payment      from '../models/Payment.js';
import Invoice      from '../models/Invoice.js';
import Restaurant   from '../models/Restaurant.js';
import Subscription from '../models/Subscription.js';
import { syncRestaurantPlan, changePlan } from '../services/subscriptionService.js';
import { activateAfterPayment }   from '../services/billingService.js';
import { emitNotification }       from '../utils/notificationEvents.js';
import { logPlatformAction }      from '../utils/platformAudit.js';
import { createAndEmit }          from './notificationController.js';

// ── Helper: resolve restaurantIds matching a name search ─────────────────────
const restaurantIdsByName = async (search) => {
  const matches = await Restaurant.find({ name: new RegExp(search.trim(), 'i') }).select('_id').lean();
  return matches.map(r => r._id);
};

// ─────────────────────────────────────────────────────────────────────────────
// RESTAURANT-SIDE ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

// ── GET /api/payments — my payment history ────────────────────────────────────
export const getMyPayments = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [payments, total] = await Promise.all([
      Payment.find({ restaurantId: req.restaurantId })
        .populate('invoiceId', 'invoiceNumber total dueDate billingPeriodStart billingPeriodEnd')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Payment.countDocuments({ restaurantId: req.restaurantId }),
    ]);

    res.json({
      success: true,
      data: payments,
      pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/payments — submit manual payment for an open invoice ────────────
export const submitManualPayment = async (req, res) => {
  try {
    const { invoiceId, receiptUrl, receiptType = 'screenshot', submitterNotes = '', referenceNumber = '' } = req.body;

    if (!invoiceId)  return res.status(400).json({ success: false, message: 'invoiceId is required' });
    if (!receiptUrl) return res.status(400).json({ success: false, message: 'receiptUrl is required' });

    const invoice = await Invoice.findOne({ _id: invoiceId, restaurantId: req.restaurantId });
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    if (invoice.status === 'paid') return res.status(400).json({ success: false, message: 'Invoice is already paid' });
    if (invoice.status === 'void') return res.status(400).json({ success: false, message: 'Invoice has been voided' });

    const existing = await Payment.findOne({ invoiceId, restaurantId: req.restaurantId, status: 'pending_review' });
    if (existing) {
      return res.status(400).json({ success: false, message: 'A payment is already pending review for this invoice' });
    }

    const payment = await Payment.create({
      restaurantId:   req.restaurantId,
      invoiceId:      invoice._id,
      subscriptionId: invoice.subscriptionId,
      amount:         invoice.total,
      currency:       invoice.currency,
      status:         'pending_review',
      provider:       'manual',
      receiptUrl,
      receiptType,
      submittedBy:     req.user._id,
      submitterNotes,
      referenceNumber,
    });

    emitNotification('payment_submitted', {
      restaurantId:  req.restaurantId.toString(),
      invoiceNumber: invoice.invoiceNumber,
      amount:        invoice.total,
      currency:      invoice.currency,
    });

    res.status(201).json({
      success: true,
      data: payment,
      message: 'Payment submitted for review. You will be notified once approved.',
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── DELETE /api/payments/:id — cancel a pending_review submission ─────────────
export const cancelMyPayment = async (req, res) => {
  try {
    const payment = await Payment.findOne({ _id: req.params.id, restaurantId: req.restaurantId });
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
    if (payment.status !== 'pending_review') {
      return res.status(400).json({ success: false, message: 'Only pending payments can be cancelled' });
    }

    payment.status = 'cancelled';
    await payment.save();

    res.json({ success: true, message: 'Payment submission cancelled' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PLATFORM-SIDE ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

// ── GET /platform/v1/payments ─────────────────────────────────────────────────
export const listAllPayments = async (req, res) => {
  try {
    const { status, restaurantId, invoiceId, search, page = 1, limit = 20 } = req.query;
    const skip  = (Number(page) - 1) * Number(limit);
    const query = {};

    if (status)       query.status       = status;
    if (restaurantId) query.restaurantId = restaurantId;
    if (invoiceId)    query.invoiceId    = invoiceId;

    if (search && !restaurantId) {
      const rIds = await restaurantIdsByName(search);
      query.restaurantId = { $in: rIds };
    }

    const [payments, total, pendingCount] = await Promise.all([
      Payment.find(query)
        .populate('restaurantId',  'name email slug')
        .populate('invoiceId',     'invoiceNumber total dueDate billingPeriodStart billingPeriodEnd')
        .populate('submittedBy',   'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Payment.countDocuments(query),
      Payment.countDocuments({ status: 'pending_review' }),
    ]);

    res.json({
      success: true,
      data: payments,
      pendingCount,
      pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /platform/v1/payments/export ─────────────────────────────────────────
export const exportPayments = async (req, res) => {
  try {
    const { status, restaurantId, search } = req.query;
    const query = {};

    if (status)       query.status       = status;
    if (restaurantId) query.restaurantId = restaurantId;

    if (search && !restaurantId) {
      const rIds = await restaurantIdsByName(search);
      query.restaurantId = { $in: rIds };
    }

    const payments = await Payment.find(query)
      .populate('restaurantId', 'name email slug')
      .populate('invoiceId',    'invoiceNumber total')
      .populate('submittedBy',  'name')
      .sort({ createdAt: -1 })
      .limit(5000)
      .lean();

    const header = ['Restaurant', 'Invoice #', 'Amount', 'Status', 'Type', 'Submitted By', 'Submitted Date', 'Approved By', 'Approved Date', 'Rejection Reason'];
    const rows   = payments.map(p => [
      p.restaurantId?.name || '',
      p.invoiceId?.invoiceNumber || '',
      p.amount || 0,
      p.status || '',
      p.receiptType || '',
      p.submittedBy?.name || '',
      new Date(p.createdAt).toISOString().slice(0, 10),
      p.approvedBy || '',
      p.approvedAt ? new Date(p.approvedAt).toISOString().slice(0, 10) : '',
      p.rejectionReason || '',
    ]);

    const csv = [header, ...rows]
      .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="bayroute-payments-${new Date().toISOString().slice(0,10)}.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /platform/v1/payments/:id ─────────────────────────────────────────────
export const getPaymentDetail = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('restaurantId',  'name email slug phone')
      .populate('invoiceId',     'invoiceNumber total subtotal tax dueDate status billingPeriodStart billingPeriodEnd')
      .populate('subscriptionId','status billingCycle')
      .populate('submittedBy',   'name email role');
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
    res.json({ success: true, data: payment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PATCH /platform/v1/payments/:id/approve ───────────────────────────────────
export const approvePayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('invoiceId')
      .populate('restaurantId', 'name');

    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
    if (payment.status !== 'pending_review') {
      return res.status(400).json({ success: false, message: `Cannot approve a payment with status "${payment.status}"` });
    }

    const adminName    = req.platformAdmin?.admin?.name || 'Platform Admin';
    const restaurantId = payment.restaurantId._id || payment.restaurantId;

    payment.status     = 'approved';
    payment.approvedBy = adminName;
    payment.approvedAt = new Date();
    await payment.save();

    // Centralised: mark invoice paid + activate subscription
    const invoice = payment.invoiceId;
    if (invoice) {
      await activateAfterPayment(invoice, payment, adminName, {
        changePlanFn: changePlan,
        syncPlanFn:   syncRestaurantPlan,
      });
    }

    await createAndEmit({
      restaurantId,
      role:     'admin',
      type:     'subscription_updated',
      title:    'Payment Approved',
      message:  `Your payment of ${payment.currency} ${payment.amount.toLocaleString()} has been approved. Your subscription is now active.`,
      priority: 'high',
    });

    emitNotification('payment_approved', {
      restaurantId:   restaurantId.toString(),
      restaurantName: payment.restaurantId.name,
      amount:         payment.amount,
      currency:       payment.currency,
      invoiceNumber:  invoice?.invoiceNumber,
    });

    logPlatformAction(
      req.platformAdmin, 'PAYMENT_APPROVED', 'payment',
      payment._id, payment.restaurantId.name, req,
      { amount: payment.amount, currency: payment.currency }
    );

    res.json({ success: true, data: payment, message: 'Payment approved and subscription activated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PATCH /platform/v1/payments/:id/reject ────────────────────────────────────
export const rejectPayment = async (req, res) => {
  try {
    const { reason = 'Payment rejected by platform admin' } = req.body;

    const payment = await Payment.findById(req.params.id)
      .populate('restaurantId', 'name');

    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
    if (payment.status !== 'pending_review') {
      return res.status(400).json({ success: false, message: `Cannot reject a payment with status "${payment.status}"` });
    }

    const adminName = req.platformAdmin?.admin?.name || 'Platform Admin';

    payment.status          = 'rejected';
    payment.rejectedBy      = adminName;
    payment.rejectedAt      = new Date();
    payment.rejectionReason = reason;
    await payment.save();

    await createAndEmit({
      restaurantId: payment.restaurantId._id || payment.restaurantId,
      role:         'admin',
      type:         'subscription_updated',
      title:        'Payment Rejected',
      message:      `Your payment submission was rejected. Reason: ${reason}. Please resubmit with a valid receipt.`,
      priority:     'urgent',
    });

    emitNotification('payment_rejected', {
      restaurantId:   (payment.restaurantId._id || payment.restaurantId).toString(),
      restaurantName: payment.restaurantId.name,
      amount:         payment.amount,
      reason,
    });

    logPlatformAction(
      req.platformAdmin, 'PAYMENT_REJECTED', 'payment',
      payment._id, payment.restaurantId.name, req,
      { reason }
    );

    res.json({ success: true, data: payment, message: 'Payment rejected' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PATCH /platform/v1/payments/:id/request-resubmission ─────────────────────
export const requestResubmission = async (req, res) => {
  try {
    const { note = 'Please resubmit with a clearer receipt.' } = req.body;

    const payment = await Payment.findById(req.params.id)
      .populate('restaurantId', 'name');

    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
    if (payment.status !== 'pending_review') {
      return res.status(400).json({ success: false, message: 'Can only request resubmission for payments under review' });
    }

    payment.resubmissionRequested = true;
    payment.resubmissionNote      = note;
    payment.status                = 'rejected';
    payment.rejectionReason       = `Resubmission requested: ${note}`;
    await payment.save();

    await createAndEmit({
      restaurantId: payment.restaurantId._id || payment.restaurantId,
      role:         'admin',
      type:         'subscription_updated',
      title:        'Payment Resubmission Required',
      message:      note,
      priority:     'high',
    });

    res.json({ success: true, data: payment, message: 'Resubmission requested' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /platform/v1/payments/stats ──────────────────────────────────────────
export const getPaymentStats = async (req, res) => {
  try {
    const now        = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [pendingCount, approvedToday, rejectedToday, totalApproved, totalAmount] = await Promise.all([
      Payment.countDocuments({ status: 'pending_review' }),
      Payment.countDocuments({ status: 'approved', approvedAt: { $gte: todayStart } }),
      Payment.countDocuments({ status: 'rejected', rejectedAt: { $gte: todayStart } }),
      Payment.countDocuments({ status: 'approved' }),
      Payment.aggregate([
        { $match: { status: 'approved' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        pendingCount,
        approvedToday,
        rejectedToday,
        totalApproved,
        totalAmount: totalAmount[0]?.total || 0,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
