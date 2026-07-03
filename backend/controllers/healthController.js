import mongoose from 'mongoose';
import { getMetrics } from '../utils/metrics.js';
import { isRedisAvailable } from '../config/redis.js';

const DB_STATES = ['disconnected', 'connected', 'connecting', 'disconnecting'];

// GET /api/health  — public; load balancers / uptime monitors use this
export const getHealth = async (req, res) => {
  try {
    const mongoState  = mongoose.connection.readyState;
    const mongoUp     = mongoState === 1;
    const redisUp     = await isRedisAvailable();
    const mem         = process.memoryUsage();

    const health = {
      status:    mongoUp ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      version:   '2.0.0',
      uptime:    {
        seconds: Math.floor(process.uptime()),
        human:   formatUptime(process.uptime()),
      },
      services: {
        mongodb: {
          state:   DB_STATES[mongoState] ?? 'unknown',
          healthy: mongoUp,
        },
        redis: {
          state:   redisUp
            ? 'connected'
            : process.env.REDIS_URL
              ? 'disconnected'
              : 'not_configured',
          healthy: redisUp,
        },
      },
      memory: {
        heapUsed:  mb(mem.heapUsed),
        heapTotal: mb(mem.heapTotal),
        rss:       mb(mem.rss),
        external:  mb(mem.external),
      },
      metrics: getMetrics(),
    };

    res.status(mongoUp ? 200 : 503).json(health);
  } catch (err) {
    res.status(503).json({ status: 'error', message: err.message });
  }
};

// GET /api/health/metrics  — platform superadmin only
export const getMetricsSnapshot = (_req, res) => {
  const mem = process.memoryUsage();
  res.json({
    success: true,
    data: {
      process: {
        pid:      process.pid,
        platform: process.platform,
        nodeVersion: process.version,
        uptime:   Math.floor(process.uptime()),
        memory: {
          heapUsed:  mb(mem.heapUsed),
          heapTotal: mb(mem.heapTotal),
          rss:       mb(mem.rss),
        },
        cpuUsage: process.cpuUsage(),
      },
      requests: getMetrics(),
    },
  });
};

const mb = (bytes) => `${Math.round(bytes / 1024 / 1024)}MB`;

const formatUptime = (seconds) => {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return [d && `${d}d`, h && `${h}h`, m && `${m}m`, `${s}s`].filter(Boolean).join(' ');
};
