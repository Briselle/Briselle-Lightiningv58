/* ============================================================
   NotionNest — core/crossBlockSelection.js
   Created At: 2026-08-17 | Last Modified: 2026-08-17
   Previous Version Back URL: (new file — no previous version)

   Task: BRIS-NN-T120
   Purpose: Pure helpers for selecting text ACROSS block boundaries.

   ── The constraint being worked around ─────────────────────────
   Every block renders its own `contentEditable` div, so each is a
   separate editing host. A browser will not carry ONE USER SELECTION
   across two editing hosts — it collapses the range at the boundary.
   That is a DOM rule, not something an event handler can prevent, and
   it is why a drag stops at the end of the first block.

   ── The part browsers DO allow ─────────────────────────────────
   The restriction applies to the *user* selection. A programmatic
   `Range` may start in one editing host and end in another quite
   legally. So the model here is a single Range, and painting it is
   handed to the CSS Custom Highlight API — the browser draws it
   natively, with no overlay elements to position, no getClientRects
   maths, and nothing to recompute on scroll or resize.

   Copy then comes almost free: range.toString() is the exact plain
   text and cloneContents() the exact markup, sliced by the browser at
   the same offsets the user sees highlighted.

   No React here — these are testable functions.
   ============================================================ */

/** Is the CSS Custom Highlight API usable in this browser? */
export function supportsHighlightApi() {
  return typeof CSS !== 'undefined'
    && typeof CSS.highlights !== 'undefined'
    && typeof Highlight !== 'undefined';
}

/**
 * Caret position under a viewport point.
 * caretRangeFromPoint (Chrome/Safari) and caretPositionFromPoint
 * (Firefox) are the two halves of an unfinished standard; both exist in
 * the wild and neither is universal.
 * @returns {{node: Node, offset: number}|null}
 */
export function caretFromPoint(x, y) {
  if (typeof document === 'undefined') return null;

  if (document.caretRangeFromPoint) {
    const r = document.caretRangeFromPoint(x, y);
    return r ? { node: r.startContainer, offset: r.startOffset } : null;
  }
  if (document.caretPositionFromPoint) {
    const p = document.caretPositionFromPoint(x, y);
    return p ? { node: p.offsetNode, offset: p.offset } : null;
  }
  return null;
}

/** The block element a node lives in, or null. */
export function blockElementOf(node) {
  if (!node) return null;
  const el = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
  return el ? el.closest('[data-block-id]') : null;
}

/** The block id a node lives in, or null. */
export function blockIdOf(node) {
  return blockElementOf(node)?.getAttribute('data-block-id') || null;
}

/**
 * Document order of two nodes.
 * @returns {number} negative if a precedes b, positive if it follows, 0 if same
 */
export function compareNodes(a, b) {
  if (a === b) return 0;
  const pos = a.compareDocumentPosition(b);
  if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
  if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
  return 0;
}

/**
 * Build a Range between two caret positions, in document order.
 * Returns null when either end is missing or they are the same point.
 */
export function buildRange(anchor, focus) {
  if (!anchor?.node || !focus?.node) return null;

  let start = anchor;
  let end = focus;

  const order = compareNodes(anchor.node, focus.node);
  if (order > 0 || (order === 0 && anchor.offset > focus.offset)) {
    start = focus;
    end = anchor;
  }

  try {
    const range = document.createRange();
    range.setStart(start.node, start.offset);
    range.setEnd(end.node, end.offset);
    return range.collapsed ? null : range;
  } catch (e) {
    /* Offsets can go stale between a mousemove and a re-render. */
    return null;
  }
}

/** Does this range cross a block boundary? */
export function spansBlocks(range) {
  if (!range) return false;
  const a = blockIdOf(range.startContainer);
  const b = blockIdOf(range.endContainer);
  return !!a && !!b && a !== b;
}

const HIGHLIGHT_NAME = 'nn-cross-selection';

