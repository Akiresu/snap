# Snap — Implementation Tasks

## Phase 4 — Cross-Environment Comparison

**Goal**: `--url` + `--compare-to` mode captures fresh baseline from one URL and snapshots from another in a single command.

### Prerequisites
- Phase 3 complete and comparison logic working

### Steps

1. Wire up the `--url` + `--compare-to` flow in `src/index.ts`:
    - Capture baseline from `--compare-to` URL into `base/` (overwrites existing)
    - Capture snapshots from `--url` into `snapshot/`
    - Run comparison (reuse existing compare module)
    - Same console output and exit codes as Phase 3

   This should require minimal new code — just orchestrating the existing capture and compare functions in sequence.

### Verify

```bash
# Compare two different sites in one command
docker compose run snap --url https://staging.example.com --compare-to https://example.com

# Should see diffs if the sites differ
ls output/desktop/diff/

# Verify baseline was updated from --compare-to
ls output/desktop/base/
```

---

## Notes for Claude Code

- All development and testing happens inside Docker. Do not install Node.js, Playwright, or browsers on the host/WSL.
- The `output/` folder is shared via volume mount — screenshots must be accessible from the host filesystem.
- Keep the code simple and flat. Minimal abstraction. This is a dev tool, not a framework.
- Use `async/await` throughout. No callbacks.
- Handle errors gracefully but simply — `console.error` and `process.exit(1)` is fine.
- Each source file should have a single clear responsibility: `index.ts` (CLI + orchestration), `capture.ts` (Playwright screenshots), `compare.ts` (pixelmatch diffing), `cookies.ts` (placeholder).