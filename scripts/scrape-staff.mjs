#!/usr/bin/env node
// Scrape the BHS staff directory into TSV for the `staff` sheet tab.
//
// Fallback for when refreshStaffDirectory() gets a 403 in the Apps Script
// editor: the school site's firewall intermittently blocks Google's shared
// fetch servers by IP, but a request from your own machine goes through.
// Loads Code.js in a VM and calls its parseStaffDirectory, so there is one
// parser to maintain (Code.js's top level is only declarations — no Apps
// Script services are touched).
//
// Usage:
//   node scripts/scrape-staff.mjs > staff.tsv
//
// Then replace the `staff` tab's contents: select all (the whole tab), hit
// delete, click cell A1, paste the file's contents — and run clearCaches()
// from the Apps Script editor so the app picks it up.

import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const repo = dirname(dirname(fileURLToPath(import.meta.url)));
const ctx = createContext({});
runInContext(readFileSync(join(repo, 'Code.js'), 'utf8'), ctx, { filename: 'Code.js' });

const url = runInContext('STAFF_DIRECTORY_URL', ctx);
const res = await fetch(url, {
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
  },
});
if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);

const rows = runInContext('parseStaffDirectory', ctx)(await res.text());
if (rows.length < 200) {
  throw new Error(`Only parsed ${rows.length} staff rows — did the page layout change?`);
}

const lines = [['lastName', 'firstName', 'role', 'email', 'photoUrl']].concat(
  rows.map((r) => [r.lastName, r.firstName, r.role, r.email, r.photoUrl]),
);
process.stdout.write(lines.map((l) => l.join('\t')).join('\n') + '\n');
console.error(`${rows.length} staff rows`);
