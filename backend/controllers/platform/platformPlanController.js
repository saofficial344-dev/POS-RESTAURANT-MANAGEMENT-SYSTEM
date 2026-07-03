import Plan         from '../../models/Plan.js';
import Subscription  from '../../models/Subscription.js';
import { logPlatformAction } from '../../utils/platformAudit.js';

export const listPlans = async (req, res) => {
  try {
    const plans = await Plan.find({ isArchived: false }).sort({ sortOrder: 1, createdAt: 1 });
    res.json({ success: true, data: plans });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getPlan = async (req, res) => {
  try {
    const plan = await Plan.findById(req.params.id);
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
    res.json({ success: true, data: plan });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createPlan = async (req, res) => {
  try {
    const plan = await Plan.create(req.body);
    logPlatformAction(req.platformAdmin, 'PLAN_CREATED', 'plan', plan._id, plan.name, req, { slug: plan.slug });
    res.status(201).json({ success: true, data: plan });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ success: false, message: 'A plan with this slug already exists' });
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updatePlan = async (req, res) => {
  try {
    // Prevent slug updates — slug is the stable identifier
    delete req.body.slug;
    const plan = await Plan.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
    logPlatformAction(req.platformAdmin, 'PLAN_UPDATED', 'plan', plan._id, plan.name, req, req.body);
    res.json({ success: true, data: plan });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const archivePlan = async (req, res) => {
  try {
    const plan = await Plan.findByIdAndUpdate(
      req.params.id,
      { isArchived: true, isActive: false, isPublic: false },
      { new: true }
    );
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
    logPlatformAction(req.platformAdmin, 'PLAN_ARCHIVED', 'plan', plan._id, plan.name, req);
    res.json({ success: true, data: plan, message: `Plan "${plan.name}" archived` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const togglePlan = async (req, res) => {
  try {
    const plan = await Plan.findById(req.params.id);
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });

    plan.isActive = !plan.isActive;
    if (!plan.isActive) plan.isPublic = false;
    await plan.save();

    logPlatformAction(
      req.platformAdmin,
      plan.isActive ? 'PLAN_ACTIVATED' : 'PLAN_DEACTIVATED',
      'plan', plan._id, plan.name, req
    );

    res.json({
      success: true,
      data: plan,
      message: `Plan "${plan.name}" ${plan.isActive ? 'activated' : 'deactivated'}`,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const duplicatePlan = async (req, res) => {
  try {
    const source = await Plan.findById(req.params.id);
    if (!source) return res.status(404).json({ success: false, message: 'Plan not found' });

    const baseSlug = `${source.slug}-copy`;
    let slug = baseSlug;
    let attempt = 1;
    while (await Plan.findOne({ slug })) {
      slug = `${baseSlug}-${attempt++}`;
    }

    const copy = await Plan.create({
      name:        `${source.name} (Copy)`,
      slug,
      displayName: `${source.displayName} (Copy)`,
      description: source.description,
      isActive:    false,
      isPublic:    false,
      isArchived:  false,
      price:       source.price,
      trialDays:   source.trialDays,
      limits:      source.limits,
      features:    source.features,
      sortOrder:   source.sortOrder + 1,
      color:       source.color,
      badge:       '',
    });

    logPlatformAction(req.platformAdmin, 'PLAN_DUPLICATED', 'plan', copy._id, copy.name, req, { sourceId: source._id });
    res.status(201).json({ success: true, data: copy, message: `Plan duplicated as "${copy.name}"` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deletePlan = async (req, res) => {
  try {
    const plan = await Plan.findById(req.params.id);
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });

    // Block deletion if any active/trial subscriptions use this plan
    const activeCount = await Subscription.countDocuments({
      planId: plan._id,
      status: { $in: ['trial', 'active', 'past_due'] },
    });
    if (activeCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete: ${activeCount} active subscription(s) use this plan. Archive it instead.`,
      });
    }

    await Plan.findByIdAndDelete(req.params.id);
    logPlatformAction(req.platformAdmin, 'PLAN_DELETED', 'plan', plan._id, plan.name, req);
    res.json({ success: true, message: `Plan "${plan.name}" deleted` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
