# Snap — Implementation Tasks

## Phase 2 — Screenshot Capture

**Goal**: `--base` mode captures full-page screenshots and saves them to the correct output folder.

### Prerequisites
- Phase 1 complete and working in Docker

### Steps

1. Create `src/capture.ts` — screenshot capture module:
    - Launch Chromium with `ignoreHTTPSErrors: true`
    - Create browser context with the selected viewport preset
    - Call the cookie placeholder before navigation (see step 2)
    - For each page in config:
        - Navigate to `baseUrl + page.path` with `waitUntil: 'networkidle'`
        - Take full-page screenshot (`fullPage: true`)
        - Save as `output/<viewport>/base/<label>.png`
    - Close browser when done

2. Create `src/cookies.ts` — cookie placeholder:
   ```typescript
   import { BrowserContext } from 'playwright';

   export async function setCookies(context: BrowserContext, baseUrl: string): Promise<void> {
     // TODO: Add cookies here as needed
     // Example:
     // await context.addCookies([
     //   { name: 'auth', value: 'token123', url: baseUrl },
     // ]);
   }
   ```

3. Wire up the `--base` flow in `src/index.ts`:
    - When `--base` is provided: call capture with the base URL, save to `base/` folder
    - Ensure the output directory structure is created (`output/<viewport>/base/`)

4. Add console output for capture progress:
   ```
   Snap — capturing baseline (desktop)

     ✓ homepage
     ✓ about
     ✓ products

   Baseline saved: 3 pages
   ```

### Verify

```bash
# Should create output/desktop/base/homepage.png
docker compose run snap --base https://example.com

# Check the file exists on host
ls -la output/desktop/base/

# Test mobile viewport
docker compose run snap --base https://example.com --viewport mobile
ls -la output/mobile/base/
```