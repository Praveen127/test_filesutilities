// Runs every browser test suite and prints one summary.   npm run test:browser
import { spawnSync } from 'node:child_process';
import path from 'node:path';
const here = path.dirname(new URL(import.meta.url).pathname);
const SUITES = ['privacy', 'deps', 'formats', 'mobile', 'a11y', 'accounts', 'seo', 'return', 'pe'];
const only = process.argv.slice(2);
const rows = []; let failed = false;
for (const s of SUITES.filter(s => !only.length || only.includes(s))) {
  console.log(`\n=== ${s} ===`);
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [path.join(here, `${s}.test.mjs`)], { stdio: ['ignore', 'pipe', 'inherit'], env: process.env, maxBuffer: 1 << 26 });
  const out = r.stdout.toString(); process.stdout.write(out);
  const m = out.match(/(\d+) passed, (\d+) failed, (\d+) skipped\s*$/m);
  rows.push([s, m ? m[1] : '?', m ? m[2] : '?', m ? m[3] : '?', ((Date.now() - t0) / 1000).toFixed(0) + 's', r.status === 0 ? 'ok' : 'FAILED']);
  if (r.status !== 0) failed = true;
}
console.log('\nsuite       passed  failed  skipped  time   result');
for (const r of rows) console.log(r[0].padEnd(11), r[1].padStart(6), r[2].padStart(7), r[3].padStart(8), r[4].padStart(6), ' ', r[5]);
process.exit(failed ? 1 : 0);
