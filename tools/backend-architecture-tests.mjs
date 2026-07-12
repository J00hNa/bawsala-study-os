import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { EventEmitter } from 'node:events';

const require = createRequire(import.meta.url);
const apiContract = require('../lib/api-contract.js');
const apiErrors = require('../lib/api-errors.js');
const { clampInteger, parsePagination, paginate } = require('../lib/pagination.js');
const { createRuntimeMetrics } = require('../lib/runtime-metrics.js');

function testApiContract(){
  const ids = apiContract.ROUTES.map(route => route.id);
  assert.equal(new Set(ids).size, ids.length, 'API route IDs must be unique.');
  assert.ok(ids.length >= 50, 'The central API contract unexpectedly lost routes.');

  const health = apiContract.resolve('/api/health', 'GET');
  assert.equal(health.found, true);
  assert.equal(health.methodAllowed, true);
  assert.equal(health.route.id, 'health.full');

  const dynamic = apiContract.resolve('/api/calendar/events/event_123', 'PATCH');
  assert.equal(dynamic.methodAllowed, true);
  assert.equal(dynamic.route.id, 'calendar.event');

  const wrongMethod = apiContract.resolve('/api/auth/signup', 'GET');
  assert.equal(wrongMethod.found, true);
  assert.equal(wrongMethod.methodAllowed, false);
  assert.deepEqual(wrongMethod.allowed, ['POST']);

  const billingRead = apiContract.resolve('/api/billing/status', 'GET');
  assert.equal(billingRead.route.category, 'payment-read');
  const webhook = apiContract.resolve('/api/billing/webhook', 'POST');
  assert.equal(webhook.route.category, 'payment-webhook');

  assert.equal(apiContract.resolve('/api/integrations/google-calendar/connect', 'GET').route.id, 'integration.google-calendar.connect');
  assert.equal(apiContract.resolve('/api/integrations/google-calendar', 'DELETE').route.id, 'integration.google-calendar.disconnect');

  const options = apiContract.resolve('/api/billing/checkout', 'OPTIONS');
  assert.equal(options.methodAllowed, true);
  assert.ok(options.allowed.includes('POST'));
  assert.ok(options.allowed.includes('OPTIONS'));

  const missing = apiContract.resolve('/api/definitely-missing', 'GET');
  assert.equal(missing.found, false);
  assert.deepEqual(missing.allowed, []);

  const published = apiContract.publicContract();
  assert.equal(published.length, apiContract.ROUTES.length);
  assert.ok(published.every(route => route.id && route.category && route.methods.length));
}


function testApiErrors(){
  const rateLimited = apiErrors.normalize(Object.assign(new Error('RATE_LIMITED'), { status: 429 }));
  assert.equal(rateLimited.code, 'RATE_LIMITED');
  assert.equal(rateLimited.retryable, true);
  assert.match(rateLimited.message, /طلبات كثيرة/);

  const internal = apiErrors.normalize(new Error('database password leaked in stack'));
  assert.equal(internal.code, 'SERVER_ERROR');
  assert.equal(internal.retryable, true);
  assert.ok(!internal.message.includes('database'));

  const unknownClient = apiErrors.normalize(Object.assign(new Error('SOME_NEW_CODE'), { status: 400 }));
  assert.equal(unknownClient.code, 'SOME_NEW_CODE');
  assert.equal(unknownClient.retryable, false);
}

function testPagination(){
  assert.equal(clampInteger('500', 1, 100, 10), 100);
  assert.equal(clampInteger('-5', 1, 100, 10), 1);
  assert.equal(clampInteger('bad', 1, 100, 10), 10);

  const params = new URLSearchParams('page=3&limit=5000');
  assert.deepEqual(parsePagination(params, { defaultLimit: 25, maxLimit: 200 }), { page: 3, limit: 200, offset: 400 });

  const first = paginate(['a','b','c','d','e'], { page: 1, limit: 2 });
  assert.deepEqual(first.items, ['a','b']);
  assert.deepEqual(first.pagination, { page: 1, limit: 2, total: 5, pageCount: 3, hasPrevious: false, hasNext: true });

  const clamped = paginate(['a','b','c'], { page: 999, limit: 2 });
  assert.deepEqual(clamped.items, ['c']);
  assert.equal(clamped.pagination.page, 2);
  assert.equal(clamped.pagination.hasPrevious, true);
  assert.equal(clamped.pagination.hasNext, false);

  const empty = paginate([], { page: 7, limit: 20 });
  assert.deepEqual(empty.items, []);
  assert.equal(empty.pagination.page, 1);
  assert.equal(empty.pagination.pageCount, 1);
}

class FakeResponse extends EventEmitter {
  constructor(){
    super();
    this.statusCode = 200;
    this.headers = new Map();
  }
  hasHeader(name){ return this.headers.has(String(name).toLowerCase()); }
  setHeader(name, value){ this.headers.set(String(name).toLowerCase(), String(value)); }
  getHeader(name){ return this.headers.get(String(name).toLowerCase()); }
  writeHead(status){ this.statusCode = Number(status); return this; }
  write(){ return true; }
  end(){ this.emit('finish'); return this; }
}

async function testRuntimeMetrics(){
  const metrics = createRuntimeMetrics({ maxSamples: 2, maxRecent: 2, slowRequestMs: 0 });

  for(const [index, status] of [200, 503, 200].entries()){
    const req = { method: index === 1 ? 'POST' : 'GET', url: '/api/test', routeId: index === 1 ? 'test.failure' : 'test.success', requestId: `req_${index}` };
    const res = new FakeResponse();
    metrics.begin(req, res);
    res.statusCode = status;
    res.write('abc');
    res.writeHead(status);
    res.end('def');
    assert.match(res.getHeader('server-timing'), /^app;dur=/);
    assert.match(res.getHeader('x-response-time'), /ms$/);
  }

  const snapshot = metrics.snapshot({ includeRecent: true });
  assert.equal(snapshot.activeRequests, 0);
  assert.equal(snapshot.totalRequests, 3);
  assert.equal(snapshot.totalErrors, 1);
  assert.equal(snapshot.bytesSent, 18);
  assert.equal(snapshot.latencyMs.sampleSize, 2, 'Sample retention must respect maxSamples.');
  assert.equal(snapshot.recent.length, 2, 'Recent request retention must respect maxRecent.');
  assert.equal(snapshot.routes.find(route => route.route === 'test.failure')?.errors, 1);
  assert.equal(snapshot.routes.find(route => route.route === 'test.success')?.count, 2);
  assert.equal(snapshot.slowRequests, 3);
}

try{
  testApiContract();
  testApiErrors();
  testPagination();
  await testRuntimeMetrics();
  console.log('OK: backend architecture tests passed.');
}catch(error){
  console.error(error);
  process.exitCode = 1;
}
