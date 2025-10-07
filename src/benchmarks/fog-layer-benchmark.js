/**
 * Fog Layer Latency Benchmark
 * Comprehensive evaluation of IoT → Edge → Fog → Cloud latency
 */

import dotenv from "dotenv";
dotenv.config();
import "../services/mongoose.js";
import Models from "../models/index.js";
import FogComputingSimulator from "../simulation/fog-layer-simulator.js";
import NetworkLatency from "../simulation/network-latency-simulator.js";
import fs from "fs";
import path from "path";

// Configuration
const CLOUD_URL = process.env.CLOUD_URL || "http://localhost:3000";
const EDGE_SERVER_URL = "http://edge-simulator"; // Virtual URL
const NUM_IOT_DEVICES = 20;
const NUM_EDGE_NODES = 5;
const NUM_FOG_NODES = 3;
const NUM_REQUESTS = 100;
const WARMUP_REQUESTS = 20;

/**
 * Statistics calculator
 */
function calculateStats(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / values.length;

  // Calculate standard deviation
  const variance =
    values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
    values.length;
  const stdDev = Math.sqrt(variance);

  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean,
    median: sorted[Math.floor(sorted.length / 2)],
    p95: sorted[Math.floor(sorted.length * 0.95)],
    p99: sorted[Math.floor(sorted.length * 0.99)],
    stdDev,
  };
}

/**
 * Run fog layer benchmark
 */
