import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Helpers that set up mocks and then dynamically import cli.ts fresh each time.
// cli.ts calls main() immediately on import, so we must configure argv and mocks
// before the import, then await the settled promise so all async work completes.

async function runCli(argv: string[]): Promise<void> {
  process.argv = ['node', 'cli.js', ...argv];
  vi.resetModules();
  // Swallow unhandled rejections that bubble out of main() — the test assertions
  // check spies, not thrown errors.
  try {
    await import('../src/cli.js');
  } catch {
    // intentionally ignored: some paths call process.exit which our spy intercepts
  }
  // Allow any microtasks spawned by main() to settle.
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('CLI flag validation', () => {
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((_code?: number) => undefined as never);
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    exitSpy.mockRestore();
    errorSpy.mockRestore();
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('exits 1 with a helpful message when no flags are provided', async () => {
    await runCli([]);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('at least one of --base or --url is required'),
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('exits 1 when --base and --url are both provided', async () => {
    await runCli(['--base', 'https://example.com', '--url', 'https://staging.example.com']);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('--base and --url are mutually exclusive'),
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('exits 1 when --compare-to is provided without --url', async () => {
    await runCli(['--compare-to', 'https://example.com']);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('at least one of --base or --url is required'),
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('exits 1 when --viewport has an invalid value', async () => {
    await runCli(['--url', 'https://staging.example.com', '--viewport', 'widescreen']);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('--viewport'));
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('exits 1 when --threshold is non-numeric', async () => {
    await runCli(['--url', 'https://staging.example.com', '--threshold', 'abc']);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('--threshold'));
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});

describe('CLI orchestration', () => {
  // Shared mock factories — recreated fresh per test via vi.resetModules().
  const {
    mockCaptureBaseline,
    mockCaptureSnapshot,
    mockCompareImages,
    mockPrintResults,
    mockGetExitCode,
    mockLoadConfig,
    mockRm,
    mockMkdir,
    mockReadFile,
    mockWriteFile,
  } = vi.hoisted(() => {
    const mockCaptureBaseline = vi.fn().mockResolvedValue(undefined);
    const mockCaptureSnapshot = vi.fn().mockResolvedValue(undefined);
    const mockCompareImages = vi
      .fn()
      .mockReturnValue({ percentage: 0, diffBuffer: Buffer.alloc(0) });
    const mockPrintResults = vi.fn();
    const mockGetExitCode = vi.fn().mockReturnValue(0);
    const mockLoadConfig = vi.fn().mockResolvedValue({
      pages: [{ label: 'home', path: '/' }],
      defaultThreshold: 5,
    });
    const mockRm = vi.fn().mockResolvedValue(undefined);
    const mockMkdir = vi.fn().mockResolvedValue(undefined);
    // Returns a non-empty buffer; compareImages is mocked so contents don't matter.
    const mockReadFile = vi.fn().mockResolvedValue(Buffer.from('fake-png'));
    const mockWriteFile = vi.fn().mockResolvedValue(undefined);
    return {
      mockCaptureBaseline,
      mockCaptureSnapshot,
      mockCompareImages,
      mockPrintResults,
      mockGetExitCode,
      mockLoadConfig,
      mockRm,
      mockMkdir,
      mockReadFile,
      mockWriteFile,
    };
  });

  vi.mock('../src/capture.js', () => ({
    captureBaseline: mockCaptureBaseline,
    captureSnapshot: mockCaptureSnapshot,
  }));

  vi.mock('../src/compare.js', () => ({
    compareImages: mockCompareImages,
  }));

  vi.mock('../src/output.js', () => ({
    printResults: mockPrintResults,
    getExitCode: mockGetExitCode,
  }));

  vi.mock('../src/config.js', () => ({
    loadConfig: mockLoadConfig,
  }));

  vi.mock('node:fs/promises', () => ({
    rm: mockRm,
    mkdir: mockMkdir,
    readFile: mockReadFile,
    writeFile: mockWriteFile,
  }));

  let exitSpy: ReturnType<typeof vi.spyOn>;
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    // Restore default mock return values after clearAllMocks.
    mockCaptureBaseline.mockResolvedValue(undefined);
    mockCaptureSnapshot.mockResolvedValue(undefined);
    mockCompareImages.mockReturnValue({ percentage: 0, diffBuffer: Buffer.alloc(0) });
    mockPrintResults.mockImplementation(() => undefined);
    mockGetExitCode.mockReturnValue(0);
    mockLoadConfig.mockResolvedValue({
      pages: [{ label: 'home', path: '/' }],
      defaultThreshold: 5,
    });
    mockRm.mockResolvedValue(undefined);
    mockMkdir.mockResolvedValue(undefined);
    mockReadFile.mockResolvedValue(Buffer.from('fake-png'));
    mockWriteFile.mockResolvedValue(undefined);

    exitSpy = vi.spyOn(process, 'exit').mockImplementation((_code?: number) => undefined as never);
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    exitSpy.mockRestore();
    logSpy.mockRestore();
    errorSpy.mockRestore();
    vi.resetModules();
  });

  it('calls captureBaseline with --compare-to URL then captureSnapshot with --url', async () => {
    await runCli([
      '--url', 'https://staging.example.com',
      '--compare-to', 'https://example.com',
    ]);

    expect(mockCaptureBaseline).toHaveBeenCalledOnce();
    expect(mockCaptureBaseline).toHaveBeenCalledWith(
      expect.objectContaining({ pages: expect.any(Array) }),
      'https://example.com',
      'desktop',
      expect.any(Function),
    );

    expect(mockCaptureSnapshot).toHaveBeenCalledOnce();
    expect(mockCaptureSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({ pages: expect.any(Array) }),
      'https://staging.example.com',
      'desktop',
      expect.any(Function),
    );

    // captureBaseline must be called before captureSnapshot
    const baselineOrder = mockCaptureBaseline.mock.invocationCallOrder[0];
    const snapshotOrder = mockCaptureSnapshot.mock.invocationCallOrder[0];
    expect(baselineOrder).toBeLessThan(snapshotOrder);
  });

  it('does NOT call captureBaseline when only --url is provided (no --compare-to)', async () => {
    await runCli(['--url', 'https://staging.example.com']);

    expect(mockCaptureBaseline).not.toHaveBeenCalled();
    expect(mockCaptureSnapshot).toHaveBeenCalledOnce();
    expect(mockCaptureSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({ pages: expect.any(Array) }),
      'https://staging.example.com',
      'desktop',
      expect.any(Function),
    );
  });
});
