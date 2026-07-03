import http from 'http';
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import mongoSanitize from 'express-mongo-sanitize';
import mongoose from 'mongoose';

dotenv.config();

import { validateEnv }    from './utils/validateEnv.js';
import logger             from './utils/logger.js';
import { trackRequest }   from './utils/metrics.js';
import connectDB          from './config/db.js';
import { apiLimiter, authLimiter, authSlowDown } from './middleware/rateLimitMiddleware.js';
import { initSocket, stopSocketJobs } from './socket/index.js';

import settingRoutes      from './routes/settingRoutes.js';
import categoryRoutes     from './routes/categoryRoutes.js';
import authRoutes         from './routes/authRoutes.js';
import itemRoutes         from './routes/itemRoutes.js';
import billRoutes         from './routes/billRoutes.js';
import userRoutes         from './routes/userRoutes.js';
import orderRoutes        from './routes/orderRoutes.js';
import tableRoutes        from './routes/tableRoutes.js';
import dashboardRoutes    from './routes/dashboardRoutes.js';
import branchRoutes       from './routes/branchRoutes.js';
import subscriptionRoutes    from './routes/subscriptionRoutes.js';
import paymentRoutes         from './routes/paymentRoutes.js';
import platformRoutes        from './routes/platform/index.js';
import healthRoutes          from './routes/healthRoutes.js';
import notificationRoutes    from './routes/notificationRoutes.js';

import { startSubscriptionJobs } from './jobs/subscriptionJobs.js';

// ── Validate required env vars before anything else ───────────────────────────
validateEnv();

// ── Connect to MongoDB ────────────────────────────────────────────────────────
connectDB();

// ── Start background jobs ─────────────────────────────────────────────────────
startSubscriptionJobs();

const app = express();

// ── Request metrics (before all routes) ──────────────────────────────────────
app.use(trackRequest);

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet());

// ── Compression ───────────────────────────────────────────────────────────────
app.use(compression());

// ── HTTP request logging (Morgan) ─────────────────────────────────────────────
const morganStream = { write: (msg) => logger.http(msg.trim()) };
app.use(
  morgan(
    process.env.NODE_ENV === 'production' ? 'combined' : 'dev',
    { stream: morganStream }
  )
);

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = (
  process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:3000'
)
  .split(',')
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error('CORS policy violation'));
    },
    credentials: true,
  })
);

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Sanitization ──────────────────────────────────────────────────────────────
// Express 5: req.query is read-only — call .sanitize() directly on writable fields only.
app.use((req, _res, next) => {
  if (req.body)   req.body   = mongoSanitize.sanitize(req.body);
  if (req.params) req.params = mongoSanitize.sanitize(req.params);
  next();
});

// ── Rate limiting ─────────────────────────────────────────────────────────────
app.use('/api/', apiLimiter);

// ── Health check (no auth, no rate-limit — must be reachable by load balancers) ─
app.use('/api/health', healthRoutes);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',         authSlowDown, authLimiter, authRoutes);
app.use('/api/users',        userRoutes);
app.use('/api/items',        itemRoutes);
app.use('/api/bills',        billRoutes);
app.use('/api/categories',   categoryRoutes);
app.use('/api/settings',     settingRoutes);
app.use('/api/orders',       orderRoutes);
app.use('/api/tables',       tableRoutes);
app.use('/api/dashboard',    dashboardRoutes);
app.use('/api/branches',     branchRoutes);
app.use('/api/subscription',    subscriptionRoutes);
app.use('/api/payments',        paymentRoutes);
app.use('/api/notifications',   notificationRoutes);

// ── Developer Platform — completely isolated from restaurant API ───────────────
app.use('/platform/v1', platformRoutes);

app.get('/', (_req, res) =>
  res.json({ status: 'ok', service: 'Restaurant POS API', version: '2.0.0' })
);

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  const status = err.status || err.statusCode || 500;
  const isDev  = process.env.NODE_ENV !== 'production';
  logger.error('[Server Error]', { status, message: err.message, stack: err.stack });
  res.status(status).json({
    success: false,
    message: status < 500 || isDev ? (err.message || 'Internal server error') : 'Internal server error',
  });
});

// ── Start server ──────────────────────────────────────────────────────────────
const PORT   = process.env.PORT || 5000;
const server = http.createServer(app);

// Attach Socket.IO to the same HTTP server
initSocket(server);

server.listen(PORT, () =>
  logger.info(`[Server] Running on port ${PORT} (${process.env.NODE_ENV || 'development'})`)
);

// ── Graceful shutdown ─────────────────────────────────────────────────────────
const shutdown = async (signal) => {
  logger.info(`[Shutdown] ${signal} received — closing server`);

  server.close(async () => {
    try {
      stopSocketJobs();
      await mongoose.connection.close();
      logger.info('[Shutdown] MongoDB connection closed — exiting cleanly');
      process.exit(0);
    } catch (err) {
      logger.error('[Shutdown] Error closing MongoDB:', { error: err.message });
      process.exit(1);
    }
  });

  // Force-kill after 10 s if connections don't drain
  setTimeout(() => {
    logger.error('[Shutdown] Timeout — forcing exit');
    process.exit(1);
  }, 10_000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

// Log unhandled promise rejections instead of crashing silently
process.on('unhandledRejection', (reason) => {
  logger.error('[UnhandledRejection]', { reason: String(reason) });
});
