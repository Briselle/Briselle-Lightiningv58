# NotionNest › MeetingNotesBlock — Action Plan & Handover

**Created:** 2026-08-16
**Module:** `briselle-lightining.client/src/modules/notion-nest/blocks/meeting-notes/`
**Status:** 5 tasks parked and ready to implement (`T70`–`T74`), plus a backlog.

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
