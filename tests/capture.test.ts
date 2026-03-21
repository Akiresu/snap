import { describe, it, expect, vi, beforeEach } from 'vitest';
import path from 'node:path';

const {
  mockBrowser,
  mockContext,
  mockLaunchBrowser,
  mockCreateContext,
  mockSetCookies,
  mockNavigateAndScreenshot,
  mockMkdir,
  mockWriteFile,
} = vi.hoisted(() => {
  const mockBrowser = { close: vi.fn().mockResolvedValue(undefined) };
  const mockContext = {};
  const mockLaunchBrowser = vi.fn().mockResolvedValue(mockBrowser);
  const mockCreateContext = vi.fn().mockResolvedValue(mockContext);
  const mockSetCookies = vi.fn().mockResolvedValue(undefined);
  const mockNavigateAndScreenshot = vi.fn().mockResolvedValue(Buffer.from('png'));
  const mockMkdir = vi.fn().mockResolvedValue(undefined);
  const mockWriteFile = vi.fn().mockResolvedValue(undefined);
  return {
    mockBrowser,
    mockContext,
    mockLaunchBrowser,
    mockCreateContext,
    mockSetCookies,
    mockNavigateAndScreenshot,
    mockMkdir,
    mockWriteFile,
  };
});

vi.mock('../src/browser.js', () => ({
  launchBrowser: mockLaunchBrowser,
  createContext: mockCreateContext,
  setCookies: mockSetCookies,
  navigateAndScreenshot: mockNavigateAndScreenshot,
}));

vi.mock('node:fs/promises', () => ({
  mkdir: mockMkdir,
  writeFile: mockWriteFile,
}));

import { captureBaseline, captureSnapshot } from '../src/capture.js';
import type { SnapConfig } from '../src/config.js';

const config: SnapConfig = {
  pages: [
    { path: '/', label: 'home' },
    { path: '/about', label: 'about' },
  ],
  defaultThreshold: 5,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockLaunchBrowser.mockResolvedValue(mockBrowser);
  mockCreateContext.mockResolvedValue(mockContext);
  mockSetCookies.mockResolvedValue(undefined);
  mockNavigateAndScreenshot.mockResolvedValue(Buffer.from('png'));
  mockMkdir.mockResolvedValue(undefined);
  mockWriteFile.mockResolvedValue(undefined);
  mockBrowser.close.mockResolvedValue(undefined);
});

describe('captureBaseline', () => {
  it('calls navigateAndScreenshot with correct full URLs', async () => {
    await captureBaseline(config, 'https://example.com', 'desktop', () => {});
    expect(mockNavigateAndScreenshot).toHaveBeenCalledWith(mockContext, 'https://example.com/');
    expect(mockNavigateAndScreenshot).toHaveBeenCalledWith(mockContext, 'https://example.com/about');
  });

  it('calls writeFile with correct output paths', async () => {
    const buf = Buffer.from('png');
    mockNavigateAndScreenshot.mockResolvedValue(buf);
    await captureBaseline(config, 'https://example.com', 'desktop', () => {});
    expect(mockWriteFile).toHaveBeenCalledWith(path.join('output', 'desktop', 'base', 'home.png'), buf);
    expect(mockWriteFile).toHaveBeenCalledWith(path.join('output', 'desktop', 'base', 'about.png'), buf);
  });

  it('calls onPageCaptured once per page with correct label', async () => {
    const cb = vi.fn();
    await captureBaseline(config, 'https://example.com', 'desktop', cb);
    expect(cb).toHaveBeenCalledTimes(2);
    expect(cb).toHaveBeenCalledWith('home');
    expect(cb).toHaveBeenCalledWith('about');
  });

  it('calls mkdir with { recursive: true } before the loop', async () => {
    await captureBaseline(config, 'https://example.com', 'mobile', () => {});
    expect(mockMkdir).toHaveBeenCalledWith(path.join('output', 'mobile', 'base'), { recursive: true });
    const mkdirOrder = mockMkdir.mock.invocationCallOrder[0];
    const navigateOrder = mockNavigateAndScreenshot.mock.invocationCallOrder[0];
    expect(mkdirOrder).toBeLessThan(navigateOrder);
  });

  it('calls setCookies before the page loop', async () => {
    await captureBaseline(config, 'https://example.com', 'desktop', () => {});
    expect(mockSetCookies).toHaveBeenCalledWith(mockContext, 'https://example.com');
    const setCookiesOrder = mockSetCookies.mock.invocationCallOrder[0];
    const navigateOrder = mockNavigateAndScreenshot.mock.invocationCallOrder[0];
    expect(setCookiesOrder).toBeLessThan(navigateOrder);
  });

  it('calls browser.close() even when navigateAndScreenshot throws', async () => {
    mockNavigateAndScreenshot.mockRejectedValue(new Error('capture failed'));
    await expect(captureBaseline(config, 'https://example.com', 'desktop', () => {})).rejects.toThrow('capture failed');
    expect(mockBrowser.close).toHaveBeenCalledOnce();
  });
});

