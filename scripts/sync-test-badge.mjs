// The test count in the README used to be typed by hand, which meant it was
// right on the day it was written and silently wrong afterwards. It appears
// twice — once in the badge at the top, once in the sentence that opens
// "Quality and testing" — so there were two numbers to forget. This reads the
// real one out of the suite instead.
//
//   npm run badge         rewrites both to match the suite
//   npm run badge:check   fails if any of them disagree — this is what CI runs
//
// The count stays in the README rather than being fetched at render time on
// purpose: no gist, no token, no bot commits in a history with one author.

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const README = 'README.md';

// Both places the number is written. `badge` carries it twice — the alt text
// and the shield itself — because a badge whose label disagrees with its own
// image is exactly the kind of thing nobody notices.
const PATTERNS = {
  badge: /\[!\[Tests\]\(https:\/\/img\.shields\.io\/badge\/tests-(\d+)%20passing-([0-9a-f]{6})\)\]\(([^)]+)\)/,
  prose: /The automated suite currently contains \*\*(\d+) tests\*\*/,
};

// Node's test runner has no JSON reporter, but the TAP output ends with a
// summary, and `# tests N` there is the total the runner actually executed —
// not a count of files, and not a number this script could drift away from.
function countTests() {
  let stdout;
  try {
    stdout = execFileSync('node', ['--test', '--test-reporter=tap'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'inherit'],
    });
  } catch (error) {
    // A failing suite is not a badge problem, and rewriting the number while
    // the tests are red would be the wrong thing to do quietly.
    if (error.stdout) process.stdout.write(error.stdout);
    console.error('The test suite did not pass. Fix it before touching the badge.');
    process.exit(1);
  }

  const match = stdout.match(/^# tests (\d+)$/m);
  if (!match) {
    console.error('Could not read a test count out of the TAP summary.');
    process.exit(1);
  }
  return Number(match[1]);
}

const check = process.argv.includes('--check');
let readme = readFileSync(README, 'utf8');

const found = {};
for (const [name, pattern] of Object.entries(PATTERNS)) {
  const match = readme.match(pattern);
  if (!match) {
    console.error(`No test count found in the ${name} of ${README}. Expected ${pattern}.`);
    process.exit(1);
  }
  found[name] = Number(match[1]);
}

const actual = countTests();
const stale = Object.entries(found).filter(([, value]) => value !== actual);

if (stale.length === 0) {
  console.log(`README test count is in sync: ${actual} tests.`);
  process.exit(0);
}

if (check) {
  for (const [name, value] of stale) {
    console.error(`The ${name} says ${value}, the suite has ${actual}.`);
  }
  console.error('Run `npm run badge` and commit the result.');
  process.exit(1);
}

readme = readme
  .replace(
    PATTERNS.badge,
    (_, __, colour, href) =>
      `[![Tests](https://img.shields.io/badge/tests-${actual}%20passing-${colour})](${href})`,
  )
  .replace(PATTERNS.prose, `The automated suite currently contains **${actual} tests**`);

writeFileSync(README, readme);
for (const [name, value] of stale) {
  console.log(`README ${name} updated: ${value} → ${actual}.`);
}
