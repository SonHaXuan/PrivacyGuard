/**
 * Baseline Implementation: No Cache
 * Privacy evaluation without hash-based caching for performance comparison
 */

import Helpers from "../helpers";

/**
 * Evaluate privacy compliance without caching
 * Always performs full validation regardless of previous evaluations
 * @param {Object} app - Application data
 * @param {Object} user - User privacy preferences
 * @returns {Promise<Object>} - Evaluation result
 */
export async function evaluateNoCache(app, user) {
  const startTime = process.hrtime.bigint();

  // Always perform full evaluation (no cache check)
  const isAccepted = await Helpers.PrivacyPreference.evaluate(app, user);

  const endTime = process.hrtime.bigint();
  const latencyMs = Number(endTime - startTime) / 1_000_000;

  return {
    result: isAccepted ? "grant" : "deny",
    latencyMs,
    cacheHit: false,
    approach: "no-cache",
  };
}

/**
 * Process multiple evaluation requests without caching
 * @param {number} count - Number of evaluations
 * @param {Object} app - Application data
 * @param {Object} user - User privacy preferences
 * @returns {Promise<Object>} - Aggregated results
 */
export async function benchmarkNoCache(count, app, user) {
  console.log(`\n=== NO CACHE BASELINE (${count} evaluations) ===\n`);

  const latencies = [];
  let grantCount = 0;
  let denyCount = 0;

  const overallStart = process.hrtime.bigint();

  for (let i = 0; i < count; i++) {
    const result = await evaluateNoCache(app, user);
    latencies.push(result.latencyMs);
    if (result.result === "grant") grantCount++;
    else denyCount++;
  }

  const overallEnd = process.hrtime.bigint();
  const totalTimeMs = Number(overallEnd - overallStart) / 1_000_000;

  const sortedLatencies = [...latencies].sort((a, b) => a - b);
  const avgLatency = latencies.reduce((sum, l) => sum + l, 0) / latencies.length;

  return {
    approach: "no-cache",
    evaluations: count,
    totalTimeMs,
    avgLatencyMs: avgLatency,
    minLatencyMs: sortedLatencies[0],
    maxLatencyMs: sortedLatencies[sortedLatencies.length - 1],
    p50LatencyMs: sortedLatencies[Math.floor(sortedLatencies.length * 0.5)],
    p95LatencyMs: sortedLatencies[Math.floor(sortedLatencies.length * 0.95)],
    p99LatencyMs: sortedLatencies[Math.floor(sortedLatencies.length * 0.99)],
    grantCount,
    denyCount,
  };
}

export default {
  evaluateNoCache,
  benchmarkNoCache,
};