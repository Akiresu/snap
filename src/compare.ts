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

  const width = Math.max(basePng.width, snapshotPng.width);
  const height = Math.max(basePng.height, snapshotPng.height);

  const normalizedBase = new PNG({width, height});
  const normalizedSnapshot = new PNG({width, height});

  const diffPng = new PNG({width, height});

  PNG.bitblt(basePng,
      normalizedBase,
      0,
      0,
      basePng.width,
      basePng.height,
      0,
      0
  );

  PNG.bitblt(snapshotPng,
      normalizedSnapshot,
      0,
      0,
      snapshotPng.width,
      snapshotPng.height,
      0,
      0
  );

  const diffPixels = pixelmatch(
    normalizedBase.data,
    normalizedSnapshot.data,
    diffPng.data,
    width,
    height,
    { threshold: 0.1 },
  ) as number;

  const percentage = (diffPixels / (width * height)) * 100;

  return {
    percentage,
    diffBuffer: Buffer.from(PNG.sync.write(diffPng)),
  };
}