async function runBenchmark() {
  console.log("\n╔═══════════════════════════════════════════════╗");
  console.log("║   FOG LAYER LATENCY BENCHMARK                 ║");
  console.log("╚═══════════════════════════════════════════════╝\n");

  const results = {
    configuration: {
      numIoTDevices: NUM_IOT_DEVICES,
      numEdgeNodes: NUM_EDGE_NODES,
      numFogNodes: NUM_FOG_NODES,
      numRequests: NUM_REQUESTS,
      warmupRequests: WARMUP_REQUESTS,
      cloudUrl: CLOUD_URL,
      latencyConfig: NetworkLatency.getConfig(),
    },
    timestamp: new Date().toISOString(),
    latencyBreakdown: {
      iotToEdge: [],
      edgeToFog: [],
      fogToCloud: [],
      cloudProcessing: [],
      total: [],
    },
    cachePerformance: {
      edgeCacheHits: 0,
      edgeCacheMisses: 0,
      cloudCacheHits: 0,
      cloudCacheMisses: 0,
    },
    errors: [],
  };

  // Step 1: Setup test data
  console.log("📊 Setting up test data...");
  await Models.EvaluateHash.deleteMany({});

  const users = await Models.User.find().limit(10);
  const apps = await Models.App.find().limit(10);

  if (users.length === 0 || apps.length === 0) {
    throw new Error(
      "No test data found. Run 'npm run dev' first to generate test data."
    );
  }

  console.log(`✓ Found ${users.length} users and ${apps.length} apps\n`);

  // Step 2: Initialize fog simulator
  console.log("🌐 Initializing fog computing simulator...");
  const simulator = new FogComputingSimulator(CLOUD_URL, EDGE_SERVER_URL);
  await simulator.initialize(NUM_IOT_DEVICES, NUM_EDGE_NODES, NUM_FOG_NODES);

  const stats = simulator.getStats();
  console.log(`✓ Simulator ready:`);
  console.log(`  - IoT Devices: ${stats.iotDevices}`);
  console.log(`  - Edge Nodes: ${stats.edgeNodes}`);
  console.log(`  - Fog Nodes: ${stats.fogNodes}\n`);

  // Step 3: Warmup phase
  console.log(`🔥 Warmup phase (${WARMUP_REQUESTS} requests)...`);
  for (let i = 0; i < WARMUP_REQUESTS; i++) {
    const deviceIndex = i % NUM_IOT_DEVICES;
    const userId = users[i % users.length]._id.toString();
    const appId = apps[i % apps.length]._id.toString();

    try {
      await simulator.simulateRequest(deviceIndex, appId, userId);
    } catch (error) {
      console.warn(`Warmup request ${i} failed:`, error.message);
    }
  }
  console.log("✓ Warmup complete\n");

  // Step 4: Main benchmark
  console.log(`⚡ Running benchmark (${NUM_REQUESTS} requests)...\n`);

  const progressInterval = Math.floor(NUM_REQUESTS / 10);

  for (let i = 0; i < NUM_REQUESTS; i++) {
    const deviceIndex = i % NUM_IOT_DEVICES;
    const userId = users[i % users.length]._id.toString();
    const appId = apps[i % apps.length]._id.toString();

    try {
      const result = await simulator.simulateRequest(deviceIndex, appId, userId);

      // Record latency breakdown
      results.latencyBreakdown.iotToEdge.push(result.iotEdgeLatency);
      results.latencyBreakdown.edgeToFog.push(
        result.edgeFogLatency || 0
      );
      results.latencyBreakdown.fogToCloud.push(
        result.fogCloudLatency || 0
      );
      results.latencyBreakdown.cloudProcessing.push(
        parseFloat(result.latencyMs) || 0
      );
      results.latencyBreakdown.total.push(result.totalLatency);

      // Record cache hits
      if (result.edgeCacheHit) {
        results.cachePerformance.edgeCacheHits++;
      } else {
        results.cachePerformance.edgeCacheMisses++;
      }

      if (result.cacheHit) {
        results.cachePerformance.cloudCacheHits++;
      } else {
        results.cachePerformance.cloudCacheMisses++;
      }

      // Progress indicator
      if ((i + 1) % progressInterval === 0) {
        const progress = ((i + 1) / NUM_REQUESTS * 100).toFixed(0);
        console.log(`  Progress: ${progress}% (${i + 1}/${NUM_REQUESTS})`);
      }
    } catch (error) {
      results.errors.push({
        request: i,
        deviceIndex,
        userId,
        appId,
        error: error.message,
      });
    }
  }

  console.log("\n✓ Benchmark complete\n");

  // Step 5: Calculate statistics
  console.log("📈 Calculating statistics...\n");

  results.statistics = {
    iotToEdge: calculateStats(results.latencyBreakdown.iotToEdge),
    edgeToFog: calculateStats(
      results.latencyBreakdown.edgeToFog.filter((v) => v > 0)
    ),
    fogToCloud: calculateStats(
      results.latencyBreakdown.fogToCloud.filter((v) => v > 0)
    ),
    cloudProcessing: calculateStats(results.latencyBreakdown.cloudProcessing),
    total: calculateStats(results.latencyBreakdown.total),
  };

  results.cachePerformance.edgeCacheHitRate =
    results.cachePerformance.edgeCacheHits /
    (results.cachePerformance.edgeCacheHits +
      results.cachePerformance.edgeCacheMisses);

  results.cachePerformance.cloudCacheHitRate =
    results.cachePerformance.cloudCacheHits /
    (results.cachePerformance.cloudCacheHits +
      results.cachePerformance.cloudCacheMisses);

  // Step 6: Display results
  displayResults(results);

  // Step 7: Save results
  await saveResults(results);

  return results;
}

/**
 * Display results in terminal
 */
