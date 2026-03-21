import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

export interface CompareImageResult {
  percentage: number;
  diffBuffer: Buffer;
}

export interface PageCompareResult {
  label: string;
  percentage: number;
  pass: boolean;
  skipped: boolean;
}

export function compareImages(base: Buffer, snapshot: Buffer): CompareImageResult {
  const basePng = PNG.sync.read(base);
  const snapshotPng = PNG.sync.read(snapshot);

  if (basePng.width !== snapshotPng.width || basePng.height !== snapshotPng.height) {
    const emptyPng = new PNG({ width: basePng.width, height: basePng.height });
    return {
      percentage: 100,
      diffBuffer: Buffer.from(PNG.sync.write(emptyPng)),
    };
  }

  const { width, height } = basePng;
  const diffPng = new PNG({ width, height });

  const diffPixels = pixelmatch(
    basePng.data,
    snapshotPng.data,
    diffPng.data,
    width,
    height,
    { threshold: 0.1 },
  );

  const percentage = (diffPixels / (width * height)) * 100;

  return {
    percentage,
    diffBuffer: Buffer.from(PNG.sync.write(diffPng)),
  };
}