/** Paint a range. Silently does nothing where the API is unavailable. */
export function paintHighlight(range) {
  if (!supportsHighlightApi()) return false;
  try {
    if (!range) { CSS.highlights.delete(HIGHLIGHT_NAME); return false; }
    CSS.highlights.set(HIGHLIGHT_NAME, new Highlight(range));
    return true;
  } catch (e) {
    return false;
  }
}

export function clearHighlight() {
  if (!supportsHighlightApi()) return;
  try { CSS.highlights.delete(HIGHLIGHT_NAME); } catch (e) { /* nothing to clear */ }
}

/* ══════════════════════════════════════════════════════════════════
   BRIS-NN-T121 — serialise BY BLOCK, not by DOM fragment.

   The first version handed range.cloneContents() straight to the
   clipboard. That fragment is a pile of `<div contenteditable>` — the
   editor's scaffolding — with no semantic tags anywhere: no <h1>, no
   <ul><li>, not even <p>. Word has nothing to lay out, so it renders
   one long paragraph. That is the "junk para".

   The block TYPE is the missing information, and it is already on each
   block element as `block-heading1`, `block-bulleted-list` and so on.
   Reading it lets each covered block be re-emitted as the tag it
   actually is, with its inline markup (bold, italic, links) preserved
   from the DOM, and consecutive list items grouped into a real <ul> or
   <ol>.

   This produces BETTER output than a browser's native copy, because the
   structure is reconstructed deliberately rather than inferred from
   whatever divs happened to be in the range.
   ══════════════════════════════════════════════════════════════════ */

/** `block-bulleted-list` → `bulleted_list`. */
export function blockTypeOf(blockEl) {
  if (!blockEl?.classList) return 'paragraph';
  for (const c of blockEl.classList) {
    if (c.startsWith('block-') && c !== 'block-content' && c !== 'block-controls') {
      const t = c.slice(6).replace(/-/g, '_');
      if (t && t !== 'highlighted' && t !== 'selected') return t;
    }
  }
  return 'paragraph';
}

/** The leaf-most block elements the range actually touches, in order. */
function coveredBlocks(range) {
  const scope = range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
    ? range.commonAncestorContainer
    : range.commonAncestorContainer.parentElement;
  if (!scope) return [];

  const root = scope.closest('.notion-app') || scope;
  const all = Array.from(root.querySelectorAll('[data-block-id]'))
    .filter(el => { try { return range.intersectsNode(el); } catch (e) { return false; } });

  /* A parent and its child both intersect; only the innermost carries
     text, so drop any block that contains another covered block. */
  return all.filter(el => !all.some(other => other !== el && el.contains(other)));
}

/* ══════════════════════════════════════════════════════════════════
   BRIS-NN-T122 — the block's TEXT, not the block's chrome.

   Every block renders control affordances as real DOM nodes beside its
   content:
       .block-controls > .block-plus   "+"
       .block-controls > .block-handle "⠿"   (BlockRenderer:259)
       .list-marker                    "•" / "1."  (ListBlock:24)

   They were being stripped from the HTML but NOT from the plain text,
   because the markdown came from range.toString() over the raw DOM.
   That is the "- +⠿•Everything from Option A plus:" in a paste.

   Two defences now. First, the sub-range is clipped to the block's
   EDITABLE element where there is one, so the controls are outside it
   and never collected. Second, html and text are both read from the
   same cleaned fragment, so they cannot disagree again.
   ══════════════════════════════════════════════════════════════════ */

const CHROME_SELECTOR =
  '.block-controls, .block-handle, .block-plus, .comment-annotations, .todo-checkbox, .list-marker, .toggle-icon';

/** The element holding a block's actual text. */
function contentElOf(blockEl) {
  return blockEl.querySelector(':scope > div > .block-content [contenteditable]')
    || blockEl.querySelector(':scope [contenteditable]')
    || blockEl.querySelector(':scope > div > .block-content')
    || blockEl;
}

