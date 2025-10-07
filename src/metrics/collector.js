/**
 * Metrics Collector
 * Collects and exports benchmark results to CSV/JSON for research paper analysis
 */

import fs from "fs";
import path from "path";

/**
 * Ensure results directory exists
 * @param {string} dir - Directory path
 */
function ensureDirectory(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Export latency benchmark results to CSV
 * @param {Object} results - Latency benchmark statistics
 * @param {string} filename - Output filename (without extension)
 * @param {string} outputDir - Output directory
 * @returns {string} - Path to exported file
 */
export function exportLatencyToCSV(results, filename = "latency-results", outputDir = "./results") {
  ensureDirectory(outputDir);

  const csvRows = [
    ["Metric", "Min (ms)", "Mean (ms)", "Median (ms)", "P95 (ms)", "P99 (ms)", "Max (ms)", "StdDev (ms)"],
    [
      "Cache Hit",
      results.cacheHit.min,
      results.cacheHit.mean,
      results.cacheHit.median,
      results.cacheHit.p95,
      results.cacheHit.p99,
      results.cacheHit.max,
      results.cacheHit.stdDev,
    ],
    [
      "Cache Miss (Full Validation)",
      results.cacheMiss.min,
      results.cacheMiss.mean,
      results.cacheMiss.median,
      results.cacheMiss.p95,
      results.cacheMiss.p99,
      results.cacheMiss.max,
      results.cacheMiss.stdDev,
    ],
    [
      "Hash Computation",
      results.hashComputation.min,
      results.hashComputation.mean,
      results.hashComputation.median,
      results.hashComputation.p95,
      results.hashComputation.p99,
      results.hashComputation.max,
      results.hashComputation.stdDev,
    ],
    [
      "Nested Set Query",
      results.nestedSetQuery.min,
      results.nestedSetQuery.mean,
      results.nestedSetQuery.median,
      results.nestedSetQuery.p95,
      results.nestedSetQuery.p99,
      results.nestedSetQuery.max,
      results.nestedSetQuery.stdDev,
    ],
    [],
    ["Cache Speedup Factor", results.speedupFactor.toFixed(2) + "x"],
  ];

  const csvContent = csvRows.map((row) => row.join(",")).join("\n");
  const filepath = path.join(outputDir, `${filename}.csv`);
  fs.writeFileSync(filepath, csvContent);

  console.log(`✓ Latency results exported to: ${filepath}`);
  return filepath;
}

/**
 * Export throughput benchmark results to CSV
 * @param {Array<Object>} results - Array of throughput benchmark results
 * @param {string} filename - Output filename (without extension)
 * @param {string} outputDir - Output directory
 * @returns {string} - Path to exported file
 */
export function exportThroughputToCSV(results, filename = "throughput-results", outputDir = "./results") {
  ensureDirectory(outputDir);

  const csvRows = [
    [
      "Concurrent Users",
      "Total Requests",
      "Throughput (req/s)",
      "Avg Latency (ms)",
      "P50 (ms)",
      "P95 (ms)",
      "P99 (ms)",
      "Max Latency (ms)",
      "Cache Hit Rate",
      "Total Time (s)",
    ],
  ];

  results.forEach((result) => {
    csvRows.push([
      result.concurrentUsers,
      result.totalRequests,
      result.throughputRPS.toFixed(2),
      result.avgLatencyMs.toFixed(2),
      result.p50LatencyMs.toFixed(2),
      result.p95LatencyMs.toFixed(2),
      result.p99LatencyMs.toFixed(2),
      result.maxLatencyMs.toFixed(2),
      result.cacheHitRate,
      result.totalTimeSec.toFixed(2),
    ]);
  });

  const csvContent = csvRows.map((row) => row.join(",")).join("\n");
  const filepath = path.join(outputDir, `${filename}.csv`);
  fs.writeFileSync(filepath, csvContent);

  console.log(`✓ Throughput results exported to: ${filepath}`);
  return filepath;
}

/**
 * Export resource usage statistics to CSV
 * @param {Object} stats - Resource usage statistics
 * @param {string} filename - Output filename (without extension)
 * @param {string} outputDir - Output directory
 * @returns {string} - Path to exported file
 */
export function exportResourceStatsToCSV(stats, filename = "resource-stats", outputDir = "./results") {
  ensureDirectory(outputDir);

  const csvRows = [
    ["Metric", "Average", "Peak"],
    ["CPU Usage (%)", stats.avgCPUPercent, stats.maxCPUPercent],
    ["Heap Memory (MB)", stats.avgHeapUsedMB, stats.maxHeapUsedMB],
    ["RSS Memory (MB)", stats.avgRssMB, stats.maxRssMB],
    [],
    ["Sample Count", stats.sampleCount, ""],
  ];

  const csvContent = csvRows.map((row) => row.join(",")).join("\n");
  const filepath = path.join(outputDir, `${filename}.csv`);
  fs.writeFileSync(filepath, csvContent);

  console.log(`✓ Resource stats exported to: ${filepath}`);
  return filepath;
}

/**
 * Export any benchmark results to JSON
 * @param {Object} data - Data to export
 * @param {string} filename - Output filename (without extension)
 * @param {string} outputDir - Output directory
 * @returns {string} - Path to exported file
 */
export function exportToJSON(data, filename = "benchmark-results", outputDir = "./results") {
  ensureDirectory(outputDir);

  const filepath = path.join(outputDir, `${filename}.json`);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));

  console.log(`✓ Results exported to JSON: ${filepath}`);
  return filepath;
}

/**
 * Export comprehensive benchmark report (multiple formats)
 * @param {Object} benchmarkData - All benchmark data
 * @param {string} prefix - Filename prefix
 * @param {string} outputDir - Output directory
 * @returns {Object} - Paths to exported files
 */
