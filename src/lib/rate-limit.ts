import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

/**
 * In-memory sliding window rate limiter storage for local dev / fallback.
 */
interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();

// Periodic in-memory cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitMap.entries()) {
      if (now > record.resetAt) {
        rateLimitMap.delete(key);
      }
    }
  }, 5 * 60 * 1000).unref?.();
}

/**
 * Checks if a given key has exceeded the limit (in-memory sliding window).
 * Used for authentication endpoints.
 */
export function checkRateLimit(
  key: string,
  maxAttempts: number = 5,
  windowMs: number = 15 * 60 * 1000 // 15 minutes
): { allowed: boolean; remaining: number; resetInSeconds: number } {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return {
      allowed: true,
      remaining: maxAttempts - 1,
      resetInSeconds: Math.ceil(windowMs / 1000),
    };
  }

  if (record.count >= maxAttempts) {
    return {
      allowed: false,
      remaining: 0,
      resetInSeconds: Math.max(1, Math.ceil((record.resetAt - now) / 1000)),
    };
  }

  record.count += 1;
  return {
    allowed: true,
    remaining: maxAttempts - record.count,
    resetInSeconds: Math.max(1, Math.ceil((record.resetAt - now) / 1000)),
  };
}

/**
 * Resets the rate limit for a key upon successful authentication.
 */
export function resetRateLimit(key: string): void {
  rateLimitMap.delete(key);
}

let upstashChatLimiter: Ratelimit | null = null;

function getUpstashLimiter(): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null;
  }

  if (!upstashChatLimiter) {
    try {
      const redis = new Redis({
        url,
        token,
      });

      upstashChatLimiter = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(20, '10 m'),
        analytics: true,
        prefix: 'ratelimit:chat',
      });
    } catch (err) {
      console.error('Failed to initialize Upstash Redis rate limiter:', err);
      return null;
    }
  }

  return upstashChatLimiter;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetInSeconds: number;
}

/**
 * Per-IP rate limiter for the Chat API.
 * Uses Upstash Redis when UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set.
 * Falls back to an in-memory sliding window limiter so local dev continues to work.
 * Limit: 20 requests per 10 minutes per IP.
 */
export async function checkChatRateLimit(
  ip: string,
  maxRequests: number = 20,
  windowSeconds: number = 10 * 60 // 10 minutes
): Promise<RateLimitResult> {
  const upstash = getUpstashLimiter();

  if (upstash) {
    try {
      const result = await upstash.limit(ip);
      const resetInSeconds = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
      return {
        success: result.success,
        limit: result.limit,
        remaining: result.remaining,
        resetInSeconds,
      };
    } catch (err) {
      console.error('Upstash rate limit request error, falling back to in-memory:', err);
    }
  }

  // In-memory sliding window fallback
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const key = `chat:${ip}`;
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return {
      success: true,
      limit: maxRequests,
      remaining: maxRequests - 1,
      resetInSeconds: windowSeconds,
    };
  }

  if (record.count >= maxRequests) {
    return {
      success: false,
      limit: maxRequests,
      remaining: 0,
      resetInSeconds: Math.max(1, Math.ceil((record.resetAt - now) / 1000)),
    };
  }

  record.count += 1;
  return {
    success: true,
    limit: maxRequests,
    remaining: maxRequests - record.count,
    resetInSeconds: Math.max(1, Math.ceil((record.resetAt - now) / 1000)),
  };
}
