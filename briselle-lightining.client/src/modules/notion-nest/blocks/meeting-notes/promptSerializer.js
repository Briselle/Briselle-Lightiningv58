/* ============================================================
   NotionNest — meeting-notes/promptSerializer.js
   Created At: 2026-08-16 | Last Modified: 2026-08-16
   Previous Version Back URL: meeting-notes/config/EditPromptModal.jsx@2026-08-15
                              (parsePromptToBlocks / blocksToText)

   Task: BRIS-NN-MNB-T96
   Purpose: Convert between prompt markdown and NotionNest block JSON.

   Lifted from EditPromptModal's own parse/serialise pair rather than
   written fresh — that logic already handled h1-h3, bullets, numbered
   lists, todos, dividers and quotes correctly. What changed:

     • it emits the NotionNest block shape (id/type/content/properties)
       so the real page editor can render it, instead of the modal's
       private shape;
     • round-tripping is lossless for the types it covers, and any type
       it does not recognise degrades to a paragraph rather than being
       dropped;
     • ids are unique per call. The original built them from
       `Date.now() + counter`, which collides when two blocks are
       created inside the same millisecond.

   No React. Pure functions, so both the editor and the summary call
   can use them.
   ============================================================ */

let idCounter = 0;

/** Collision-proof id: a timestamp alone repeats within a millisecond. */
function newBlockId() {
  idCounter += 1;
  return `pb_${Date.now().toString(36)}_${idCounter}_${Math.random().toString(36).slice(2, 8)}`;
}

/** A NotionNest block in the shape BlockRenderer expects. */
function makeBlock(type, content, extra = {}) {
  return { id: newBlockId(), type, content: content || '', ...extra };
}

/**
 * Markdown prompt text → NotionNest blocks.
 * @param {string} text
 * @returns {Array<object>} always at least one block
 */
export function markdownToBlocks(text) {
  if (!text || !String(text).trim()) return [makeBlock('paragraph', '')];

  const lines = String(text).replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let inFence = false;
  let fenceLines = [];
  let fenceLang = '';

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    /* Fenced code survives verbatim — headings and bullets inside a code
       sample are content, not structure. */
    const fence = line.match(/^```(\w*)\s*$/);
    if (fence) {
      if (inFence) {
        blocks.push(makeBlock('code', fenceLines.join('\n'), { language: fenceLang || 'plain' }));
        inFence = false;
        fenceLines = [];
        fenceLang = '';
      } else {
        inFence = true;
        fenceLang = fence[1] || '';
      }
      continue;
    }
    if (inFence) { fenceLines.push(line); continue; }

    if (/^###\s+/.test(line))      blocks.push(makeBlock('heading3', line.replace(/^###\s+/, '')));
    else if (/^##\s+/.test(line))  blocks.push(makeBlock('heading2', line.replace(/^##\s+/, '')));
    else if (/^#\s+/.test(line))   blocks.push(makeBlock('heading1', line.replace(/^#\s+/, '')));
    else if (/^[-*•]\s+\[[ xX]\]\s+/.test(line)) {
      blocks.push(makeBlock(
        'todo',
        line.replace(/^[-*•]\s+\[[ xX]\]\s+/, ''),
        { checked: /^[-*•]\s+\[[xX]\]\s+/.test(line) }
      ));
    }
    else if (/^[-*•]\s+/.test(line))  blocks.push(makeBlock('bulleted_list', line.replace(/^[-*•]\s+/, '')));
    else if (/^\d+[.)]\s+/.test(line)) blocks.push(makeBlock('numbered_list', line.replace(/^\d+[.)]\s+/, '')));
    else if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) blocks.push(makeBlock('divider', ''));
    else if (/^>\s?/.test(line))    blocks.push(makeBlock('quote', line.replace(/^>\s?/, '')));
    else if (line.trim() === '') {
      /* A blank line is a separator, not content — but keep one when it
         sits between two paragraphs so the prompt's own spacing survives
         a round trip. */
      const prev = blocks[blocks.length - 1];
      const next = lines[i + 1];
      if (prev && prev.type === 'paragraph' && next && next.trim() !== '' && !/^[#>\-*\d`]/.test(next)) {
        blocks.push(makeBlock('paragraph', ''));
      }
    }
    else blocks.push(makeBlock('paragraph', line));
  }

  /* An unterminated fence still yields its content rather than losing it. */
  if (inFence && fenceLines.length) {
    blocks.push(makeBlock('code', fenceLines.join('\n'), { language: fenceLang || 'plain' }));
  }

  return blocks.length ? blocks : [makeBlock('paragraph', '')];
}

