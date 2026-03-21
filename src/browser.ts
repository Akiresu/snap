import { chromium, Browser, BrowserContext } from 'playwright';
import { VIEWPORTS, type ViewportName } from './constants.js';

export async function launchBrowser(): Promise<Browser> {
  return chromium.launch();
}

export async function createContext(browser: Browser, viewport: ViewportName): Promise<BrowserContext> {
  return browser.newContext({
    viewport: VIEWPORTS[viewport],
    ignoreHTTPSErrors: true,
  });
}

// TODO: set cookies on the context before navigation
export async function setCookies(context: BrowserContext, baseUrl: string): Promise<void> {
  void context;
  void baseUrl;
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
