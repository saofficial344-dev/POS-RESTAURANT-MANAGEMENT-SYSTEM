import Invoice      from '../../models/Invoice.js';
import Payment      from '../../models/Payment.js';
import Restaurant   from '../../models/Restaurant.js';
import Subscription from '../../models/Subscription.js';
import { logPlatformAction }                        from '../../utils/platformAudit.js';
import { emitNotification }                         from '../../utils/notificationEvents.js';
import { syncRestaurantPlan, changePlan }           from '../../services/subscriptionService.js';
import { activateAfterPayment, refundInvoice as doRefund } from '../../services/billingService.js';

// ── Resolve restaurant IDs matching a search string ───────────────────────────
const restaurantIdsBySearch = async (search) => {
  const regex   = new RegExp(search.trim(), 'i');
  const matches = await Restaurant.find({ status: { $ne: 'deleted' }, name: regex }).select('_id').lean();
  return matches.map(r => r._id);
};

// ── GET /platform/v1/invoices ─────────────────────────────────────────────────
export const listInvoices = async (req, res) => {
  try {
    const { status, restaurantId, search, invoiceType, page = 1, limit = 25 } = req.query;
    const skip  = (Number(page) - 1) * Number(limit);
    const query = {};

    if (status)       query.status       = status;
    if (restaurantId) query.restaurantId = restaurantId;
    if (invoiceType)  query.invoiceType  = invoiceType;

    if (search && !restaurantId) {
      const rIds = await restaurantIdsBySearch(search);
      query.$or = [
        { restaurantId:  { $in: rIds } },
        { invoiceNumber: new RegExp(search.trim(), 'i') },
      ];
    }

    const [invoices, total] = await Promise.all([
      Invoice.find(query)
        .populate('restaurantId', 'name email slug')
        .populate('planId', 'name displayName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Invoice.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: invoices,
      pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /platform/v1/invoices/:id ─────────────────────────────────────────────
export const getInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('restaurantId',  'name email slug address phone')
      .populate('planId',        'name displayName')
      .populate('subscriptionId','status billingCycle');
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

    const payments = await Payment.find({ invoiceId: invoice._id })
      .sort({ createdAt: -1 })
      .populate('submittedBy', 'name email');

    res.json({ success: true, data: { invoice, payments } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PATCH /platform/v1/invoices/:id/mark-paid ─────────────────────────────────
export const markInvoicePaid = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('restaurantId', 'name');
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    if (invoice.status === 'paid') return res.status(400).json({ success: false, message: 'Already paid' });
    if (invoice.status === 'void') return res.status(400).json({ success: false, message: 'Cannot mark a voided invoice as paid' });

    const adminName = req.platformAdmin?.admin?.name || 'Platform Admin';

    // Create a manual payment record for audit trail
    await Payment.create({
      restaurantId:   invoice.restaurantId._id,
      invoiceId:      invoice._id,
      subscriptionId: invoice.subscriptionId,
      amount:         invoice.total,
      currency:       invoice.currency,
      status:         'succeeded',
      provider:       req.body.provider || 'manual',
      approvedBy:     adminName,
      approvedAt:     new Date(),
    });

    // Mark invoice paid + activate subscription (centralised)
    await activateAfterPayment(invoice, null, adminName, {
      changePlanFn: changePlan,
      syncPlanFn:   syncRestaurantPlan,
    });

    logPlatformAction(
      req.platformAdmin, 'INVOICE_MARKED_PAID', 'invoice',
      invoice._id, invoice.invoiceNumber, req,
      { amount: invoice.total, currency: invoice.currency }
    );

    emitNotification('payment_succeeded', {
      restaurantId:   (invoice.restaurantId._id || invoice.restaurantId).toString(),
      restaurantName: invoice.restaurantId.name,
      amount:         invoice.total,
      currency:       invoice.currency,
    });

    res.json({ success: true, data: invoice });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PATCH /platform/v1/invoices/:id/void ─────────────────────────────────────
export const voidInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate('restaurantId', 'name');
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    if (invoice.status === 'paid') return res.status(400).json({ success: false, message: 'Cannot void a paid invoice' });

    const adminName    = req.platformAdmin?.admin?.name || 'Platform Admin';
    invoice.status     = 'void';
    invoice.approvedBy = adminName;
    await invoice.save();

    logPlatformAction(
      req.platformAdmin, 'INVOICE_VOIDED', 'invoice',
      invoice._id, invoice.invoiceNumber, req
    );

    res.json({ success: true, data: invoice, message: `Invoice ${invoice.invoiceNumber} voided` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PATCH /platform/v1/invoices/:id/refund ────────────────────────────────────
export const refundInvoice = async (req, res) => {
  try {
    const { reason = 'Refunded by platform admin' } = req.body;
    const adminName = req.platformAdmin?.admin?.name || 'Platform Admin';

    const invoice = await doRefund(req.params.id, adminName, reason);

    // Create refund payment record
    await Payment.create({
      restaurantId: invoice.restaurantId,
      invoiceId:    invoice._id,
      amount:       -invoice.total,
      currency:     invoice.currency,
      status:       'refunded',
      provider:     'manual',
      approvedBy:   adminName,
      approvedAt:   new Date(),
    });

    logPlatformAction(
      req.platformAdmin, 'INVOICE_REFUNDED', 'invoice',
      invoice._id, invoice.invoiceNumber, req,
      { amount: invoice.total, reason }
    );

    res.json({ success: true, data: invoice, message: `Invoice ${invoice.invoiceNumber} refunded` });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ── GET /platform/v1/invoices/overview ───────────────────────────────────────
export const getBillingOverview = async (req, res) => {
  try {
    const now          = new Date();
    const monthStart   = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth    = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const [
      totalRevenue, monthRevenue, lastMonthRevenue,
      openCount, overdueCount, overdueAmount,
      totalCount, paidCount, paidAmount,
      cancelledCount, refundedCount, refundedAmount,
      byType,
    ] = await Promise.all([
      Invoice.aggregate([{ $match: { status: 'paid' } }, { $group: { _id: null, sum: { $sum: '$total' } } }]),
      Invoice.aggregate([{ $match: { status: 'paid', paidAt: { $gte: monthStart } } }, { $group: { _id: null, sum: { $sum: '$total' } } }]),
      Invoice.aggregate([{ $match: { status: 'paid', paidAt: { $gte: lastMonth, $lte: lastMonthEnd } } }, { $group: { _id: null, sum: { $sum: '$total' } } }]),
      Invoice.countDocuments({ status: 'open' }),
      Invoice.countDocuments({ status: 'open', dueDate: { $lt: now } }),
      Invoice.aggregate([{ $match: { status: 'open', dueDate: { $lt: now } } }, { $group: { _id: null, sum: { $sum: '$total' } } }]),
      Invoice.countDocuments({}),
      Invoice.countDocuments({ status: 'paid' }),
      Invoice.aggregate([{ $match: { status: 'paid' } }, { $group: { _id: null, sum: { $sum: '$total' } } }]),
      Invoice.countDocuments({ status: 'cancelled' }),
      Invoice.countDocuments({ status: 'refunded' }),
      Invoice.aggregate([{ $match: { status: 'refunded' } }, { $group: { _id: null, sum: { $sum: '$total' } } }]),
      Invoice.aggregate([
        { $group: { _id: '$invoiceType', count: { $sum: 1 }, total: { $sum: '$total' } } },
        { $sort:  { count: -1 } },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        totalRevenue:     totalRevenue[0]?.sum     || 0,
        monthRevenue:     monthRevenue[0]?.sum     || 0,
        lastMonthRevenue: lastMonthRevenue[0]?.sum || 0,
        openInvoices:     openCount,
        overdueInvoices:  overdueCount,
        overdueAmount:    overdueAmount[0]?.sum    || 0,
        totalInvoices:    totalCount,
        paidInvoices:     paidCount,
        paidAmount:       paidAmount[0]?.sum       || 0,
        cancelledInvoices: cancelledCount,
        refundedInvoices:  refundedCount,
        refundedAmount:    refundedAmount[0]?.sum  || 0,
        byType:            byType.map(t => ({ type: t._id, count: t.count, total: t.total })),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /platform/v1/invoices/export ─────────────────────────────────────────
export const exportInvoices = async (req, res) => {
  try {
    const { status, restaurantId, search, invoiceType } = req.query;
    const query = {};

    if (status)       query.status       = status;
    if (restaurantId) query.restaurantId = restaurantId;
    if (invoiceType)  query.invoiceType  = invoiceType;

    if (search && !restaurantId) {
      const rIds = await restaurantIdsBySearch(search);
      query.$or = [
        { restaurantId:  { $in: rIds } },
        { invoiceNumber: new RegExp(search.trim(), 'i') },
      ];
    }

    const invoices = await Invoice.find(query)
      .populate('restaurantId', 'name email slug')
      .populate('planId', 'displayName')
      .sort({ createdAt: -1 })
      .limit(5000)
      .lean();

    const header = [
      'Invoice #', 'Restaurant', 'Plan', 'Type', 'Amount', 'Discount', 'Tax', 'Total',
      'Currency', 'Status', 'Due Date', 'Paid Date', 'Approved By', 'Created By', 'Created',
    ];
    const rows = invoices.map(inv => [
      inv.invoiceNumber || '',
      inv.restaurantId?.name || '',
      inv.planId?.displayName || '',
      inv.invoiceType || '',
      inv.subtotal || 0,
      inv.discountAmount || 0,
      inv.tax || 0,
      inv.total || 0,
      inv.currency || 'PKR',
      inv.status || '',
      inv.dueDate  ? new Date(inv.dueDate).toISOString().slice(0, 10) : '',
      inv.paidAt   ? new Date(inv.paidAt).toISOString().slice(0, 10)  : '',
      inv.approvedBy || '',
      inv.createdBy  || 'system',
      new Date(inv.createdAt).toISOString().slice(0, 10),
    ]);

    const csv = [header, ...rows]
      .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="invoices-${new Date().toISOString().slice(0,10)}.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
