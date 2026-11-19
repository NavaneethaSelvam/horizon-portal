type RateLimitResult = { allowed: boolean; configured: boolean; retryAfterSeconds?: number };

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
    const response = await fetch(`${url}/eval`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify([RATE_LIMIT_SCRIPT, [`horizon:login:${key}`], [String(WINDOW_SECONDS)]]),
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error("RATE_LIMIT_SERVICE_UNAVAILABLE");

    const payload: unknown = await response.json();
    const result =
      typeof payload === "object" && payload !== null && "result" in payload
        ? (payload as { result?: unknown }).result
        : undefined;
    if (!Array.isArray(result) || result.length !== 2) throw new Error("RATE_LIMIT_SERVICE_UNAVAILABLE");

    const count = result[0];
    const ttl = result[1];
    if (
      typeof count !== "number" || !Number.isSafeInteger(count) || count < 1 ||
      typeof ttl !== "number" || !Number.isSafeInteger(ttl) || ttl < 1 || ttl > WINDOW_SECONDS
    ) {
      throw new Error("RATE_LIMIT_SERVICE_UNAVAILABLE");
    }
    return { allowed: count <= MAX_ATTEMPTS, configured: true, retryAfterSeconds: ttl };
  } catch {
    throw new Error("RATE_LIMIT_SERVICE_UNAVAILABLE");
  }
}

export function securityEvent(event: string, details: Record<string, string | number | boolean | undefined>) {
  const safeDetails = Object.fromEntries(Object.entries(details).filter(([, value]) => value !== undefined));
  console.warn(`[security] ${event}`, safeDetails);
}
