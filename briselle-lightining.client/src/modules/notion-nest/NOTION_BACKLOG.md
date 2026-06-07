# NotionNest parity backlog

## Fixed in latest pass

| # | Item | Status |
|---|------|--------|
| 0 | Slash menu: Recent, Close, Escape, sections, `bn-suggestion-menu` crash fix | Done |
| 1–3 | Formatting: code, inline equation, emoji react, Ziva skills, Edit with AI, colors (via default toolbar) | Partial |
| 4 | Toggle list + toggle headings with nested children | Partial |
| 5 | Quote row-height bar | Done |
| 6 | Code block light grey styling | Done |
| 7 | Divider visible + color picker | Done |
| 8 | Callout vertical center | Done |
| 11 | Video embed URL slash command | Done |
| 12–13 | File/PDF click → in-app viewer (pdf, txt, images) | Partial |
| 14 | TOC click-to-scroll | Done |
| 15–16 | Bookmark/embed Notion-style URL capture | Partial |
| 37 | Code Mermaid slash item | Stub |
| — | Editor load crash (`getBoundingClientRect`) | Fixed |

## Still planned (large scope)

9–10 Page / sub-page DB rows · 17–27 Full database views + charts · 23–25 Feed/Dashboard/Maps · 28–36 Form, button, breadcrumb, tabs, synced, columns, AI notes · 38 Inline @mentions · 39 More embed providers · 41 Import · 42 OCR

Track per-element in follow-up PRs.

## Tabs L1/L2 model

- **L1** (`notionTabs`): tab bar + `notionTabPanel` shells only.
- **L2** (`notionTabPanel`): all user blocks and block controls (side menu) belong here.
- `enforceTabL2Containment()` moves any L1 strays into the correct panel on mount, edit, and tab switch.

## Tabs block — baseline (do not remove without explicit agreement)

**Behavior baseline** (May 2026):

- Single-mount: only the active tab’s blocks live in the document; others in `panelCache`.
- Empty tab shows **one** static line via CSS on L2 `.bn-block-group` (`::before` gutter + `::after` label), `data-tab-active-empty` from `stampEmptyHint()` + `readActiveTabIndex()`.
- Click empty L2 row → `focusActiveTabPanelContent()` seeds one paragraph; hint hides; BlockNote “Enter text or type '/' for commands” uses the **same** flex row (shared `--notion-tab-placeholder-*` tokens in `notion-tabs-indent-fix.css`).
- Inactive panel shells are **position:absolute** in one L1 slot; only the active shell is in flow (no vertical drift when adding tabs).
- Formatting/alignment polish continues on top of this baseline; do not regress visibility, single-mount, or empty-hint → editor handoff.

## Tabs block — acceptance tests (manual, ~5 min)

1. New tabs show **only** the static line “Empty tab. Click or drop blocks inside.” (no blocks, no “/” placeholder).
2. Click the empty tab body → BlockNote placeholder (“Press Space…” / “/”) appears **inside that tab**; typed blocks stay in that tab (L2).
3. Drag a block out below the tabs card → it becomes a normal page block (not re-adopted). Drag a page block into a tab → it links to that tab.
4. Create a tabs block with three tabs; put distinct text in each tab.
2. Click Tab 1, Tab 2, Tab 3 — only the active tab’s blocks are visible and editable.
3. Reload the page — same behavior; no flash of all tabs at once.
4. Drag a block from Tab 1 onto Tab 2 in the tab bar — content moves to Tab 2 and shows when Tab 2 is active.
5. Drag a block from inside the tabs card to below the card — it becomes a normal page block (visible outside tabs).
6. Type new content directly below the tabs card — it is adopted into the active tab panel only.
