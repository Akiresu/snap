import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { printResults, getExitCode } from '../src/output.js';
import type { PageCompareResult } from '../src/compare.js';

describe('getExitCode', () => {
  it('returns 0 when all pages pass', () => {
    const results: PageCompareResult[] = [
      { label: 'homepage', percentage: 0.3, pass: true, skipped: false },
      { label: 'about', percentage: 1.2, pass: true, skipped: false },
    ];
    expect(getExitCode(results)).toBe(0);
  });

  it('returns 1 when at least one page fails', () => {
    const results: PageCompareResult[] = [
      { label: 'homepage', percentage: 0.3, pass: true, skipped: false },
      { label: 'products', percentage: 8.7, pass: false, skipped: false },
    ];
    expect(getExitCode(results)).toBe(1);
  });

  it('returns 0 when results contain only skipped pages', () => {
    const results: PageCompareResult[] = [
      { label: 'contact', percentage: 0, pass: true, skipped: true },
    ];
    expect(getExitCode(results)).toBe(0);
  });

  it('returns 0 when results are empty', () => {
    expect(getExitCode([])).toBe(0);
  });
});

describe('printResults', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('prints the header with threshold formatted to 1 decimal place', () => {
    printResults([], 5);
    const allOutput = logSpy.mock.calls.flat().join('\n');
    expect(allOutput).toContain('threshold: 5.0%');
  });

  it('formats threshold with 1 decimal even for a non-integer value', () => {
    printResults([], 3.5);
    const allOutput = logSpy.mock.calls.flat().join('\n');
    expect(allOutput).toContain('threshold: 3.5%');
  });

  it('prints passing pages with ✓ icon and percentage', () => {
    const results: PageCompareResult[] = [
      { label: 'homepage', percentage: 0.3, pass: true, skipped: false },
    ];
    printResults(results, 5);
    const allOutput = logSpy.mock.calls.flat().join('\n');
    expect(allOutput).toContain('✓');
    expect(allOutput).toContain('homepage');
    expect(allOutput).toContain('99.7% match');
  });

  it('prints failing pages with ✗ icon, percentage, and "→ diff saved"', () => {
    const results: PageCompareResult[] = [
      { label: 'products', percentage: 8.7, pass: false, skipped: false },
    ];
    printResults(results, 5);
    const allOutput = logSpy.mock.calls.flat().join('\n');
    expect(allOutput).toContain('✗');
    expect(allOutput).toContain('products');
    expect(allOutput).toContain('91.3% match');
    expect(allOutput).toContain('→ diff saved');
  });

  it('prints skipped pages with ⚠ icon and "no baseline"', () => {
    const results: PageCompareResult[] = [
      { label: 'contact', percentage: 0, pass: true, skipped: true },
    ];
    printResults(results, 5);
    const allOutput = logSpy.mock.calls.flat().join('\n');
    expect(allOutput).toContain('⚠');
    expect(allOutput).toContain('contact');
    expect(allOutput).toContain('no baseline');
  });

  it('prints "all N pages passed" when there are no failures', () => {
    const results: PageCompareResult[] = [
      { label: 'homepage', percentage: 0.3, pass: true, skipped: false },
      { label: 'about', percentage: 1.2, pass: true, skipped: false },
    ];
    printResults(results, 5);
    const allOutput = logSpy.mock.calls.flat().join('\n');
    expect(allOutput).toContain('Result: all 2 pages passed');
  });

  it('prints "X of Y pages failed" when there are failures', () => {
    const results: PageCompareResult[] = [
      { label: 'homepage', percentage: 0.3, pass: true, skipped: false },
      { label: 'about', percentage: 1.2, pass: true, skipped: false },
      { label: 'products', percentage: 8.7, pass: false, skipped: false },
      { label: 'contact', percentage: 0, pass: true, skipped: true },
    ];
    printResults(results, 5);
    const allOutput = logSpy.mock.calls.flat().join('\n');
    expect(allOutput).toContain('Result: 1 of 4 pages failed');
  });

  it('uses dots to pad label to consistent width', () => {
    const results: PageCompareResult[] = [
      { label: 'a', percentage: 0, pass: true, skipped: false },
    ];
    printResults(results, 5);
    // Short label "a" should get many dots (max(3, 22 - 1) = 21 dots)
    const pageLine = logSpy.mock.calls.find((call) =>
      String(call[0]).includes('✓'),
    );
    expect(pageLine).toBeDefined();
    const line = String(pageLine![0]);
    const dotMatches = line.match(/\.+/);
    expect(dotMatches).not.toBeNull();
    expect(dotMatches![0].length).toBe(21);
  });

  it('uses a minimum of 3 dots even for long labels', () => {
    // Label longer than 22 chars should still get exactly 3 dots
    const longLabel = 'a'.repeat(25);
    const results: PageCompareResult[] = [
      { label: longLabel, percentage: 0, pass: true, skipped: false },
    ];
    printResults(results, 5);
    const pageLine = logSpy.mock.calls.find((call) =>
      String(call[0]).includes('✓'),
    );
    expect(pageLine).toBeDefined();
    const line = String(pageLine![0]);
    const dotMatches = line.match(/\.+/);
    expect(dotMatches).not.toBeNull();
    expect(dotMatches![0].length).toBe(3);
  });
});
