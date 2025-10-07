/**
 * Quick test to verify benchmark workflow
 */

require("dotenv").config();
require("./src/services/mongoose");

async function test() {
  console.log("\n=== Testing Benchmark Workflow ===\n");

  try {
    // Import modules
    console.log("1. Importing modules...");
    const Models = require("./src/models").default;
    const TestDataGenerator = require("./src/generators/test-data-generator").default;
    const LatencyBenchmark = require("./src/benchmarks/latency-benchmark").default;
    console.log("✓ Modules imported successfully\n");

    // Check database connection
    console.log("2. Checking database connection...");
    const mongoose = require("mongoose");
    if (mongoose.connection.readyState === 1) {
      console.log("✓ MongoDB connected\n");
    } else {
      console.log("⚠ Waiting for MongoDB connection...");
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Initialize privacy policy
    console.log("3. Initializing privacy policy...");
    const hasPolicy = await Models.PrivacyPolicy.findOne({});
    if (!hasPolicy) {
      await Models.PrivacyPolicy.insertMany([{
        attributes: [
          { name: "General", left: 1, right: 31 },
          { name: "Identifier", left: 2, right: 7 },
          { name: "UserId", left: 3, right: 4 },
          { name: "Name", left: 5, right: 6 },
          { name: "Generic", left: 7, right: 16 },
          { name: "Fitness", left: 8, right: 15 },
          { name: "Movement", left: 9, right: 10 },
          { name: "Height", left: 11, right: 12 },
        ],
        purposes: [
          { name: "General", left: 1, right: 32 },
          { name: "Admin", left: 2, right: 7 },
          { name: "Marketing", left: 12, right: 31 },
        ],
      }]);
      console.log("✓ Privacy policy created\n");
    } else {
      console.log("✓ Privacy policy already exists\n");
    }

    // Generate test data (small scale for quick test)
    console.log("4. Generating test data (5 users, 2 apps)...");
    await Models.User.deleteMany({});
    await Models.App.deleteMany({});
    await Models.EvaluateHash.deleteMany({});

    const { users, apps } = await TestDataGenerator.generateTestDataset({
      userCount: 5,
      appCount: 2,
      clearExisting: false
    });
    console.log(`✓ Generated ${users.length} users and ${apps.length} apps\n`);

    // Run quick latency test (10 iterations)
    console.log("5. Running latency benchmark (10 iterations)...");
    const stats = await LatencyBenchmark.runLatencyBenchmark(10);
    console.log("\n=== Quick Results ===");
    console.log(`Cache Hit (mean):   ${stats.cacheHit.mean.toFixed(3)} ms`);
    console.log(`Cache Miss (mean):  ${stats.cacheMiss.mean.toFixed(3)} ms`);
    console.log(`Speedup Factor:     ${stats.speedupFactor.toFixed(2)}x`);
    console.log("\n✓ Latency benchmark completed\n");

    // Test metrics export
    console.log("6. Testing metrics export...");
    const MetricsCollector = require("./src/metrics/collector").default;
    const testResults = {
      latency: stats,
      systemInfo: {
        platform: process.platform,
        nodeVersion: process.version,
      },
      dataset: {
        users: users.length,
        apps: apps.length,
      }
    };

    MetricsCollector.exportToJSON(testResults, "test-results", "./results");
    console.log("✓ Metrics export working\n");

    console.log("=".repeat(50));
    console.log("🎉 ALL TESTS PASSED! Workflow is working correctly.");
    console.log("=".repeat(50));
    console.log("\nYou can now run the full benchmarks:");
    console.log("  npm run benchmark MEDIUM");
    console.log("  npm run comparative");
    console.log("\n");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ TEST FAILED:");
    console.error(error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

test();