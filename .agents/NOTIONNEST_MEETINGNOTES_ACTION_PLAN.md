# NotionNest › MeetingNotesBlock — Action Plan & Handover

**Created:** 2026-08-16 | **Last Modified:** 2026-08-16
**Module:** `briselle-lightining.client/src/modules/notion-nest/blocks/meeting-notes/`
**Status:** `T70`–`T76` **IMPLEMENTED** (awaiting the user's manual accept/reject).
Backlog in §2 unchanged.

## Completion log — 2026-08-16

| ID | Status | Notes |
|---|---|---|
| `T75` | ✅ Done | *Supersedes `T72`.* Signed URLs are pre-resolved when the DAM list loads, so the click path has no `await` at all. |
| `T72` | ⛔ Superseded | Its stated fix could not work — see the revision note below. |
| `T70` | ✅ Done | `AudioController` is the one player; `AudioPlayerBar.jsx` deleted; the never-live render in `TranscriptPanel` removed. |
| `T76` | ✅ Done | *New.* Both players merged into one `Briselle Audio Controller` with user-switchable `simple` / `full` variants. |
| `T71` | ✅ Done | 106-line `.nnr-player-*` block retired; slimming overrides scoped to `.nnr-audio-player-row`. |
| `T73` | ✅ Done | `hooks/useIsOffscreen.js`; pill now a fallback, not a permanent overlay. |
| `T74` | ✅ Done | Floating dock reuses `useIsOffscreen`. Implemented as a **remote**, not a second player — see the revision note. |
| `T77` | ✅ Done | *New.* DAM loader read six columns that do not exist. One root cause behind the wrong filename, "select one selects all", undeletable files, duplicate rows and the playback error. |

### `T77` — the DAM loader read columns that do not exist

`enterprise_files` has **`file_id`** as its primary key and keeps everything
else inside JSONB documents (`scripts/enterprise_files_v2_schema.sql:13`).
There is no `id`, `original_filename`, `file_url`, `cdn_url`, `file_size` or
`duration_seconds` column. The loader read all six. Each returned `undefined`,
and that single mapping error produced every reported symptom:

| Symptom | Mechanism |
|---|---|
| Everything named "Audio Recording" | `fileInfo.name` does not exist — the key is `displayName` |
| Clicking one file selects all | `id: row.id` → `undefined`; `selectedAudioFileIds.includes(undefined)` is true for every row |
| Deleted files return after refresh | `FileService.delete(undefined)` bails before touching the DB — and `.catch(() => {})` hid it |
| Playback error | `FileService.getSignedUrl(undefined)` returns `''`, so there is no source |
| 5 copies of the same file | the merge matched on `fileId`, which was `undefined` on every DAM row, so each refresh appended them again |

Correct mapping: `row.file_id`, `file_information.displayName`,
`physical_metadata.fileSize`, `physical_metadata.duration`.

Also in `T77`:
- **Filename** is now `Recording <YYYY-MM-DD HH-MM-SS>.webm` in local time, per
  the agreed rule. The stored object is still `<fileId>.webm`, so the display
  name never reaches the storage path.
- **The DB is the source of truth.** The loader reconciles instead of merging:
  active DAM rows win, a local record claiming a `fileId` the DB no longer
  returns is dropped, and ghosts with no `fileId`/`data`/`url` are purged —
  including from `localStorage`, which was re-seeding them on every mount.
  A 2-minute grace window keeps a just-recorded file safe from a stale read.
- **Soft delete is awaited and checked.** The UI only forgets a file once the
  database has marked it deleted; a refusal is reported in the list.
- `audioUrl` removed from the loader effect's deps — it re-ran the query every
  time a recording finished, racing the row it had just inserted.

**Verified path** (unchanged, matches the agreed rule):
`00000000-0000-0000-0000-000000000000/NotionNest/MeetingNotesBlock/<fileId>.webm`
— `block.id` is not a UUID, so `ensureUuid` substitutes the system UUID.

### `T78` — every recording was uploaded as a ZERO-BYTE file

`startRecording` calls `mr.start()` with **no timeslice**, so
`ondataavailable` fires exactly once — during the flush that
`MediaRecorder.stop()` triggers **asynchronously**. `stopRecording` called
`stop()` and built the Blob on the very next line, while
`audioChunksRef.current` was still empty.

Every recording therefore uploaded as a 0-byte `audio/webm`. It inserted a
row, uploaded an object, and produced a valid signed URL — nothing in the DAM
chain reported a problem. The only symptom was the player refusing to play at
`00:00 / 00:00`.

Fixed by moving the blob construction and the whole persist path into
`recorder.onstop`, with:
- a one-shot guard so a double `onstop` cannot upload twice;
- an explicit 0-byte rejection, so an empty recording is reported instead of
  being stored as an unplayable row;
- microphone release deferred until after the flush — stopping the tracks
  immediately after `stop()` can truncate or empty the final chunk;
- `<audio onError>` reporting the real `MediaError` code. A rejected `play()`
  promise cannot distinguish "no source" from "corrupt source", which is why
  this went unnoticed.

Also in `T78`:
- **Duplicate error message.** `MeetingAudioPlayer` rendered `playerError` and
  `AudioController` rendered its own `playError`, so one failure appeared
  twice. The controller now owns the display and takes the host's message
  through an `error` prop.
- **Full-variant repositioning**, to the requested layout:
  `line 1` file name at the left edge · variant toggle, volume, close at the right;
  `line 2` queue count at the left · equalizer at full stretch, **double
  density** (2px pitch instead of 4px) · elapsed/total/remaining · transport
  (prev, play, stop, next) at the right edge.
  The Music icon badge was dropped so the name genuinely starts the line.
  **Interpretation to confirm:** "toggle for minimal version" and "expand" were
  read as one control — `⤡` collapses to simple, `⤢` expands back to full.

### `T79` — the T78 layout was built but never rendered

The repositioning shipped in `T78` was correct and was never visible, for
two separate reasons.

1. **`playerVariant` defaulted to `'simple'`.** The block rendered the
   one-line minimal view unless the toggle had been clicked, so the two-line
   layout simply never appeared. The full controller is the default now;
   `'simple'` is the mode the user opts into. (A block that already persisted
   `audioPlayerVariant: 'simple'` keeps it — click `⤢` once.)

2. **The equalizer bars were clipped.** Bar heights were pixel values
   computed against a fixed 48px container, but the `T71` slimming override
   sets the container to ~32px inside the meeting block, and the container is
   `overflow: hidden`. Bars up to 44px were cut off top and bottom. Bar
   heights are now **percentages of the track**, so the waveform fits
   whatever height a host gives it. `heightScale` no longer doubles up with
   the container height — `compact` selects the track height in CSS and the
   bars follow.

Also: `.nnr-audio-player-row .bac-waveform-container` (specificity 0,2,0)
outranked `.bac-waveform-compact` (0,1,0), so the one-line view was being
given the two-line view's track height. Now scoped per variant.

### `T80`–`T82` — transport parity, auto-transcript tab, auto-summary

- **`T80`** One `transportGroup` definition rendered by both variants, in the
  compact style, on the right-hand side of each. The full variant's 32px
  brand-filled play button is gone; `.bac-btn-simple-main` is no longer scoped
  to `.bac-simple`. Simple-variant order is now
  `count · name · equalizer · time · volume · transport · toggle · close`.
- **`T81`** `startTranscribe` (all three modes) and `resumeRecording` set
  `viewMode = 'transcript'`, so starting from Summary or Notes no longer
  captures lines out of sight.
- **`T82`** Stopping always runs the summary. `stopRecording` reads the final
  transcript from `transcriptLinesRef` — the state setters above it have not
  flushed, so the closure's copy is a render behind and would drop the last
  lines — then calls `handleGenerateSummary` through a ref (it is declared
  ~600 lines later; a direct call is a temporal-dead-zone hazard).
  `handleGenerateSummary` already collated transcript + notes, resolved the
  configured instruction prompt and called Groq, so this is wiring, not a
  second implementation.

  The Groq call is now **streamed**. That is what makes the progress
  checklist honest: each section row is a heading the model has actually
  emitted, with the streamed body text as its detail line. A non-streamed
  call could only drive a fabricated checklist ticking itself off on a timer.
  Steps and their real triggers:

  | Row | Completes when |
  |---|---|
  | Saving audio recording | the DAM upload promise resolves (omitted in transcript-only mode) |
  | Transcribing | recognition stopped |
  | Reading transcript and notes | inputs collated |
  | Analyzing transcript and notes | the first streamed token arrives |
  | one row per section | the next heading arrives |

  A failed step shows a cross and its reason. The local template fallback
  reports itself as a failure of the AI step rather than passing as a summary.

  New: `summary/SummaryProgress.jsx`. `SummaryTab` shows it in place of the
  old centred spinner, which could not distinguish slow from stalled.

### `T83` — the Ziva API key was never resolved, so nothing ever reached a provider

`getZivaApiConfig` called `ZivaApiRouterService.getProviderForScope()` and
`.getActiveProvider()`. **Neither method exists** on that service — its real
surface is `getProviders` / `getKeyForModuleScope` / `getAllAvailableModels`.
Both calls sat behind `typeof … === 'function'` guards, so both were silently
skipped, and the code fell through to reading localStorage keys
`ziva_api_key_groq` / `ziva_groq_api_key` / `groq_api_key` — none of which the
router writes either (it uses `briselle_groq_key`, and normally the provider
registry itself).

The API key was therefore **always empty**, every request was skipped, and
every summary came from the local template.

**Routing contract, now implemented in `zivaApiRouterService.js`** as
`getPipesForScope(scopeTag)` / `getTopPipeForScope(scopeTag)` — platform-level,
because STT, summarization, chat and translation all route identically:

1. query every configured provider;
2. keep those that are active, hold an API key, **and declare the requested
   module scope**;
3. order into a sequence — explicit `priority`, else configuration order;
4. return fully resolved pipes (key, `baseUrl`, scope-appropriate model);
   callers push to pipe #1.

`_modelForScope` picks an `stt` model for the STT scope and a `chat` model
otherwise. Pipes with no resolvable endpoint are dropped rather than left to
fail on an empty URL.

**Consequences in the meeting block:**
- The request goes to the **pipe's own `baseUrl`**. The Groq URL was hardcoded,
  so any other Ziva provider would have been sent to Groq with its key.
- **The local template fallback is deleted.** A fabricated summary that looks
  like AI output is worse than none — once saved it is indistinguishable from a
  real one, and it is what masked this bug. A failure now writes nothing.
- A non-OK response reports the provider's own error message; previously a bad
  key or unknown model silently produced a "successful" template summary.
- New `Routing to <provider>` step names which pipe served the request, and
  how many were available.
- With no provider enabled for the scope, the checklist says exactly that and
  what to configure.

### `T84` — scope matching now accepts the label the UI shows

`ZivaApiSettingsModal` stores scope **ids** (`handleToggleScope(scope.id)`) and
only *renders* the label, so a registry written there holds `summarization`.
But a registry written by any other path — an older build, an import, a
hand-edited entry — can hold `Meeting Notes Summarization` instead, and an
exact `scopes.includes('summarization')` then reports the provider as not
enabled while the settings screen plainly shows the scope ticked.

`providerHasScope(provider, scopeTag)` matches the id, the full label, and the
label without its parenthetical qualifier, case- and whitespace-insensitively.
`getPipesForScope` **and** `getKeyForModuleScope` both use it, so STT, chat and
translation callers are covered by the same fix.

`getScopeDiagnostics(scopeTag)` reports why a scope failed to resolve —
provider count, how many declare the scope, which lack a key, which are switched
off, and every distinct scope string in the registry. The meeting block turns
that into a specific message instead of one blank "unavailable", and logs the
full diagnostics to the console. A single undifferentiated failure message is
what made `T83` take three rounds to find.

### `T85` — checklist hides once the summary lands

The progress list is scaffolding: once the summary is on screen it has served
its purpose and only pushes the content down. It is now shown while generating
and hidden on success.

**Exception — a failed run keeps it.** There is no summary to show, and the
failed row carries the only explanation of what went wrong (which provider was
tried, what it returned). Hiding it there would leave a bare "No summary
generated yet" with no reason, which is the failure mode `T83`/`T84` existed to
end. `resetSummarySteps` clears it on the next run either way.

Also fixed: completed section rows kept a stale half-sentence preview.
`setSummaryStep` merges its argument and skips an `undefined` detail, so the
detail written while a section was streaming survived its completion. Sections
now clear it explicitly, leaving the preview only on the row being written.

### `T86`/`T87` — tab row palette, and the empty strip under the header

**`T86` — the CSS was already right; inline styles were beating it.**
`NotionNestPage.css` carried a correct Notion palette for
`.nnr-notion-tab-bar` and `.nnr-tab-btn-pill` (`#6b6b6b` / `#37352f` /
`#f7f7f5`). Every pill in `MeetingTabBar` then set the same properties
**inline** with a slate-and-blue palette (`#64748b`, `#0f172a`, white pill +
box-shadow), and inline style beats any selector short of `!important`. The
right-hand icons each carried their own inline colour too, which is why the
audio-files icon looked unrelated to its neighbours. Inline styles removed;
one palette, no accent blue:

| token | value | used for |
|---|---|---|
| ink | `#37352f` | active label, icon on hover |
| muted | `#787774` | resting label and icon |
| hover surface | `#f1f1f0` | pill and icon hover |
| active surface | `#ececeb` | selected pill, open menu |
| hairline | `#e9e9e7` | row bottom border |

- Active pill was `#191919`; now the same ink as hover, so the row reads as
  one family.
- **The Transcript tab looked heavier than the others when active** because
  its mic overlay is the only *filled* glyph in the row — same colour value,
  much more mass. It is now held a step lighter, and its disc matches the pill
  surface instead of always being white.
- Tab icons rest at 0.75 opacity and firm up with their label.
- `.nnr-af-badge` was `#2383e2`; the count is a fact, not an alert.
- `.nnr-summary-icon-btn` hover/focus and the Summary tab's empty-state
  button were the last `#2383e2` / `#0070d2` in the view.
- New `.nnr-tabrow-icon-btn` gives audio-files and settings one shared
  appearance, with an `active` state while their menu is open.

**`T87` — the blank band between the header and the content.**
`TranscriptToolbar` is mounted on every tab so recording and playback controls
stay reachable, but it only ever holds three things: the Original/Translated
switch, the translate popover, and the live recording controls. With none of
them present it still rendered its own padding, background and bottom border —
a ~40px empty strip under the tab row. It now renders only when it has
content. (The `.nnr-transcript-toolbar:empty` rule elsewhere was an attempt at
this, but `:empty` never matched: the element always had its wrapper divs.)

**Already correct — hiding the old summary while regenerating.** Summary
content is gated on `!isGeneratingSummary`, so the previous text is replaced by
the checklist for the duration of the run and the new summary appears in one
step. Verified, not changed.

### `T88` — the white band, actually found this time

`T87` blamed the empty transcript toolbar. That strip was real and removing it
was correct, but it was **not** what produced the visible gap. Three top
spacings were stacking before the first heading:

```
.nnr-tab-content      padding-top 14px
.nnr-summary-content  padding-top 16px
.mt-rich-text h2      margin-top  14px
                    = 44px
```

`.nnr-tab-content` is declared **twice** in `NotionNestPage.css` — line ~9782
(`12px`) and line ~17141 (`14px`). The later wins, so reading the first
declaration understates the gap. This is the duplicate-definition hazard
already listed in §5 item 5.

Fixed with `.nnr-tab-content.nnr-summary-tab { padding-top: 0 }`, a
`padding-top: 0` on `.nnr-summary-content`, and a first-child margin reset on
the generated markdown. The compound selector is required — `.nnr-summary-tab`
alone ties `.nnr-tab-content` on specificity and loses on source order. The
tab's `minHeight` inline style moved here too, so the spacing above the
summary is decided in one place.

**Icon standardisation.** The generate/regenerate button was still
`.nnr-summary-icon-btn` — a bordered white box in a row of borderless icons.
It now uses the shared `.nnr-tabrow-icon-btn` with a `:disabled` state added,
and the dead ruleset was deleted rather than left behind.

**Process note:** `T87` was reported as fixed without confirming the gap had
actually closed — the toolbar was a real defect standing next to the real
cause. Measure the specific symptom, not a plausible nearby one.

### `T89`/`T90` — recording pill timing + placement, and the idle prompt

**`T89a` — the pill arrived seconds late.** `useIsOffscreen` watched
`entry.isIntersecting`, which stays **true** while any sliver of the element
is still in view; `threshold` only decides when the callback *fires*, not what
`isIntersecting` reports. So the pill waited until the inline controls had
scrolled entirely past the edge — on a slow scroll, seconds after they stopped
being usable. The hook now takes `minVisible` and compares
`intersectionRatio`, with thresholds registered at both crossings.
`RecordingPill` and the audio dock pass `minVisible: 1`, so the fallback
appears the moment its control is even partly clipped. Stop is the control at
stake; early beats late.

**`T89b` — the pill was tab-scoped.** It was mounted inside
`TranscriptPanel`, so it existed only while the Transcript tab was open — the
one tab where the inline controls are already on screen and the pill is least
needed. Leaving that tab removed the only visible Stop button. A recording is
block state, not tab state: it is now mounted by the Base, inside a new
`transcript/RecordingOverlays.jsx`.

**`T90` — "Still there?"** After 15s (`SILENCE_NOTICE_MS`) with no
transcription activity while recording, a dark card offers *Go to meeting
note* / *Stop*, with a dismiss.

- Silence is measured from **real activity** — a committed line or an interim
  result — not from a timer started at record time, so a continuously-talking
  meeting never sees it.
- **Paused is exempt.** A deliberate silence is not an idle one.
- Dismiss applies to the current silence only; the flag clears the moment
  speech resumes, so a later silence re-arms it.
- `RecordingOverlays` stacks the notice above the pill in one flex column, so
  neither needs to know the other's height and the pill can still expand on
  hover. `.nnr-rec-pill` therefore drops its own `position: fixed` and becomes
  a flow item; the stack is `pointer-events: none` so an empty column cannot
  swallow clicks.

**Wording deviation, flagged:** the reference reads *"Notion AI is recording
your audio…"*. Naming a competitor's product inside Briselle would be wrong,
and §7 states Notion is inspiration and not to be copied — so the string is
**"Ziva AI is recording your audio but hasn't heard from you in a while."**
Layout, tone and actions match the reference. Say the word if a different
product name is wanted.

### `T91` — idle notice fired instantly; stack widths did not match

**The notice appeared as soon as recording started.** `lastSpeechAtRef` was
seeded at **component mount** and only re-stamped by speech. A block open for
longer than `SILENCE_NOTICE_MS` before Record was pressed was therefore
already "silent" by that measure, so the notice appeared on the first
one-second tick rather than after fifteen seconds of quiet.

The speech-reset effect could not cover it: with no speech yet, neither
`interimText` nor the line count changes when recording begins, so it never
re-ran. The window now restarts inside the interval effect — i.e. every time
recording starts or resumes.

**Width parity.** The notice was a fixed 340px while the pill was
`fit-content`, so the two floating cards never lined up — and the pill changed
width on hover as its detail row was revealed, shifting under the notice. One
width now lives on `.nnr-rec-stack` (`min(92vw, 340px)`) and both children fill
it, so they share an edge and the pill no longer resizes on hover. 340px is the
narrowest width that keeps the notice body to two lines.

Inside the wider pill, the waveform takes the slack (`flex: 1 1 auto`) while
the timer and stop button stay pinned right, instead of everything bunching at
the left edge.

### `T100` — token budget: it was never the prompt

Reported: *"Request too large … TPM: Limit 12000, Requested 20450"*.

The arithmetic, for the record:

| Part | Tokens | Share |
|---|---|---|
| `max_tokens` **reserved completion** | 4,096 | 20% |
| System message (the Auto instruction) | 155 | **0.8%** |
| Transcript + notes | ~16,199 | 79% |

Exactly **one** instruction is sent — two messages, one system with a single
resolved `instructionPrompt`, one user. The instruction is under 1% of the
request; the transcript is effectively all of it.

The non-obvious part is that Groq counts `max_tokens` — the *reserved*
completion, not the completion actually produced — toward the per-minute
budget. A 12k tier with 4096 reserved leaves ~8k for input.

**Fixes:**
- `max_tokens` 4096 → **2048**. These summaries run far under 2048, so the
  larger reserve was buying nothing and costing input headroom.
- **Try whole, split only if refused.** Most meetings fit in one request and
  keep costing one. Only a provider refusal on size triggers chunking, so the
  cost is never paid speculatively and no limit is guessed.
- The provider's stated ceiling is **parsed from its own error**
  (`Limit 12000`) rather than hardcoded.
- Map-reduce: each part is summarised keeping decisions/actions/names/numbers,
  then the parts are synthesised with the chosen instruction. Streaming stays
  on the synthesis, so the section rows are still real headings.
- A per-minute limit hit mid-way is a **wait, not a failure** — one paced
  retry past the window before giving up, so the parts already summarised are
  not thrown away.
- The `callZivaChat` helper now holds the request/stream logic once, instead
  of it being inline in `handleGenerateSummary`.
- Failures report on their own `error` row. Marking `analyze` failed would
  have flipped a step that genuinely completed, since the split path fails
  later — at a part, or at the synthesis.

**Verified against the reported case:** a 30k-token transcript splits into 3
parts, every part inside budget, worst-case request 11,996 tokens (under
12,000), no content lost, and a pathological single 100k-character line
hard-splits rather than producing an unsendable chunk.

### NOT implemented — cascade delete on block deletion

The rule *"upon deleting the block the entire files under that block is marked
as deleted"* has **no implementation anywhere**. `PageContext.deleteBlock`
(`core/PageContext.jsx:322`) never touches `enterprise_files`, and there is no
`deleteByBlockId` on `FileService`. Deleting a meeting block today orphans its
rows as Active. Needs a `FileService.softDeleteByBlockId(blockId)` plus one
call in `deleteBlock` — a shared core file, so it needs approval first.

### Why `T72` was superseded by `T75`

`T72` said to move the `getSignedUrl` call inside the click handler. That
cannot work: the `await` **is** the network round-trip, so wherever it sits
the click's transient activation is already spent by the time `play()` runs.

The actual cause is upstream — `MeetingNotesBlockBase.jsx` loads DAM rows with
`url: phys.file_url || row.file_url || row.cdn_url || ''`, which is `''` for a
private bucket. `T75` resolves those URLs when the files load, so by click time
`url` is populated and `play()` is reached synchronously. Signed URLs expire,
so they are held in component state and deliberately never persisted.

### Why the `T74` mini-player is a remote, not a player

Two `<AudioController>` instances with the same `src` = two `<audio>` elements
playing at once. Moving the single instance into the dock instead would unmount
and remount it, resetting playback to 00:00 on every scroll past. So the
controller stays mounted inline and the dock drives the same queue handlers.

### Also found and fixed

- The `AudioController` render in `TranscriptPanel` passed `audioUrl` /
  `onPlayPause` / `audioDuration` / `recording`; the real props are `src` /
  `onPlay` / `onPause` / `duration`. It never received a `src`, so its
  `<audio>` element never rendered. It was not a redundant player — it was a
  player that could not play.
- `AudioController` swallowed every `play()` rejection with `.catch(() => {})`
  (bug class #8 below). It now reports through an optional `onError` prop and
  an inline message.
- `MeetingNotesBlockBase` imported `AudioController` and never rendered it.
- The play queue holds **ids**, not record copies. Copies went stale the moment
  the pre-resolve pass patched a URL into `audioFiles`, leaving the queue with
  the url-less snapshot.

### Still outstanding

- `playAudio` / `pauseAudio` / `seekAudio` / `legacyPlayAudioFile` in the Base
  all poke `audioRef`, which is attached to no rendered element. They are now
  fully orphaned. Removing them crosses the 100-line safety threshold, so they
  were left in place for a separate approved pass.
- `outputDevices` is never enumerated, so `AudioController`'s speaker selector
  renders nothing. Inert, not broken.
- `RecordingPill` mounts inside `TranscriptPanel`, so it cannot appear while
  the user is on the Summary or Notes tab. Pre-existing; the inline controls in
  `TranscriptToolbar` do render on every tab, so nothing is unreachable.

> Read `.agents/rules/briselle-global-rules.md` and
> `.agents/rules/briselle-enterprise-architecture.md` first. In particular:
> **Thumb Rule #4 — no code changes without an approved Implementation Plan.**
> This document *is* that plan for `T70`–`T74`; confirm scope with the user
> before starting, and re-plan anything not listed here.

---

## 1. Parked tasks — implement in this order

### `T72` — Fix blocked audio playback  *(do first: this is the blocker)*

**Symptom:** clicking Play shows *"Playback blocked by the browser"*.

**Root cause (confirmed, not a guess):** in `transcript/AudioPlayerBar.jsx` the
code awaits a network call before calling `play()`:

```js
playable = await FileService.getSignedUrl(current.fileId);  // network round-trip
await el.play();                                            // activation already spent
```

Browsers grant *transient user activation* for a few seconds after a click.
Awaiting the signed-URL fetch consumes that window, so `play()` is refused.
The user's click did happen — the code discards its activation.

**Fix:** resolve the signed URL **inside the click handler**, before the queue
is set, so `play()` runs with activation intact. Cache the resolved URL on the
record so replays skip the round-trip. Keep the inline error messages — they
are the only reason this failure became visible at all.

**Files:** `MeetingNotesBlockBase.jsx` (`playAudioFile`, `playSelectedAudioFiles`),
`transcript/AudioPlayerBar.jsx`

---

### `T70` — Adopt `AudioController` as *the* playback controller

**Context:** the user asked ~10 times for the Briselle Audio Controller to be
the player. A parallel `AudioPlayerBar` was built instead. That was wrong.

`utility-modules/audio-controller/AudioController.jsx` (10,862 bytes, intact,
never deleted) **already has everything required**:

| Feature | Evidence |
|---|---|
| `src`, `onPlay`, `onPause`, `onSeek`, `onPrev`, `onNext`, `onTimeUpdate`, `onEnded`, `onClose` | props, lines 10–33 |
| Equalizer | `barCount` + analyser, ~9 references |
| Volume | ~12 references |
| Output-device selection | `onSelectOutputDevice` |

**Do:**
1. Delete `transcript/AudioPlayerBar.jsx`.
2. Render `AudioController` in `transcript/TranscriptToolbar.jsx`, wired to the
   play queue: `onNext`/`onPrev` step the queue, `onEnded` advances,
   `onClose` clears it.
3. Remove the now-dead `AudioController` render still sitting in
   `transcript/TranscriptPanel.jsx` (guarded on `audioUrl && !recording && …`)
   so there is exactly **one** player render path.

**Files:** delete `AudioPlayerBar.jsx`; edit `TranscriptToolbar.jsx`,
`TranscriptPanel.jsx`, `MeetingNotesBlockBase.jsx`

---

### `T71` — Slim the controller's styling

The user's objection is that `AudioController` looks "heavy" and doesn't match
Notion/Salesforce.

**Do:** override from `styles/NotionNestPage.css`, scoped under the meeting
block. **Do not edit `AudioController.css`** — the Audio block and other
consumers must keep their current appearance.

Reference weight: `.nnr-player-*` rules already in `NotionNestPage.css`
(28px controls, 4px slider track, 12px thumb, neutral greys) — reuse those
values, then delete the `.nnr-player-*` block once `AudioPlayerBar` is gone.

---

### `T73` — Recording pill only when inline controls are off-screen

`nnr-rec-pill` currently shows whenever recording. It should appear **only when
`nnr-tab-rec-group` is not in the viewport.**

**Do:** new `hooks/useIsOffscreen.js` wrapping `IntersectionObserver`; gate the
pill on it.

**Files:** new `hooks/useIsOffscreen.js`, `transcript/RecordingPill.jsx`

---

### `T74` — Floating mini-player

Same rule as `T73`, for playback: when the inline `AudioController` scrolls out
of view, show a compact floating player docked bottom-centre (play/pause, stop,
track name).

**Reuse `useIsOffscreen` from `T73`** — do not write a second observer.

**Files:** `transcript/`, `styles/NotionNestPage.css`

---

## 2. Backlog (not yet planned — re-plan before starting)

| ID | Item |
|---|---|
| `T52` / `T53` | Playback equalizer + **mic input volume** control during transcription. `micVolumeSliderLevel` / `setMicVolumeSliderLevel` already exist and already drive the equalizer bar count — this is a slider bound to existing state. |
| — | **Confidence stat shows `—`.** `transcript/transcriptStats.js` reads `line.confidence`, but the recogniser discards the `confidence` value that `SpeechRecognition` returns on every result. Capture it in `onresult` and carry it through `transcriptLine.js`. Deliberately shows `—` rather than a fabricated number. |
| — | **Custom-instruction icon picker.** `instructionIcons` is wired end-to-end and persists; there is no picker UI. Belongs in `EditPromptModal` beside the title field. |
| — | **Markdown serialisation for prompts.** User wants prompts stored as text with block prefixes (`#`, `##`). Needs a blocks↔markdown serializer, and `EditPromptModal` pointed at the parent page's block registry (it currently has its own `SLASH_TYPES`). All blocks should be available in that editor **except** Ziva AI Meeting Notes. |
| — | **Legacy duration backfill.** Recordings created before the timer fix have `duration: 0` stored. Nothing backfills them; a one-off script over `enterprise_files` would be needed. |
| — | **Inline styles.** Several components still carry `style={{…}}` (tab pills, toolbar, transcript content), which violates the no-inline-CSS rule and has repeatedly forced `!important` overrides. Worth a dedicated migration pass. |

---

## 3. Architecture you must understand first

```
blocks/MeetingNotesBlock.jsx          barrel → keeps the original import path
blocks/meeting-notes/
  MeetingNotesBlockBase.jsx           owns ALL state; publishes ~330 keys via context
  context/MeetingNotesContext.jsx     the single contract
  constants.js                        prompts, LANGUAGE_CODE_MAP (39 languages), resolveRecognitionLang
  audioUtils.js                       PCM→WAV
  hooks/useDismissOnOutside.js        shared popover dismissal
  header/         MeetingHeader, ParticipantsPanel
  tabs/           MeetingTabBar, SummaryTab, NotesTab
  transcript/     TranscriptPanel, TranscriptToolbar, TranscribeControl,
                  RecordingPill, Waveform, AudioPlayerBar (to be deleted),
                  TranscriptStatsBar, transcriptLine.js, transcriptStats.js
  translate/      TranslatePanel
  summary/        SummaryActions
  config/         InstructionsMenu, MeetingModals, EditPromptModal
  footer/         MeetingFooter
```

**The Base owns state; sub-files are presentational** and read from
`useMeetingNotes()`. Adding a value means: declare it in the Base **and** add it
to the `meetingNotesApi` object literal **and** destructure it in the consumer.
Missing any one of those three is the most common failure in this codebase.

---

## 4. Verification — run these every time

```bash
cd briselle-lightining.client

# 1. every context key resolves to a real binding
node ../.agents/scripts/verify-meeting-context.js

# 2. parse each changed file
./node_modules/.bin/esbuild --outfile=/dev/null <file>

# 3. full build
./node_modules/.bin/vite build
```

**A green build does not mean working code.** JavaScript does not fail at build
time on undefined references, so `vite build` happily ships code that throws on
mount. Checks 1 and 2 exist because of that.

---

## 5. Bug classes that actually occurred here — check for these

1. **Context key with no declaration.** Added to the `meetingNotesApi` literal
   but never declared. Green build, runtime crash. → `verify-meeting-context.js`
2. **Component defined but never mounted.** The full 13-item slider menu existed
   and was exported for several rounds while a 5-item stub rendered in its place.
   Verify things are *invoked*, not merely *defined*.
3. **JSX component used without an import.** `AudioController`, `Upload`,
   `NotionDatePicker` all hit this after being moved between files. Bundler
   catches import-path errors, **not** undefined JSX identifiers.
4. **Effect labelled "on unmount" with a dependency array.** A cleanup with
   `[recognition]` cleared the recording timer every few seconds, so every
   recording saved `duration: 0`. Four rounds were spent fixing downstream
   symptoms of a number that was always zero.
5. **CSS overridden by a later same-specificity rule.** Grey interim text stayed
   black because `.nnr-transcript-para > .nnr-transcript-text { color: inherit }`
   appears later in the file. Also: `.nnr-transcript-text` has **three** base
   definitions, one of which styles it as a bordered card.
6. **Falsy-zero filters.** `af.duration ? … : null` hid legitimate `0` values.
7. **Stale closure in a loop.** Calling `removeAudioFile` in a `forEach` filtered
   the same captured array each time, so only one file was deleted.
8. **Swallowed errors.** `.catch(() => {})` around `play()` made a completely
   broken player look merely unresponsive for five rounds.

---

## 6. Data model notes

- **`sanitizeNotionBlocks`** in `core/notionNestPageDefaults.ts` is a
  **whitelist**. Any new block property is silently stripped on save unless
  added there. This has caused at least four separate "it doesn't persist" bugs.
  Already whitelisted: `calendarEvent`, `calendarEventMode`, `calendarSource`,
  `pinnedInsights`, `defaultInstruction`, `hiddenInstructions`,
  `instructionIcons`, `transcriptStarted`.
- **DAM (`enterprise_files`)** — `FileService.upload()` inserts the metadata row
  **before** the storage object (correct, as specified). Storage path is
  `NotionNest/MeetingNotesBlock/<blockId>`. Delete is a soft delete via
  `status_information.isDeleted`.
- **Audio records have two shapes.** Locally-created ones carry `data` (base64);
  DAM-loaded ones carry `url`/`fileId` and **no** `data`. Anything reading audio
  must handle both — this is what broke playback.
- **DAM query must filter on `source_info->>blockId`**, not on
  `data_entity_type`. Filtering by type pulls every meeting block's audio.

---

## 7. Working agreements the user has stated

- **Plan first, always.** No code changes without explicit approval.
- Reuse existing components; **merge, don't duplicate**.
- **No inline CSS** — centralised in `styles/NotionNestPage.css`.
- Comments carry Created / Last Modified dates and a previous-version back URL.
- Keep the last 5 versions of modified files backed up under
  `C:\Users\sk997\.gemini\antigravity-ide\brain\<id>\file_backups\`.
- **Never restore from git** unless the user says "Briselle Restore Mode".
- Manual testing only — do not run browser automation.
- End each round with a cumulative **accept / reject** table of changed files.
- Notion is **inspiration**, not a source to copy. Build equivalent behaviour in
  Briselle's own design system.

---

## 8. Outstanding risk

A large body of work from this session exists **only in the working tree and the
brain backups** — it is not committed. The original incident that started this
work was uncommitted code being lost. Committing to a branch before further
changes would make all of it recoverable by `git` rather than by forensics.
