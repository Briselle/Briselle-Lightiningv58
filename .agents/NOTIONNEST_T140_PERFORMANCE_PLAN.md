# NotionNest — Load Performance & "Failed to fetch": Implementation Plan

**Created:** 2026-08-22
**Status:** AWAITING APPROVAL — no code changed.
**Tasks:** `T140`–`T145`

---

## 0. Measured, not assumed

### Bundle
Route-level lazy loading already exists (`App.tsx:22`), so the problem is not
a missing `lazy()` — it is what that one chunk contains:

| Asset | Size |
|---|---|
| `NotionNestPage-*.js` | **1,154 KB** |
| `NotionNestPage-*.css` | **300 KB** |
| `index-*.js` (shared) | 594 KB |

Nothing renders until all 1.45 MB of that chunk arrives. The four largest
sources inside it:

| Source | Lines |
|---|---|
| `menus/menus.jsx` | 5,157 |
| `blocks/meeting-notes/MeetingNotesBlockBase.jsx` | 4,386 |
| `core/PageContext.jsx` | 1,459 |
| `utils/notionTabs*.ts` (3 files) | ~2,450 |

### Network on mount — the likely "Failed to fetch"
**Per meeting block instance**, on mount:

| Work | Requests |
|---|---|
| `loadAudioFromDam()` → `enterprise_files` | 1 |
| `loadPromptDocument()` → `platform_config` | 1 |
| Signed-URL pre-resolve, **per audio file** | **2** (`getFileMetadata` then `createSignedUrl`) |

`aiPromptConfigService.ts` has **no cache** (grep: 0 hits) — so N meeting
blocks on a page issue N identical `platform_config` queries.

A page with 3 meeting blocks × 10 audio files:
**3 + 3 + 60 = 66 requests fired in parallel on mount.**

That is both the spinner and the intermittent `TypeError: Failed to fetch` —
Supabase rejects or drops requests under that burst, and the raw `fetch`
rejection surfaces unchanged because nothing retries or serialises.

---

## 1. Tasks

### `T140` — Do not pre-resolve signed URLs on mount *(biggest win, smallest change)*
**File:** `MeetingNotesBlockBase.jsx`

The pre-resolve pass exists so `play()` is reached without an `await`
(`T75`). It does not need to run for **every** file at mount — only for the
one about to be played.

- Resolve the FIRST file eagerly, the rest on demand.
- Keep the existing on-click fallback (already written, `startPlayQueue`).
- Cost falls from `2 × N` to `2`.

**Trade-off, stated:** clicking play on a file whose URL is not yet resolved
costs one round-trip before audio starts, exactly as the fallback already
handles. Sixty requests on mount is the worse deal.

### `T141` — Cache the prompt document per page load
**File:** `services/aiPromptConfigService.ts`

Module-level promise cache: N blocks share ONE `platform_config` query.
Invalidated by every write path (`upsertInstruction`, `deleteInstruction`,
`resetInstructionToDefault`, `savePromptDocument`) so an edit is still seen
immediately. Prompts are org-level and change rarely — this is the textbook
case for it.

Cost: N → 1.

### `T142` — One signed-URL call instead of two
**File:** `utility-modules/upload-module/FileService.ts`

`getSignedUrl` calls `getFileMetadata` (a DB round-trip) purely to read
`storagePath` and check `isDeleted`. The loader has **already read that row**
and holds both.

- Add `getSignedUrlFromRow(row)` that skips the lookup.
- Keep `getSignedUrl(fileId)` for callers without a row — no breaking change.

Cost per file: 2 → 1.

### `T143` — Split the bundle
**Files:** `core/BlockRenderer.jsx`, `vite.config`, `App.tsx`

- **Lazy-load the Meeting Notes block.** 4,386 lines that only matter on a
  page that contains one. `BlockRenderer` already dynamic-imports itself in
  the meeting block, so the pattern exists here.
- **Lazy-load `menus/menus.jsx`** behind first interaction. 5,157 lines, and
  the slash menu is not needed to paint the page.
- **`manualChunks`** to split vendor from NotionNest so the app shell caches
  independently of editor changes.

Target: first paint on a chunk well under 400 KB, the rest arriving after.

### `T144` — Make the failure honest and recoverable
**Files:** `MeetingNotesBlockBase.jsx`, `aiPromptConfigService.ts`

`TypeError: Failed to fetch` reaching an error boundary means one rejected
request takes down the view. Instead:

- Wrap mount-time reads so a failure degrades that block, not the page.
- One retry with backoff on a network-class rejection (not on 4xx).
- Show what failed, in place, with a Retry — the pattern already used for
  `audioFilesError` and `audioSttTeaserText`.

### `T145` — Measure it
**File:** `.agents/scripts/measure-bundle.js` *(new)*

Prints chunk sizes and flags any over a threshold, so this is checked rather
than re-discovered. Run alongside `verify-no-tdz.js`.

---

## 2. Order — by value per unit of risk

| Step | Tasks | Effect | Risk |
|---|---|---|---|
| 1 | `T140` + `T141` + `T142` | **66 requests → ~5** | Low — contained, no shared core |
| 2 | `T144` | Failures stop killing the page | Low |
| 3 | `T143` | 1,154 KB → target < 400 KB first paint | **Medium — touches BlockRenderer and the build** |
| 4 | `T145` | Keeps it measured | None |

**Step 1 alone should remove most of the spin and the fetch errors.** I
recommend doing steps 1–2, measuring, and only then deciding whether `T143`
is still needed — splitting the bundle is the riskiest change here and may
prove unnecessary once the request storm is gone.

---

## 3. Verification

- `verify-no-tdz.js`, `verify-meeting-context.js`, `esbuild` parse, `vite build`
- **Before/after request count** on a page with a meeting block, from the
  Network panel — the number that actually matters
- **Before/after chunk sizes** via `T145`
- Manual: audio still plays, prompts still load, an edited prompt is still
  seen immediately (proves the `T141` cache invalidation)

---

## 4. Approve

Recommend approving **steps 1–2** now (`T140`, `T141`, `T142`, `T144`) and
holding `T143` until the effect is measured.
