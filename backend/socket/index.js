import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Restaurant from '../models/Restaurant.js';
import logger from '../utils/logger.js';
import { rooms, ROLE_ROOMS } from './rooms.js';

let io = null;

// Platform metrics broadcast interval reference
let platformInterval = null;

export function initSocket(httpServer) {
  const allowedOrigins = (
    process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:3000'
  )
    .split(',')
    .map((o) => o.trim());

  io = new Server(httpServer, {
    cors: {
      origin:      allowedOrigins,
      methods:     ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout:  20000,
    pingInterval: 10000,
  });

  // ── JWT auth middleware ──────────────────────────────────────────────────────
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) return next(new Error('Authentication required'));

      // Try restaurant JWT first, then platform JWT
      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch {
        try {
          decoded = jwt.verify(token, process.env.JWT_SECRET_PLATFORM);
        } catch {
          return next(new Error('Invalid token'));
        }
      }

      if (decoded.isPlatform) {
        socket.data.isPlatform = true;
        socket.data.userId     = decoded.id;
        socket.data.role       = decoded.role;
        return next();
      }

      const user = await User.findById(decoded.id).select('name role restaurantId branchId status');
      if (!user)                      return next(new Error('User not found'));
      if (user.status === 'inactive') return next(new Error('Account inactive'));

      // Reject connections for deleted restaurants immediately
      if (user.restaurantId) {
        const restaurant = await Restaurant.findById(user.restaurantId).select('status');
        if (!restaurant || restaurant.status === 'deleted') {
          return next(new Error('RESTAURANT_DELETED'));
        }
      }

      socket.data.userId       = user._id.toString();
      socket.data.name         = user.name;
      socket.data.role         = user.role;
      socket.data.restaurantId = user.restaurantId?.toString();
      socket.data.branchId     = user.branchId?.toString();
      socket.data.isPlatform   = false;

      next();
    } catch (err) {
      next(new Error('Authentication failed'));
    }
  });

  // ── Connection handler ───────────────────────────────────────────────────────
  io.on('connection', (socket) => {
    const { userId, role, restaurantId, branchId, isPlatform, name } = socket.data;

    if (isPlatform) {
      socket.join(rooms.platform());
      logger.info(`[Socket] Platform admin connected: ${socket.id}`);
    } else {
      // Every restaurant user joins the restaurant-wide room
      socket.join(rooms.restaurant(restaurantId));

      // User-specific room (for targeted notifications)
      socket.join(`user:${userId}`);

      // Role-specific rooms
      if (role === 'kitchen')                          socket.join(rooms.kitchen(restaurantId));
      if (role === 'waiter')                           socket.join(rooms.waiters(restaurantId));
      if (role === 'cashier')                          socket.join(rooms.cashiers(restaurantId));
      if (['manager', 'admin'].includes(role)) socket.join(rooms.managers(restaurantId));

      // Branch room
      if (branchId) socket.join(rooms.branch(restaurantId, branchId));

      // Broadcast presence
      socket.to(rooms.restaurant(restaurantId)).emit('user:online', {
        userId,
        name,
        role,
        at: new Date(),
      });

      logger.info(`[Socket] Connected: ${name} (${role}) restaurant=${restaurantId} id=${socket.id}`);
    }

    // ── Client → server events ─────────────────────────────────────────────────
    socket.on('ping:custom', () => socket.emit('pong:custom', { at: new Date() }));

    socket.on('disconnect', () => {
      if (!isPlatform && restaurantId) {
        socket.to(rooms.restaurant(restaurantId)).emit('user:offline', {
          userId,
          name,
          role,
          at: new Date(),
        });
      }
      logger.info(`[Socket] Disconnected: ${socket.id}`);
    });
  });

  // ── Platform metrics broadcast every 30 s ──────────────────────────────────
  platformInterval = setInterval(() => {
    emitPlatformMetrics().catch(() => {});
  }, 30_000);

  logger.info('[Socket] Socket.IO server initialized');
  return io;
}

// ── Singleton accessor (imported by controllers) ─────────────────────────────
export function getIO() {
  return io;
}

// ── Emit helpers used by controllers ─────────────────────────────────────────

export function emitToRestaurant(restaurantId, event, data) {
  if (!io || !restaurantId) return;
  io.to(rooms.restaurant(restaurantId)).emit(event, data);
}

export function emitToRoom(roomName, event, data) {
  if (!io) return;
  io.to(roomName).emit(event, data);
}

export function emitToKitchen(restaurantId, event, data) {
  if (!io || !restaurantId) return;
  io.to(rooms.kitchen(restaurantId)).emit(event, data);
}

export function emitToWaiters(restaurantId, event, data) {
  if (!io || !restaurantId) return;
  io.to(rooms.waiters(restaurantId)).emit(event, data);
}

export function emitToCashiers(restaurantId, event, data) {
  if (!io || !restaurantId) return;
  io.to(rooms.cashiers(restaurantId)).emit(event, data);
}

export function emitToManagers(restaurantId, event, data) {
  if (!io || !restaurantId) return;
  io.to(rooms.managers(restaurantId)).emit(event, data);
}

export function emitToPlatform(event, data) {
  if (!io) return;
  io.to(rooms.platform()).emit(event, data);
}

// ── Force-disconnect all sockets for a deleted restaurant ────────────────────
export function disconnectRestaurantSockets(restaurantId) {
  if (!io || !restaurantId) return;
  const rid      = restaurantId.toString();
  const roomName = rooms.restaurant(rid);

  // Emit deletion notice first so clients can display a message before disconnect
  io.to(roomName).emit('restaurant:deleted', {
    code:    'RESTAURANT_DELETED',
    message: 'This restaurant has been permanently deleted. You have been logged out.',
    at:      new Date(),
  });

  // Disconnect after 600 ms so the event is flushed to all clients
  setTimeout(() => {
    const socketsInRoom = io.sockets.adapter.rooms.get(roomName);
    if (socketsInRoom) {
      for (const socketId of [...socketsInRoom]) {
        const s = io.sockets.sockets.get(socketId);
        if (s) {
          logger.info(`[Socket] Force-disconnecting ${s.id} — restaurant ${rid} deleted`);
          s.disconnect(true);
        }
      }
    }
  }, 600);
}

// ── Platform live metrics ─────────────────────────────────────────────────────
async function emitPlatformMetrics() {
  if (!io) return;
  try {
    const Order = (await import('../models/Order.js')).default;

    const [total, active] = await Promise.all([
      Restaurant.countDocuments({ status: { $ne: 'deleted' } }),
      Restaurant.countDocuments({ status: { $ne: 'deleted' }, planStatus: { $in: ['active', 'trial'] } }),
    ]);

    const start = new Date(); start.setHours(0, 0, 0, 0);
    const todayOrders = await Order.countDocuments({ createdAt: { $gte: start } });

    emitToPlatform('platform:metrics:update', {
      totalRestaurants:  total,
      activeRestaurants: active,
      todayOrders,
      at: new Date(),
    });
  } catch {
    // Non-fatal; skip this broadcast cycle
  }
}

export function stopSocketJobs() {
  if (platformInterval) clearInterval(platformInterval);
}
