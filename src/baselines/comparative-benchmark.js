/**
 * Comparative Benchmark
 * Compares proposed approach with baselines for research paper evaluation
 */

require("dotenv").config();
import "../services/mongoose";
import Models from "../models";
import Helpers from "../helpers";
import { computeCacheKey } from "../utils/hashUtils.js";
import moment from "moment";
import NoCacheBaseline from "./no-cache";
import FlatHierarchyBaseline from "./flat-hierarchy";
import MetricsCollector from "../metrics/collector";

/**
 * Evaluate using proposed approach (with cache + nested set)
 * Uses SHA-256 for secure cache key generation
 * @param {Object} app - Application data
 * @param {Object} user - User privacy preferences
 * @returns {Promise<Object>} - Evaluation result
 */
async function evaluateProposed(app, user) {
  const startTime = process.hrtime.bigint();

  const userId = user.id.toString();
  const hashValue = computeCacheKey(app, user.privacyPreference);

  // Check cache
  const permission = await Models.EvaluateHash.findOne({
    userId,
    hash: hashValue,
    createdAt: {
      $gte: moment()
        .utc()
        .subtract(Number(user.privacyPreference.timeofRetention), "second"),
    },
  });

  let result;
  let cacheHit = false;

  if (permission) {
    result = permission.result;
    cacheHit = true;
  } else {
    const isAccepted = await Helpers.PrivacyPreference.evaluate(app, user);
    result = isAccepted ? "grant" : "deny";

    // Store in cache
    await Models.EvaluateHash.create({
      userId,
      hash: hashValue,
      result,
    });
  }

  const endTime = process.hrtime.bigint();
  const latencyMs = Number(endTime - startTime) / 1_000_000;

  return {
    result,
    latencyMs,
    cacheHit,
    approach: "proposed-hash-cache-nested-set",
  };
}

/**
 * Benchmark proposed approach
 * @param {number} count - Number of evaluations
 * @param {Object} app - Application data
 * @param {Object} user - User privacy preferences
 * @returns {Promise<Object>} - Benchmark results
 */
async function benchmarkProposed(count, app, user) {
  console.log(`\n=== PROPOSED APPROACH (${count} evaluations) ===\n`);

  const latencies = [];
  let grantCount = 0;
  let denyCount = 0;
  let cacheHitCount = 0;

  const overallStart = process.hrtime.bigint();

  for (let i = 0; i < count; i++) {
    const result = await evaluateProposed(app, user);
    latencies.push(result.latencyMs);
    if (result.result === "grant") grantCount++;
    else denyCount++;
    if (result.cacheHit) cacheHitCount++;
  }

  const overallEnd = process.hrtime.bigint();
  const totalTimeMs = Number(overallEnd - overallStart) / 1_000_000;

  const sortedLatencies = [...latencies].sort((a, b) => a - b);
  const avgLatency = latencies.reduce((sum, l) => sum + l, 0) / latencies.length;

  return {
    approach: "proposed-hash-cache-nested-set",
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
    cacheHitCount,
    cacheHitRate: ((cacheHitCount / count) * 100).toFixed(2) + "%",
  };
}

/**
 * Run comprehensive comparison across all approaches
 * @param {number} evaluationCount - Number of evaluations per approach
 * @param {Object} app - Application data
 * @param {Object} user - User privacy preferences
 * @returns {Promise<Object>} - Comparative results
 */
export async function runComparativeAnalysis(evaluationCount = 100, app, user) {
  console.log("\n" + "=".repeat(70));
  console.log("COMPARATIVE BASELINE ANALYSIS");
  console.log("=".repeat(70) + "\n");

  // Clear cache before starting
  await Models.EvaluateHash.deleteMany({});

  const results = {};

  // 1. Proposed approach (with cache + nested set)
  results.proposed = await benchmarkProposed(evaluationCount, app, user);

  // Clear cache for fair comparison
  await Models.EvaluateHash.deleteMany({});

  // 2. No cache baseline
  results.noCache = await NoCacheBaseline.benchmarkNoCache(evaluationCount, app, user);

  // 3. Flat hierarchy baseline
  results.flatHierarchy = await FlatHierarchyBaseline.benchmarkFlatHierarchy(
    evaluationCount,
    app,
    user
  );

  // Calculate improvements
  const improvements = {
    proposedVsNoCache: {
      latencyReduction: (
        ((results.noCache.avgLatencyMs - results.proposed.avgLatencyMs) /
          results.noCache.avgLatencyMs) *
        100
      ).toFixed(2),
      speedup: (results.noCache.avgLatencyMs / results.proposed.avgLatencyMs).toFixed(2),
    },
    proposedVsFlatHierarchy: {
      latencyReduction: (
        ((results.flatHierarchy.avgLatencyMs - results.proposed.avgLatencyMs) /
          results.flatHierarchy.avgLatencyMs) *
        100
      ).toFixed(2),
      speedup: (results.flatHierarchy.avgLatencyMs / results.proposed.avgLatencyMs).toFixed(2),
    },
  };

  return {
    results,
    improvements,
  };
}

