import { getRedisClient } from '../config/redis.js';

/**
 * Cache middleware factory — caches the JSON response for `ttlSeconds`.
 * No-op when Redis is not configured (REDIS_URL env var absent).
 *
 * Usage: router.get('/stats', cache(60), handler)
 */
export const cache = (ttlSeconds = 60) => async (req, res, next) => {
  const redis = getRedisClient();
  if (!redis) return next();

  // Include restaurantId so tenants never share cached responses
  const rid = req.restaurantId ? `:${req.restaurantId}` : '';
  const key = `cache:${req.method}${rid}:${req.originalUrl}`;

  try {
    const hit = await redis.get(key);
    if (hit) {
      res.setHeader('X-Cache', 'HIT');
      return res.json(JSON.parse(hit));
    }

    // Intercept res.json to store the response before sending
    const origJson = res.json.bind(res);
    res.json = (body) => {
      // Only cache 2xx responses
      if (res.statusCode < 300) {
        redis.setex(key, ttlSeconds, JSON.stringify(body)).catch(() => {});
      }
      res.setHeader('X-Cache', 'MISS');
      return origJson(body);
    };

    next();
  } catch {
    next(); // Redis error → passthrough, never block the request
  }
};

/**
 * Invalidate all cache keys matching a glob pattern.
 * Example: invalidateCache('cache:GET:/api/dashboard*')
 */
export const invalidateCache = async (pattern) => {
  const redis = getRedisClient();
  if (!redis) return;
  try {
    const keys = await redis.keys(pattern);
    if (keys.length) await redis.del(...keys);
  } catch {}
};
