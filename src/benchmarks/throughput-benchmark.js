/**
 * Throughput Benchmark
 * Measures concurrent user handling capacity and system throughput
 */

import Models from "../models";
import Helpers from "../helpers";
import { computeCacheKey } from "../utils/hashUtils.js";
import moment from "moment";

/**
 * Process a single evaluation request
 * @param {Object} app - Application data
 * @param {Object} user - User privacy preferences
 * @returns {Promise<Object>} - Evaluation result with timing
 */
async function processEvaluationRequest(app, user) {
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
    success: true,
    latencyMs,
    cacheHit,
    result,
  };
}

/**
 * Run concurrent requests and measure throughput
 * @param {number} concurrentUsers - Number of concurrent users
 * @param {number} requestsPerUser - Number of requests per user
 * @param {Array<Object>} apps - Array of app objects
 * @param {Array<Object>} users - Array of user objects
 * @returns {Promise<Object>} - Throughput metrics
 */
export async function measureThroughput(
  concurrentUsers = 10,
  requestsPerUser = 10,
  apps = [],
  users = []
) {
  console.log(
    `\n=== THROUGHPUT BENCHMARK (${concurrentUsers} concurrent users, ${requestsPerUser} requests each) ===\n`
  );

  if (apps.length === 0 || users.length === 0) {
    throw new Error("Apps and users arrays must not be empty");
  }

  const startTime = process.hrtime.bigint();
  const promises = [];
  const results = {
    successful: 0,
    failed: 0,
    cacheHits: 0,
    cacheMisses: 0,
    latencies: [],
  };

  // Generate concurrent requests
  for (let i = 0; i < concurrentUsers; i++) {
    const user = users[i % users.length];
    const app = apps[i % apps.length];

    for (let j = 0; j < requestsPerUser; j++) {
      promises.push(
        processEvaluationRequest(app, user)
          .then((res) => {
            results.successful++;
            results.latencies.push(res.latencyMs);
            if (res.cacheHit) results.cacheHits++;
            else results.cacheMisses++;
          })
          .catch((err) => {
            results.failed++;
            console.error("Request failed:", err.message);
          })
      );
    }
  }

  // Wait for all requests to complete
  await Promise.all(promises);

  const endTime = process.hrtime.bigint();
  const totalTimeMs = Number(endTime - startTime) / 1_000_000;
  const totalTimeSec = totalTimeMs / 1000;

  const totalRequests = concurrentUsers * requestsPerUser;
  const throughputRPS = totalRequests / totalTimeSec;

  // Calculate latency statistics
  const sortedLatencies = results.latencies.sort((a, b) => a - b);
  const avgLatency = results.latencies.reduce((sum, l) => sum + l, 0) / results.latencies.length;

  return {
    concurrentUsers,
    requestsPerUser,
    totalRequests,
    successful: results.successful,
    failed: results.failed,
    cacheHits: results.cacheHits,
    cacheMisses: results.cacheMisses,
    cacheHitRate: (results.cacheHits / totalRequests * 100).toFixed(2) + "%",
    totalTimeMs,
    totalTimeSec,
    throughputRPS,
    avgLatencyMs: avgLatency,
    minLatencyMs: sortedLatencies[0],
    maxLatencyMs: sortedLatencies[sortedLatencies.length - 1],
    p50LatencyMs: sortedLatencies[Math.floor(sortedLatencies.length * 0.5)],
    p95LatencyMs: sortedLatencies[Math.floor(sortedLatencies.length * 0.95)],
    p99LatencyMs: sortedLatencies[Math.floor(sortedLatencies.length * 0.99)],
  };
}

/**
 * Run throughput benchmark with increasing concurrent users
 * @param {Array<number>} userCounts - Array of concurrent user counts to test
 * @param {number} requestsPerUser - Requests per user
 * @param {Array<Object>} apps - Array of app objects
 * @param {Array<Object>} users - Array of user objects
 * @returns {Promise<Array<Object>>} - Array of throughput results
 */