/** The part of one block that lies inside the range, as a sub-range. */
function clipToBlock(range, blockEl) {
  const contentEl = contentElOf(blockEl);
  const sub = document.createRange();
  sub.selectNodeContents(contentEl);
  try {
    if (contentEl.contains(range.startContainer)) sub.setStart(range.startContainer, range.startOffset);
    if (contentEl.contains(range.endContainer)) sub.setEnd(range.endContainer, range.endOffset);
  } catch (e) { /* keep the whole content element */ }
  return sub;
}

/** Cleaned markup AND text of a sub-range, from one shared fragment. */
function cleanFragment(sub) {
  const holder = document.createElement('div');
  try { holder.appendChild(sub.cloneContents()); } catch (e) { return { html: '', text: '' }; }

  holder.querySelectorAll(CHROME_SELECTOR).forEach(el => el.remove());
  holder.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
  holder.querySelectorAll('[class]').forEach(el => el.removeAttribute('class'));
  holder.querySelectorAll('[data-block-id]').forEach(el => el.removeAttribute('data-block-id'));

  const html = holder.innerHTML.trim();

  /* ══════════════════════════════════════════════════════════════════
     BRIS-NN-T126 — keep the markdown prefixes when the content is
     already structured.

     Copying across NotionNest blocks yields "## ", "- ", "- [ ] "
     because each block's TYPE says what prefix to write. The summary is
     a single block whose structure lives in RENDERED HTML instead — so
     it fell to holder.textContent and arrived as flat prose, while the
     same copy pasted into Word kept its formatting from the html half.
     Two representations of one selection disagreeing.

     When the fragment contains block-level tags, the markdown is
     derived from them so both halves say the same thing.
     ══════════════════════════════════════════════════════════════════ */
  const hasStructure = !!holder.querySelector('h1,h2,h3,h4,h5,h6,ul,ol,li,blockquote,pre,hr,p');

  return {
    html,
    text: hasStructure
      ? fragmentToMarkdown(holder)
      /* Same node set as the html, so a control cannot survive in one
         and not the other. */
      : (holder.textContent || '').replace(/\s+/g, ' ').trim(),
  };
}

/** Rendered HTML → markdown, mirroring the block serialiser's prefixes. */
function fragmentToMarkdown(root) {
  const lines = [];
  const inline = (el) => (el.textContent || '').replace(/\s+/g, ' ').trim();

  const walk = (node) => {
    for (const el of node.children) {
      const tag = el.tagName.toLowerCase();
      switch (tag) {
        case 'h1': lines.push(`# ${inline(el)}`); break;
        case 'h2': lines.push(`## ${inline(el)}`); break;
        case 'h3': case 'h4': case 'h5': case 'h6':
          lines.push(`### ${inline(el)}`); break;
        /* A list is ONE entry containing its items on consecutive lines —
           pushing each item separately would put a blank line between
           every bullet once the entries are joined. */
        case 'ul':
          lines.push(Array.from(el.children).map((li) => {
            const t = inline(li);
            /* The renderer writes checkboxes as ☑ / ☐ glyphs. */
            const m = t.match(/^([☑☐])\s*(.*)$/);
            return m ? `- [${m[1] === '☑' ? 'x' : ' '}] ${m[2]}` : `- ${t}`;
          }).join('\n'));
          break;
        case 'ol':
          lines.push(Array.from(el.children)
            .map((li, i) => `${i + 1}. ${inline(li)}`).join('\n'));
          break;
        case 'blockquote': lines.push(`> ${inline(el)}`); break;
        case 'pre': lines.push('```\n' + (el.textContent || '').trim() + '\n```'); break;
        case 'hr': lines.push('---'); break;
        case 'p': { const t = inline(el); if (t) lines.push(t); break; }
        default:
          /* A wrapper div — descend rather than flatten it. */
          if (el.children.length) walk(el);
          else { const t = inline(el); if (t) lines.push(t); }
      }
    }
  };

  walk(root);

  /* Nothing structural was actually found — fall back to the text. */
  if (!lines.length) return (root.textContent || '').replace(/\s+/g, ' ').trim();
  return lines.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
}

