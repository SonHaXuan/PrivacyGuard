/**
 * Network Latency Simulator for Fog Computing
 * Simulates realistic network delays across IoT → Edge → Fog → Cloud tiers
 */

/**
 * Network Latency Configuration (in milliseconds)
 * Based on typical fog computing architectures:
 * - IoT → Edge: Very low latency (WiFi/Bluetooth range)
 * - Edge → Fog: Low latency (LAN/metro network)
 * - Fog → Cloud: Medium latency (WAN/internet)
 */
const LATENCY_CONFIG = {
  // IoT Device to Edge Node (WiFi, Bluetooth, Zigbee)
  IOT_TO_EDGE: {
    min: 1,      // Minimum latency (ms)
    max: 5,      // Maximum latency (ms)
    mean: 2.5,   // Average latency (ms)
    jitter: 1,   // Network jitter (ms)
  },

  // Edge Node to Fog Node (LAN, Metro Ethernet)
  EDGE_TO_FOG: {
    min: 5,
    max: 15,
    mean: 10,
    jitter: 3,
  },

  // Fog Node to Cloud (WAN, Internet)
  FOG_TO_CLOUD: {
    min: 20,
    max: 100,
    mean: 50,
    jitter: 15,
  },

  // Direct IoT to Cloud (for comparison - bypassing edge/fog)
  IOT_TO_CLOUD: {
    min: 30,
    max: 150,
    mean: 80,
    jitter: 25,
  },
};

/**
 * Simulates network latency with realistic variation
 * Uses normal distribution with jitter for realistic modeling
 *
 * @param {Object} config - Latency configuration
 * @returns {Promise<number>} - Actual latency in milliseconds
 */
async function simulateLatency(config) {
  const startTime = process.hrtime.bigint();

  // Generate latency using normal distribution
  const randomFactor = Math.random() - 0.5; // -0.5 to 0.5
  const jitterComponent = randomFactor * config.jitter;
  const latency = Math.max(
    config.min,
    Math.min(config.max, config.mean + jitterComponent)
  );

  // Actual sleep to simulate network delay
  await sleep(latency);

  const endTime = process.hrtime.bigint();
  const actualLatency = Number(endTime - startTime) / 1_000_000;

  return actualLatency;
}

/**
 * Sleep utility
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Simulate IoT → Edge latency
 */
async function iotToEdge() {
  return simulateLatency(LATENCY_CONFIG.IOT_TO_EDGE);
}

/**
 * Simulate Edge → Fog latency
 */
async function edgeToFog() {
  return simulateLatency(LATENCY_CONFIG.EDGE_TO_FOG);
}

/**
 * Simulate Fog → Cloud latency
 */
async function fogToCloud() {
  return simulateLatency(LATENCY_CONFIG.FOG_TO_CLOUD);
}

/**
 * Simulate direct IoT → Cloud latency (no fog)
 */
async function iotToCloud() {
  return simulateLatency(LATENCY_CONFIG.IOT_TO_CLOUD);
}

/**
 * Simulate complete IoT → Edge → Fog → Cloud path
 * Returns breakdown of each hop
 */
async function simulateCompletePath() {
  const iotEdgeLatency = await iotToEdge();
  const edgeFogLatency = await edgeToFog();
  const fogCloudLatency = await fogToCloud();

  return {
    iotToEdge: iotEdgeLatency,
    edgeToFog: edgeFogLatency,
    fogToCloud: fogCloudLatency,
    total: iotEdgeLatency + edgeFogLatency + fogCloudLatency,
  };
}

/**
 * Get latency configuration for inspection
 */
function getConfig() {
  return LATENCY_CONFIG;
}

export default {
  iotToEdge,
  edgeToFog,
  fogToCloud,
  iotToCloud,
  simulateCompletePath,
  getConfig,
  LATENCY_CONFIG,
};
