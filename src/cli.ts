import { Command } from 'commander';
import { loadConfig } from './config.js';
import { captureBaseline } from './capture.js';
import { DEFAULT_THRESHOLD, DEFAULT_VIEWPORT, VIEWPORTS, type ViewportName } from './constants.js';

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
    await captureBaseline(config, opts.base, viewport, (label) => {
      console.log(`  ✓ ${label}`);
    });
    console.log(`\nBaseline saved: ${config.pages.length} pages`);
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
