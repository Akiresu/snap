# Snap — Visual Regression Testing Tool

## Specification

Full requirements: [docs/SPEC.md](docs/SPEC.md)

**Read the relevant section of the spec before implementing anything.** The spec is the source of truth for behaviour, CLI interface, output structure, and comparison logic.

---

## Development Environment

Everything runs inside a Docker container. **Never run Node, npm, or any project tooling directly on WSL.**

```bash
# Start the container
docker compose up -d

# ALL commands go through docker compose exec
docker compose exec snap npm install
docker compose exec snap npm run build
docker compose exec snap npm test
docker compose exec snap npm run snap -- --base https://example.com
docker compose exec snap npm run snap -- --url https://staging.example.com
docker compose exec snap npm run snap -- --url https://staging.example.com --compare-to https://example.com
```

### Container Details
- **Image**: `mcr.microsoft.com/playwright:v1.58.0-noble` (Node.js LTS + Chromium/Firefox/WebKit)
- **Container name**: `snap-dev`
- **Working directory**: `/app` (bind-mounted from project root)
- **Network**: host mode (full access to VPN, LAN, localhost)
- **Browsers**: Pre-installed at `/ms-playwright` — **never run `playwright install`**

---

## Project Structure

```
snap/
├── CLAUDE.md
├── README.md
├── snap.json                  # Active config (gitignored)
├── snap.example.json          # Config template
├── package.json
├── tsconfig.json
├── docker-compose.yml
├── Dockerfile
├── docs/
│   └── SPEC.md
├── output/                    # Screenshots and diffs (runtime, gitignored)
│   └── <viewport>/
│       ├── base/
│       ├── snapshot/
│       └── diff/
├── src/
│   ├── cli.ts                 # Entry point — CLI parsing, orchestration
│   ├── config.ts              # Load and validate snap.json
│   ├── browser.ts             # Playwright lifecycle, navigation, cookies
│   ├── capture.ts             # Screenshot capture, file I/O
│   ├── compare.ts             # Pixel diff logic, diff image generation
│   └── output.ts              # Console output formatting, exit code
└── tests/
    ├── config.test.ts
    ├── compare.test.ts
    └── output.test.ts
```

### Module Boundaries

| Module | Responsibility |
|--------|----------------|
| `src/cli.ts` | Parse CLI args, validate flag combinations, call capture/compare in the right order |
| `src/config.ts` | Load `snap.json`, validate schema, provide typed config to the rest of the app |
| `src/browser.ts` | Own the Playwright browser/context/page lifecycle. All Playwright API calls live here |
| `src/capture.ts` | Use `browser.ts` to navigate and screenshot each page, write PNGs to the correct output path |
| `src/compare.ts` | Pure pixel comparison logic — no Playwright, no file path assumptions |
| `src/output.ts` | Format console results, determine exit code |

Keep these boundaries clean. `compare.ts` must not import Playwright. `browser.ts` must not know about comparison or CLI args.

---

## Coding Conventions

### TypeScript
- Strict mode enabled (`"strict": true` in `tsconfig.json`)
- No `any` — use `unknown` and narrow properly
- Async/await for all I/O (Playwright, file system). No raw Promise chains
- Named exports preferred over default exports (easier to grep)
- No magic strings — viewport names, output subdirectory names, config defaults all go in a single `constants.ts` if there are more than two

### Key Libraries
- `playwright` — browser automation and screenshots
- `pixelmatch` — pixel-level image comparison (returns diff count, writes diff PNG)
- `pngjs` — PNG encode/decode (required by pixelmatch)
- `zod` — config validation (parse `snap.json` into a typed schema; throw on invalid input)
- `commander` — CLI argument parsing

### Package Rules
- **Stable releases only.** No alpha, beta, RC, or `next` tagged packages
- Pin exact versions in `package.json` (`"pixelmatch": "5.3.0"`, not `"^5.3.0"`) — image comparison results must be reproducible

### Testing
- **Framework**: Vitest (fast, native TypeScript, no transpile step)
- **Unit tests**: config validation, comparison logic (known pixel data), output formatting, viewport lookup
- **Integration tests**: Playwright against a minimal local HTML page served within the test — verifies the full capture → compare → output pipeline
- Tests live in `tests/`, mirroring `src/` structure
- Every public function exported from a module needs a test

---

## CLI Commands Reference

```bash
# Capture baseline
npm run snap -- --base <url>

# Compare against existing baseline
npm run snap -- --url <url>

# Single-command cross-environment compare
npm run snap -- --url <url> --compare-to <base-url>

# With optional flags
npm run snap -- --url <url> --viewport mobile --threshold 3.5
```

Valid `--viewport` values: `desktop` (default), `tablet`, `mobile`.

`--base` and `--url` are mutually exclusive at the top level — but `--compare-to` requires `--url`. Passing an invalid combination must exit with a clear error message, not a stack trace.

---

## Playwright Behaviour (from spec — do not deviate)

- **Wait strategy**: `waitUntil: 'networkidle'` on every navigation
- **Screenshots**: full-page (`fullPage: true`)
- **HTTPS errors**: ignored (`ignoreHTTPSErrors: true`) — required for localhost/staging
- **Browser**: Chromium only
- **Cookies**: set via a dedicated method in `browser.ts` before any navigation. Leave it as a clearly marked `// TODO` placeholder — do not fill in values

---

## Development Workflow

1. Read the relevant section of [docs/SPEC.md](docs/SPEC.md) before starting
2. Check existing modules for patterns before writing new code
3. `npm run build` after every change — zero TypeScript errors before moving on
4. `npm test` — all tests must pass before marking work done
5. If adding a new module, add its boundary to the table in this file

---

## Important Rules

1. **ALL commands run inside the container** via `docker compose exec snap <command>`
2. **Never** run Node, npm, or project tools directly on WSL
3. **Never** run `playwright install` — browsers are pre-installed in the image
4. **Never** add a database — this project has no persistence layer (see spec: "No SQLite or database storage")
5. **Never** generate HTML reports — out of scope per spec
6. **Always** create `output/<viewport>/base|snapshot|diff/` directories before writing to them
7. **Config file**: `snap.json` at project root (see `snap.example.json` for template)
8. **Output path**: `./output/<viewport>/<base|snapshot|diff>/<label>.png` — relative to project root
