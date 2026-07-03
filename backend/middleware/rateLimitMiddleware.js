import rateLimit from 'express-rate-limit';
import slowDown  from 'express-slow-down';

const makeLimit = (windowMs, max, message) =>
  rateLimit({
    windowMs,
    max,
    message:         { success: false, message },
    standardHeaders: true,
    legacyHeaders:   false,
  });

// Strict limit for login / refresh endpoints (brute-force protection)
export const authLimiter = makeLimit(
  15 * 60 * 1000, // 15 minutes
  20,             // 20 attempts per window per IP
  'Too many authentication attempts. Please try again in 15 minutes.'
);

// General API limit per IP
export const apiLimiter = makeLimit(
  60 * 1000, // 1 minute
  200,       // 200 requests/min
  'Too many requests. Please slow down.'
);

// Strict limit for restaurant registration
export const registerLimiter = makeLimit(
  60 * 60 * 1000, // 1 hour
  5,              // 5 registrations/hour per IP
  'Too many registration attempts. Please try again later.'
);

// Platform auth — stricter than restaurant auth (high-value target)
export const platformAuthLimiter = makeLimit(
  15 * 60 * 1000, // 15 minutes
  10,             // 10 attempts per window per IP
  'Too many platform authentication attempts. Please try again in 15 minutes.'
);

// Platform API — separate bucket from restaurant API
export const platformApiLimiter = makeLimit(
  60 * 1000, // 1 minute
  100,       // 100 requests/min
  'Too many platform requests. Please slow down.'
);

// Progressive slowdown for auth endpoints — adds delay after 5 consecutive requests
// This stacks on top of authLimiter so brute-force attempts become progressively slower
export const authSlowDown = slowDown({
  windowMs:    15 * 60 * 1000, // same window as authLimiter
  delayAfter:  5,               // start adding delay after 5 requests
  delayMs:    (used) => (used - 5) * 500, // +500 ms per extra request above 5
  maxDelayMs:  20_000,          // cap at 20 seconds per request
});
