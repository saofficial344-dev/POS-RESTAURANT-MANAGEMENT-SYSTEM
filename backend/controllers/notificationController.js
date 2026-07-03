import Notification from '../models/Notification.js';
import { emitToRoom } from '../socket/index.js';
import { rooms } from '../socket/rooms.js';

// Helper — build the base tenant filter
const tf = (req) => ({ restaurantId: req.restaurantId || null });

// GET /api/notifications — current user's notifications (paginated)
export const getNotifications = async (req, res) => {
  const { page = 1, limit = 30, unreadOnly } = req.query;
  const skip   = (Number(page) - 1) * Number(limit);
  const filter = { ...tf(req), userId: req.user._id };
  if (unreadOnly === 'true') filter.read = false;

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Notification.countDocuments(filter),
    Notification.countDocuments({ ...tf(req), userId: req.user._id, read: false }),
  ]);

  res.json({
    success: true,
    data: notifications,
    unreadCount,
    pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
  });
};

// PATCH /api/notifications/:id/read — mark one as read
export const markRead = async (req, res) => {
  const n = await Notification.findOneAndUpdate(
    { _id: req.params.id, ...tf(req), userId: req.user._id },
    { read: true, readAt: new Date() },
    { new: true }
  );
  if (!n) return res.status(404).json({ success: false, message: 'Notification not found' });
  res.json({ success: true, data: n });
};

// PATCH /api/notifications/read-all — mark all as read
export const markAllRead = async (req, res) => {
  await Notification.updateMany(
    { ...tf(req), userId: req.user._id, read: false },
    { read: true, readAt: new Date() }
  );
  res.json({ success: true, message: 'All notifications marked as read' });
};

// DELETE /api/notifications/:id — delete one
export const deleteNotification = async (req, res) => {
  await Notification.findOneAndDelete({ _id: req.params.id, ...tf(req), userId: req.user._id });
  res.json({ success: true, message: 'Notification deleted' });
};

// Utility used by other controllers to create + emit a notification
export const createAndEmit = async ({
  restaurantId,
  userId,
  role,
  type,
  title,
  message,
  data = {},
  priority = 'normal',
}) => {
  try {
    const notification = await Notification.create({
      restaurantId,
      userId:   userId || null,
      role:     role   || null,
      type,
      title,
      message,
      data,
      priority,
    });

    const payload = {
      _id:      notification._id,
      type,
      title,
      message,
      data,
      priority,
      read:     false,
      createdAt: notification.createdAt,
    };

    // Emit to specific user socket room or role room
    if (userId && restaurantId) {
      emitToRoom(`user:${userId}`, 'notification:new', payload);
    } else if (role && restaurantId) {
      const roleRoomMap = {
        kitchen:  rooms.kitchen(restaurantId),
        waiter:   rooms.waiters(restaurantId),
        cashier:  rooms.cashiers(restaurantId),
        manager:  rooms.managers(restaurantId),
      };
      const roomName = roleRoomMap[role];
      if (roomName) emitToRoom(roomName, 'notification:new', payload);
    }

    return notification;
  } catch {
    // Non-fatal — notification creation failure should not break the main flow
  }
};
