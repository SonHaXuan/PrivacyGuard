/**
 * Quick Test Data Generator
 * Generates minimal test data for fog benchmarks
 */

import dotenv from "dotenv";
dotenv.config();
import "../services/mongoose.js";
import Models from "../models/index.js";

async function generateTestData() {
  console.log("Generating test data...\n");

  // Check if policy exists
  let policy = await Models.PrivacyPolicy.findOne();

  if (!policy) {
    console.log("Creating privacy policy...");
    // Create simple privacy policy with nested set model
    policy = await Models.PrivacyPolicy.create({
      attributes: [
        { _id: "attr1", name: "Location", left: 1, right: 6 },
        { _id: "attr2", name: "GPS", left: 2, right: 3, parent: "attr1" },
        { _id: "attr3", name: "IP Address", left: 4, right: 5, parent: "attr1" },
        { _id: "attr4", name: "Contact", left: 7, right: 10 },
        { _id: "attr5", name: "Email", left: 8, right: 9, parent: "attr4" },
      ],
      purposes: [
        { _id: "purp1", name: "Marketing", left: 1, right: 4 },
        { _id: "purp2", name: "Advertising", left: 2, right: 3, parent: "purp1" },
        { _id: "purp3", name: "Analytics", left: 5, right: 6 },
      ],
    });
    console.log("✓ Privacy policy created");
  }

  // Create users
  const userCount = await Models.User.countDocuments();
  if (userCount < 10) {
    console.log("Creating users...");
    for (let i = 0; i < 10; i++) {
      await Models.User.create({
        fullName: `Test User ${i}`,
        privacyPreference: {
          allowedAttributes: ["attr1", "attr2"],
          allowedPurposes: ["purp3"],
          exceptAttributes: [],
          exceptPurposes: [],
          deniedAttributes: ["attr4"],
          deniedPurposes: ["purp1"],
          timeofRetention: 3600,
        },
      });
    }
    console.log("✓ 10 users created");
  }

  // Create apps
  const appCount = await Models.App.countDocuments();
  if (appCount < 10) {
    console.log("Creating apps...");
    for (let i = 0; i < 10; i++) {
      await Models.App.create({
        name: `Test App ${i}`,
        attributes: ["attr2"],
        purposes: ["purp3"],
        timeofRetention: 1800,
      });
    }
    console.log("✓ 10 apps created");
  }

  console.log("\n✅ Test data ready\n");

  const users = await Models.User.countDocuments();
  const apps = await Models.App.countDocuments();
  console.log(`Users: ${users}`);
  console.log(`Apps: ${apps}`);
}

generateTestData()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });
