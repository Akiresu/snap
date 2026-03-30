import type { PageCompareResult } from './compare.js';

export function printResults(results: PageCompareResult[], threshold: number): void {
  console.log(`\nSnap — comparing against baseline (diff threshold: ${threshold.toFixed(1)}%)\n`);

  for (const result of results) {
    const dots = '.'.repeat(Math.max(3, 22 - result.label.length));

    if (result.skipped) {
      console.log(`  ⚠ ${result.label} ${dots} no baseline`);
    } else if (result.pass) {
      if (result.percentage > 0) {
        console.log(`  ✓ ${result.label} ${dots} ${(100 - result.percentage).toFixed(1)}% match  → diff saved`);
      } else {
        console.log(`  ✓ ${result.label} ${dots} ${(100 - result.percentage).toFixed(1)}% match`);
      }
    } else {
      console.log(`  ✗ ${result.label} ${dots} ${(100 - result.percentage).toFixed(1)}% match  → diff saved`);
    }
  }

  const failCount = results.filter((r) => !r.pass && !r.skipped).length;
  const totalCount = results.length;

  console.log('');
  if (failCount === 0) {
    console.log(`Result: all ${totalCount} pages passed`);
  } else {
    console.log(`Result: ${failCount} of ${totalCount} pages failed`);
  }
}

export function getExitCode(results: PageCompareResult[]): number {
  const anyFailed = results.some((r) => !r.pass && !r.skipped);
  return anyFailed ? 1 : 0;
}
