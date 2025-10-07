/**
 * Test Data Generator
 * Generates synthetic users and apps for benchmarking at various scales
 */

import Models from "../models";

/**
 * Get random elements from array
 * @param {Array} arr - Source array
 * @param {number} count - Number of elements to pick
 * @returns {Array} - Random elements
 */
function getRandomElements(arr, count) {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, arr.length));
}

/**
 * Generate synthetic users with varying privacy preferences
 * @param {number} count - Number of users to generate
 * @param {Object} privacyPolicy - Privacy policy with attributes and purposes
 * @returns {Promise<Array<Object>>} - Generated users
 */
export async function generateUsers(count, privacyPolicy = null) {
  if (!privacyPolicy) {
    privacyPolicy = await Models.PrivacyPolicy.findOne({});
  }

  if (!privacyPolicy) {
    throw new Error("Privacy policy not found. Run createPrivacyPolicy() first.");
  }

  const users = [];
  const attributes = privacyPolicy.attributes.filter(attr => attr.left > 1); // Exclude root "General"
  const purposes = privacyPolicy.purposes.filter(p => p.left > 1); // Exclude root "General"

  console.log(`Generating ${count} synthetic users...`);

  for (let i = 0; i < count; i++) {
    // Randomly select privacy preferences
    const allowedAttrCount = Math.floor(Math.random() * 5) + 1; // 1-5 attributes
    const exceptAttrCount = Math.floor(Math.random() * 2); // 0-1 exceptions
    const denyAttrCount = Math.floor(Math.random() * 2); // 0-1 denies

    const allowedPurposeCount = Math.floor(Math.random() * 5) + 1; // 1-5 purposes
    const exceptPurposeCount = Math.floor(Math.random() * 2); // 0-1 exceptions
    const denyPurposeCount = Math.floor(Math.random() * 2); // 0-1 denies

    const allowedAttributes = getRandomElements(attributes, allowedAttrCount).map(a => a._id);
    const exceptions = getRandomElements(attributes, exceptAttrCount).map(a => a._id);
    const denyAttributes = getRandomElements(attributes, denyAttrCount).map(a => a._id);

    const allowedPurposes = getRandomElements(purposes, allowedPurposeCount).map(p => p._id);
    const prohibitedPurposes = getRandomElements(purposes, exceptPurposeCount).map(p => p._id);
    const denyPurposes = getRandomElements(purposes, denyPurposeCount).map(p => p._id);

    // Random retention time: 100s to 10000s
    const timeofRetention = Math.floor(Math.random() * 9900) + 100;

    const user = {
      fullName: `User ${i + 1}`,
      privacyPreference: {
        attributes: allowedAttributes,
        exceptions,
        denyAttributes,
        allowedPurposes,
        prohibitedPurposes,
        denyPurposes,
        timeofRetention,
      },
    };

    users.push(user);
  }

  const createdUsers = await Models.User.insertMany(users);
  console.log(`✓ Generated ${createdUsers.length} users`);

  return createdUsers;
}

/**
 * Generate synthetic apps with varying attribute and purpose requirements
 * @param {number} count - Number of apps to generate
 * @param {Object} privacyPolicy - Privacy policy with attributes and purposes
 * @returns {Promise<Array<Object>>} - Generated apps
 */
export async function generateApps(count, privacyPolicy = null) {
  if (!privacyPolicy) {
    privacyPolicy = await Models.PrivacyPolicy.findOne({});
  }

  if (!privacyPolicy) {
    throw new Error("Privacy policy not found. Run createPrivacyPolicy() first.");
  }

  const apps = [];
  const attributes = privacyPolicy.attributes.filter(attr => attr.left > 1); // Exclude root "General"
  const purposes = privacyPolicy.purposes.filter(p => p.left > 1); // Exclude root "General"

  console.log(`Generating ${count} synthetic apps...`);

  for (let i = 0; i < count; i++) {
    // Randomly select app requirements
    const attrCount = Math.floor(Math.random() * 4) + 1; // 1-4 attributes
    const purposeCount = Math.floor(Math.random() * 4) + 1; // 1-4 purposes

    const appAttributes = getRandomElements(attributes, attrCount).map(a => a._id);
    const appPurposes = getRandomElements(purposes, purposeCount).map(p => p._id);

    // Random retention time: 50s to 5000s (apps typically request less than users allow)
    const timeofRetention = Math.floor(Math.random() * 4950) + 50;

    const app = {
      name: `App ${i + 1}`,
      attributes: appAttributes,
      purposes: appPurposes,
      timeofRetention,
    };

    apps.push(app);
  }

  const createdApps = await Models.App.insertMany(apps);
  console.log(`✓ Generated ${createdApps.length} apps`);

  return createdApps;
}

