/**
 * Resource Monitor
 * Tracks CPU, memory, and database resource utilization during benchmarks
 */

import os from "os";

/**
 * Get current CPU usage
 * @returns {Promise<number>} - CPU usage percentage
 */
export async function getCPUUsage() {
  const startUsage = process.cpuUsage();
  const startTime = process.hrtime();

  await new Promise((resolve) => setTimeout(resolve, 100));

  const endUsage = process.cpuUsage(startUsage);
  const endTime = process.hrtime(startTime);

  const elapsedTimeMs = endTime[0] * 1000 + endTime[1] / 1_000_000;
  const elapsedCPUTimeMs = (endUsage.user + endUsage.system) / 1000;

  return (elapsedCPUTimeMs / elapsedTimeMs) * 100;
}

/**
 * Get current memory usage
 * @returns {Object} - Memory usage statistics
 */
export function getMemoryUsage() {
  const memUsage = process.memoryUsage();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;

  return {
    processHeapUsedMB: (memUsage.heapUsed / 1024 / 1024).toFixed(2),
    processHeapTotalMB: (memUsage.heapTotal / 1024 / 1024).toFixed(2),
    processRssMB: (memUsage.rss / 1024 / 1024).toFixed(2),
    systemUsedMB: (usedMem / 1024 / 1024).toFixed(2),
    systemTotalMB: (totalMem / 1024 / 1024).toFixed(2),
    systemUsagePercent: ((usedMem / totalMem) * 100).toFixed(2),
  };
}

/**
 * Get system information
 * @returns {Object} - System specs
 */
export function getSystemInfo() {
  return {
    platform: os.platform(),
    arch: os.arch(),
    cpus: os.cpus().length,
    cpuModel: os.cpus()[0].model,
    totalMemoryGB: (os.totalmem() / 1024 / 1024 / 1024).toFixed(2),
    nodeVersion: process.version,
  };
}

/**
 * Monitor resources during a function execution
 * @param {Function} fn - Async function to monitor
 * @param {number} sampleIntervalMs - Sampling interval in milliseconds
 * @returns {Promise<Object>} - Function result and resource metrics
 */
export async function monitorExecution(fn, sampleIntervalMs = 1000) {
  const samples = [];
  let monitoring = true;

  // Start monitoring in background
  const monitoringTask = (async () => {
    while (monitoring) {
      const cpuUsage = await getCPUUsage();
      const memUsage = getMemoryUsage();
      samples.push({
        timestamp: Date.now(),
        cpuPercent: cpuUsage,
        heapUsedMB: parseFloat(memUsage.processHeapUsedMB),
        rssMB: parseFloat(memUsage.processRssMB),
      });
      await new Promise((resolve) => setTimeout(resolve, sampleIntervalMs));
    }
  })();

  // Execute function
  const startTime = Date.now();
  const result = await fn();
  const endTime = Date.now();
  const durationMs = endTime - startTime;

  // Stop monitoring
  monitoring = false;
  await monitoringTask;

  // Calculate statistics
  const cpuSamples = samples.map((s) => s.cpuPercent);
  const heapSamples = samples.map((s) => s.heapUsedMB);
  const rssSamples = samples.map((s) => s.rssMB);

  const avgCPU = cpuSamples.reduce((sum, val) => sum + val, 0) / cpuSamples.length;
  const maxCPU = Math.max(...cpuSamples);
  const avgHeap = heapSamples.reduce((sum, val) => sum + val, 0) / heapSamples.length;
  const maxHeap = Math.max(...heapSamples);
  const avgRSS = rssSamples.reduce((sum, val) => sum + val, 0) / rssSamples.length;
  const maxRSS = Math.max(...rssSamples);

  return {
    result,
    durationMs,
    samples,
    statistics: {
      avgCPUPercent: avgCPU.toFixed(2),
      maxCPUPercent: maxCPU.toFixed(2),
      avgHeapUsedMB: avgHeap.toFixed(2),
      maxHeapUsedMB: maxHeap.toFixed(2),
      avgRssMB: avgRSS.toFixed(2),
      maxRssMB: maxRSS.toFixed(2),
      sampleCount: samples.length,
    },
  };
}

/**
 * Print resource usage in table format
 * @param {Object} stats - Resource statistics
 */
export function printResourceStats(stats) {
  console.log("\n=== RESOURCE USAGE STATISTICS ===\n");
  console.log("Metric                    | Average      | Peak");
  console.log("--------------------------|--------------|-------------");
  console.log(
    `CPU Usage                 | ${stats.avgCPUPercent.padStart(12)}% | ${stats.maxCPUPercent.padStart(11)}%`
  );
  console.log(
    `Heap Memory               | ${stats.avgHeapUsedMB.padStart(10)} MB | ${stats.maxHeapUsedMB.padStart(9)} MB`
  );
  console.log(
    `RSS Memory                | ${stats.avgRssMB.padStart(10)} MB | ${stats.maxRssMB.padStart(9)} MB`
  );
  console.log(`\nSample Count: ${stats.sampleCount}`);
  console.log("\n");
}

/**
 * Create a resource snapshot
 * @returns {Object} - Current resource snapshot
 */
export function createSnapshot() {
  const mem = getMemoryUsage();
  return {
    timestamp: new Date().toISOString(),
    memory: mem,
    uptime: process.uptime(),
  };
}

export default {
  getCPUUsage,
  getMemoryUsage,
  getSystemInfo,
  monitorExecution,
  printResourceStats,
  createSnapshot,
};