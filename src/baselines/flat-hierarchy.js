/**
 * Baseline Implementation: Flat Hierarchy
 * Privacy evaluation without nested set model optimization
 * Uses simple array membership checks instead of hierarchical queries
 */

import Models from "../models";

/**
 * Check if attribute is allowed using flat array comparison (no nested set)
 * @param {Array} appAttributes - App attribute IDs
 * @param {Array} userAttributes - User privacy preference attribute IDs
 * @returns {Promise<boolean>} - True if all app attributes are in user's list
 */
async function evaluateAttributesFlat(appAttributes, userAttributes) {
  // Simple array membership check without hierarchy
  for (const appAttr of appAttributes) {
    const attrId = appAttr.toString();
    const found = userAttributes.some(userAttr => userAttr.toString() === attrId);
    if (!found) return false;
  }
  return true;
}

/**
 * Check if purpose is allowed using flat array comparison (no nested set)
 * @param {Array} appPurposes - App purpose IDs
 * @param {Array} userPurposes - User privacy preference purpose IDs
 * @returns {Promise<boolean>} - True if all app purposes are in user's list
 */
async function evaluatePurposesFlat(appPurposes, userPurposes) {
  // Simple array membership check without hierarchy
  for (const appPurpose of appPurposes) {
    const purposeId = appPurpose.toString();
    const found = userPurposes.some(userPurpose => userPurpose.toString() === purposeId);
    if (!found) return false;
  }
  return true;
}

/**
 * Evaluate privacy compliance using flat hierarchy (no nested set queries)
 * @param {Object} app - Application data
 * @param {Object} user - User privacy preferences
 * @returns {Promise<Object>} - Evaluation result
 */
export async function evaluateFlatHierarchy(app, user) {
  const startTime = process.hrtime.bigint();

  const { privacyPreference } = user;

  // Check attributes (allow, except, deny)
  const isAllowedAttrs = await evaluateAttributesFlat(
    app.attributes,
    privacyPreference.attributes
  );
  const isExceptedAttrs = await evaluateAttributesFlat(
    app.attributes,
    privacyPreference.exceptions || []
  );
  const isDeniedAttrs = await evaluateAttributesFlat(
    app.attributes,
    privacyPreference.denyAttributes || []
  );

  const attrsAccepted = isAllowedAttrs && !isExceptedAttrs && !isDeniedAttrs;

  // Check purposes (allow, except, deny)
  const isAllowedPurposes = await evaluatePurposesFlat(
    app.purposes,
    privacyPreference.allowedPurposes
  );
  const isExceptedPurposes = await evaluatePurposesFlat(
    app.purposes,
    privacyPreference.prohibitedPurposes || []
  );
  const isDeniedPurposes = await evaluatePurposesFlat(
    app.purposes,
    privacyPreference.denyPurposes || []
  );

  const purposesAccepted = isAllowedPurposes && !isExceptedPurposes && !isDeniedPurposes;

  // Check time of retention
  const timeAccepted = app.timeofRetention <= privacyPreference.timeofRetention;

  const isAccepted = attrsAccepted && purposesAccepted && timeAccepted;

  const endTime = process.hrtime.bigint();
  const latencyMs = Number(endTime - startTime) / 1_000_000;

  return {
    result: isAccepted ? "grant" : "deny",
    latencyMs,
    approach: "flat-hierarchy",
    details: {
      attrsAccepted,
      purposesAccepted,
      timeAccepted,
    },
  };
}

/**
 * Benchmark flat hierarchy approach
 * @param {number} count - Number of evaluations
 * @param {Object} app - Application data
 * @param {Object} user - User privacy preferences
 * @returns {Promise<Object>} - Benchmark results
 */
export async function benchmarkFlatHierarchy(count, app, user) {
  console.log(`\n=== FLAT HIERARCHY BASELINE (${count} evaluations) ===\n`);

  const latencies = [];
  let grantCount = 0;
  let denyCount = 0;

  const overallStart = process.hrtime.bigint();

  for (let i = 0; i < count; i++) {
    const result = await evaluateFlatHierarchy(app, user);
    latencies.push(result.latencyMs);
    if (result.result === "grant") grantCount++;
    else denyCount++;
  }

  const overallEnd = process.hrtime.bigint();
  const totalTimeMs = Number(overallEnd - overallStart) / 1_000_000;

  const sortedLatencies = [...latencies].sort((a, b) => a - b);
  const avgLatency = latencies.reduce((sum, l) => sum + l, 0) / latencies.length;

  return {
    approach: "flat-hierarchy",
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
  evaluateFlatHierarchy,
  benchmarkFlatHierarchy,
};