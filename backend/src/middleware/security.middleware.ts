import { Request, Response, NextFunction } from 'express';

// 1. In-memory Rate Limiter Cache
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitCache = new Map<string, RateLimitEntry>();
const WINDOW_SIZE_MS = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS = 500; // max 500 requests per 15-min window per IP

// IPs that are never rate-limited (localhost dev)
const RATE_LIMIT_WHITELIST = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
const IS_DEV = process.env.NODE_ENV !== 'production';

// Clear cache entries periodically to prevent memory growth
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitCache.entries()) {
    if (now > entry.resetTime) {
      rateLimitCache.delete(ip);
    }
  }
}, 5 * 60 * 1000); // every 5 minutes

export const rateLimiter = (req: Request, res: Response, next: NextFunction): void => {
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';

  // Never rate-limit localhost during development
  if (IS_DEV && RATE_LIMIT_WHITELIST.has(ip)) {
    return next();
  }

  const now = Date.now();
  let entry = rateLimitCache.get(ip);

  if (!entry || now > entry.resetTime) {
    entry = { count: 1, resetTime: now + WINDOW_SIZE_MS };
    rateLimitCache.set(ip, entry);
  } else {
    entry.count++;
  }

  // Set standard rate limit headers
  res.setHeader('X-RateLimit-Limit', MAX_REQUESTS);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, MAX_REQUESTS - entry.count));
  res.setHeader('X-RateLimit-Reset', Math.round(entry.resetTime / 1000));

  if (entry.count > MAX_REQUESTS) {
    res.status(429).json({
      success: false,
      error: 'Too many requests. Please try again later.',
      code: 'TOO_MANY_REQUESTS'
    });
    return;
  }

  next();
};

// 2. Structured Production Error Handling
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const statusCode = err.status || err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  // Securely log details on server
  console.error('API Server Error:', {
    message: err.message,
    stack: isProduction ? '[REDACTED]' : err.stack,
    path: req.path,
    method: req.method
  });

  res.status(statusCode).json({
    success: false,
    error: isProduction ? 'Internal Server Error. Please contact administrator.' : err.message,
    code: err.code || 'INTERNAL_SERVER_ERROR'
  });
};

// 3. AI Prompt Injection & Input Sanitizer
const PROMPT_INJECTION_KEYWORDS = [
  'ignore all previous instructions',
  'ignore previous instructions',
  'system prompt override',
  'you must now act as',
  'forget what you were programmed',
  'bypass guidelines'
];

export const sanitizeInputs = (req: Request, res: Response, next: NextFunction): void => {
  // Sanitize body text parameter inputs to prevent AI prompt injections
  if (req.body && typeof req.body === 'object') {
    for (const key of Object.keys(req.body)) {
      if (typeof req.body[key] === 'string') {
        let val = req.body[key] as string;

        // Escape HTML tags to prevent XSS
        val = val.replace(/</g, '&lt;').replace(/>/g, '&gt;');

        // Check and sanitize prompt injection keywords
        const valLower = val.toLowerCase();
        for (const word of PROMPT_INJECTION_KEYWORDS) {
          if (valLower.includes(word)) {
            val = val.replace(new RegExp(word, 'gi'), '[REDACTED INJECTION ATTEMPT]');
          }
        }

        req.body[key] = val;
      }
    }
  }

  next();
};

// 4. Secure Custom HTTP Headers
export const secureHeaders = (req: Request, res: Response, next: NextFunction): void => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';");
  next();
};
