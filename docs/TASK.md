# Snap — Implementation Tasks

## Phase 1 — Docker + Scaffolding & CLI

**Goal**: A containerized TypeScript CLI that parses and validates all arguments. No Playwright yet.

### Steps

1. Init Node.js/TypeScript project:
    - `package.json` with dependencies: `playwright`, `pixelmatch`, `pngjs`, `commander`
    - `@types/pngjs` as dev dependency
    - `tsconfig.json` targeting ES2022, output to `dist/`

2. Create `snap.json` example config:
   ```json
   {
     "pages": [
       { "path": "/", "label": "homepage" }
     ],
     "defaultThreshold": 5.0
   }
   ```

3. Create CLI entry point (`src/index.ts`):
    - Use `commander` to define all parameters: `--base`, `--url`, `--compare-to`, `--viewport`, `--threshold`
    - Validate the behavior matrix:
        - At least one of `--base` or `--url` must be provided
        - `--compare-to` requires `--url`
        - `--viewport` must be one of: `desktop`, `tablet`, `mobile` (default: `desktop`)
    - Load and parse `snap.json`
    - Print parsed config and arguments to console (temporary, for verification)

4. Define viewport presets as a constant:
   ```typescript
   const VIEWPORTS = {
     desktop: { width: 1920, height: 1080 },
     tablet: { width: 768, height: 1024 },
     mobile: { width: 375, height: 812 },
   };
   ```

### Verify

```bash
# Should print parsed args and config
docker compose run snap --base http://example.com
docker compose run snap --url http://example.com
docker compose run snap --url http://example.com --compare-to http://prod.example.com
docker compose run snap --url http://example.com --viewport mobile --threshold 3.5

# Should fail with validation error
docker compose run snap
docker compose run snap --compare-to http://example.com
docker compose run snap --url http://example.com --viewport invalid
```