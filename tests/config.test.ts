import { describe, it, expect, vi, beforeEach } from 'vitest';

// We need to mock fs/promises to test config loading
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
}));

import { readFile } from 'fs/promises';
import { loadConfig } from '../src/config.js';

const mockReadFile = vi.mocked(readFile);

function setConfigContent(content: unknown): void {
  mockReadFile.mockResolvedValue(JSON.stringify(content) as never);
}

describe('loadConfig', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('parses a valid config successfully', async () => {
    setConfigContent({
      pages: [{ path: '/', label: 'homepage' }],
      defaultThreshold: 5.0,
    });

    const config = await loadConfig();
    expect(config.pages).toHaveLength(1);
    expect(config.pages[0].path).toBe('/');
    expect(config.pages[0].label).toBe('homepage');
    expect(config.defaultThreshold).toBe(5.0);
  });

  it('parses config with multiple pages', async () => {
    setConfigContent({
      pages: [
        { path: '/', label: 'homepage' },
        { path: '/about', label: 'about' },
      ],
      defaultThreshold: 2.5,
    });

    const config = await loadConfig();
    expect(config.pages).toHaveLength(2);
    expect(config.pages[1].label).toBe('about');
  });

  it('throws when pages array is missing', async () => {
    setConfigContent({ defaultThreshold: 5.0 });
    await expect(loadConfig()).rejects.toThrow();
  });

  it('throws when pages array is empty', async () => {
    setConfigContent({ pages: [], defaultThreshold: 5.0 });
    await expect(loadConfig()).rejects.toThrow();
  });

  it('throws when a page is missing path', async () => {
    setConfigContent({
      pages: [{ label: 'homepage' }],
      defaultThreshold: 5.0,
    });
    await expect(loadConfig()).rejects.toThrow();
  });

  it('throws when a page is missing label', async () => {
    setConfigContent({
      pages: [{ path: '/' }],
      defaultThreshold: 5.0,
    });
    await expect(loadConfig()).rejects.toThrow();
  });

  it('throws when defaultThreshold is missing', async () => {
    setConfigContent({ pages: [{ path: '/', label: 'homepage' }] });
    await expect(loadConfig()).rejects.toThrow();
  });

  it('throws when defaultThreshold is not a number', async () => {
    setConfigContent({
      pages: [{ path: '/', label: 'homepage' }],
      defaultThreshold: 'five',
    });
    await expect(loadConfig()).rejects.toThrow();
  });

  it('strips extra unknown fields (passthrough behavior)', async () => {
    setConfigContent({
      pages: [{ path: '/', label: 'homepage' }],
      defaultThreshold: 5.0,
      unknownField: 'should be ignored or stripped',
    });

    // Should not throw — zod strips unknown fields by default
    const config = await loadConfig();
    expect(config.pages).toHaveLength(1);
  });
});
