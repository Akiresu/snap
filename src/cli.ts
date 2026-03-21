import { Command } from 'commander';
import { rm, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { loadConfig } from './config.js';
import { captureBaseline, captureSnapshot } from './capture.js';
import { compareImages, type PageCompareResult } from './compare.js';
import { printResults, getExitCode } from './output.js';
import { DEFAULT_THRESHOLD, DEFAULT_VIEWPORT, OUTPUT_DIRS, VIEWPORTS, type ViewportName } from './constants.js';

const VALID_VIEWPORTS = Object.keys(VIEWPORTS) as ViewportName[];

async function main(): Promise<void> {
  const program = new Command();

  program
    .name('snap')
    .description('Visual regression testing tool')
    .option('--base <url>', 'capture baseline screenshots')
    .option('--url <url>', 'capture and compare screenshots')
    .option('--compare-to <url>', 'base URL to compare against (requires --url)')
    .option('--viewport <name>', `viewport to use: ${VALID_VIEWPORTS.join(' | ')}`, DEFAULT_VIEWPORT)
    .option('--threshold <number>', 'diff threshold percentage', String(DEFAULT_THRESHOLD))
    .parse(process.argv);

  const opts = program.opts<{
    base?: string;
    url?: string;
    compareTo?: string;
    viewport: string;
    threshold: string;
  }>();

  // Validate: at least one of --base or --url required
  if (!opts.base && !opts.url) {
    console.error('Error: at least one of --base or --url is required');
    process.exit(1);
  }

  // Validate: --base and --url are mutually exclusive
  if (opts.base && opts.url) {
    console.error('Error: --base and --url are mutually exclusive');
    process.exit(1);
  }

  // Validate: --compare-to requires --url
  if (opts.compareTo && !opts.url) {
    console.error('Error: --compare-to requires --url');
    process.exit(1);
  }

  // Validate: --viewport must be a valid value
  if (!VALID_VIEWPORTS.includes(opts.viewport as ViewportName)) {
    console.error(`Error: --viewport must be one of: ${VALID_VIEWPORTS.join(', ')}`);
    process.exit(1);
  }

  const threshold = parseFloat(opts.threshold);
  if (isNaN(threshold)) {
    console.error('Error: --threshold must be a number');
    process.exit(1);
  }

  const config = await loadConfig();

  const viewport = opts.viewport as ViewportName;

  if (opts.base) {
    console.log(`\nSnap — capturing baseline (${viewport})\n`);
    const failedPages: string[] = [];
    await captureBaseline(
      config,
      opts.base,
      viewport,
      (label) => { console.log(`  ✓ ${label}`); },
      (label, err) => {
        console.error(`  ✗ ${label}  ${err.message}`);
        failedPages.push(label);
      },
    );
    const successCount = config.pages.length - failedPages.length;
    console.log(`\nBaseline saved: ${successCount} of ${config.pages.length} pages`);
    if (failedPages.length > 0) {
      process.exit(1);
    }
  }

  if (opts.url) {
    const snapshotDir = path.join('output', viewport, OUTPUT_DIRS.snapshot);
    const diffDir = path.join('output', viewport, OUTPUT_DIRS.diff);
    const baseDir = path.join('output', viewport, OUTPUT_DIRS.base);

    // If --compare-to is provided, capture a fresh baseline first
    if (opts.compareTo) {
      console.log(`\nSnap — capturing baseline from ${opts.compareTo} (${viewport})\n`);
      await rm(baseDir, { recursive: true, force: true });
      await mkdir(baseDir, { recursive: true });
      const compareToFailed: string[] = [];
      await captureBaseline(
        config,
        opts.compareTo,
        viewport,
        (label) => { console.log(`  ✓ ${label}`); },
        (label, err) => {
          console.error(`  ✗ ${label}  ${err.message}`);
          compareToFailed.push(label);
        },
      );
      if (compareToFailed.length > 0) {
        process.exit(1);
      }
    }

    // Clear and recreate snapshot/ and diff/
    await rm(snapshotDir, { recursive: true, force: true });
    await rm(diffDir, { recursive: true, force: true });
    await mkdir(snapshotDir, { recursive: true });
    await mkdir(diffDir, { recursive: true });

    // Capture snapshots
    await captureSnapshot(
      config,
      opts.url,
      viewport,
      () => {},
      (label, err) => { console.error(`  ✗ ${label}  ${err.message}`); },
    );

    // Compare each page
    const results: PageCompareResult[] = await Promise.all(config.pages.map(async (page) => {
      const basePath = path.join(baseDir, `${page.label}.png`);
      const snapshotPath = path.join(snapshotDir, `${page.label}.png`);

      let baseBuffer: Buffer | null = null;
      try {
        baseBuffer = await readFile(basePath);
      } catch {
        // baseline missing — fall through to skipped result
      }

      if (baseBuffer === null) {
        return { label: page.label, percentage: 0, pass: true, skipped: true };
      }

      let snapshotBuffer: Buffer;
      try {
        snapshotBuffer = await readFile(snapshotPath);
      } catch {
        // snapshot file missing (capture failed for this page) — treat as 100% fail
        return { label: page.label, percentage: 100, pass: false, skipped: false };
      }

      const { percentage, diffBuffer } = compareImages(baseBuffer, snapshotBuffer);
      const pass = percentage <= threshold;

      if (!pass) {
        await writeFile(path.join(diffDir, `${page.label}.png`), diffBuffer);
      }

      return { label: page.label, percentage, pass, skipped: false };
    }));

    printResults(results, threshold);
    process.exit(getExitCode(results));
  }
}

main().catch((err: unknown) => {
  if (err instanceof Error) {
    console.error(`Error: ${err.message}`);
  } else {
    console.error('An unexpected error occurred');
  }
  process.exit(1);
});
