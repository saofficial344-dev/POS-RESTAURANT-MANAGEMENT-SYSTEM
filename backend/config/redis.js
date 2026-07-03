import Redis from 'ioredis';
import logger from '../utils/logger.js';

let client = null;

export const getRedisClient = () => {
  if (!process.env.REDIS_URL) return null;
  if (client) return client;

  client = new Redis(process.env.REDIS_URL, {
    enableReadyCheck:     true,
    maxRetriesPerRequest: 1,
    lazyConnect:          true,
    connectTimeout:       3000,
  });

  client.on('connect', () => logger.info('[Redis] Connected'));
  client.on('error',   (err) => {
    logger.warn('[Redis] Connection error — cache disabled', { error: err.message });
    client = null;
  });

  return client;
};

export const isRedisAvailable = async () => {
  const c = getRedisClient();
  if (!c) return false;
  try {
    await c.ping();
    return true;
  } catch {
    return false;
  }
};