/**
 * Generate complete test dataset for a given scale
 * @param {Object} config - Configuration for test data
 * @param {number} config.userCount - Number of users
 * @param {number} config.appCount - Number of apps
 * @param {boolean} config.clearExisting - Clear existing test data
 * @returns {Promise<Object>} - Generated users and apps
 */
export async function generateTestDataset(config = {}) {
  const {
    userCount = 100,
    appCount = 20,
    clearExisting = true,
  } = config;

  console.log(`\n=== GENERATING TEST DATASET ===`);
  console.log(`Users: ${userCount}, Apps: ${appCount}\n`);

  // Load privacy policy
  const privacyPolicy = await Models.PrivacyPolicy.findOne({});
  if (!privacyPolicy) {
    throw new Error("Privacy policy not found. Run createPrivacyPolicy() first.");
  }

  // Clear existing test data if requested
  if (clearExisting) {
    console.log("Clearing existing test data...");
    await Models.User.deleteMany({});
    await Models.App.deleteMany({});
    await Models.EvaluateHash.deleteMany({});
    console.log("✓ Cleared existing data\n");
  }

  // Generate data
  const users = await generateUsers(userCount, privacyPolicy);
  const apps = await generateApps(appCount, privacyPolicy);

  console.log(`\n✓ Test dataset generated successfully!`);
  console.log(`  - ${users.length} users`);
  console.log(`  - ${apps.length} apps`);
  console.log(`  - ${users.length * apps.length} possible user-app combinations\n`);

  return { users, apps, privacyPolicy };
}

/**
 * Generate predefined test datasets for common benchmark scales
 */
export const DATASET_PRESETS = {
  SMALL: { userCount: 10, appCount: 5 },
  MEDIUM: { userCount: 50, appCount: 10 },
  LARGE: { userCount: 100, appCount: 20 },
  XLARGE: { userCount: 500, appCount: 50 },
  XXLARGE: { userCount: 1000, appCount: 100 },
};

/**
 * Generate a preset test dataset
 * @param {string} presetName - Name of the preset (SMALL, MEDIUM, LARGE, etc.)
 * @param {boolean} clearExisting - Clear existing test data
 * @returns {Promise<Object>} - Generated users and apps
 */
export async function generatePresetDataset(presetName = "MEDIUM", clearExisting = true) {
  const preset = DATASET_PRESETS[presetName.toUpperCase()];
  if (!preset) {
    throw new Error(
      `Unknown preset: ${presetName}. Available presets: ${Object.keys(DATASET_PRESETS).join(", ")}`
    );
  }

  console.log(`\n=== GENERATING PRESET: ${presetName.toUpperCase()} ===`);
  return generateTestDataset({ ...preset, clearExisting });
}

/**
 * Get statistics about current test data
 * @returns {Promise<Object>} - Data statistics
 */
export async function getDatasetStats() {
  const userCount = await Models.User.countDocuments();
  const appCount = await Models.App.countDocuments();
  const cacheEntries = await Models.EvaluateHash.countDocuments();

  const privacyPolicy = await Models.PrivacyPolicy.findOne({});
  const attributeCount = privacyPolicy ? privacyPolicy.attributes.length : 0;
  const purposeCount = privacyPolicy ? privacyPolicy.purposes.length : 0;

  return {
    users: userCount,
    apps: appCount,
    cacheEntries,
    attributes: attributeCount,
    purposes: purposeCount,
    possibleCombinations: userCount * appCount,
  };
}

/**
 * Print dataset statistics
 * @param {Object} stats - Dataset statistics
 */
export function printDatasetStats(stats) {
  console.log("\n=== DATASET STATISTICS ===\n");
  console.log(`Users:                    ${stats.users}`);
  console.log(`Apps:                     ${stats.apps}`);
  console.log(`Cache Entries:            ${stats.cacheEntries}`);
  console.log(`Privacy Attributes:       ${stats.attributes}`);
  console.log(`Privacy Purposes:         ${stats.purposes}`);
  console.log(`Possible Combinations:    ${stats.possibleCombinations}`);
  console.log("\n");
}

export default {
  generateUsers,
  generateApps,
  generateTestDataset,
  generatePresetDataset,
  getDatasetStats,
  printDatasetStats,
  DATASET_PRESETS,
};