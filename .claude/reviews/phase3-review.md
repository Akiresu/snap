# Review: phase3-comparison-and-diff

**Date:** 2026-03-21
**Files reviewed:**
- `src/compare.ts`
- `src/output.ts`
- `src/capture.ts`
- `src/cli.ts`
- `src/pixelmatch.d.ts`
- `tests/compare.test.ts`
- `tests/output.test.ts`

---

## 🔴 Critical

- **File:** `src/cli.ts` | **Lines:** 114 — The pass/fail threshold comparison uses `<=` (`const pass = percentage <= threshold`), but both the SPEC (`docs/SPEC.md` line 118: "If the difference **exceeds** the threshold → FAIL") and TASK.md (line 17: "If percentage **>** threshold: … mark as FAIL") require `>` for a fail. The current code treats a result exactly equal to the threshold as a pass, which is correct, but the logic reads `pass = percentage <= threshold`. This is actually consistent with "exceeds" semantics (strictly greater than fails). This is fine — no bug here. Rescinding as critical.

- **File:** `src/cli.ts` | **Lines:** 86–89 — The `snapshot/` and `diff/` directories are cleared and recreated **after** `captureBaseline` completes when `--compare-to` is used, but **before** `captureSnapshot` is called. This means if `captureSnapshot` was already called inside `captureBaseline`'s sibling flow, the newly created dirs would survive. However, the actual ordering is: (1) optional `captureBaseline`, (2) `rm` + `mkdir` snapshot and diff dirs, (3) `captureSnapshot`. The `captureSnapshot` function itself also calls `mkdir` with `{ recursive: true }` on the snapshot dir (see `capture.ts` line 43–44), meaning the dir is created twice — once in `cli.ts` line 88 and once inside `captureSnapshot`. This is harmless (both use `recursive: true`) but wasteful. Not a bug — downgrading to suggestion.

- **File:** `src/cli.ts` | **Lines:** 107–108 — When a baseline image is missing, the result is pushed with `pass: true` and `skipped: true`. The `getExitCode` function in `output.ts` correctly excludes skipped pages from failure counting. However, the spec (SPEC.md line 120) says "report it as a warning/skip (not a failure)" — this is correctly implemented. No issue.

- **File:** `src/cli.ts` | **Lines:** 112 — `readFile(snapshotPath)` is called without a try/catch. If a snapshot file is missing (e.g., `captureSnapshot` failed silently for a page, or a page was added to config after baseline was captured), this will throw an unhandled exception that bubbles up to `main().catch(...)` and exits with code `1` and a generic error message rather than a structured per-page result. This is a runtime crash for a legitimate edge case.

- **File:** `src/compare.ts` | **Lines:** 21–26 — On a size mismatch, the function returns a `diffBuffer` containing an empty (all-zero pixel data) PNG with the **base** image dimensions. The empty PNG has all pixels at `(0,0,0,0)` — fully transparent black. This is a valid PNG and won't crash anything, but it is written to `diff/<label>.png` as the diff image. Since the comparison returns `percentage: 100` (which exceeds any reasonable threshold), `cli.ts` will write this empty-pixel buffer as the diff image. The diff image will appear blank/transparent rather than showing the actual visual difference. The spec does not prescribe what the diff image should look like on a size mismatch, so this is acceptable behaviour — downgrading to suggestion.

---

## 🔴 Critical (confirmed)

- **File:** `src/cli.ts` | **Lines:** 112 — `await readFile(snapshotPath)` has no error handling. If `captureSnapshot` threw an error partway through (the `try/finally` in `capture.ts` ensures the browser closes but does not catch write errors), or if the file system write failed, a subsequent `readFile` on the missing snapshot file will throw `ENOENT`. This exception propagates to `main().catch`, prints a bare error message, and exits with code `1` — bypassing `printResults` entirely, so the caller gets no structured output for the pages that did succeed. This is a crash-on-legitimate-input scenario.

---

## 🟡 Suggestions

- **File:** `src/compare.ts` | **Lines:** 1–46 — `compare.ts` has no file I/O and no Playwright imports — module boundary is clean. However, the module only exports `compareImages` and the two interfaces. The `PageCompareResult` interface is defined here but is only populated by the caller (`cli.ts`). Conceptually `PageCompareResult` belongs in an output/results module since `compare.ts` never constructs one. Low-impact, but worth noting for future refactoring.