function displayResults(results) {
  console.log("\n╔═══════════════════════════════════════════════╗");
  console.log("║          BENCHMARK RESULTS                    ║");
  console.log("╚═══════════════════════════════════════════════╝\n");

  console.log("📊 LATENCY BREAKDOWN (milliseconds)\n");

  console.log("┌─────────────────────────────────────────────────────────────┐");
  console.log("│ IoT → Edge Latency                                          │");
  console.log("├─────────────────────────────────────────────────────────────┤");
  const iotEdge = results.statistics.iotToEdge;
  console.log(`│ Mean:     ${iotEdge.mean.toFixed(3)} ms                                      │`);
  console.log(`│ Median:   ${iotEdge.median.toFixed(3)} ms                                      │`);
  console.log(`│ P95:      ${iotEdge.p95.toFixed(3)} ms                                      │`);
  console.log(`│ P99:      ${iotEdge.p99.toFixed(3)} ms                                      │`);
  console.log(`│ Min/Max:  ${iotEdge.min.toFixed(3)} / ${iotEdge.max.toFixed(3)} ms                            │`);
  console.log("└─────────────────────────────────────────────────────────────┘\n");

  console.log("┌─────────────────────────────────────────────────────────────┐");
  console.log("│ Edge → Fog Latency                                          │");
  console.log("├─────────────────────────────────────────────────────────────┤");
  const edgeFog = results.statistics.edgeToFog;
  console.log(`│ Mean:     ${edgeFog.mean.toFixed(3)} ms                                     │`);
  console.log(`│ Median:   ${edgeFog.median.toFixed(3)} ms                                     │`);
  console.log(`│ P95:      ${edgeFog.p95.toFixed(3)} ms                                     │`);
  console.log(`│ P99:      ${edgeFog.p99.toFixed(3)} ms                                     │`);
  console.log(`│ Min/Max:  ${edgeFog.min.toFixed(3)} / ${edgeFog.max.toFixed(3)} ms                           │`);
  console.log("└─────────────────────────────────────────────────────────────┘\n");

  console.log("┌─────────────────────────────────────────────────────────────┐");
  console.log("│ Fog → Cloud Latency                                         │");
  console.log("├─────────────────────────────────────────────────────────────┤");
  const fogCloud = results.statistics.fogToCloud;
  console.log(`│ Mean:     ${fogCloud.mean.toFixed(3)} ms                                    │`);
  console.log(`│ Median:   ${fogCloud.median.toFixed(3)} ms                                    │`);
  console.log(`│ P95:      ${fogCloud.p95.toFixed(3)} ms                                    │`);
  console.log(`│ P99:      ${fogCloud.p99.toFixed(3)} ms                                    │`);
  console.log(`│ Min/Max:  ${fogCloud.min.toFixed(3)} / ${fogCloud.max.toFixed(3)} ms                          │`);
  console.log("└─────────────────────────────────────────────────────────────┘\n");

  console.log("┌─────────────────────────────────────────────────────────────┐");
  console.log("│ Cloud Processing Latency                                    │");
  console.log("├─────────────────────────────────────────────────────────────┤");
  const cloud = results.statistics.cloudProcessing;
  console.log(`│ Mean:     ${cloud.mean.toFixed(3)} ms                                      │`);
  console.log(`│ Median:   ${cloud.median.toFixed(3)} ms                                      │`);
  console.log(`│ P95:      ${cloud.p95.toFixed(3)} ms                                      │`);
  console.log(`│ P99:      ${cloud.p99.toFixed(3)} ms                                      │`);
  console.log(`│ Min/Max:  ${cloud.min.toFixed(3)} / ${cloud.max.toFixed(3)} ms                            │`);
  console.log("└─────────────────────────────────────────────────────────────┘\n");

  console.log("┌─────────────────────────────────────────────────────────────┐");
  console.log("│ TOTAL End-to-End Latency                                    │");
  console.log("├─────────────────────────────────────────────────────────────┤");
  const total = results.statistics.total;
  console.log(`│ Mean:     ${total.mean.toFixed(3)} ms                                    │`);
  console.log(`│ Median:   ${total.median.toFixed(3)} ms                                    │`);
  console.log(`│ P95:      ${total.p95.toFixed(3)} ms                                    │`);
  console.log(`│ P99:      ${total.p99.toFixed(3)} ms                                    │`);
  console.log(`│ Min/Max:  ${total.min.toFixed(3)} / ${total.max.toFixed(3)} ms                          │`);
  console.log("└─────────────────────────────────────────────────────────────┘\n");

  console.log("\n💾 CACHE PERFORMANCE\n");
  console.log(`Edge Cache Hit Rate:  ${(results.cachePerformance.edgeCacheHitRate * 100).toFixed(2)}%`);
  console.log(`  - Hits:   ${results.cachePerformance.edgeCacheHits}`);
  console.log(`  - Misses: ${results.cachePerformance.edgeCacheMisses}`);
  console.log(`\nCloud Cache Hit Rate: ${(results.cachePerformance.cloudCacheHitRate * 100).toFixed(2)}%`);
  console.log(`  - Hits:   ${results.cachePerformance.cloudCacheHits}`);
  console.log(`  - Misses: ${results.cachePerformance.cloudCacheMisses}`);

  if (results.errors.length > 0) {
    console.log(`\n⚠️  Errors: ${results.errors.length}`);
  }

  console.log("\n");
}

