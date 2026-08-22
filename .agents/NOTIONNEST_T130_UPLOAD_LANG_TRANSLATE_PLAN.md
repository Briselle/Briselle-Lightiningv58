# NotionNest › Meeting Notes — Upload / Language / Translate: Implementation Plan

**Created:** 2026-08-22 | **Last Modified:** 2026-08-22
**Status:** ✅ **APPROVED AND EXECUTED** — `T130`–`T134` complete. `T135` deferred.
**Tasks:** `T130`–`T135`

> **Revision 2** — no third-party endpoint is hardcoded anywhere. Every AI call
> resolves through the Ziva module-scope pipeline (`getPipesForScope` → top-1),
> including translation. If Google is ever wanted it is registered as a
> PROVIDER row with the `Translation Engine` scope, not written into the code.

> Thumb Rule #4: no code changes until this plan is approved.

---

## 0. Root causes — found, not guessed

| # | Symptom | Root cause | Evidence |
|---|---|---|---|
| 3 | Upload audio "not working at this point" | The `<input type="file">` lives **inside `TranscribeControl`**. `MeetingTabBar` mounts that only when `recording \|\| !transcriptStarted`; `TranscriptToolbar` mounts it only when `recording`. Once a transcript exists and you are not recording, **the input does not exist**, so `audioUploadRef.current?.click()` is a silent no-op. | `TranscribeControl.jsx:125-133` (input), `MeetingTabBar.jsx` mount condition |
| 3b | Wrong menu entry removed | I removed the entry under **Resume Transcription** and kept the parent dropdown's. The instruction was the opposite. | `T127` change |
| 4 | Tamil (any language) not transcribed | `startRecording` sets `recog.lang = resolveRecognitionLang(selectedLanguage)` but its dependency array is `[saveProp, isTranscribingAudioFile, audioUrl]` — **`selectedLanguage` is missing**. The callback therefore holds the value from the render in which it was created, so changing the language then pressing Start still uses the old one. | `MeetingNotesBlockBase.jsx:827` vs deps at `:981` |
| 5 | Translate does nothing | `handleTranslateTranscript` calls **`getLanguageCode(...)`, which is defined nowhere in the codebase.** It throws `ReferenceError` on the first line inside its `try`, the outer `catch` swallows it, and the function returns having done nothing. | grep across `src`: only the two call sites, no definition |
| 5b | Even once that throws no more | It then calls `https://translate.googleapis.com/translate_a/single` **directly from the browser** — an unofficial endpoint with no CORS headers, and a third-party service outside the Ziva provider pipeline. | `MeetingNotesBlockBase.jsx:1957` |

**Note on 5:** `getLanguageCode` is a fabricated API — precisely what
`briselle-enterprise-architecture.md` → *AI Rules* → "Never fabricate APIs"
prohibits. It has been dead since it was written; translation has never worked.

---

## 1. Tasks

### `T130` — Mount the file input unconditionally *(fixes "not working")*
**Files:** `MeetingNotesBlockBase.jsx`, `transcript/TranscribeControl.jsx`

- Move the `<input type="file">` out of `TranscribeControl` and into the Base's
  own render, beside `<RecordingOverlays />`, so its lifetime matches the
  block rather than a conditional control.
- `TranscribeControl` keeps using `audioUploadRef` from context — the ref
  contract does not change, so no call site moves.

**Why not just widen the mount condition:** the input would still be owned by
a component that legitimately unmounts. The Base is the only element that is
always present.

### `T131` — Put the menu entries the right way round
**Files:** `transcript/TranscribeControl.jsx`, `MeetingNotesBlockBase.jsx`

- **Remove** "Transcribe audio file" from the **parent split-button dropdown**.
- **Restore** it under **Resume Transcription** in the slider menu (reverting
  my `T127` deletion).
- Leave the separate "Upload Audio" slider item as-is — with `T130` it now
  works, and it is the plain-upload path rather than the transcribe path.

### `T132` — Fix the stale language closure *(fixes Tamil, live)*
**Files:** `MeetingNotesBlockBase.jsx`

- Add `selectedLanguage` to `startRecording`'s dependency array.
- Read the language through a ref at call time as well, so a change made while
  the menu is open is honoured even if the callback has not been recreated.
- Same audit for `resumeRecording` (`:1276`) and `startTranscribe`.

**Verification:** log the resolved BCP-47 tag once at session start
(`recog.lang`) so a wrong language is visible rather than silent.

### `T133` — Translation through the Ziva pipeline *(fixes translate)*
**Files:** `MeetingNotesBlockBase.jsx`

**Verified before planning:** the scope keywords you have configured in Groq —
**"Speech to Text"** and **"Translation Engine"** — already resolve to a pipe.
The tolerant scope matching added in `T84` accepts the id, the full label, or
the label without its parenthetical, so no new plumbing is needed:

| Scope queried | Resolves to | Model chosen |
|---|---|---|
| `stt` ← "Speech to Text" | `https://api.groq.com/openai/v1` | `whisper-large-v3-turbo` |
| `translation` ← "Translation Engine" | same | `llama-3.3-70b-versatile` |
| `summarization` ← "Meeting Notes Summarization" | same | `llama-3.3-70b-versatile` |

Changes:
- Delete both `getLanguageCode(...)` calls (the fabricated API) and use
  `LANGUAGE_CODE_MAP` from `constants.js`, which already holds all 39
  languages.
- Delete the hardcoded `translate.googleapis.com` fetch. **No third-party
  endpoint appears in code.** Translation resolves the top-1 pipe for the
  `translation` scope and calls it, exactly as summarisation does.
