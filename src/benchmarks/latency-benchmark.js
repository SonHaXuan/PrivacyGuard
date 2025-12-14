/**
 * Latency Benchmark
 * Measures privacy validation time, hash cache impact, and query performance
 */

import Models from "../models";
import Helpers from "../helpers";
import { sha256, computeCacheKey } from "../utils/hashUtils.js";
import moment from "moment";

/**
 * Measure evaluation latency with cache hit
 * @param {Object} app - Application data
 * @param {Object} user - User privacy preferences
 * @returns {Promise<Object>} - Latency metrics
 */
export async function measureCacheHit(app, user) {
  const startTime = process.hrtime.bigint();

  const userId = user.id.toString();
  const hashValue = computeCacheKey(app, user.privacyPreference);

  const permission = await Models.EvaluateHash.findOne({
    userId,
    hash: hashValue,
    createdAt: {
      $gte: moment()
        .utc()
        .subtract(Number(user.privacyPreference.timeofRetention), "second"),
    },
  });

  const endTime = process.hrtime.bigint();
  const latencyNs = Number(endTime - startTime);
  const latencyMs = latencyNs / 1_000_000;

  return {
    type: "cache_hit",
    latencyMs,
    latencyNs,
    cacheHit: !!permission,
    result: permission ? permission.result : null,
  };
}

/**
 * Measure evaluation latency with cache miss (full validation)
 * @param {Object} app - Application data
 * @param {Object} user - User privacy preferences
 * @returns {Promise<Object>} - Latency metrics
 */
export async function measureCacheMiss(app, user) {
  const startTime = process.hrtime.bigint();

  // Perform full evaluation
  const isAccepted = await Helpers.PrivacyPreference.evaluate(app, user);

  const endTime = process.hrtime.bigint();
  const latencyNs = Number(endTime - startTime);
  const latencyMs = latencyNs / 1_000_000;

  return {
    type: "cache_miss_full_validation",
    latencyMs,
    latencyNs,
    cacheHit: false,
    result: isAccepted ? "grant" : "deny",
  };
}

/**
 * Measure hash computation overhead (SHA-256)
 * @param {Object} app - Application data
 * @param {Object} user - User privacy preferences
 * @returns {Object} - Hash computation time
 */
export function measureHashComputation(app, user) {
  const startTime = process.hrtime.bigint();

  const hashValue = computeCacheKey(app, user.privacyPreference);

  const endTime = process.hrtime.bigint();
  const latencyNs = Number(endTime - startTime);
  const latencyMs = latencyNs / 1_000_000;

  return {
    type: "hash_computation_sha256",
    latencyMs,
    latencyNs,
    hashValue,
  };
}

/**
 * Measure nested set query performance (attributes)
 * @param {Array} appAttributes - App attribute IDs
 * @param {Array} uppAttributes - User privacy preference attributes
 * @returns {Promise<Object>} - Query latency
 */
export async function measureNestedSetQuery(appAttributes, uppAttributes) {
  const startTime = process.hrtime.bigint();

  // Simulate the nested set query from privacy-preference.helper.js:119-127
  const mongoose = require("mongoose");
  const appAttributeId = appAttributes[0];

  let appAttribute = await Models.PrivacyPolicy.aggregate([
    { $unwind: "$attributes" },
    {
      $match: {
        "attributes._id": mongoose.Types.ObjectId(appAttributeId.id),
      },
    },
  ]);

  if (appAttribute[0] && appAttribute[0].attributes) {
    appAttribute = appAttribute[0].attributes;

    await Models.PrivacyPolicy.findOne({
      attributes: {
        $elemMatch: {
          _id: { $in: uppAttributes },
          left: { $lte: appAttribute.left },
          right: { $gte: appAttribute.right },
        },
      },
    });
  }

  const endTime = process.hrtime.bigint();
  const latencyNs = Number(endTime - startTime);
  const latencyMs = latencyNs / 1_000_000;

  return {
    type: "nested_set_query",
    latencyMs,
    latencyNs,
  };
}

/**
 * Run comprehensive latency benchmark
 * @param {number} iterations - Number of test iterations
 * @returns {Promise<Object>} - Aggregated benchmark results
 */