/**
 * Save results to files
 */
async function saveResults(results) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const resultsDir = path.join(process.cwd(), "results");

  // Ensure results directory exists
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  // Save JSON
  const jsonPath = path.join(
    resultsDir,
    `fog-layer-benchmark_${timestamp}.json`
  );
  fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));
  console.log(`✓ Results saved to: ${jsonPath}`);

  // Save CSV
  const csvPath = path.join(resultsDir, `fog-layer-benchmark_${timestamp}.csv`);
  const csvContent = generateCSV(results);
  fs.writeFileSync(csvPath, csvContent);
  console.log(`✓ CSV saved to: ${csvPath}`);

  // Save summary report
  const reportPath = path.join(
    resultsDir,
    `fog-layer-benchmark_${timestamp}.txt`
  );
  const report = generateReport(results);
  fs.writeFileSync(reportPath, report);
  console.log(`✓ Report saved to: ${reportPath}`);
}

/**
 * Generate CSV output
 */
function generateCSV(results) {
  let csv = "Layer,Mean,Median,P95,P99,Min,Max,StdDev\n";

  const layers = [
    "IoT→Edge",
    "Edge→Fog",
    "Fog→Cloud",
    "Cloud Processing",
    "Total",
  ];
  const stats = [
    results.statistics.iotToEdge,
    results.statistics.edgeToFog,
    results.statistics.fogToCloud,
    results.statistics.cloudProcessing,
    results.statistics.total,
  ];

  layers.forEach((layer, i) => {
    const s = stats[i];
    csv += `${layer},${s.mean.toFixed(3)},${s.median.toFixed(3)},${s.p95.toFixed(3)},${s.p99.toFixed(3)},${s.min.toFixed(3)},${s.max.toFixed(3)},${s.stdDev.toFixed(3)}\n`;
  });

  return csv;
}

/**
 * Generate text report
 */
