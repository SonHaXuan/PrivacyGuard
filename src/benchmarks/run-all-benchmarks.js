/**
 * Master Benchmark Runner
 * Executes all benchmarks and generates comprehensive report for research paper
 */

require("dotenv").config();
import "../services/mongoose";
import Models from "../models";
import LatencyBenchmark from "./latency-benchmark";
import ThroughputBenchmark from "./throughput-benchmark";
import ResourceMonitor from "./resource-monitor";
import TestDataGenerator from "../generators/test-data-generator";
import MetricsCollector from "../metrics/collector";

/**
 * Initialize privacy policy if not exists
 */
async function ensurePrivacyPolicy() {
  const hasData = await Models.PrivacyPolicy.findOne({});
  if (hasData) return;

  console.log("Initializing privacy policy...");
  await Models.PrivacyPolicy.insertMany([
    {
      attributes: [
        { name: "General", left: 1, right: 31 },
        { name: "Identifier", left: 2, right: 7 },
        { name: "UserId", left: 3, right: 4 },
        { name: "Name", left: 5, right: 6 },
        { name: "Generic", left: 7, right: 16 },
        { name: "Fitness", left: 8, right: 15 },
        { name: "Moverment", left: 9, right: 10 },
        { name: "Height", left: 11, right: 12 },
        { name: "Weight", left: 13, right: 14 },
        { name: "Sensitive", left: 17, right: 30 },
        { name: "Position", left: 18, right: 19 },
        { name: "Health", left: 20, right: 29 },
        { name: "Physical state", left: 21, right: 26 },
        { name: "Heart rate", left: 22, right: 23 },
        { name: "Blood pressure", left: 24, right: 25 },
        { name: "Psychological state", left: 27, right: 28 },
      ],
      purposes: [
        { name: "General", left: 1, right: 32 },
        { name: "Admin", left: 2, right: 7 },
        { name: "Profilling", left: 3, right: 4 },
        { name: "Analysis", left: 5, right: 6 },
        { name: "Purchase", left: 8, right: 9 },
        { name: "Shipping", left: 10, right: 11 },
        { name: "Maketing", left: 12, right: 31 },
        { name: "Direct", left: 13, right: 24 },
        { name: "DPhone", left: 14, right: 15 },
        { name: "DEmail", left: 16, right: 21 },
        { name: "Service updates", left: 17, right: 18 },
        { name: "Special offers", left: 19, right: 20 },
        { name: "DFax", left: 22, right: 23 },
        { name: "Third-party", left: 24, right: 30 },
        { name: "TEMail", left: 26, right: 27 },
        { name: "TPostal", left: 28, right: 29 },
      ],
    },
  ]);
  console.log("✓ Privacy policy initialized\n");
}

/**
 * Run all benchmarks with specified dataset size
 * @param {string} datasetSize - SMALL, MEDIUM, LARGE, XLARGE, XXLARGE
 * @param {string} outputDir - Output directory for results
 */
async function runCompleteBenchmarkSuite(datasetSize = "MEDIUM", outputDir = "./results") {
  console.log("\n" + "=".repeat(70));
  console.log("COMPREHENSIVE BENCHMARK SUITE FOR RESEARCH PAPER");
  console.log("=".repeat(70));
  console.log(`Dataset Size: ${datasetSize}`);
  console.log(`Output Directory: ${outputDir}`);
  console.log("=".repeat(70) + "\n");

  const collector = MetricsCollector.createCollector();

  // Ensure privacy policy exists
  await ensurePrivacyPolicy();

  // 1. Generate test dataset
  console.log("\n### STEP 1: Generating Test Dataset ###\n");
  const { users, apps } = await TestDataGenerator.generatePresetDataset(datasetSize, true);
  const datasetStats = await TestDataGenerator.getDatasetStats();
  TestDataGenerator.printDatasetStats(datasetStats);
  collector.addDatasetInfo(datasetStats);

  // 2. Collect system information
  console.log("\n### STEP 2: Collecting System Information ###\n");
  const systemInfo = ResourceMonitor.getSystemInfo();
  console.log(`Platform: ${systemInfo.platform} (${systemInfo.arch})`);
  console.log(`CPU: ${systemInfo.cpuModel} (${systemInfo.cpus} cores)`);
  console.log(`Memory: ${systemInfo.totalMemoryGB} GB`);
  console.log(`Node: ${systemInfo.nodeVersion}`);
  collector.addSystemInfo(systemInfo);

  // 3. Run latency benchmark
  console.log("\n### STEP 3: Running Latency Benchmark ###\n");
  const latencyResults = await LatencyBenchmark.runLatencyBenchmark(100);
  LatencyBenchmark.printLatencyResults(latencyResults);
  collector.addLatencyResults(latencyResults);

  // 4. Run throughput benchmark with increasing load
  console.log("\n### STEP 4: Running Throughput Benchmark ###\n");
  const userCounts = [10, 50, 100];
  if (datasetSize === "LARGE" || datasetSize === "XLARGE") {
    userCounts.push(200);
  }
  if (datasetSize === "XLARGE" || datasetSize === "XXLARGE") {
    userCounts.push(500);
  }

  const throughputResults = await ThroughputBenchmark.runScalabilityTest(
    userCounts,
    10,
    apps,
    users
  );
  ThroughputBenchmark.printThroughputResults(throughputResults);
  collector.addThroughputResults(throughputResults);

  // 5. Resource usage monitoring
  console.log("\n### STEP 5: Monitoring Resource Usage ###\n");
  console.log("Running workload with resource monitoring...");
  const { statistics } = await ResourceMonitor.monitorExecution(async () => {
    return await ThroughputBenchmark.measureThroughput(50, 20, apps, users);
  }, 500);
  ResourceMonitor.printResourceStats(statistics);
  collector.addResourceStats(statistics);

  // 6. Export results
  console.log("\n### STEP 6: Exporting Results ###\n");
  const exportedFiles = collector.export(`benchmark_${datasetSize}`, outputDir);

  console.log("\n" + "=".repeat(70));
  console.log("BENCHMARK SUITE COMPLETED");
  console.log("=".repeat(70));
  console.log(`\nResults saved to: ${outputDir}/`);
  console.log(`\nExported files:`);
  console.log(`  - JSON:    ${exportedFiles.json}`);
  console.log(`  - Summary: ${exportedFiles.summary}`);
  Object.entries(exportedFiles.csv).forEach(([type, path]) => {
    console.log(`  - CSV:     ${path}`);
  });
  console.log("\n");

  return collector.getData();
}

/**
 * Main execution
 */
async function main() {
  const datasetSize = process.argv[2] || "MEDIUM";
  const outputDir = process.argv[3] || "./results";

  try {
    await runCompleteBenchmarkSuite(datasetSize, outputDir);
    console.log("✓ All benchmarks completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("\n✗ Benchmark failed:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export default {
  runCompleteBenchmarkSuite,
};