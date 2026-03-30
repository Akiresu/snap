import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { type SnapConfig } from './config.js';
import { OUTPUT_DIRS, type ViewportName } from './constants.js';
import { launchBrowser, createContext, setCookies, navigateAndScreenshot } from './browser.js';

export async function captureBaseline(
  config: SnapConfig,
  baseUrl: string,
  viewport: ViewportName,
  onPageCaptured: (label: string) => void,
  onPageFailed: (label: string, error: Error) => void,
): Promise<void> {
  const browser = await launchBrowser();
  try {
    const context = await createContext(browser, viewport);
    await setCookies(context, baseUrl, config.cookies);

    const outputDir = path.join('output', viewport, OUTPUT_DIRS.base);
    await mkdir(outputDir, { recursive: true });

    await Promise.all(config.pages.map(async (page) => {
      const url = baseUrl + page.path;
      try {
        const buffer = await navigateAndScreenshot(context, url, config.readySelector);
        await writeFile(path.join(outputDir, `${page.label}.png`), buffer);
        onPageCaptured(page.label);
      } catch (err) {
        onPageFailed(page.label, err instanceof Error ? err : new Error(String(err)));
      }
    }));
  } finally {
    await browser.close();
  }
}

export async function captureSnapshot(
  config: SnapConfig,
  snapshotUrl: string,
  viewport: ViewportName,
  onPageCaptured: (label: string) => void,
  onPageFailed: (label: string, error: Error) => void,
): Promise<void> {
  const browser = await launchBrowser();
  try {
    const context = await createContext(browser, viewport);
    await setCookies(context, snapshotUrl, config.cookies);

    const outputDir = path.join('output', viewport, OUTPUT_DIRS.snapshot);
    await mkdir(outputDir, { recursive: true });

    await Promise.all(config.pages.map(async (page) => {
      const url = snapshotUrl + page.path;
      try {
        const buffer = await navigateAndScreenshot(context, url, config.readySelector);
        await writeFile(path.join(outputDir, `${page.label}.png`), buffer);
        onPageCaptured(page.label);
      } catch (err) {
        onPageFailed(page.label, err instanceof Error ? err : new Error(String(err)));
      }
    }));
  } finally {
    await browser.close();
  }
}
