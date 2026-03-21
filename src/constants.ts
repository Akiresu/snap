export const VIEWPORTS = {
  desktop: { width: 1920, height: 1080 },
  tablet:  { width: 768,  height: 1024 },
  mobile:  { width: 375,  height: 812  },
} as const;

export type ViewportName = keyof typeof VIEWPORTS;

export const OUTPUT_DIRS = {
  base: 'base',
  snapshot: 'snapshot',
  diff: 'diff',
} as const;

export const DEFAULT_VIEWPORT: ViewportName = 'desktop';
export const DEFAULT_THRESHOLD = 5.0;
