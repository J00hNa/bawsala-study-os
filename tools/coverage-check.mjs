import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = process.cwd();
const coverageDir = path.join(root, 'coverage', 'v8');
fs.rmSync(coverageDir, { recursive: true, force: true });
fs.mkdirSync(coverageDir, { recursive: true });

function runScript(name) {
  const command = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const result = spawnSync(command, ['run', name], {
    cwd: root,
    env: { ...process.env, NODE_V8_COVERAGE: coverageDir },
    stdio: 'inherit'
  });
  if (result.status !== 0) process.exit(result.status || 1);
}

runScript('test:unit');
runScript('test:integration');

const rangesByFile = new Map();
for (const name of fs.readdirSync(coverageDir).filter(item => item.endsWith('.json'))) {
  let report;
  try { report = JSON.parse(fs.readFileSync(path.join(coverageDir, name), 'utf8')); }
  catch (_) { continue; }
  for (const script of report.result || []) {
    if (!script.url?.startsWith('file:')) continue;
    let filename;
    try { filename = fileURLToPath(script.url); } catch (_) { continue; }
    const relative = path.relative(root, filename).replaceAll('\\', '/');
    if (relative === 'server.js' || relative.startsWith('lib/')) {
      const list = rangesByFile.get(relative) || [];
      for (const fn of script.functions || []) {
        for (const range of fn.ranges || []) {
          if (range.endOffset > range.startOffset) list.push([range.startOffset, range.endOffset, range.count]);
        }
      }
      rangesByFile.set(relative, list);
    }
  }
}

function effectiveCoveredLength(ranges, max) {
  const normalized = ranges
    .map(([start, end, count]) => [Math.max(0, Math.min(max, start)), Math.max(0, Math.min(max, end)), Number(count || 0)])
    .filter(([start, end]) => end > start);
  const boundaries = [...new Set([0, max, ...normalized.flatMap(([start, end]) => [start, end])])].sort((a, b) => a - b);
  let covered = 0;
  for (let index = 0; index < boundaries.length - 1; index += 1) {
    const start = boundaries[index];
    const end = boundaries[index + 1];
    if (end <= start) continue;
    const active = normalized.filter(([rangeStart, rangeEnd]) => rangeStart <= start && rangeEnd >= end);
    if (!active.length) continue;
    active.sort((a, b) => (a[1] - a[0]) - (b[1] - b[0]));
    if (active[0][2] > 0) covered += end - start;
  }
  return covered;
}


const sourceFiles = [
  'server.js',
  ...fs.readdirSync(path.join(root, 'lib')).filter(name => name.endsWith('.js')).map(name => `lib/${name}`)
];
let coveredTotal = 0;
let bytesTotal = 0;
let libCovered = 0;
let libBytes = 0;
const rows = [];
for (const relative of sourceFiles) {
  const source = fs.readFileSync(path.join(root, relative));
  const bytes = source.length;
  const covered = effectiveCoveredLength(rangesByFile.get(relative) || [], bytes);
  const percent = bytes ? covered / bytes * 100 : 100;
  rows.push({ relative, bytes, covered, percent });
  coveredTotal += covered;
  bytesTotal += bytes;
  if (relative.startsWith('lib/')) { libCovered += covered; libBytes += bytes; }
}
const overall = bytesTotal ? coveredTotal / bytesTotal * 100 : 0;
const libs = libBytes ? libCovered / libBytes * 100 : 0;
const serverRow = rows.find(row => row.relative === 'server.js');

const summary = {
  generatedAt: new Date().toISOString(),
  method: 'V8 byte-range coverage across unit and integration suites',
  thresholds: { overall: 35, server: 25, libraries: 50 },
  overallPercent: Number(overall.toFixed(2)),
  serverPercent: Number((serverRow?.percent || 0).toFixed(2)),
  librariesPercent: Number(libs.toFixed(2)),
  files: rows.map(row => ({ file: row.relative, percent: Number(row.percent.toFixed(2)), coveredBytes: row.covered, totalBytes: row.bytes }))
};
fs.writeFileSync(path.join(root, 'coverage', 'summary.json'), JSON.stringify(summary, null, 2));

const failures = [];
if (overall < summary.thresholds.overall) failures.push(`overall ${overall.toFixed(1)}% < ${summary.thresholds.overall}%`);
if ((serverRow?.percent || 0) < summary.thresholds.server) failures.push(`server ${serverRow?.percent.toFixed(1) || 0}% < ${summary.thresholds.server}%`);
if (libs < summary.thresholds.libraries) failures.push(`libraries ${libs.toFixed(1)}% < ${summary.thresholds.libraries}%`);
const unexecutedCritical = ['lib/network-security.js', 'lib/timezone.js', 'lib/snapshot-schema.js'].filter(file => (rows.find(row => row.relative === file)?.percent || 0) < 20);
if (unexecutedCritical.length) failures.push(`critical modules below 20%: ${unexecutedCritical.join(', ')}`);

if (failures.length) {
  console.error(`Coverage gate failed: ${failures.join('; ')}`);
  console.error('Per-file coverage:', rows.map(row => `${row.relative}=${row.percent.toFixed(1)}%`).join(', '));
  process.exit(1);
}
console.log(`OK: coverage gate passed (overall ${overall.toFixed(1)}%, server ${serverRow.percent.toFixed(1)}%, libraries ${libs.toFixed(1)}%).`);
