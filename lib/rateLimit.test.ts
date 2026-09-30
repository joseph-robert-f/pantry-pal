import { test } from "node:test";
import assert from "node:assert/strict";
import { clientKey, createRateLimiter } from "./rateLimit.ts";

test("allows a burst up to capacity, then refuses with a retry time", () => {
  const rl = createRateLimiter({ capacity: 3, refillPerSec: 0.5 });
  for (let i = 0; i < 3; i++) assert.deepEqual(rl.take("a", 0), { ok: true });
  assert.deepEqual(rl.take("a", 0), { ok: false, retryAfterSec: 2 });
});

test("refills over time", () => {
  const rl = createRateLimiter({ capacity: 1, refillPerSec: 1 });
  assert.equal(rl.take("a", 0).ok, true);
  assert.equal(rl.take("a", 500).ok, false);
  assert.equal(rl.take("a", 1000).ok, true);
});

test("keys are independent", () => {
  const rl = createRateLimiter({ capacity: 1, refillPerSec: 0.01 });
  assert.equal(rl.take("a", 0).ok, true);
  assert.equal(rl.take("b", 0).ok, true);
  assert.equal(rl.take("a", 0).ok, false);
});

test("a refused request does not spend tokens", () => {
  const rl = createRateLimiter({ capacity: 2, refillPerSec: 1 });
  rl.take("a", 0);
  rl.take("a", 0);
  assert.equal(rl.take("a", 0).ok, false);
  assert.equal(rl.take("a", 1000).ok, true); // exactly one token refilled
});

test("memory stays bounded, dropping the least recent key", () => {
  const rl = createRateLimiter({ capacity: 1, refillPerSec: 0.001, maxKeys: 2 });
  rl.take("a", 0);
  rl.take("b", 1);
  rl.take("a", 2); // a is now most recent
  rl.take("c", 3); // evicts b
  assert.equal(rl.size(), 2);
  assert.equal(rl.take("a", 4).ok, false); // a kept its spent bucket
  assert.equal(rl.take("b", 4).ok, true); // b was evicted, so it starts fresh
});

test("clientKey uses the first forwarded address", () => {
  assert.equal(clientKey(new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" })), "203.0.113.7");
  assert.equal(clientKey(new Headers({ "x-real-ip": "198.51.100.2" })), "198.51.100.2");
  assert.equal(clientKey(new Headers()), "unknown");
});
