import PlatformAuditLog from '../../models/PlatformAuditLog.js';

// ── GET /platform/v1/audit-logs ───────────────────────────────────────────────
export const getAuditLogs = async (req, res) => {
  try {
    const {
      action, actorEmail, targetType, targetId,
      page  = 1,
      limit = 25,
    } = req.query;

    const filter = {};
    if (action)     filter.action     = action;
    if (targetType) filter.targetType = targetType;
    if (targetId)   filter.targetId   = targetId;
    if (actorEmail?.trim()) {
      filter.actorEmail = new RegExp(actorEmail.trim(), 'i');
    }

    const skip  = (Number(page) - 1) * Number(limit);
    const total = await PlatformAuditLog.countDocuments(filter);

    const logs = await PlatformAuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('actorId', 'name email role');

    res.json({
      success: true,
      data:    logs,
      pagination: {
        total,
        page:  Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
