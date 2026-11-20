type RateLimitResult = { allowed: boolean; configured: boolean; retryAfterSeconds?: number };

class RateLimitUnavailableError extends Error {
  constructor() {
    super("RATE_LIMIT_SERVICE_UNAVAILABLE");
  }
}

const localAttempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_SECONDS = 15 * 60;
const MAX_ATTEMPTS = 10;

const RATE_LIMIT_SCRIPT = `
local count = redis.call("INCR", KEYS[1])
if count == 1 then
  redis.call("EXPIRE", KEYS[1], ARGV[1])
end
return { count, redis.call("TTL", KEYS[1]) }
`;

function localRateLimit(key: string): RateLimitResult {
  const now = Date.now();
  const current = localAttempts.get(key);
  if (!current || current.resetAt <= now) {
    localAttempts.set(key, { count: 1, resetAt: now + WINDOW_SECONDS * 1000 });
    return { allowed: true, configured: true };
  }
  current.count += 1;
  return current.count > MAX_ATTEMPTS
    ? { allowed: false, configured: true, retryAfterSeconds: Math.ceil((current.resetAt - now) / 1000) }
    : { allowed: true, configured: true };
}

export async function checkLoginRateLimit(key: string): Promise<RateLimitResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    if (process.env.NODE_ENV !== "production") return localRateLimit(key);
    return { allowed: false, configured: false };
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify([
        "EVAL",
        RATE_LIMIT_SCRIPT,
        "1",
        `horizon:login:${key}`,
        String(WINDOW_SECONDS),
      ]),
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      securityEvent("login_rate_limit_unavailable", { reason: "upstash_http_error", status: response.status });
      throw new RateLimitUnavailableError();
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      securityEvent("login_rate_limit_unavailable", { reason: "upstash_invalid_response" });
      throw new RateLimitUnavailableError();
    }
    const result =
      typeof payload === "object" && payload !== null && "result" in payload
        ? (payload as { result?: unknown }).result
        : undefined;
    if (!Array.isArray(result) || result.length !== 2) {
      securityEvent("login_rate_limit_unavailable", { reason: "upstash_invalid_response" });
      throw new RateLimitUnavailableError();
    }

    const count = result[0];
    const ttl = result[1];
    if (
      typeof count !== "number" || !Number.isSafeInteger(count) || count < 1 ||
      typeof ttl !== "number" || !Number.isSafeInteger(ttl) || ttl < 1 || ttl > WINDOW_SECONDS
    ) {
      securityEvent("login_rate_limit_unavailable", { reason: "upstash_invalid_response" });
      throw new RateLimitUnavailableError();
    }
    return { allowed: count <= MAX_ATTEMPTS, configured: true, retryAfterSeconds: ttl };
  } catch (error) {
    if (error instanceof RateLimitUnavailableError) {
      if (process.env.NODE_ENV !== "production") return localRateLimit(key);
      throw error;
    }
    securityEvent("login_rate_limit_unavailable", {
      reason: error instanceof DOMException && error.name === "TimeoutError"
        ? "upstash_timeout"
        : "upstash_network_error",
    });
    if (process.env.NODE_ENV !== "production") return localRateLimit(key);
    throw new RateLimitUnavailableError();
  }
}

export function securityEvent(event: string, details: Record<string, string | number | boolean | undefined>) {
  const safeDetails = Object.fromEntries(Object.entries(details).filter(([, value]) => value !== undefined));
  console.warn(`[security] ${event}`, safeDetails);
}