export async function runLatencyBenchmark(iterations = 100) {
  console.log(`\n=== LATENCY BENCHMARK (${iterations} iterations) ===\n`);

  const app = await Models.App.findOne();
  const user = await Models.User.findOne();

  if (!app || !user) {
    throw new Error("Test data not found. Run createPrivacyPolicy() and insertTestData() first.");
  }

  const results = {
    cacheHit: [],
    cacheMiss: [],
    hashComputation: [],
    nestedSetQuery: [],
  };

  // Warm-up: create cache entry (using SHA-256)
  const userId = user.id.toString();
  const hashValue = computeCacheKey(app, user.privacyPreference);

  await Models.EvaluateHash.findOneAndUpdate(
    { userId, hash: hashValue },
    { result: "grant", createdAt: new Date() },
    { upsert: true }
  );

  // Run cache hit tests
  console.log("Testing cache hit performance...");
  for (let i = 0; i < iterations; i++) {
    const result = await measureCacheHit(app, user);
    results.cacheHit.push(result.latencyMs);
  }

  // Clear cache for cache miss tests
  await Models.EvaluateHash.deleteMany({ userId, hash: hashValue });

  // Run cache miss tests (full validation)
  console.log("Testing cache miss (full validation) performance...");
  for (let i = 0; i < iterations; i++) {
    const result = await measureCacheMiss(app, user);
    results.cacheMiss.push(result.latencyMs);

    // Clear cache after each test to ensure cache miss
    await Models.EvaluateHash.deleteMany({ userId, hash: hashValue });
  }

  // Run hash computation tests
  console.log("Testing hash computation overhead...");
  for (let i = 0; i < iterations; i++) {
    const result = measureHashComputation(app, user);
    results.hashComputation.push(result.latencyMs);
  }

  // Run nested set query tests
  console.log("Testing nested set query performance...");
  for (let i = 0; i < iterations; i++) {
    const result = await measureNestedSetQuery(
      app.attributes,
      user.privacyPreference.attributes
    );
    results.nestedSetQuery.push(result.latencyMs);
  }

  // Calculate statistics
  const stats = {
    cacheHit: calculateStats(results.cacheHit),
    cacheMiss: calculateStats(results.cacheMiss),
    hashComputation: calculateStats(results.hashComputation),
    nestedSetQuery: calculateStats(results.nestedSetQuery),
    speedupFactor: calculateStats(results.cacheMiss).mean / calculateStats(results.cacheHit).mean,
  };

  return stats;
}

/**
 * Calculate statistical metrics
 * @param {Array<number>} values - Latency measurements in ms
 * @returns {Object} - Statistics (min, max, mean, median, p95, p99)
 */
function calculateStats(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, val) => acc + val, 0);

  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean: sum / sorted.length,
    median: sorted[Math.floor(sorted.length / 2)],
    p95: sorted[Math.floor(sorted.length * 0.95)],
    p99: sorted[Math.floor(sorted.length * 0.99)],
    stdDev: calculateStdDev(sorted, sum / sorted.length),
  };
}

function calculateStdDev(values, mean) {
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((acc, val) => acc + val, 0) / values.length;
  return Math.sqrt(avgSquaredDiff);
}

/**
 * Print benchmark results in table format
 * @param {Object} stats - Benchmark statistics
 */
export function printLatencyResults(stats) {
  console.log("\n=== LATENCY BENCHMARK RESULTS ===\n");
  console.log("Metric               | Min (ms) | Mean (ms) | Median (ms) | P95 (ms) | P99 (ms) | Max (ms) | StdDev");
  console.log("---------------------|----------|-----------|-------------|----------|----------|----------|--------");

  const metrics = [
    { name: "Cache Hit", data: stats.cacheHit },
    { name: "Cache Miss (Full)", data: stats.cacheMiss },
    { name: "Hash Computation", data: stats.hashComputation },
    { name: "Nested Set Query", data: stats.nestedSetQuery },
  ];

  metrics.forEach(({ name, data }) => {
    console.log(
      `${name.padEnd(20, " ")} | ${data.min.toFixed(3).padStart(8)} | ${data.mean.toFixed(3).padStart(9)} | ${data.median.toFixed(3).padStart(11)} | ${data.p95.toFixed(3).padStart(8)} | ${data.p99.toFixed(3).padStart(8)} | ${data.max.toFixed(3).padStart(8)} | ${data.stdDev.toFixed(3)}`
    );
  });

  console.log("\n");
  console.log(`Cache Speedup Factor: ${stats.speedupFactor.toFixed(2)}x faster with cache`);
  console.log("\n");
}

export default {
  measureCacheHit,
  measureCacheMiss,
  measureHashComputation,
  measureNestedSetQuery,
  runLatencyBenchmark,
  printLatencyResults,
};