const escapeHtml = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Serialise a range as semantic HTML + markdown.
 * @returns {{text: string, html: string}}
 */
export function serialiseRange(range) {
  if (!range) return { text: '', html: '' };

  let blocks = [];
  try { blocks = coveredBlocks(range); } catch (e) { blocks = []; }

  /* Single block, or the structure could not be read. T122: cleaned here
     too — range.toString() would carry the "+", "⠿" and "•" chrome. */
  if (blocks.length <= 1) {
    const only = blocks[0];
    const { html, text } = cleanFragment(only ? clipToBlock(range, only) : range);
    if (!text && !html) return { text: '', html: '' };
    return { text, html: html ? `<p>${html}</p>` : escapeHtml(text) };
  }

  const parts = [];
  const md = [];
  let listOpen = null;   // 'ul' | 'ol' | null
  let ordinal = 0;

  const closeList = () => { if (listOpen) { parts.push(`</${listOpen}>`); listOpen = null; ordinal = 0; } };
  const openList = (tag) => {
    if (listOpen !== tag) { closeList(); parts.push(`<${tag}>`); listOpen = tag; ordinal = 0; }
  };

  blocks.forEach((el) => {
    const type = blockTypeOf(el);
    /* One fragment, one clean, both representations from it. */
    const { html: inner, text } = cleanFragment(clipToBlock(range, el));
    if (!inner && !text && type !== 'divider') return;

    switch (type) {
      case 'heading1': case 'toggle_heading1':
        closeList(); parts.push(`<h1>${inner}</h1>`); md.push(`# ${text}`); break;
      case 'heading2': case 'toggle_heading2':
        closeList(); parts.push(`<h2>${inner}</h2>`); md.push(`## ${text}`); break;
      case 'heading3': case 'heading4': case 'heading5':
      case 'toggle_heading3': case 'toggle_heading4': case 'toggle_heading5':
        closeList(); parts.push(`<h3>${inner}</h3>`); md.push(`### ${text}`); break;
      case 'bulleted_list': case 'toggle':
        openList('ul'); parts.push(`<li>${inner}</li>`); md.push(`- ${text}`); break;
      case 'numbered_list':
        openList('ol'); ordinal += 1; parts.push(`<li>${inner}</li>`); md.push(`${ordinal}. ${text}`); break;
      case 'todo': {
        const done = el.classList.contains('checked');
        openList('ul');
        parts.push(`<li>${done ? '☑' : '☐'} ${inner}</li>`);
        md.push(`- [${done ? 'x' : ' '}] ${text}`);
        break;
      }
      case 'quote': case 'callout':
        closeList(); parts.push(`<blockquote>${inner}</blockquote>`); md.push(`> ${text}`); break;
      case 'code':
        closeList(); parts.push(`<pre><code>${escapeHtml(text)}</code></pre>`);
        md.push('```\n' + text + '\n```'); break;
      case 'divider':
        closeList(); parts.push('<hr>'); md.push('---'); break;
      default:
        closeList(); parts.push(`<p>${inner}</p>`); md.push(text); break;
    }
  });
  closeList();

  /* T126: consecutive list items belong together — a blank line between
     every bullet is what made a copied list look double-spaced. */
  const isListLine = (l) => /^\s*(?:[-*]\s|\d+\.\s)/.test(l || '');
  const joined = md.filter(l => l !== undefined && l !== null).reduce((acc, line, i) => {
    if (i === 0) return line;
    const prev = md[i - 1];
    return acc + (isListLine(prev) && isListLine(line) ? '\n' : '\n\n') + line;
  }, '');

  return {
    text: joined.replace(/\n{3,}/g, '\n\n').trim(),
    html: `<div>${parts.join('')}</div>`,
  };
}
