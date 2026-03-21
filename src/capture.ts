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
): Promise<void> {
  const browser = await launchBrowser();
  try {
    const context = await createContext(browser, viewport);
    await setCookies(context, baseUrl);

    const outputDir = path.join('output', viewport, OUTPUT_DIRS.base);
    await mkdir(outputDir, { recursive: true });

    for (const page of config.pages) {
      const url = baseUrl + page.path;
      const buffer = await navigateAndScreenshot(context, url);
      await writeFile(path.join(outputDir, `${page.label}.png`), buffer);
      onPageCaptured(page.label);
    }
  } finally {
    await browser.close();
  }
}
