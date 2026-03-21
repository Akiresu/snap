import { describe, it, expect } from 'vitest';
import { PNG } from 'pngjs';
import { compareImages } from '../src/compare.js';

function createPng(
  width: number,
  height: number,
  fill: [number, number, number, number],
): Buffer {
  const png = new PNG({ width, height });
  for (let i = 0; i < width * height * 4; i += 4) {
    png.data[i] = fill[0];
    png.data[i + 1] = fill[1];
    png.data[i + 2] = fill[2];
    png.data[i + 3] = fill[3];
  }
  return Buffer.from(PNG.sync.write(png));
}

describe('compareImages', () => {
  it('returns 0% diff for identical images', () => {
    const img = createPng(10, 10, [255, 0, 0, 255]);
    const result = compareImages(img, img);
    expect(result.percentage).toBe(0);
    expect(result.diffBuffer).toBeInstanceOf(Buffer);
    expect(result.diffBuffer.length).toBeGreaterThan(0);
  });

  it('returns ~100% diff for completely different images', () => {
    const base = createPng(10, 10, [0, 0, 0, 255]);
    const snapshot = createPng(10, 10, [255, 255, 255, 255]);
    const result = compareImages(base, snapshot);
    // All pixels differ — percentage should be very high (pixelmatch threshold may reduce exact count)
    expect(result.percentage).toBeGreaterThan(90);
    expect(result.diffBuffer).toBeInstanceOf(Buffer);
  });

  it('returns 100% diff and an empty PNG on size mismatch', () => {
    const base = createPng(10, 10, [255, 0, 0, 255]);
    const snapshot = createPng(20, 20, [255, 0, 0, 255]);
    const result = compareImages(base, snapshot);
    expect(result.percentage).toBe(100);

    // diffBuffer should be a valid PNG with the base dimensions
    const diffPng = PNG.sync.read(result.diffBuffer);
    expect(diffPng.width).toBe(10);
    expect(diffPng.height).toBe(10);
  });

  it('returns a percentage between 0 and 100 for partial differences', () => {
    // Build two 10x10 images where only the top row differs
    const base = new PNG({ width: 10, height: 10 });
    const snapshot = new PNG({ width: 10, height: 10 });

    for (let i = 0; i < 10 * 10 * 4; i += 4) {
      // Same background: white
      base.data[i] = 255;
      base.data[i + 1] = 255;
      base.data[i + 2] = 255;
      base.data[i + 3] = 255;

      snapshot.data[i] = 255;
      snapshot.data[i + 1] = 255;
      snapshot.data[i + 2] = 255;
      snapshot.data[i + 3] = 255;
    }

    // Make the first row of snapshot black (10 pixels out of 100)
    for (let x = 0; x < 10; x++) {
      const idx = x * 4;
      snapshot.data[idx] = 0;
      snapshot.data[idx + 1] = 0;
      snapshot.data[idx + 2] = 0;
      snapshot.data[idx + 3] = 255;
    }

    const baseBuffer = Buffer.from(PNG.sync.write(base));
    const snapshotBuffer = Buffer.from(PNG.sync.write(snapshot));

    const result = compareImages(baseBuffer, snapshotBuffer);
    expect(result.percentage).toBeGreaterThan(0);
    expect(result.percentage).toBeLessThan(100);
    expect(result.diffBuffer).toBeInstanceOf(Buffer);
  });

  it('returns a valid PNG buffer as diffBuffer', () => {
    const base = createPng(5, 5, [100, 100, 100, 255]);
    const snapshot = createPng(5, 5, [200, 200, 200, 255]);
    const result = compareImages(base, snapshot);

    // Should be parseable as a PNG
    expect(() => PNG.sync.read(result.diffBuffer)).not.toThrow();
    const diffPng = PNG.sync.read(result.diffBuffer);
    expect(diffPng.width).toBe(5);
    expect(diffPng.height).toBe(5);
  });
});
