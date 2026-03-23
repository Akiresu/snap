# Snap — Visual Regression Testing Tool

A CLI tool that captures full-page screenshots of web pages and compares them against baseline images, reporting pixel-level differences. Built with Node.js and Playwright.

## Quick Start

```bash
# 1. Build and start the dev container
docker compose up -d --build

# 2. Copy the example config and edit it
cp snap.example.json snap.json
# Edit snap.json with your page paths

# 3. Install dependencies
docker compose exec snap npm install

# 4. Capture a baseline
docker compose exec snap npm run snap -- --base https://example.com

# 5. Later, compare against the baseline
docker compose exec snap npm run snap -- --url https://staging.example.com
```

## CLI Usage

```bash
snap --base <url>                          # Capture baseline screenshots
snap --url <url>                           # Capture snapshots and compare against baseline
snap --url <url> --compare-to <url>        # Capture baseline from --compare-to, compare with --url
```

### Parameters

| Parameter              | Description |
|------------------------|-------------|
| `--base <url>`         | Capture new baseline screenshots. Overwrites existing baseline images. |
| `--url <url>`          | Capture snapshots and compare against existing baseline. |
| `--compare-to <url>`   | Used with `--url`. Takes fresh screenshots from this URL as the baseline, then compares against `--url`. |
| `--viewport <preset>`  | `desktop` (default), `tablet`, or `mobile`. |
| `--threshold <n>`      | Override `defaultThreshold` for this run (percentage, e.g. `3.5`). |

At least one of `--base` or `--url` must be provided.

### Viewport Presets

| Name      | Width | Height |
|-----------|-------|--------|
| `desktop` | 1920  | 1080   |
| `tablet`  | 768   | 1024   |
| `mobile`  | 375   | 812    |

## Configuration

Single JSON config file (`snap.json`) at the project root:

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

The base URL is always provided via CLI — never stored in config. This lets you reuse the same config across environments.

## Output

Results are written to `output/<viewport>/`:

```
output/
  desktop/
    base/        # baseline images (updated with --base or --compare-to)
    snapshot/    # latest screenshots from --url (overwritten each run)
    diff/        # diff images for pages that exceeded the threshold
  tablet/
  mobile/
```

Console output per run:

```
Snap — comparing against baseline (threshold: 5.0%)

  ✓ homepage .............. 0.3%
  ✓ about ................. 1.2%
  ✗ products .............. 8.7%  → diff saved
  ✓ contact ............... 0.0%

Result: 1 of 4 pages failed
```

Exit code: `0` if all pass, `1` if any fail.

## Docker Setup

The dev container is based on the official Playwright Node image and includes Node.js LTS, Chromium/Firefox/WebKit, and SQLite CLI.

**Network mode: host** — the container shares WSL's network, so VPN hosts, localhost services, and LAN addresses are all reachable without extra config.

```bash
docker compose up -d               # Start container
docker compose exec snap bash      # Shell into container
docker compose down                # Stop container
docker compose up -d --build       # Rebuild after Dockerfile changes
```

## Project Structure

```
snap/
├── snap.json              # Active config (gitignored)
├── snap.example.json      # Config template
├── output/                # Screenshots and diffs (runtime, gitignored)
└── src/                   # Application source
```

## Tech Stack

- Node.js (LTS)
- Playwright (Chromium) — headless browser and screenshot capture
- Docker — containerised dev environment

## Documentation

- [Claude Code Guide](CLAUDE.md)