function generateReport(results) {
  return `
FOG LAYER LATENCY BENCHMARK REPORT
Generated: ${results.timestamp}

CONFIGURATION
=============
IoT Devices: ${results.configuration.numIoTDevices}
Edge Nodes: ${results.configuration.numEdgeNodes}
Fog Nodes: ${results.configuration.numFogNodes}
Total Requests: ${results.configuration.numRequests}
Warmup Requests: ${results.configuration.warmupRequests}

LATENCY RESULTS (milliseconds)
==============================

IoT → Edge Latency:
  Mean:     ${results.statistics.iotToEdge.mean.toFixed(3)} ms
  Median:   ${results.statistics.iotToEdge.median.toFixed(3)} ms
  P95:      ${results.statistics.iotToEdge.p95.toFixed(3)} ms
  P99:      ${results.statistics.iotToEdge.p99.toFixed(3)} ms
  Min/Max:  ${results.statistics.iotToEdge.min.toFixed(3)} / ${results.statistics.iotToEdge.max.toFixed(3)} ms

Edge → Fog Latency:
  Mean:     ${results.statistics.edgeToFog.mean.toFixed(3)} ms
  Median:   ${results.statistics.edgeToFog.median.toFixed(3)} ms
  P95:      ${results.statistics.edgeToFog.p95.toFixed(3)} ms
  P99:      ${results.statistics.edgeToFog.p99.toFixed(3)} ms
  Min/Max:  ${results.statistics.edgeToFog.min.toFixed(3)} / ${results.statistics.edgeToFog.max.toFixed(3)} ms

Fog → Cloud Latency:
  Mean:     ${results.statistics.fogToCloud.mean.toFixed(3)} ms
  Median:   ${results.statistics.fogToCloud.median.toFixed(3)} ms
  P95:      ${results.statistics.fogToCloud.p95.toFixed(3)} ms
  P99:      ${results.statistics.fogToCloud.p99.toFixed(3)} ms
  Min/Max:  ${results.statistics.fogToCloud.min.toFixed(3)} / ${results.statistics.fogToCloud.max.toFixed(3)} ms

Cloud Processing:
  Mean:     ${results.statistics.cloudProcessing.mean.toFixed(3)} ms
  Median:   ${results.statistics.cloudProcessing.median.toFixed(3)} ms
  P95:      ${results.statistics.cloudProcessing.p95.toFixed(3)} ms
  P99:      ${results.statistics.cloudProcessing.p99.toFixed(3)} ms
  Min/Max:  ${results.statistics.cloudProcessing.min.toFixed(3)} / ${results.statistics.cloudProcessing.max.toFixed(3)} ms

TOTAL End-to-End:
  Mean:     ${results.statistics.total.mean.toFixed(3)} ms
  Median:   ${results.statistics.total.median.toFixed(3)} ms
  P95:      ${results.statistics.total.p95.toFixed(3)} ms
  P99:      ${results.statistics.total.p99.toFixed(3)} ms
  Min/Max:  ${results.statistics.total.min.toFixed(3)} / ${results.statistics.total.max.toFixed(3)} ms

CACHE PERFORMANCE
=================
Edge Cache Hit Rate: ${(results.cachePerformance.edgeCacheHitRate * 100).toFixed(2)}%
  Hits: ${results.cachePerformance.edgeCacheHits}
  Misses: ${results.cachePerformance.edgeCacheMisses}

Cloud Cache Hit Rate: ${(results.cachePerformance.cloudCacheHitRate * 100).toFixed(2)}%
  Hits: ${results.cachePerformance.cloudCacheHits}
  Misses: ${results.cachePerformance.cloudCacheMisses}

ERRORS
======
Total Errors: ${results.errors.length}

KEY INSIGHTS
============
1. Network Latency Distribution:
   - IoT→Edge: ${results.statistics.iotToEdge.mean.toFixed(3)} ms (${((results.statistics.iotToEdge.mean / results.statistics.total.mean) * 100).toFixed(1)}% of total)
   - Edge→Fog: ${results.statistics.edgeToFog.mean.toFixed(3)} ms (${((results.statistics.edgeToFog.mean / results.statistics.total.mean) * 100).toFixed(1)}% of total)
   - Fog→Cloud: ${results.statistics.fogToCloud.mean.toFixed(3)} ms (${((results.statistics.fogToCloud.mean / results.statistics.total.mean) * 100).toFixed(1)}% of total)
   - Processing: ${results.statistics.cloudProcessing.mean.toFixed(3)} ms (${((results.statistics.cloudProcessing.mean / results.statistics.total.mean) * 100).toFixed(1)}% of total)

2. Fog Computing Benefit:
   - Fog-based latency: ${results.statistics.total.mean.toFixed(3)} ms
   - Expected IoT→Cloud direct: ~80-150 ms
   - Latency reduction: ~${((1 - results.statistics.total.mean / 100) * 100).toFixed(1)}%

3. Edge Caching Impact:
   - Edge cache accelerates ${(results.cachePerformance.edgeCacheHitRate * 100).toFixed(1)}% of requests
   - Eliminates Fog→Cloud roundtrip for cached requests
   - Average savings: ~${(results.statistics.fogToCloud.mean + results.statistics.cloudProcessing.mean).toFixed(1)} ms per cached request
`;
}

/**
 * Main entry point
 */
async function main() {
  try {
    await runBenchmark();
    console.log("\n✅ Fog layer benchmark completed successfully\n");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Benchmark failed:", error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default runBenchmark;