- Reuse `callZivaChat` (built in `T100`) — same streaming, same error
  reporting, same capacity handling. No second HTTP implementation.
- **One batched request**, not one per line. The present loop fires N requests
  and would hit the same per-minute ceiling `T100` exists to avoid. Lines go
  numbered, come back numbered, and are mapped by index; a count mismatch
  falls back to per-line requests for the remainder rather than mis-aligning.
- Failure is reported on screen, not swallowed. Pushing the untranslated line
  and continuing is what made this look like it worked.

### `T134` — Translate popover placement + language list
**Files:** `transcript/TranscriptToolbar.jsx`, `styles/NotionNestPage.css`

- Move the From/To popover so it anchors under the footer's Translate button
  rather than a wrapper inside a strip that may not render.
- The Original / "in ‹native›" toggle is already at the top-centre
  (`TranscriptPanel.jsx:126`) — **verify only**, no change planned.

### `T135` — Provider-shape adapter *(only needed for a non-OpenAI provider)*
**Files:** `ziva-chat-module/src/zivaApiRouterService.js`

Groq is OpenAI-compatible, so `POST {baseUrl}/chat/completions` serves
summarisation and translation, and `POST {baseUrl}/audio/transcriptions`
serves STT. A provider with a different contract — Google Translate v2 is
`POST /language/translate/v2` with a `key` query parameter, not a bearer
token and not a chat body — cannot be called through the same code path.

So: add `apiShape` to the provider record (`openai` default, `google_translate`,
`custom`), returned on the resolved pipe. Callers branch on it.

**Scope note:** this task is only worth doing if you actually intend to
register Google. Groq covers Tamil and every other language in
`LANGUAGE_CODE_MAP` for both Whisper and chat translation, so on current
configuration `T133` alone is sufficient. **Recommend deferring `T135`**
until a second provider shape is genuinely needed — building an adapter for a
provider nobody has configured is speculative work.

---

## 2. Order

1. `T130` + `T131` — upload works, menus correct *(independently testable)*
2. `T132` — language honoured
3. `T133` + `T134` — translation via the configured pipe
4. `T135` — DEFERRED unless a non-OpenAI provider is to be registered

Steps 1 and 2 are small and low-risk. `T133` is the largest.

---

## 3. Verification per task

- `verify-meeting-context.js`
- Extended **TDZ scan** (deps arrays **and** plain statements) — this class has
  now caused four defects; I will add it as
  `.agents/scripts/verify-no-tdz.js` under `T130`.
- `esbuild` parse per changed file
- `vite build`
- **Manual:** upload after a transcript exists; Tamil live + Tamil file;
  translate to Tamil and confirm the text actually changes.

---

## 4. Honest limits, restated

- **Live** transcription cannot auto-detect language — the Web Speech API needs
  a fixed tag before the session starts. "Auto" resolves to the browser locale.
  A named language (Tamil) WILL work once `T132` lands.
- **File** transcription auto-detects per segment via Whisper.
- **Five languages in one sentence** is not supported by either engine.
- Translation quality becomes the configured model's. Groq/Llama handles all
  39 languages in `LANGUAGE_CODE_MAP`; for Indian languages it is generally
  good but not identical to a dedicated translation engine. If quality is
  short, register a dedicated provider under `Translation Engine` — which is
  the whole point of routing through the pipeline rather than hardcoding.
- No AI endpoint is hardcoded after this plan. Summarisation, STT and
  translation all resolve through `getPipesForScope` → top-1.

---

## 5. Execution log — 2026-08-22

| ID | Status | Note |
|---|---|---|
| `T130` | ✅ | File input moved to the Base. Also resets `e.target.value` so picking the SAME file twice still fires `onChange`. New `.nnr-hidden-file-input` class — no inline CSS. |
| `T131` | ✅ | "Transcribe audio file" removed from the parent split-button dropdown (2 entries left) and restored under Resume Transcription. "Upload Audio" retained. |
| `T132` | ✅ | `selectedLanguage` added to `startRecording` deps AND read via `selectedLanguageRef` at call time. Both `recog.lang` sites. Console trace of the resolved BCP-47 tag. |
| `T133` | ✅ | Fabricated `getLanguageCode` deleted; `translate.googleapis.com` deleted. Routes through the `translation` pipe ("Translation Engine") via `callZivaChat`. ONE batched request. Untranslated lines are reported, not passed off as translated. |
| `T134` | ✅ | From/To popover moved into the footer, anchored to the Translate button, opening upward. Toolbar pruned of the now-unused imports and state. |
| `T135` | ⏸ Deferred | Only needed to register a non-OpenAI provider such as Google Translate. |

### New: `.agents/scripts/verify-no-tdz.js`

Checks hook dependency **arrays** and plain render **statements** for names
used above their declaration. It caught a live defect in `T133` on its first
run — `callZivaChat` named in a deps array 127 lines above its declaration,
which would have thrown on mount while `vite build` passed.

### Verification

| Check | Result |
|---|---|
| `verify-no-tdz.js` (3 files) | ✅ 0 |
| `verify-meeting-context.js` | ✅ 391 keys |
| Consumers → context keys | ✅ |
| CSS brace balance | ✅ |
| `esbuild` parse, all changed files | ✅ |
| `vite build` | ✅ |

### Not verifiable without you
Manual: upload after a transcript exists; Tamil live + Tamil file; translate to
Tamil and confirm the text changes and the "in தமிழ்" tab appears.