/** Strip HTML a contentEditable may have left behind in `content`. */
function plainText(value) {
  if (value == null) return '';
  const s = String(value);
  if (!/[<&]/.test(s)) return s;
  if (typeof document === 'undefined') return s.replace(/<[^>]*>/g, '');
  const el = document.createElement('div');
  el.innerHTML = s;
  return el.textContent || '';
}

/**
 * NotionNest blocks → markdown prompt text.
 * @param {Array<object>} blocks
 * @returns {string}
 */
export function blocksToMarkdown(blocks) {
  if (!Array.isArray(blocks) || !blocks.length) return '';

  let numbering = 0;
  const lines = [];

  blocks.forEach((b) => {
    if (!b) return;
    const type = b.type || 'paragraph';
    const content = plainText(b.content);

    if (type !== 'numbered_list') numbering = 0;

    switch (type) {
      case 'heading1': lines.push(`# ${content}`); break;
      case 'heading2': lines.push(`## ${content}`); break;
      case 'heading3':
      case 'heading4':
      case 'heading5': lines.push(`### ${content}`); break;
      case 'toggle_heading1': lines.push(`# ${content}`); break;
      case 'toggle_heading2': lines.push(`## ${content}`); break;
      case 'toggle_heading3': lines.push(`### ${content}`); break;
      case 'bulleted_list':
      case 'toggle': lines.push(`- ${content}`); break;
      case 'numbered_list':
        numbering += 1;
        lines.push(`${numbering}. ${content}`);
        break;
      case 'todo': lines.push(`- [${b.checked ? 'x' : ' '}] ${content}`); break;
      case 'quote':
      case 'callout': lines.push(`> ${content}`); break;
      case 'divider': lines.push('---'); break;
      case 'code': lines.push('```' + (b.language || '') + '\n' + content + '\n```'); break;
      /* Media and structural blocks carry no prompt text. Skipped rather
         than emitted as an empty line, which would pad the prompt. */
      case 'image': case 'video': case 'audio': case 'file':
      case 'bookmark': case 'link_preview': case 'toc':
      case 'table': case 'columns': case 'tabs': case 'button':
      case 'sub_page': case 'equation':
        break;
      default: lines.push(content);
    }
  });

  /* Collapse runs of blank lines and trim the ends, so an edit that left
     trailing empty paragraphs does not grow the prompt on every save. */
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/* ══════════════════════════════════════════════════════════════════
   BRIS-NN-MNB-T124 — one visual weight for a summary's top sections.

   The model decides its own heading depth. One run opens sections with
   `##`, the next with `###`, and both are valid markdown — but they
   render at different sizes, so two summaries side by side look like
   two different features. That is the "some are better and some bad".

   Rather than fight the model with prompt wording, the levels are
   normalised on the way in: whatever the SHALLOWEST heading in the
   document is becomes h2, and everything below keeps its relative
   depth. A summary that already leads with `##` is untouched.
   ══════════════════════════════════════════════════════════════════ */
export function normaliseHeadingLevels(md) {
  if (!md) return '';
  const text = String(md);

  const levels = [...text.matchAll(/^(#{1,6})[ \t]+\S/gm)].map(m => m[1].length);
  if (!levels.length) return text;

  const shallowest = Math.min(...levels);
  /* Already leading with h1 or h2 — leave it alone. */
  if (shallowest <= 2) return text;

  const shift = shallowest - 2;
  return text.replace(/^(#{1,6})([ \t]+)/gm, (_m, hashes, space) =>
    '#'.repeat(Math.max(1, hashes.length - shift)) + space);
}

/** Blocks for an instruction, deriving them from its text on first edit. */
export function instructionToBlocks(entry) {
  if (entry && Array.isArray(entry.blocks) && entry.blocks.length) return entry.blocks;
  return markdownToBlocks(entry?.promptText || '');
}