- **File:** `src/compare.ts` | **Lines:** 31–38 — The pixelmatch `threshold` option is hardcoded to `0.1`. This is pixelmatch's per-pixel colour sensitivity (0–1 scale), not the percentage threshold from the config. The value `0.1` is a reasonable default but is not exposed as a parameter. Consider naming it as a constant (e.g., `PIXELMATCH_PIXEL_SENSITIVITY`) to make it clear it is not the same as the user-facing `--threshold` percentage.

- **File:** `src/cli.ts` | **Lines:** 86–89, and `src/capture.ts` | **Lines:** 43–44 — The `snapshot/` directory is created in `cli.ts` line 88 and then again inside `captureSnapshot` (line 43 of `capture.ts`). The double `mkdir` is harmless but the `cli.ts` pre-creation of both dirs is made redundant by `captureSnapshot`'s own `mkdir`. Either rely on the capture functions to create their own dirs (as they already do) or remove the `mkdir` calls from the capture functions. Currently the pattern is inconsistent.

- **File:** `src/cli.ts` | **Lines:** 81–83 — When `--compare-to` is used, `captureBaseline` is called silently (`onPageCaptured: () => {}`). The user gets no console feedback during what may be a long operation (capturing a full baseline). At minimum, a "Capturing fresh baseline from <url>..." log line before the call would help.

- **File:** `src/output.ts` | **Lines:** 7 — The dot padding formula is `Math.max(3, 22 - result.label.length)`. The spec example shows labels like `homepage` (8 chars) getting `..............` (14 dots) with a space before the percentage: `✓ homepage .............. 0.3%`. Counting the spec example: `homepage` is 8 chars, dots are 16 in the spec. The formula gives `22 - 8 = 14` dots. The spec appears to show 16 dots (counting `..............` in the example). This is a cosmetic discrepancy — the spec's example may just be approximate formatting — but it is worth confirming. The current formula is internally consistent and produces readable output.

- **File:** `tests/compare.test.ts` — No test covers the case where `compareImages` is passed a non-PNG buffer (corrupt/invalid input). `PNG.sync.read` will throw in that scenario. Since the function is documented as accepting `Buffer`, and callers (`cli.ts`) always read from files written by Playwright, this is a low-risk gap but worth noting.

- **File:** `tests/output.test.ts` | **Lines:** 91–99 — The test for "all N pages passed" does not include any skipped pages in the results. A test with a mix of passing and skipped pages checking the "all passed" summary would confirm that skips do not count as failures in the summary line.

- **File:** `src/pixelmatch.d.ts` — The declaration file is necessary because pixelmatch ships a CJS module without bundled TypeScript types. The type definitions are accurate against the pixelmatch 5.x API. The `export = pixelmatch` pattern is correct for a CJS default export in a `.d.ts` file.

- **File:** `src/cli.ts` | **Lines:** 124 — `process.exit(getExitCode(results))` is called inside the `if (opts.url)` block. If `opts.base` is set (and `opts.url` is not), the process exits normally after `console.log` with no explicit `process.exit(0)`. This is fine — Node will exit 0 naturally — but it is slightly inconsistent. Low priority.

---

## 🟢 Good Patterns

- Module boundaries are clean: `compare.ts` has zero imports from Playwright or from file system modules. All pixel comparison logic is self-contained and purely functional.
- `capture.ts` uses a `try/finally` block around all Playwright operations, ensuring the browser is always closed even if a page navigation throws. This prevents resource leaks.
- The `cli.ts` threshold comparison (`percentage <= threshold`) correctly implements "fail only if the diff **exceeds** the threshold", matching the spec's wording.
- `getExitCode` correctly treats skipped pages as neutral (neither pass nor fail), consistent with the spec's "warning/skip — not a failure" requirement.
- All constants (viewport names, directory names, default values) are centralised in `constants.ts` — no magic strings appear in `compare.ts`, `output.ts`, or `capture.ts`.
- The `pixelmatch.d.ts` type declaration correctly models the `PixelmatchOptions` interface and uses `export =` for the CJS module shape, enabling clean `import pixelmatch from 'pixelmatch'` usage under `"esModuleInterop": true`.
- Test coverage for `compareImages` is solid: identical images, completely different images, size mismatch, partial diff, and valid PNG output are all covered.
- `printResults` tests are thorough and cover all icon states (pass, fail, skip), dot padding at both extremes, the summary line variants, and threshold formatting.
