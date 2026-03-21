import { readFile } from 'fs/promises';
import { z } from 'zod';

const PageSchema = z.object({
  path: z.string(),
  label: z.string(),
});

const SnapConfigSchema = z.object({
  pages: z.array(PageSchema).min(1),
  defaultThreshold: z.number(),
});

export type SnapConfig = z.infer<typeof SnapConfigSchema>;

export async function loadConfig(): Promise<SnapConfig> {
  const raw = await readFile('snap.json', 'utf-8');
  const parsed = JSON.parse(raw) as unknown;
  return SnapConfigSchema.parse(parsed);
}
