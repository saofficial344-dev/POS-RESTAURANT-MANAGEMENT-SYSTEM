import Subscription  from '../models/Subscription.js';
import Invoice       from '../models/Invoice.js';
import Payment       from '../models/Payment.js';
import Plan          from '../models/Plan.js';
import Restaurant    from '../models/Restaurant.js';
import UsageTracking from '../models/UsageTracking.js';
import { changePlan, cancelSubscription, getCurrentUsage, reactivateSubscription } from '../services/subscriptionService.js';
import { createInvoice } from '../services/billingService.js';
import { emitNotification } from '../utils/notificationEvents.js';

// ── GET /api/subscription — current restaurant subscription ───────────────────
export const getMySubscription = async (req, res) => {
  try {
    const restaurantId = req.restaurantId;
    const [subscription, restaurant] = await Promise.all([
      Subscription.findOne({ restaurantId })
        .populate('planId')
        .populate('previousPlanId', 'name displayName')
        .populate('lastInvoiceId', 'invoiceNumber total status dueDate'),
      Restaurant.findById(restaurantId).select('name plan planStatus trialEndsAt planExpiresAt maxBranches maxUsers features trialUsed'),
    ]);

    if (!subscription) return res.status(404).json({ success: false, message: 'No subscription found' });

    res.json({ success: true, data: { subscription, restaurant } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/subscription/plans — public list of available plans ──────────────
export const getPublicPlans = async (req, res) => {
  try {
    const plans = await Plan.find({ isActive: true, isArchived: false, isPublic: true })
      .select('-__v')
      .sort({ sortOrder: 1 });
    res.json({ success: true, data: plans });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/subscription/usage — current month usage ────────────────────────
export const getUsage = async (req, res) => {
  try {
    const restaurantId = req.restaurantId;
    const [usage, subscription] = await Promise.all([
      getCurrentUsage(restaurantId),
      Subscription.findOne({ restaurantId }).populate('planId', 'name limits'),
    ]);

    const limits = subscription?.planId?.limits || {};
    const periods = await UsageTracking.find({ restaurantId })
      .sort({ period: -1 })
      .limit(12)
      .select('period branches staff orders tables apiRequests');

    res.json({
      success: true,
      data: {
        current: usage,
        limits,
        periods,
        plan: subscription?.planId?.name || 'Unknown',
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/subscription/invoices — restaurant invoice history ───────────────
export const getInvoices = async (req, res) => {
  try {
    const restaurantId = req.restaurantId;
    const { page = 1, limit = 10, status, search } = req.query;
    const skip  = (Number(page) - 1) * Number(limit);
    const query = { restaurantId };
    if (status) query.status = status;
    if (search) query.invoiceNumber = { $regex: search.trim(), $options: 'i' };

    const [invoices, total] = await Promise.all([
      Invoice.find(query)
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

// ── POST /api/subscription/upgrade — restaurant requests plan change ──────────
// Creates an invoice for the target plan. The plan is NOT activated until
// the platform admin approves the submitted payment receipt.
export const requestUpgrade = async (req, res) => {
  try {
    const { planSlug, billingCycle = 'monthly' } = req.body;
    if (!planSlug) return res.status(400).json({ success: false, message: 'planSlug is required' });

    const [plan, currentSub, restaurant] = await Promise.all([
      Plan.findOne({ slug: planSlug, isActive: true, isPublic: true, isArchived: false }),
      Subscription.findOne({ restaurantId: req.restaurantId }).populate('planId', 'slug price'),
      Restaurant.findById(req.restaurantId).select('name'),
    ]);

    if (!plan) return res.status(400).json({ success: false, message: 'Plan not found or unavailable' });
    if (currentSub?.planId?.slug === planSlug && currentSub?.status === 'active') {
      return res.status(400).json({ success: false, message: 'You are already on this plan' });
    }

    // Block duplicate pending invoices for the same plan
    const existingInvoice = await Invoice.findOne({
      restaurantId: req.restaurantId,
      status:       'open',
      'metadata.targetPlanSlug': planSlug,
    });
    if (existingInvoice) {
      return res.status(400).json({
        success: false,
        message: 'You already have an open invoice for this plan. Please submit payment for the existing invoice.',
        data: { invoice: existingInvoice },
      });
    }

    // Classify change type
    const oldPrice = currentSub?.planId
      ? (billingCycle === 'yearly' ? currentSub.planId.price.yearly : currentSub.planId.price.monthly)
      : 0;
    const newPrice = billingCycle === 'yearly' ? plan.price.yearly : plan.price.monthly;
    const invoiceType = !currentSub?.planId
      ? 'new_subscription'
      : currentSub.status === 'trial'
        ? 'trial_conversion'
        : newPrice >= oldPrice ? 'upgrade' : 'downgrade';

    const now = new Date();
    const periodEnd = new Date(now);
    if (billingCycle === 'yearly') periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    else                            periodEnd.setMonth(periodEnd.getMonth() + 1);

    const invoice = await createInvoice({
      restaurantId:   req.restaurantId,
      subscriptionId: currentSub?._id,
      plan,
      billingCycle,
      invoiceType,
      periodStart:    now,
      periodEnd,
      restaurantName: restaurant?.name,
      createdBy:      req.user?.name || 'system',
      metadata:       { targetPlanSlug: planSlug, billingCycle },
    });

    res.status(201).json({
      success: true,
      message: `Invoice created for ${plan.displayName}. Please submit your payment receipt to activate the plan.`,
      data: { invoice },
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ── POST /api/subscription/cancel — restaurant cancels their subscription ─────
export const requestCancel = async (req, res) => {
  try {
    const { reason = 'Cancelled by restaurant admin' } = req.body;
    const cancelled = await cancelSubscription(req.restaurantId, reason);
    res.json({ success: true, data: cancelled, message: 'Subscription cancelled. Access continues until period end.' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ── POST /api/subscription/reactivate — restaurant reactivates cancelled/expired sub ──
export const requestReactivate = async (req, res) => {
  try {
    const result = await reactivateSubscription(req.restaurantId, { adminName: req.user?.name || 'system' });
    res.json({
      success: true,
      data:    result,
      message: result.invoice
        ? `Subscription reactivated. Invoice ${result.invoice.invoiceNumber} has been generated. Please submit payment.`
        : 'Subscription reactivated successfully.',
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ── GET /api/subscription/invoices/:id — single invoice detail ───────────────
export const getInvoiceDetail = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, restaurantId: req.restaurantId })
      .populate('planId', 'name displayName')
      .populate('subscriptionId', 'status billingCycle');
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

    // Include payment info for this invoice
    const payments = await Payment.find({ invoiceId: invoice._id })
      .sort({ createdAt: -1 })
      .select('status amount currency receiptType submitterNotes approvedAt rejectedAt rejectionReason resubmissionNote createdAt');

    res.json({ success: true, data: { invoice, payments } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