export function exportComprehensiveReport(benchmarkData, prefix = "benchmark", outputDir = "./results") {
  ensureDirectory(outputDir);

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
  const baseFilename = `${prefix}_${timestamp}`;

  const exports = {
    json: null,
    csv: {},
  };

  // Export full JSON
  exports.json = exportToJSON(benchmarkData, baseFilename, outputDir);

  // Export individual CSV files
  if (benchmarkData.latency) {
    exports.csv.latency = exportLatencyToCSV(benchmarkData.latency, `${baseFilename}_latency`, outputDir);
  }

  if (benchmarkData.throughput) {
    exports.csv.throughput = exportThroughputToCSV(benchmarkData.throughput, `${baseFilename}_throughput`, outputDir);
  }

  if (benchmarkData.resources) {
    exports.csv.resources = exportResourceStatsToCSV(benchmarkData.resources, `${baseFilename}_resources`, outputDir);
  }

  // Create summary report
  const summaryPath = path.join(outputDir, `${baseFilename}_SUMMARY.txt`);
  const summaryContent = generateTextSummary(benchmarkData);
  fs.writeFileSync(summaryPath, summaryContent);
  exports.summary = summaryPath;

  console.log(`\n✓ Comprehensive report exported to: ${outputDir}/`);
  console.log(`  Files: ${Object.values(exports.csv).length} CSV + 1 JSON + 1 TXT summary`);

  return exports;
}

/**
 * Generate human-readable text summary
 * @param {Object} data - Benchmark data
 * @returns {string} - Text summary
 */
function generateTextSummary(data) {
  const lines = [];

  lines.push("=".repeat(70));
  lines.push("PRIVACY COMPLIANCE EVALUATION BENCHMARK REPORT");
  lines.push("=".repeat(70));
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push("");

  // System info
  if (data.systemInfo) {
    lines.push("SYSTEM INFORMATION");
    lines.push("-".repeat(70));
    lines.push(`Platform:        ${data.systemInfo.platform} (${data.systemInfo.arch})`);
    lines.push(`CPU:             ${data.systemInfo.cpuModel}`);
    lines.push(`CPU Cores:       ${data.systemInfo.cpus}`);
    lines.push(`Total Memory:    ${data.systemInfo.totalMemoryGB} GB`);
    lines.push(`Node Version:    ${data.systemInfo.nodeVersion}`);
    lines.push("");
  }

  // Dataset info
  if (data.dataset) {
    lines.push("TEST DATASET");
    lines.push("-".repeat(70));
    lines.push(`Users:           ${data.dataset.users}`);
    lines.push(`Apps:            ${data.dataset.apps}`);
    lines.push(`Attributes:      ${data.dataset.attributes}`);
    lines.push(`Purposes:        ${data.dataset.purposes}`);
    lines.push("");
  }

  // Latency results
  if (data.latency) {
    lines.push("LATENCY BENCHMARK");
    lines.push("-".repeat(70));
    lines.push(`Cache Hit (mean):          ${data.latency.cacheHit.mean.toFixed(3)} ms`);
    lines.push(`Cache Miss (mean):         ${data.latency.cacheMiss.mean.toFixed(3)} ms`);
    lines.push(`Hash Computation (mean):   ${data.latency.hashComputation.mean.toFixed(3)} ms`);
    lines.push(`Nested Set Query (mean):   ${data.latency.nestedSetQuery.mean.toFixed(3)} ms`);
    lines.push(`Cache Speedup Factor:      ${data.latency.speedupFactor.toFixed(2)}x`);
    lines.push("");
  }

  // Throughput results
  if (data.throughput && data.throughput.length > 0) {
    lines.push("THROUGHPUT BENCHMARK");
    lines.push("-".repeat(70));
    data.throughput.forEach((result) => {
      lines.push(
        `${result.concurrentUsers} users: ${result.throughputRPS.toFixed(2)} req/s (avg latency: ${result.avgLatencyMs.toFixed(2)} ms, cache hit: ${result.cacheHitRate})`
      );
    });
    lines.push("");
  }

  // Resource usage
  if (data.resources) {
    lines.push("RESOURCE USAGE");
    lines.push("-".repeat(70));
    lines.push(`CPU (avg/peak):        ${data.resources.avgCPUPercent}% / ${data.resources.maxCPUPercent}%`);
    lines.push(`Heap Memory (avg/peak): ${data.resources.avgHeapUsedMB} MB / ${data.resources.maxHeapUsedMB} MB`);
    lines.push(`RSS Memory (avg/peak):  ${data.resources.avgRssMB} MB / ${data.resources.maxRssMB} MB`);
    lines.push("");
  }

  lines.push("=".repeat(70));
  lines.push("END OF REPORT");
  lines.push("=".repeat(70));

  return lines.join("\n");
}

/**
 * Create a timestamped collector instance for a benchmark session
 * @returns {Object} - Collector instance
 */
export function createCollector() {
  const sessionId = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
  const data = {};

  return {
    sessionId,
    addLatencyResults: (results) => {
      data.latency = results;
    },
    addThroughputResults: (results) => {
      data.throughput = results;
    },
    addResourceStats: (stats) => {
      data.resources = stats;
    },
    addSystemInfo: (info) => {
      data.systemInfo = info;
    },
    addDatasetInfo: (info) => {
      data.dataset = info;
    },
    addCustomData: (key, value) => {
      data[key] = value;
    },
    export: (prefix = "benchmark", outputDir = "./results") => {
      return exportComprehensiveReport(data, prefix, outputDir);
    },
    getData: () => data,
  };
}

export default {
  exportLatencyToCSV,
  exportThroughputToCSV,
  exportResourceStatsToCSV,
  exportToJSON,
  exportComprehensiveReport,
  createCollector,
};