describe('captureSnapshot', () => {
  it('calls navigateAndScreenshot with correct full URLs', async () => {
    await captureSnapshot(config, 'https://staging.example.com', 'desktop', () => {});
    expect(mockNavigateAndScreenshot).toHaveBeenCalledWith(mockContext, 'https://staging.example.com/');
    expect(mockNavigateAndScreenshot).toHaveBeenCalledWith(mockContext, 'https://staging.example.com/about');
  });

  it('calls writeFile with correct snapshot output paths', async () => {
    const buf = Buffer.from('snap-png');
    mockNavigateAndScreenshot.mockResolvedValue(buf);
    await captureSnapshot(config, 'https://staging.example.com', 'desktop', () => {});
    expect(mockWriteFile).toHaveBeenCalledWith(
      path.join('output', 'desktop', 'snapshot', 'home.png'),
      buf,
    );
    expect(mockWriteFile).toHaveBeenCalledWith(
      path.join('output', 'desktop', 'snapshot', 'about.png'),
      buf,
    );
  });

  it('calls onPageCaptured once per page with correct label', async () => {
    const cb = vi.fn();
    await captureSnapshot(config, 'https://staging.example.com', 'desktop', cb);
    expect(cb).toHaveBeenCalledTimes(2);
    expect(cb).toHaveBeenCalledWith('home');
    expect(cb).toHaveBeenCalledWith('about');
  });

  it('calls mkdir for the snapshot directory with { recursive: true }', async () => {
    await captureSnapshot(config, 'https://staging.example.com', 'tablet', () => {});
    expect(mockMkdir).toHaveBeenCalledWith(
      path.join('output', 'tablet', 'snapshot'),
      { recursive: true },
    );
    const mkdirOrder = mockMkdir.mock.invocationCallOrder[0];
    const navigateOrder = mockNavigateAndScreenshot.mock.invocationCallOrder[0];
    expect(mkdirOrder).toBeLessThan(navigateOrder);
  });

  it('calls setCookies with the snapshot URL before the page loop', async () => {
    await captureSnapshot(config, 'https://staging.example.com', 'desktop', () => {});
    expect(mockSetCookies).toHaveBeenCalledWith(mockContext, 'https://staging.example.com');
    const setCookiesOrder = mockSetCookies.mock.invocationCallOrder[0];
    const navigateOrder = mockNavigateAndScreenshot.mock.invocationCallOrder[0];
    expect(setCookiesOrder).toBeLessThan(navigateOrder);
  });

  it('calls browser.close() even when navigateAndScreenshot throws', async () => {
    mockNavigateAndScreenshot.mockRejectedValue(new Error('snapshot capture failed'));
    await expect(
      captureSnapshot(config, 'https://staging.example.com', 'desktop', () => {}),
    ).rejects.toThrow('snapshot capture failed');
    expect(mockBrowser.close).toHaveBeenCalledOnce();
  });
});
