import { chromium, Browser, BrowserContext } from 'playwright';
import { VIEWPORTS, type ViewportName } from './constants.js';
import { type SnapConfig } from './config.js';

export async function launchBrowser(): Promise<Browser> {
  return chromium.launch();
}

export async function createContext(browser: Browser, viewport: ViewportName): Promise<BrowserContext> {
  return browser.newContext({
    viewport: VIEWPORTS[viewport],
    ignoreHTTPSErrors: true,
  });
}

export async function setCookies(context: BrowserContext, baseUrl: string, cookies?: SnapConfig['cookies']): Promise<void> {
  if (!cookies || cookies.length === 0) {
    return;
  }

  const url = new URL(baseUrl);
  const processedCookies = cookies.map((cookie) => ({
    ...cookie,
    domain: cookie.domain || url.hostname,
    secure: cookie.secure ?? url.protocol === 'https:',
    sameSite: cookie.sameSite || ('Lax' as const),
  }));

  await context.addCookies(processedCookies as Parameters<typeof context.addCookies>[0]);
}

export async function navigateAndScreenshot(context: BrowserContext, url: string): Promise<Buffer> {
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: 'networkidle' });
    const buffer = await page.screenshot({ fullPage: true });
    return buffer;
  } finally {
    await page.close();
  }
}
