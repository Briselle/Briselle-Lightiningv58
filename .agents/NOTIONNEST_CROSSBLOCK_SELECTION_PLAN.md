# NotionNest — Cross-Block Text Selection: Implementation Plan

**Created:** 2026-08-17
**Status:** AWAITING APPROVAL — no code written.
**Task:** `T120`

---

## 1. Why the current fixes stopped at one block

Every block renders its own editing host:

```
blocks/TextBlock.jsx      <div contentEditable …>
blocks/ListBlock.jsx      <div contentEditable …>
blocks/TodoBlock.jsx      <div contentEditable …>
…12 block files in total
```

A browser selection **cannot span two separate `contenteditable="true"` roots**.
Drag past the end of one and the browser collapses the range at the boundary.
No event handler changes this — it is how the DOM works.

This is also why the recent fixes behaved as they did: `T119` stopped
`handleBlockClick` destroying a *within-block* selection, which is why Summary
and Transcript now work (their content is not editable, so it is one
continuous run of text). Notes is 12 editing hosts in a column, so it still
stops at the first.

**Notion does not use native selection for this.** It keeps its own model —
anchor `{blockId, offset}` and focus `{blockId, offset}` — paints the
highlight itself, and reimplements clipboard operations against that model.
Matching it means building the same thing.

---

## 2. Two options

### Option A — custom selection layer *(recommended)*

Keep the per-block editing hosts. Add a selection model over them.

- Native selection continues to handle the single-block case, unchanged.
- The moment a drag crosses a block boundary, take over: track
  `{anchorBlockId, anchorOffset, focusBlockId, focusOffset}`, paint the
  highlight, and clear the native range.
- Copy / cut / delete read the model when it is active.

**Risk:** medium. Additive — nothing existing is rewritten. Contained to a new
hook plus small changes in `BlockRenderer` and the clipboard handlers.

### Option B — single editing host

Rewrite the document as one `contentEditable` root with blocks as non-editable
structural nodes inside, the way ProseMirror and Slate do.

Native selection then spans blocks for free, and copy/paste is largely the
browser's problem.

**Risk:** high. Every one of the 12 block components, `useEditable`,
`focusBlock`, caret restoration, the slash menu, markdown shortcuts and undo
all assume per-block hosts. This is a rewrite of the editor core.

**Recommendation: Option A.** Option B is the "correct" architecture but not
worth destabilising a working editor for.

---

## 3. Option A — how it works

### `T120a` — selection model
**New:** `core/useCrossBlockSelection.js`

```js
{ anchorBlockId, anchorOffset, focusBlockId, focusOffset, isActive }
```

- `mousedown` on block text: record the anchor from
  `caretPositionFromPoint` (Firefox) / `caretRangeFromPoint` (Chrome, Safari).
- `mousemove` while pressed: resolve the point to `{blockId, offset}`. While
  both ends are in the SAME block, do nothing — the browser is already doing
  it correctly. On the first crossing, activate the model and call
  `removeAllRanges()` once.
- `mouseup`: freeze. `Escape`, or any collapsed click, clears it.

### `T120b` — highlight painting
**Changed:** `core/BlockRenderer.jsx`, `styles/NotionNestPage.css`

Each block asks the model what portion of it is covered — none, all, from
offset N, or up to offset N — and renders a `::selection`-coloured overlay
using `Range.getClientRects()` for the partial ends. Fully-covered middle
blocks take a simple full-width highlight, which is cheap.

### `T120c` — keyboard
**Changed:** `blocks/shared/useEditable.js`

`Shift+Arrow` at a block edge already jumps blocks (`useEditable.js:410`);
route it into the model instead of `removeAllRanges()` + `blur()`.
`Ctrl/Cmd+A` extends to the whole document on a second press, as Notion does.

### `T120d` — clipboard and deletion
**Changed:** `core/NotionNestPage.jsx` (`handleCopy`, `handlePaste`), `PageContext`

When the model is active:
- **copy** — slice the anchor and focus blocks at their offsets, take the
  middle blocks whole, and emit `text/plain`, `text/html` and the existing
  `application/x-notion-nest-blocks` JSON so a paste back into NotionNest is
  lossless.
- **cut / Backspace / Delete** — remove the covered range and merge the two
  partial end blocks into one.
- **paste over an active selection** — delete first, then insert.

`T118`'s `ownsEvent()` guard already keeps the embedded Notes page from
answering the outer page's events; the model must be per-page for the same
reason.

---

## 4. Order and checkpoints

| Step | Deliverable | Verifiable on its own |
|---|---|---|
| 1 | `T120a` model + `T120b` highlight | Drag across blocks shows a correct highlight |
| 2 | `T120d` copy | Ctrl+C yields exactly the highlighted text |
| 3 | `T120d` cut / delete | Deletion merges the end blocks correctly |
| 4 | `T120c` keyboard | Shift+Arrow and Ctrl+A match the mouse behaviour |

Each step is usable before the next. Step 1 alone answers the visible
complaint; steps 2–4 make it behave like a real selection.

---

## 5. Scope, honestly

**Estimate: 2–3 focused sessions.** Not a bug fix.

The fiddly parts, so they are not a surprise later:
- `caretRangeFromPoint` is not standardised — Chrome/Safari and Firefox need
  different calls, and both need a fallback.
- Nested blocks (columns, toggles, tabs) make "the block after this one"
  non-trivial. `flatVisibleBlocks()` already exists and is the right basis.
- Deleting across blocks of different types has to decide which type the
  merged block keeps — Notion keeps the anchor's.
- The Notes tab runs a page inside a page; the model must be per-instance.

---

## 6. Decision

1. **Option A or Option B?** (Recommendation: A.)
2. **Do you want step 1 alone first** — visible cross-block highlight — or the
   full four steps before reviewing?
3. This lands in shared NotionNest core, affecting every page. Confirm.
