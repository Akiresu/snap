import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockPage, mockContext, mockBrowser, mockChromium } = vi.hoisted(() => {
  const mockPage = {
    goto: vi.fn().mockResolvedValue(null),
    screenshot: vi.fn().mockResolvedValue(Buffer.from('png')),
    close: vi.fn().mockResolvedValue(undefined),
  };
  const mockContext = {
    newPage: vi.fn().mockResolvedValue(mockPage),
  };
  const mockBrowser = {
    newContext: vi.fn().mockResolvedValue(mockContext),
    close: vi.fn().mockResolvedValue(undefined),
  };
  const mockChromium = {
    launch: vi.fn().mockResolvedValue(mockBrowser),
  };
  return { mockPage, mockContext, mockBrowser, mockChromium };
});

vi.mock('playwright', () => ({
  chromium: mockChromium,
}));

import { launchBrowser, createContext, setCookies, navigateAndScreenshot } from '../src/browser.js';
import { VIEWPORTS } from '../src/constants.js';

beforeEach(() => {
  vi.clearAllMocks();
  mockChromium.launch.mockResolvedValue(mockBrowser);
  mockBrowser.newContext.mockResolvedValue(mockContext);
  mockContext.newPage.mockResolvedValue(mockPage);
  mockPage.goto.mockResolvedValue(null);
  mockPage.screenshot.mockResolvedValue(Buffer.from('png'));
  mockPage.close.mockResolvedValue(undefined);
  mockBrowser.close.mockResolvedValue(undefined);
});

describe('launchBrowser', () => {
  it('calls chromium.launch()', async () => {
    const browser = await launchBrowser();
    expect(mockChromium.launch).toHaveBeenCalledOnce();
    expect(browser).toBe(mockBrowser);
  });
});

describe('createContext', () => {
  it.each(Object.keys(VIEWPORTS) as Array<keyof typeof VIEWPORTS>)(
    'passes correct viewport and ignoreHTTPSErrors for %s',
    async (viewportName) => {
      await createContext(mockBrowser as never, viewportName);
      expect(mockBrowser.newContext).toHaveBeenCalledWith({
        viewport: VIEWPORTS[viewportName],
        ignoreHTTPSErrors: true,
      });
    },
  );
});

describe('setCookies', () => {
  it('resolves without throwing', async () => {
    await expect(setCookies(mockContext as never, 'https://example.com')).resolves.toBeUndefined();
  });
});

describe('navigateAndScreenshot', () => {
  it('calls goto with networkidle wait strategy', async () => {
    await navigateAndScreenshot(mockContext as never, 'https://example.com/page');
    expect(mockPage.goto).toHaveBeenCalledWith('https://example.com/page', { waitUntil: 'networkidle' });
  });

  it('calls screenshot with fullPage: true', async () => {
    await navigateAndScreenshot(mockContext as never, 'https://example.com/page');
    expect(mockPage.screenshot).toHaveBeenCalledWith({ fullPage: true });
  });

  it('closes the page and returns the buffer', async () => {
    const buf = Buffer.from('fakepng');
    mockPage.screenshot.mockResolvedValue(buf);
    const result = await navigateAndScreenshot(mockContext as never, 'https://example.com/page');
    expect(mockPage.close).toHaveBeenCalledOnce();
    expect(result).toBe(buf);
  });

  it('closes the page even when goto throws', async () => {
    mockPage.goto.mockRejectedValue(new Error('nav failed'));
    await expect(navigateAndScreenshot(mockContext as never, 'https://example.com/page')).rejects.toThrow('nav failed');
    expect(mockPage.close).toHaveBeenCalledOnce();
  });
});
