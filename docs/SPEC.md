# Snap — Visual Regression Testing Tool

## Overview

A CLI-based visual regression testing tool that captures full-page screenshots of web pages and compares them against baseline images, reporting pixel-level differences. Built as a lightweight dev tool — simple, tweakable, not production-grade.

## Tech Stack

- **Node.js / TypeScript** — console application
- **Playwright** — browser automation and screenshots (native Node.js API)
- **pixelmatch** — pixel-level image comparison and diff generation
- **pngjs** — PNG encoding/decoding (required by pixelmatch)
- **commander** — CLI argument parsing
- **Docker + Docker Compose** — same container pattern as the CScraper project
- **CLI command pattern** — same approach as CScraper (command-based with parameters)

## Configuration

Single JSON config file (`snap.json`) at the project root. No named profiles — one config per project.

```json
{
  "pages": [
    { "path": "/", "label": "homepage" },
    { "path": "/about", "label": "about" },
    { "path": "/products", "label": "products" },
    { "path": "/contact", "label": "contact" }
  ],
  "defaultThreshold": 5.0
}
```

- `pages` — array of page paths with human-readable labels (used for file naming)
- `defaultThreshold` — percentage of allowed pixel difference (default: `5.0`)

Page paths are relative — the base URL is always provided via CLI parameter, never stored in config. This allows the same config to be used across environments.

## CLI Commands & Parameters

### Snapshot Command (capture + compare)

```bash
snap --base <url>                          # Capture baseline screenshots (overwrites existing baseline)
snap --url <url>                           # Capture snapshots and compare against existing baseline
snap --url <url> --compare-to <url>        # Single-command: snapshot --url, compare against --compare-to
```

### Parameters

| Parameter         | Required | Description |
|-------------------|----------|-------------|
| `--base <url>`    | No*      | Capture new baseline screenshots from this URL. Overwrites existing baseline images. |
| `--url <url>`     | No*      | Capture new snapshots from this URL and compare against existing baseline. |
| `--compare-to <url>` | No   | Used with `--url`. Takes fresh screenshots from `--compare-to` URL as the baseline, then compares `--url` snapshots against them. Single-command cross-environment comparison. |
| `--viewport <size>` | No    | Viewport preset: `desktop`, `tablet`, `mobile`. Default: `desktop`. |
| `--threshold <n>` | No      | Override the config's `defaultThreshold` for this run. Percentage (e.g., `3.5`). |

*At least one of `--base` or `--url` must be provided.

### Behavior Matrix

| `--base` | `--url` | `--compare-to` | Behavior |
|----------|---------|-----------------|----------|
| ✓        |         |                 | Capture baseline only. Save to `base/`. No comparison. |
|          | ✓       |                 | Capture snapshots to `snapshot/`. Compare against existing `base/`. Generate diffs. |
|          | ✓       | ✓               | Capture fresh baseline from `--compare-to` into `base/` (overwrite). Capture snapshots from `--url` into `snapshot/`. Compare and generate diffs. |

## Viewport Presets

Hardcoded in the application (not configurable via JSON):

| Name      | Width | Height |
|-----------|-------|--------|
| `desktop` | 1920  | 1080   |
| `tablet`  | 768   | 1024   |
| `mobile`  | 375   | 812    |

The `--viewport` parameter selects a preset. Default is `desktop`.

Viewport name is included in the output folder path to keep results separated (e.g., `output/desktop/base/`, `output/mobile/base/`).

## Output Folder Structure

```
output/
  desktop/
    base/
      homepage.png
      about.png
      products.png
      contact.png
    snapshot/
      homepage.png       # refreshed each run
      about.png
    diff/
      homepage.png       # refreshed each run
      about.png
  tablet/
    base/
    snapshot/
    diff/
  mobile/
    base/
    snapshot/
    diff/
```

- `base/` — baseline images. Updated only when `--base` is provided or `--compare-to` is used.
- `snapshot/` — latest screenshots from the current `--url` run. Overwritten each run.
- `diff/` — generated diff images highlighting pixel differences. Overwritten each run. Only created for pages that exceed the threshold.

File names derived from the `label` field in config (e.g., `homepage.png`).

## Comparison Logic

- Compare each `snapshot/<label>.png` against `base/<label>.png` pixel by pixel.
- Calculate the percentage of differing pixels.
- If the difference exceeds the threshold → **FAIL** for that page.
- Generate a diff image highlighting changed pixels and save to `diff/<label>.png`.
- If a baseline image is missing for a page, report it as a warning/skip (not a failure).

## Console Output

Simple pass/fail per page with percentage:

```
Snap — comparing against baseline (threshold: 5.0%)

  ✓ homepage .............. 0.3%
  ✓ about ................. 1.2%
  ✗ products .............. 8.7%  → diff saved
  ✓ contact ............... 0.0%

Result: 1 of 4 pages failed
```

Exit code: `0` if all pass, `1` if any fail.

## Playwright Configuration

- **Wait strategy**: `waitUntil: 'networkidle'` before capturing each screenshot.
- **Screenshot type**: Full-page (`fullPage: true`).
- **SSL/Certificate errors**: Ignore all HTTPS certificate errors (`ignoreHTTPSErrors: true`). Required for localhost testing.
- **Browser**: Chromium (Playwright default).

## Cookie Support

Provide a dedicated method/class for setting cookies on the browser context before navigation. The method should be a clearly marked placeholder with a TODO comment, ready for the developer to fill in specific cookie values later.

```typescript
// Example structure (implementation detail for the agent):
async function setCookies(context: BrowserContext, baseUrl: string): Promise<void> {
  // TODO: Add cookies here as needed
  // Example:
  // await context.addCookies([
  //   { name: 'auth', value: 'token123', url: baseUrl },
  // ]);
}
```

This method must be called before any page navigation occurs, for every run.

## Docker Setup

Follow the same Docker Compose pattern as the CScraper project:

- **Single container**: Based on Playwright's official Docker image (`mcr.microsoft.com/playwright:v1.x-jammy`), which includes Node.js and all browser binaries out of the box
- Shared volume for the `output/` folder so results are accessible from the host
- Shared volume for the config file (`snap.json`)

## Image Comparison Implementation

Use **pixelmatch** with **pngjs** for pixel-level comparison:

- pixelmatch returns the number of differing pixels and can output a diff image buffer directly
- The diff image highlights differing pixels (red on transparent by default — configurable)
- Percentage = `(diffPixels / totalPixels) * 100`

## Non-Requirements (Explicitly Out of Scope)

- No HTML report generation
- No web UI for viewing results
- No SQLite or database storage
- No named profiles or multi-project config
- No configurable viewport sizes (presets only)
- No authentication flows (just cookie placeholder)
- No parallel page capture (nice-to-have, not required)
- No retry logic on navigation failures