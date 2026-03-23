const RATE_LIMIT_BUCKETS_SYMBOL = Symbol.for("willing-ways-ai.rate-limit-buckets");

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
}

function getBuckets() {
  const globalObject = globalThis as typeof globalThis & {
    [RATE_LIMIT_BUCKETS_SYMBOL]?: Map<string, RateLimitBucket>;
  };

  if (!globalObject[RATE_LIMIT_BUCKETS_SYMBOL]) {
    globalObject[RATE_LIMIT_BUCKETS_SYMBOL] = new Map<string, RateLimitBucket>();
  }

  return globalObject[RATE_LIMIT_BUCKETS_SYMBOL];
}

function getClientIdentifier(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    request.headers.get("x-vercel-forwarded-for") ||
    request.headers.get("user-agent") ||
    "unknown"
  );
}

export function checkRateLimit(
  request: Request,
  scope: string,
  options: RateLimitOptions,
): RateLimitResult {
  const now = Date.now();
  const buckets = getBuckets();
  const key = `${scope}:${getClientIdentifier(request)}`;
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, {
      count: 1,
      resetAt: now + options.windowMs,
    });

    return {
      allowed: true,
      limit: options.limit,
      remaining: Math.max(options.limit - 1, 0),
      resetAt: now + options.windowMs,
      retryAfterSeconds: Math.ceil(options.windowMs / 1000),
    };
  }

  current.count += 1;

  const remaining = Math.max(options.limit - current.count, 0);
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((current.resetAt - now) / 1000),
  );

  return {
    allowed: current.count <= options.limit,
    limit: options.limit,
    remaining,
    resetAt: current.resetAt,
    retryAfterSeconds,
  };
}

export function rateLimitHeaders(result: RateLimitResult) {
  return {
    "Cache-Control": "no-store",
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.floor(result.resetAt / 1000)),
    "Retry-After": String(result.retryAfterSeconds),
  };
}
