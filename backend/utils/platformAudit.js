import PlatformAuditLog from '../models/PlatformAuditLog.js';

/**
 * Fire-and-forget audit log writer.
 * Never throws — audit failures must not block the main request.
 */
export const logPlatformAction = (
  admin,        // req.platformAdmin object
  action,       // one of PlatformAuditLog.action enum values
  targetType,   // 'restaurant' | 'branch' | 'api_key' | etc.
  targetId,     // string or ObjectId
  targetName,   // human-readable target name
  req,          // Express request (for ip + userAgent)
  metadata = {} // optional extra context
) => {
  PlatformAuditLog.create({
    actorId:    admin?._id,
    actorEmail: admin?.email,
    actorName:  admin?.name,
    action,
    targetType,
    targetId:   targetId ? String(targetId) : undefined,
    targetName,
    metadata,
    ip:         req?.ip || req?.headers?.['x-forwarded-for'],
    userAgent:  req?.headers?.['user-agent'],
  }).catch((err) => {
    console.error('[AuditLog] Failed to write:', err.message);
  });
};
