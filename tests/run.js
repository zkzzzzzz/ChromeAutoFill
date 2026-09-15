#!/usr/bin/env node
// Minimal test runner: discovers *.test.js in this directory, runs each
// one's exported async function, and prints a PASS/FAIL summary.
const fs = require("fs");
const path = require("path");

const dir = __dirname;
const files = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith(".test.js"))
  .sort();

async function main() {
  const results = [];
  for (const file of files) {
    const testFn = require(path.join(dir, file));
    const start = Date.now();
    process.stdout.write(`\n▶ ${file}\n`);
    try {
      await testFn();
      const ms = Date.now() - start;
      console.log(`  ✓ PASS (${ms}ms)`);
      results.push({ file, ok: true });
    } catch (err) {
      const ms = Date.now() - start;
      console.log(`  ✗ FAIL (${ms}ms): ${err.message}`);
      results.push({ file, ok: false, error: err.message });
    }
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} tests passed.`);
  if (failed.length) {
    console.log("\nFailed:");
    failed.forEach((r) => console.log(`  - ${r.file}: ${r.error}`));
    process.exit(1);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error("Test runner crashed:", err);
  process.exit(1);
});
