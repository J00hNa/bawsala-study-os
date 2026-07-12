'use strict';

const { monitorEventLoopDelay } = require('node:perf_hooks');

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index];
}

function createRuntimeMetrics({ maxSamples = 500, maxRecent = 80, slowRequestMs = 750 } = {}) {
  const startedAt = Date.now();
  const eventLoop = monitorEventLoopDelay({ resolution: 20 });
  eventLoop.enable();
  const samples = [];
  const recent = [];
  const byRoute = new Map();
  let activeRequests = 0;
  let totalRequests = 0;
  let totalErrors = 0;
  let slowRequests = 0;
  let bytesSent = 0;

  function begin(req, res) {
    const start = process.hrtime.bigint();
    activeRequests += 1;
    totalRequests += 1;
    let responseBytes = 0;
    let completed = false;

    const originalWriteHead = res.writeHead;
    const originalWrite = res.write;
    const originalEnd = res.end;
    res.writeHead = function wrappedWriteHead(...args) {
      const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
      if (!this.hasHeader('Server-Timing')) this.setHeader('Server-Timing', `app;dur=${durationMs.toFixed(1)}`);
      if (!this.hasHeader('X-Response-Time')) this.setHeader('X-Response-Time', `${durationMs.toFixed(1)}ms`);
      return originalWriteHead.apply(this, args);
    };
    res.write = function wrappedWrite(chunk, encoding, callback) {
      if (chunk) responseBytes += Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(String(chunk), encoding);
      return originalWrite.call(this, chunk, encoding, callback);
    };
    res.end = function wrappedEnd(chunk, encoding, callback) {
      if (chunk) responseBytes += Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(String(chunk), encoding);
      return originalEnd.call(this, chunk, encoding, callback);
    };

    const finish = () => {
      if (completed) return;
      completed = true;
      activeRequests = Math.max(0, activeRequests - 1);
      const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
      const status = Number(res.statusCode || 0);
      const route = req.routeId || (String(req.url || '').startsWith('/api/') ? 'api.unmatched' : 'static');
      const method = String(req.method || 'GET').toUpperCase();
      const failed = status >= 500;
      const slow = durationMs >= slowRequestMs;
      if (failed) totalErrors += 1;
      if (slow) slowRequests += 1;
      bytesSent += responseBytes;
      samples.push(durationMs);
      if (samples.length > maxSamples) samples.splice(0, samples.length - maxSamples);
      const routeStats = byRoute.get(route) || { route, count: 0, errors: 0, slow: 0, totalMs: 0, maxMs: 0, bytes: 0 };
      routeStats.count += 1;
      routeStats.errors += failed ? 1 : 0;
      routeStats.slow += slow ? 1 : 0;
      routeStats.totalMs += durationMs;
      routeStats.maxMs = Math.max(routeStats.maxMs, durationMs);
      routeStats.bytes += responseBytes;
      byRoute.set(route, routeStats);
      recent.unshift({
        at: new Date().toISOString(),
        requestId: req.requestId || '',
        route,
        method,
        status,
        durationMs: Math.round(durationMs * 10) / 10,
        bytes: responseBytes,
        slow
      });
      if (recent.length > maxRecent) recent.length = maxRecent;
    };

    res.once('finish', finish);
    res.once('close', finish);
  }

  function snapshot({ includeRecent = false } = {}) {
    const sorted = [...samples].sort((a, b) => a - b);
    const routes = [...byRoute.values()]
      .map(item => ({
        route: item.route,
        count: item.count,
        errors: item.errors,
        slow: item.slow,
        averageMs: Math.round((item.totalMs / Math.max(1, item.count)) * 10) / 10,
        maxMs: Math.round(item.maxMs * 10) / 10,
        bytes: item.bytes
      }))
      .sort((a, b) => b.count - a.count || b.averageMs - a.averageMs);
    const payload = {
      startedAt: new Date(startedAt).toISOString(),
      uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
      activeRequests,
      totalRequests,
      totalErrors,
      errorRate: totalRequests ? Math.round((totalErrors / totalRequests) * 10000) / 100 : 0,
      slowRequests,
      bytesSent,
      latencyMs: {
        sampleSize: sorted.length,
        average: sorted.length ? Math.round((sorted.reduce((sum, n) => sum + n, 0) / sorted.length) * 10) / 10 : 0,
        p50: Math.round(percentile(sorted, 50) * 10) / 10,
        p95: Math.round(percentile(sorted, 95) * 10) / 10,
        p99: Math.round(percentile(sorted, 99) * 10) / 10,
        max: sorted.length ? Math.round(sorted[sorted.length - 1] * 10) / 10 : 0
      },
      eventLoopLagMs: {
        p50: Math.round((Number(eventLoop.percentile(50)) / 1e6) * 10) / 10,
        p95: Math.round((Number(eventLoop.percentile(95)) / 1e6) * 10) / 10,
        p99: Math.round((Number(eventLoop.percentile(99)) / 1e6) * 10) / 10,
        max: Math.round((Number(eventLoop.max || 0) / 1e6) * 10) / 10
      },
      routes
    };
    if (includeRecent) payload.recent = recent.slice();
    return payload;
  }

  return { begin, snapshot, activeRequests: () => activeRequests, close: () => eventLoop.disable() };
}

module.exports = { createRuntimeMetrics };