/**
 * Print comparative results in table format
 * @param {Object} comparison - Comparative analysis results
 */
export function printComparativeResults(comparison) {
  const { results, improvements } = comparison;

  console.log("\n=== COMPARATIVE RESULTS ===\n");
  console.log(
    "Approach                  | Avg Latency (ms) | P95 (ms) | P99 (ms) | Total Time (ms) | Cache Hit Rate"
  );
  console.log(
    "--------------------------|------------------|----------|----------|-----------------|---------------"
  );

  const approaches = [
    { name: "Proposed (Cache+Nested)", data: results.proposed },
    { name: "No Cache", data: results.noCache },
    { name: "Flat Hierarchy", data: results.flatHierarchy },
  ];

  approaches.forEach(({ name, data }) => {
    const cacheRate = data.cacheHitRate || "N/A";
    console.log(
      `${name.padEnd(25, " ")} | ${data.avgLatencyMs.toFixed(2).padStart(16)} | ${data.p95LatencyMs.toFixed(2).padStart(8)} | ${data.p99LatencyMs.toFixed(2).padStart(8)} | ${data.totalTimeMs.toFixed(2).padStart(15)} | ${cacheRate.padStart(14)}`
    );
  });

  console.log("\n=== PERFORMANCE IMPROVEMENTS ===\n");
  console.log(`Proposed vs No Cache:`);
  console.log(
    `  - Latency Reduction: ${improvements.proposedVsNoCache.latencyReduction}%`
  );
  console.log(`  - Speedup Factor:    ${improvements.proposedVsNoCache.speedup}x`);

  console.log(`\nProposed vs Flat Hierarchy:`);
  console.log(
    `  - Latency Reduction: ${improvements.proposedVsFlatHierarchy.latencyReduction}%`
  );
  console.log(`  - Speedup Factor:    ${improvements.proposedVsFlatHierarchy.speedup}x`);

  console.log("\n");
}

/**
 * Export comparative results to CSV
 * @param {Object} comparison - Comparative analysis results
 * @param {string} filename - Output filename
 * @param {string} outputDir - Output directory
 */
export function exportComparativeResults(comparison, filename = "comparative-results", outputDir = "./results") {
  const { results, improvements } = comparison;

  const csvRows = [
    [
      "Approach",
      "Evaluations",
      "Avg Latency (ms)",
      "Min (ms)",
      "P50 (ms)",
      "P95 (ms)",
      "P99 (ms)",
      "Max (ms)",
      "Total Time (ms)",
      "Cache Hit Rate",
    ],
  ];

  Object.values(results).forEach((data) => {
    csvRows.push([
      data.approach,
      data.evaluations,
      data.avgLatencyMs.toFixed(3),
      data.minLatencyMs.toFixed(3),
      data.p50LatencyMs.toFixed(3),
      data.p95LatencyMs.toFixed(3),
      data.p99LatencyMs.toFixed(3),
      data.maxLatencyMs.toFixed(3),
      data.totalTimeMs.toFixed(3),
      data.cacheHitRate || "N/A",
    ]);
  });

  csvRows.push([]);
  csvRows.push(["IMPROVEMENTS"]);
  csvRows.push([
    "Comparison",
    "Latency Reduction (%)",
    "Speedup Factor",
  ]);
  csvRows.push([
    "Proposed vs No Cache",
    improvements.proposedVsNoCache.latencyReduction,
    improvements.proposedVsNoCache.speedup,
  ]);
  csvRows.push([
    "Proposed vs Flat Hierarchy",
    improvements.proposedVsFlatHierarchy.latencyReduction,
    improvements.proposedVsFlatHierarchy.speedup,
  ]);

  return MetricsCollector.exportToJSON(
    { comparison: results, improvements },
    filename,
    outputDir
  );
}

/**
 * Main execution for standalone comparison
 */
async function main() {
  try {
    const app = await Models.App.findOne();
    const user = await Models.User.findOne();

    if (!app || !user) {
      console.error("No test data found. Please generate test data first.");
      process.exit(1);
    }

    const comparison = await runComparativeAnalysis(100, app, user);
    printComparativeResults(comparison);
    exportComparativeResults(comparison);

    console.log("✓ Comparative analysis completed!");
    process.exit(0);
  } catch (error) {
    console.error("✗ Comparison failed:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export default {
  runComparativeAnalysis,
  printComparativeResults,
  exportComparativeResults,
};