export async function runScalabilityTest(
  userCounts = [10, 50, 100, 500],
  requestsPerUser = 10,
  apps = [],
  users = []
) {
  console.log("\n=== SCALABILITY TEST: Increasing Concurrent Users ===\n");

  const results = [];

  for (const concurrentUsers of userCounts) {
    console.log(`\nTesting with ${concurrentUsers} concurrent users...`);

    // Clear cache before each test for consistent comparison
    await Models.EvaluateHash.deleteMany({});

    const result = await measureThroughput(concurrentUsers, requestsPerUser, apps, users);
    results.push(result);

    console.log(`✓ Throughput: ${result.throughputRPS.toFixed(2)} requests/sec`);
    console.log(`✓ Avg Latency: ${result.avgLatencyMs.toFixed(2)} ms`);
    console.log(`✓ Cache Hit Rate: ${result.cacheHitRate}`);
  }

  return results;
}

/**
 * Measure system throughput under sustained load
 * @param {number} duration - Test duration in seconds
 * @param {number} targetRPS - Target requests per second
 * @param {Array<Object>} apps - Array of app objects
 * @param {Array<Object>} users - Array of user objects
 * @returns {Promise<Object>} - Sustained load test results
 */
export async function measureSustainedLoad(duration = 60, targetRPS = 100, apps = [], users = []) {
  console.log(`\n=== SUSTAINED LOAD TEST (${duration}s @ ${targetRPS} RPS target) ===\n`);

  if (apps.length === 0 || users.length === 0) {
    throw new Error("Apps and users arrays must not be empty");
  }

  const startTime = Date.now();
  const endTime = startTime + duration * 1000;
  const intervalMs = 1000 / targetRPS;

  const results = {
    successful: 0,
    failed: 0,
    cacheHits: 0,
    latencies: [],
    timestamps: [],
  };

  let requestCount = 0;

  // Send requests at target rate
  while (Date.now() < endTime) {
    const reqStartTime = Date.now();
    const user = users[requestCount % users.length];
    const app = apps[requestCount % apps.length];

    processEvaluationRequest(app, user)
      .then((res) => {
        results.successful++;
        results.latencies.push(res.latencyMs);
        results.timestamps.push(Date.now() - startTime);
        if (res.cacheHit) results.cacheHits++;
      })
      .catch(() => {
        results.failed++;
      });

    requestCount++;

    // Wait to maintain target rate
    const elapsed = Date.now() - reqStartTime;
    const waitTime = Math.max(0, intervalMs - elapsed);
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }

  // Wait for pending requests
  await new Promise((resolve) => setTimeout(resolve, 5000));

  const actualDuration = (Date.now() - startTime) / 1000;
  const actualRPS = results.successful / actualDuration;

  // Calculate latency statistics
  const sortedLatencies = results.latencies.sort((a, b) => a - b);
  const avgLatency = results.latencies.reduce((sum, l) => sum + l, 0) / results.latencies.length;

  return {
    duration: actualDuration,
    targetRPS,
    actualRPS,
    totalRequests: requestCount,
    successful: results.successful,
    failed: results.failed,
    cacheHits: results.cacheHits,
    cacheHitRate: ((results.cacheHits / results.successful) * 100).toFixed(2) + "%",
    avgLatencyMs: avgLatency,
    p50LatencyMs: sortedLatencies[Math.floor(sortedLatencies.length * 0.5)],
    p95LatencyMs: sortedLatencies[Math.floor(sortedLatencies.length * 0.95)],
    p99LatencyMs: sortedLatencies[Math.floor(sortedLatencies.length * 0.99)],
  };
}

/**
 * Print throughput results in table format
 * @param {Array<Object>} results - Array of throughput benchmark results
 */
export function printThroughputResults(results) {
  console.log("\n=== THROUGHPUT BENCHMARK RESULTS ===\n");
  console.log(
    "Concurrent Users | Requests/sec | Avg Latency (ms) | P95 (ms) | P99 (ms) | Cache Hit Rate"
  );
  console.log(
    "-----------------|--------------|------------------|----------|----------|---------------"
  );

  results.forEach((result) => {
    console.log(
      `${String(result.concurrentUsers).padStart(16)} | ${result.throughputRPS.toFixed(2).padStart(12)} | ${result.avgLatencyMs.toFixed(2).padStart(16)} | ${result.p95LatencyMs.toFixed(2).padStart(8)} | ${result.p99LatencyMs.toFixed(2).padStart(8)} | ${result.cacheHitRate.padStart(14)}`
    );
  });

  console.log("\n");
}

export default {
  measureThroughput,
  runScalabilityTest,
  measureSustainedLoad,
  printThroughputResults,
};