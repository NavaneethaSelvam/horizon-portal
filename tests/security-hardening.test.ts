import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { NextRequest } from "next/server";
import { checkLoginRateLimit } from "../src/lib/security";

function setNodeEnv(value: string | undefined) {
  Object.defineProperty(process.env, "NODE_ENV", { value, writable: true, configurable: true, enumerable: true });
}

test("security headers and production limiter configuration are present", () => {
  const nextConfig = readFileSync(new URL("../next.config.ts", import.meta.url), "utf8");
  const security = readFileSync(new URL("../src/lib/security.ts", import.meta.url), "utf8");
  assert.match(nextConfig, /X-Content-Type-Options/);
  assert.match(nextConfig, /Strict-Transport-Security/);
  assert.match(nextConfig, /frame-ancestors 'none'/);
  assert.match(security, /UPSTASH_REDIS_REST_URL/);
  assert.match(security, /UPSTASH_REDIS_REST_TOKEN/);
  assert.match(security, /process\.env\.NODE_ENV !== "production"/);
  assert.match(security, /redis\.call\("EXPIRE"/);
  assert.match(security, /AbortSignal\.timeout/);
});

test("production rate limiting fails closed when Upstash is not configured", async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousUrl = process.env.UPSTASH_REDIS_REST_URL;
  const previousToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  setNodeEnv("production");
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  try {
    assert.deepEqual(await checkLoginRateLimit("missing-config-test"), { allowed: false, configured: false });
  } finally {
    setNodeEnv(previousNodeEnv);
    if (previousUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
    else process.env.UPSTASH_REDIS_REST_URL = previousUrl;
    if (previousToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
    else process.env.UPSTASH_REDIS_REST_TOKEN = previousToken;
  }
});

test("login converts missing and unavailable rate-limit service to HTTP 503", async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousUrl = process.env.UPSTASH_REDIS_REST_URL;
  const previousToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  const previousFetch = globalThis.fetch;
  const { POST } = await import("../src/app/api/v1/auth/login/route");
  const request = () => new NextRequest("http://localhost/api/v1/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: "test-user", password: "test-password" }),
  });
  setNodeEnv("production");
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  try {
    assert.equal((await POST(request())).status, 503);
    process.env.UPSTASH_REDIS_REST_URL = "https://rate-limit.invalid";
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
    globalThis.fetch = async () => new Response("service unavailable", { status: 503 });
    assert.equal((await POST(request())).status, 503);
  } finally {
    globalThis.fetch = previousFetch;
    setNodeEnv(previousNodeEnv);
    if (previousUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
    else process.env.UPSTASH_REDIS_REST_URL = previousUrl;
    if (previousToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
    else process.env.UPSTASH_REDIS_REST_TOKEN = previousToken;
  }
});

test("Upstash network and malformed responses fail closed", async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousUrl = process.env.UPSTASH_REDIS_REST_URL;
  const previousToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  const previousFetch = globalThis.fetch;
  setNodeEnv("production");
  process.env.UPSTASH_REDIS_REST_URL = "https://rate-limit.invalid";
  process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
  try {
    globalThis.fetch = async () => { throw new TypeError("network failure"); };
    await assert.rejects(() => checkLoginRateLimit("network-failure-test"));
    globalThis.fetch = async () => new Response("service unavailable", { status: 503 });
    await assert.rejects(() => checkLoginRateLimit("http-failure-test"));
    globalThis.fetch = async () => new Response(JSON.stringify({ result: ["not-a-count", 900] }), { status: 200 });
    await assert.rejects(() => checkLoginRateLimit("malformed-response-test"));
  } finally {
    globalThis.fetch = previousFetch;
    setNodeEnv(previousNodeEnv);
    if (previousUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
    else process.env.UPSTASH_REDIS_REST_URL = previousUrl;
    if (previousToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
    else process.env.UPSTASH_REDIS_REST_TOKEN = previousToken;
  }
});

test("Upstash EVAL uses the atomic fixed-window command format", async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousUrl = process.env.UPSTASH_REDIS_REST_URL;
  const previousToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  const previousFetch = globalThis.fetch;
  setNodeEnv("production");
  process.env.UPSTASH_REDIS_REST_URL = "https://rate-limit.invalid";
  process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
  let request: { url: string; init?: RequestInit } | undefined;
  globalThis.fetch = async (url, init) => {
    request = { url: String(url), init };
    return new Response(JSON.stringify({ result: [10, 899] }), { status: 200 });
  };
  try {
    assert.deepEqual(await checkLoginRateLimit("successful-request-test"), {
      allowed: true,
      configured: true,
      retryAfterSeconds: 899,
    });
    assert.equal(request?.url, "https://rate-limit.invalid");
    const command = JSON.parse(String(request?.init?.body)) as unknown[];
    assert.equal(command[0], "EVAL");
    assert.match(String(command[1]), /INCR/);
    assert.deepEqual(command.slice(2), [
      "1",
      "horizon:login:successful-request-test",
      "900",
    ]);
  } finally {
    globalThis.fetch = previousFetch;
    setNodeEnv(previousNodeEnv);
    if (previousUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
    else process.env.UPSTASH_REDIS_REST_URL = previousUrl;
    if (previousToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
    else process.env.UPSTASH_REDIS_REST_TOKEN = previousToken;
  }
});

test("Upstash fixed-window responses block after ten attempts", async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousUrl = process.env.UPSTASH_REDIS_REST_URL;
  const previousToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  const previousFetch = globalThis.fetch;
  setNodeEnv("production");
  process.env.UPSTASH_REDIS_REST_URL = "https://rate-limit.invalid";
  process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
  let count = 0;
  globalThis.fetch = async () => new Response(JSON.stringify({ result: [++count, 900] }), { status: 200 });
  try {
    const results = await Promise.all(Array.from({ length: 11 }, () => checkLoginRateLimit("upstash-block-test")));
    assert.equal(results.filter((result) => result.allowed).length, 10);
    assert.deepEqual(results[10], { allowed: false, configured: true, retryAfterSeconds: 900 });
  } finally {
    globalThis.fetch = previousFetch;
    setNodeEnv(previousNodeEnv);
    if (previousUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
    else process.env.UPSTASH_REDIS_REST_URL = previousUrl;
    if (previousToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
    else process.env.UPSTASH_REDIS_REST_TOKEN = previousToken;
  }
});

test("local development limiter allows ten attempts and blocks the eleventh", async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousUrl = process.env.UPSTASH_REDIS_REST_URL;
  const previousToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  setNodeEnv("test");
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  try {
    const results = await Promise.all(Array.from({ length: 11 }, () => checkLoginRateLimit(`attempt-count-${Math.random()}`)));
    assert.equal(results.filter((result) => result.allowed).length, 11);
    const key = `fixed-window-${Date.now()}-${Math.random()}`;
    const attempts = await Promise.all(Array.from({ length: 11 }, () => checkLoginRateLimit(key)));
    assert.equal(attempts.filter((result) => result.allowed).length, 10);
    assert.equal(attempts.filter((result) => !result.allowed).length, 1);
  } finally {
    setNodeEnv(previousNodeEnv);
    if (previousUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
    else process.env.UPSTASH_REDIS_REST_URL = previousUrl;
    if (previousToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
    else process.env.UPSTASH_REDIS_REST_TOKEN = previousToken;
  }
});
