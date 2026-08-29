# NotionNest › Meeting Notes — Instruction Prompts: Implementation Plan

**Created:** 2026-08-16 | **Last Modified:** 2026-08-16
**Status:** ✅ **APPROVED AND IMPLEMENTED** — `T92`–`T99` complete.
**Tasks:** `T92`–`T99`

## Implementation log — 2026-08-16

| ID | Status | Notes |
|---|---|---|
| `T92` | ✅ | `database/019_add_ai_prompts_config_type.sql`. Seed **generated from `constants.js`**, not hand-copied, so SQL and code cannot diverge. `ON CONFLICT DO NOTHING` — re-runnable, never overwrites edits. |
| `T93` | ✅ | `selectedInstruction` derived from the block; menu list and prompts both from the document. |
| `T94` | ✅ | `services/aiPromptConfigService.ts`. |
| `T95` | ✅ | `config_json` = `{schemaVersion, order, instructions{name,icon,isSystem,blocks,promptText,updatedAt,updatedBy}}`. |
| `T96` | ✅ | `promptSerializer.js` — **all 12 prompts round-trip losslessly** (verified). |
| `T97` | ✅ | `excludedBlockTypes` through PageContext → BlockRenderer, slash menu, markdown shortcuts. |
| `T98` | ✅ | `InstructionEditorModal.jsx` embeds the real `NotionNestPage`; `EditPromptModal.jsx` deleted. |
| `T99` | ✅ | Auto editable; built-ins get Reset to default. |

**All 12 presets now have prompts.** `Candidate Interview`→`Interview`,
`Team Standup`→`Stand-up`; `Call` and `Workshop` newly written. Verified: 12 presets,
12 prompts, 12 icons, zero orphans in either direction.

