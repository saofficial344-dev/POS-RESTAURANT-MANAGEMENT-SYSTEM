import logger from './logger.js';

const SLOW_THRESHOLD_MS = Number(process.env.SLOW_REQUEST_THRESHOLD_MS) || 500;

const state = {
  requestCount:  0,
  errorCount:    0,
  totalDuration: 0,
  slowRequests:  0,
  startTime:     Date.now(),
};

// Middleware: attach to every route to collect timing + error stats
export const trackRequest = (req, res, next) => {
  const start = Date.now();
  state.requestCount++;

  res.on('finish', () => {
    const duration = Date.now() - start;
    state.totalDuration += duration;
    if (res.statusCode >= 500) state.errorCount++;
    if (duration >= SLOW_THRESHOLD_MS) {
      state.slowRequests++;
      logger.warn('[Slow Request]', {
        method:   req.method,
        url:      req.originalUrl,
        duration: `${duration}ms`,
        status:   res.statusCode,
      });
    }
  });

  next();
};

// Snapshot of current metrics — returned by /api/health/metrics
export const getMetrics = () => ({
  uptime:          Math.floor((Date.now() - state.startTime) / 1000),
  requestCount:    state.requestCount,
  errorCount:      state.errorCount,
  slowRequests:    state.slowRequests,
  avgResponseMs:
    state.requestCount > 0
      ? Math.round(state.totalDuration / state.requestCount)
      : 0,
  errorRate:
    state.requestCount > 0
      ? `${((state.errorCount / state.requestCount) * 100).toFixed(2)}%`
      : '0.00%',
});
