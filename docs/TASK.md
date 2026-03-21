# Snap — Implementation Tasks

## Phase 3 — Comparison & Diff

**Goal**: `--url` mode captures snapshots and compares them against existing baseline with pixelmatch. Console shows pass/fail. Diff images generated for failures.

### Prerequisites
- Phase 2 complete, baseline screenshots exist in `output/<viewport>/base/`

### Steps

1. Create `src/compare.ts` — comparison module:
    - For each page label, load `base/<label>.png` and `snapshot/<label>.png` using `pngjs`
    - Handle size mismatches: if dimensions differ, report as fail (100% diff) and skip pixelmatch
    - Run `pixelmatch` to get the number of differing pixels and the diff image buffer
    - Calculate percentage: `(diffPixels / totalPixels) * 100`
    - If percentage > threshold: save diff image to `diff/<label>.png`, mark as FAIL
    - If baseline image missing for a page: report as WARNING/SKIP (not a failure)
    - Return structured results per page: `{ label, percentage, pass, skipped }`

2. Wire up the `--url` flow in `src/index.ts`:
    - Capture screenshots from `--url` into `snapshot/` folder (reuse capture module from Phase 2)
    - Clear `snapshot/` and `diff/` folders before each run
    - Run comparison against `base/`
    - Print results to console

3. Console output format:
   ```
   Snap — comparing against baseline (threshold: 5.0%)

     ✓ homepage .............. 0.3%
     ✓ about ................. 1.2%
     ✗ products .............. 8.7%  → diff saved
     ⚠ contact ............... no baseline

   Result: 1 of 4 pages failed
   ```

4. Exit codes:
    - `0` — all pages pass (warnings are OK)
    - `1` — any page fails

### Verify

```bash
# First, capture baseline
docker compose run snap --base https://example.com

# Compare same site — should all pass with ~0% diff
docker compose run snap --url https://example.com

# Verify exit code
echo $?  # should be 0

# Check that snapshot/ has images but diff/ is empty (no failures)
ls output/desktop/snapshot/
ls output/desktop/diff/
```