**Dead code found and removed:** `renderCustomInstructions` was defined but
**never called** (bug class #2 again), duplicating `InstructionsMenu`; its helper and
the `setCustomInstructions` state went with it. The context verifier then caught
`setInstructionPrompts` still exported with no declaration — bug class #1, exactly what
that script exists for.

**`T97` regression check:** with no exclusions the filters return the **original array
identity**, so the main page allocates nothing and behaves identically — verified, along
with `meeting_notes` still present on the main page (36 slash items, 50 shortcuts) and
absent in the editor (35 / 49).

> Per Thumb Rule #4 this document must be approved before any code is written.

---

## 0. What I verified in the code (evidence, not assumption)

| # | Finding | Evidence |
|---|---|---|
| A | **4 of the 6 menu presets have no prompt at all.** `INSTRUCTION_PRESETS = ['Auto','Meeting','Interview','Call','Stand-up','Workshop']` but `DEFAULT_INSTRUCTION_PROMPTS` defines `Auto, Meeting, 1-on-1, Sales, Candidate Interview, Technical Discussion, Product Planning, Team Standup, Client Review, Brainstorming`. `Interview`, `Call`, `Stand-up`, `Workshop` resolve to **nothing** and fall back to `Auto`. | `MeetingNotesBlockBase.jsx:2884` vs `constants.js:9` |
| B | **`customInstructions` is `useState([])` and is never loaded from anywhere.** No custom instruction can ever appear, and `handleGenerateSummary`'s `customInstructions.find(...)` is always `undefined`. | `MeetingNotesBlockBase.jsx:367` |
| C | **`selectedInstruction` is duplicated state.** `useState(block.selectedInstruction \|\| 'Auto')` with no sync effect, alongside `block.selectedInstruction` written by `saveProp`. Two sources that can drift. | `MeetingNotesBlockBase.jsx:675` |
| D | **Auto has no edit affordance** — the row is guarded by `inst !== 'Auto'`. | `config/InstructionsMenu.jsx` |
| E | **The editor cannot accept typing.** Every block is `contentEditable` **and** `dangerouslySetInnerHTML={{__html: block.content}}` with **no `onInput`**. React owns the DOM subtree, state never receives keystrokes, and content is read back out of the DOM at save time. | `config/EditPromptModal.jsx:237-281` |
| F | `platform_config` exists with `UNIQUE (entity_id, dobj_id, config_type)`; `config_type` comment documents 1–6, code already uses **7 = ObjectCounter**. | `database/001_create_platform_config.sql`, `configService.ts:14` |
| G | `DB_ENTITY_ID = 1000000000` already exists — the Briselle org id you specified. | `configService.ts:18` |
| H | The block registry is module-level: `BLOCK_MAP` (`BlockRenderer.jsx:12`), `slashMenuSections` (`utils.js:329`), `blockShortcuts` (`utils.js:446`, `/^mt $/ → meeting_notes`). Consumed by **3** files. | `useEditable.js:198`, `menus/menus.jsx:353,494,532`, `BlockRenderer.jsx:9` |

### Honest gap

**Item 2 (footer not updating) is not fully root-caused.** Finding A explains item 1
completely, and C explains how the footer *can* drift, but I could not reproduce the
exact footer failure by reading alone and I will not guess a third time. The plan's
`T93` removes the duplicate-state class entirely, which fixes it regardless of which
drift path is occurring. If it survives `T93` I will need one runtime observation.

---

## 1. Architecture decision to confirm

**Prompts become an ORG-LEVEL library; selection stays PER-BLOCK.**

- `platform_config` row (entity `1000000000`) holds the prompt text/blocks for every
  instruction type, including `Auto`.
- The block keeps only its *preferences*: `selectedInstruction`, `defaultInstruction`,
  `hiddenInstructions`, `instructionIcons` (already whitelisted in `sanitizeNotionBlocks`).

**Consequence:** editing the "Meeting" prompt in one block changes it for every meeting
block in the org. That follows from "all prompts must be stored in the database", but
it is a real semantic change — please confirm it is what you want.

---

## 2. Tasks

### `T92` — `platform_config` config_type 8 = AIPromptsLoader
**Files:** `database/019_add_ai_prompts_config_type.sql` *(new)*

- Update the `config_type` column comment to document `7=ObjectCounter, 8=AIPromptsLoader`.
- Seed one row: `entity_id 1000000000`, `dobj_id 1000000002` *(proposed — 1000000000 and
  1000000001 are taken; confirm)*, `config_type 8`, `config_name 'AIMeetingNotesPrompt'`,
  `is_default true`, `config_json` = the shipped prompt set.
- No schema change; `UNIQUE (entity_id, dobj_id, config_type)` already gives us exactly
  one prompt document per scope.

### `T93` — Fix selection (items 1 & 2)
**Files:** `MeetingNotesBlockBase.jsx`, `config/InstructionsMenu.jsx`

- Delete the `selectedInstruction` `useState`; derive it:
  `const selectedInstruction = block.selectedInstruction || defaultInstruction || 'Auto'`.
  One source, cannot drift. `setSelectedInstruction` becomes a `saveProp` wrapper so
  existing call sites keep working.
- Delete the hardcoded `INSTRUCTION_PRESETS`. The menu is built from the config
  document's `order`, so **the list and the prompts are the same source** and finding A
  cannot recur.
- `customInstructions` loads from the config document instead of `[]`.

### `T94` — Config service
**Files:** `src/modules/notion-nest/services/aiPromptConfigService.ts` *(new)*

Mirrors the existing `configService.ts` patterns (same table, same scoping style):

```ts
AI_PROMPTS_CONFIG_TYPE = 8
AI_MEETING_NOTES_CONFIG_NAME = 'AIMeetingNotesPrompt'
loadPromptDocument()            // seeds from DEFAULT_INSTRUCTION_PROMPTS on first run
savePromptDocument(doc)
upsertInstruction(key, payload)
deleteInstruction(key)
resetInstructionToDefault(key)
```

Seeding is **idempotent** and only fires when no row exists.

### `T95` — `config_json` shape (item 6)

```jsonc
{
  "schemaVersion": "1.0",
  "order": ["Auto", "Meeting", "..."],
  "instructions": {
    "Auto": {
      "name": "Auto",
      "icon": "Sparkles",
      "isSystem": true,          // shipped preset — can be edited AND reset
      "blocks": [ /* NotionNest block JSON — editor fidelity */ ],
      "promptText": "## Overview…",   // what is sent to the LLM
      "updatedAt": "2026-08-16T…",
      "updatedBy": "…"
    }
  }
}
```

Both representations are stored: `blocks` so the editor round-trips losslessly,
`promptText` so the summary call never has to serialise at request time.

### `T96` — blocks ↔ markdown serializer
**Files:** `meeting-notes/promptSerializer.js` *(new)*

`blocksToMarkdown()` / `markdownToBlocks()`. **Lifted from the existing
`EditPromptModal` logic** (`parsePromptToBlocks` / `blocksToText`, which already handle
h1–h3, bullets, numbers, todo, divider, quote) and generalised to the NotionNest block
shape — not written from scratch.

### `T97` — Block-type exclusion in NotionNest core ⚠️ **the risky one**
**Files:** `core/PageContext.jsx`, `core/NotionNestPage.jsx`, `core/BlockRenderer.jsx`,
`core/utils.js`, `menus/menus.jsx`, `blocks/shared/useEditable.js`

Add an optional `excludedBlockTypes = []` prop, published on `PageContext`:

| Consumer | Change |
|---|---|
| `NotionNestPage` → `PageProvider` | pass-through prop |
| `BlockRenderer` | render nothing for an excluded type (defence in depth) |
| `menus/menus.jsx` (3 sites) | filter `slashMenuSections` items |
| `useEditable.js:198` | filter markdown shortcuts (`/^mt $/`) |

**Default `[]` = today's behaviour exactly**, so the main page is untouched. This is
configuration, not a fork — one renderer, one slash registry.

**Rejected alternative:** a second BlockRenderer/slash list for the editor. It would
duplicate the registry and drift the moment a block is added.

**Risk:** these are shared core files used by every NotionNest page. Mitigation —
additive optional prop, no existing signature changed, and a regression check that the
main page still lists all block types.

### `T98` — Replace the editor (item 7)
**Files:** `config/InstructionEditorModal.jsx` *(new)*, delete `config/EditPromptModal.jsx`

```jsx
<NotionNestPage
  initialBlocks={instruction.blocks}
  onChange={handleChange}
  showSidebar={false}
  excludedBlockTypes={['meeting_notes']}
/>
```

The broken `contentEditable` + `dangerouslySetInnerHTML` editor (finding E) is deleted
rather than repaired — you asked to reuse NotionNest, and repairing a parallel editor
would rebuild the duplication we have spent this whole session removing.

Modal shell adds only: instruction name field, icon picker, Save / Cancel, and
"Reset to default" for shipped presets.

### `T99` — Auto becomes editable (item 3)
**Files:** `config/InstructionsMenu.jsx`

Remove the `inst !== 'Auto'` guard. Every row — Auto included — gets Edit. Shipped
presets additionally get **Reset to default**, so an edit to Auto is reversible.

---

## 3. Order, and what is independently shippable

1. `T92` + `T94` + `T95` — storage layer *(no UI change; verifiable on its own)*
2. `T93` + `T99` — selection and Auto edit **← fixes items 1, 2, 3 without touching core**
3. `T96` — serializer
4. `T97` — core exclusion *(highest risk; isolated commit)*
5. `T98` — the editor

**Steps 1–3 are safe to approve independently of 4–5.** If you want the visible bugs
fixed first and the editor rebuilt after, approve 1–3 now.

---

## 4. Verification per step

- `node ../.agents/scripts/verify-meeting-context.js`
- `esbuild` parse on every changed file
- Consumer→context-key check across the module
- `vite build`
- **`T97`-specific:** confirm the main NotionNest page still offers every block type in
  the slash menu and `/mt` still works there, and that the editor offers neither.
- **`T92`-specific:** re-running the seed must not duplicate or overwrite an edited row.

---

## 4b. Round 2 — `T101`–`T103` (2026-08-17)

### `T101` — one CSS bug behind three symptoms

`.nnr-settings-flyout` is declared **three times** (~11160, ~14825, ~16743).
The middle declaration sets `overflow: visible !important`, which beats the
later `overflow-y: auto`. The flyout therefore could not scroll: with 12
presets the list simply spilled out of its own box.

That single fault produced all three reports:
- **#1** the list did not fit and would not scroll;
- **#6** "Add custom instructions" looked missing — it is the *last* row, so it
  was the first thing pushed past the fold;
- **#2** selecting a preset did nothing — the rows being clicked were outside
  the popover's box.

Fixed by giving `.nnr-instr-menu` its own height and scrolling rather than
adding a fourth competing `!important`. Heading, search and the add-custom row
are pinned; only the rows scroll. A **search field** was added — 12 entries is
past the point of scanning by eye.

### `T102` — no prompt text in the client (#4, #5)

`DEFAULT_INSTRUCTION_PROMPTS` is **removed from `constants.js`**, and the
service no longer seeds from code. `database/019_...sql` is the only place
prompt text exists.

`config_json` now carries two copies:

| Key | Written by | Purpose |
|---|---|---|
| `instructions.<Type>` | the app | the live, editable prompt |
| `defaults.<Type>` | the SQL seed only | source for **Reset to default** |

A reset therefore restores from the **database**, and stays correct if a later
migration revises the shipped prompts.

If the row is absent nothing is invented: `loadPromptDocument` returns
`missing: true`, the menu says the library is not installed and names the
script, writes are refused, and summary generation stops rather than
substituting a prompt the user never configured.

### `T103` — the editor's title and icon (#3)

The title was not missing — it was *duplicated*. The modal drew its own name
field and icon `<select>` above the embedded page, and the page's real Notion
title sat below, out of view. Both are removed: the page's **own** title is the
instruction name (parent-page formatting, full size) and the page's **own**
icon picker sets the instruction icon. The dropdown renders that icon, falling
back to the lucide glyph for entries never given one.

## 4c. `T105` — why selecting an instruction never worked

The write path was correct the whole time. `Row` was declared **inside**
`InstructionsMenu`'s render:

```js
const Row = ({ inst }) => ( … );        // new function identity every render
{presets.map(inst => <Row key={inst} inst={inst} />)}
```

React compares component types by identity, so a `Row` created on each render
is a **new type** each time: the entire list is unmounted and remounted on
every re-render of the menu. A click requires `mousedown` **and** `mouseup` on
the *same* element — when the row under the pointer is replaced between the
two, the browser never produces a `click` event and the handler simply never
runs.

That also explains the shape of the bug that made it so hard to place:
- **Edit and More kept working** — a button pressed and released without an
  intervening re-render completes normally.
- **`saveProp` worked from the Base** — the editor's save set
  `selectedInstruction` successfully, which is how "Technical Discussion"
  ended up selected without a single row click ever landing.

Chasing the write path (whitelist, `getBlockById` recursion, `mutateState`
cloning, memo comparators, duplicate api keys) found nothing because nothing
was wrong there. The evidence that finally located it was the screenshot: the
✓ sat on an instruction the user had *edited*, not one they had *clicked*.

`renderRow` is a plain function returning JSX, so the DOM elements persist
across renders and the click completes. Rows also gained
`role="menuitemradio"`, `tabIndex` and Enter/Space handling.

Also fixed: the stored icon is rendered as text, and the page picker can
return a **shortcode** (`:cpu:`) rather than a glyph. Unboxed, it spilled
across the label — the `:cpu:bTechnical Discussion` overlap. Non-glyph values
now fall back to the lucide icon, and the box clips regardless.

**Outstanding of the same class:** `TranscriptStatsBar.jsx:81` declares
`const Tag = ({stat, showPin}) => …` inside its render. Same remount-per-render
defect, not yet triggered by anything reported. Worth fixing in a sweep.

## 5. Open questions — please answer with your approval

1. **Org-wide prompts** (§1) — confirm editing a prompt in one block changes it for all
   blocks in the org.
2. **`dobj_id 1000000002`** for the AIMeetingNotesPrompt document — acceptable, or do you
   have an allocation convention?
3. **Preset list.** The current menu names (`Interview`, `Call`, `Stand-up`, `Workshop`)
   do not match the shipped prompts (`1-on-1`, `Sales`, `Candidate Interview`,
   `Technical Discussion`, `Product Planning`, `Team Standup`, `Client Review`,
   `Brainstorming`). Which set should ship as the seeded defaults? My recommendation: the
   **prompt list**, since those are real, written prompts — the menu names were never
   backed by anything.
4. **Scope of `T97`.** Approving it means editing shared NotionNest core files that every
   page uses. Confirm.
