/* ============================================================
   NotionNest — utils.js
   Block helpers, ID generation, caret utilities
   ============================================================ */

let _idCounter = 0;

export function generateId() {
  return 'b_' + Date.now().toString(36) + '_' + (++_idCounter);
}

// ---- Block factory ----
export function makeBlock(type, content, extra) {
  const b = { id: generateId(), type, content: content || '' };
  if (extra) Object.assign(b, extra);
  return b;
}

// ---- Default page content showcasing all block types ----
export function buildDefaultBlocks() {
  return [
    makeBlock('heading1', 'Welcome to NotionNest'),
    makeBlock('paragraph', 'Start writing, or press <kbd>/</kbd> for commands…'),
    makeBlock('heading2', 'Lists'),
    makeBlock('bulleted_list', 'First bullet item'),
    makeBlock('bulleted_list', 'Second bullet item'),
    makeBlock('bulleted_list', 'Third bullet item'),
    makeBlock('numbered_list', 'Step one'),
    makeBlock('numbered_list', 'Step two'),
    makeBlock('numbered_list', 'Step three'),
    makeBlock('heading2', 'Tasks'),
    makeBlock('todo', 'Explore NotionNest', { checked: false }),
    makeBlock('todo', 'Try the slash command menu', { checked: true }),
    makeBlock('todo', 'Drag & drop blocks', { checked: false }),
    makeBlock('toggle', 'Click me to expand', {
      open: false,
      children: [
        makeBlock('paragraph', 'Hidden content revealed! You can nest anything inside toggles.'),
        makeBlock('bulleted_list', 'Nested bullet A'),
        makeBlock('bulleted_list', 'Nested bullet B'),
      ],
    }),
    makeBlock('heading2', 'Rich Content'),
    makeBlock('quote', 'The only limit to our realization of tomorrow is our doubts of today. — Franklin D. Roosevelt'),
    makeBlock('callout', 'This is a callout block — great for tips and important info!', { calloutIcon: '💡' }),
    makeBlock('divider', ''),
    makeBlock('code', 'function greet(name) {\n  console.log(`Hello, ${name}!`);\n}\ngreet("NotionNest");', { language: 'javascript' }),
    makeBlock('heading2', 'Tabs'),
    {
      id: generateId(), type: 'tabs', content: '', activeTabId: null,
      tabs: [
        { id: generateId(), name: 'Overview', blocks: [makeBlock('paragraph', 'This is the <b>Overview</b> tab. Tabs work just like in Notion — click to switch, drag to reorder, and nest any block type inside.')] },
        { id: generateId(), name: 'Details', blocks: [makeBlock('paragraph', 'The <b>Details</b> tab can contain any blocks — lists, code, images, even nested tabs!'), makeBlock('bulleted_list', 'Detail point A'), makeBlock('bulleted_list', 'Detail point B')] },
        { id: generateId(), name: 'Notes', blocks: [makeBlock('paragraph', 'Quick notes go here. Everything is editable and draggable.')] },
      ],
    },
    makeBlock('heading2', 'Table'),
    {
      id: generateId(), type: 'table', content: '',
      rows: [
        ['Feature', 'Status', 'Priority'],
        ['Dark theme', '✅ Done', 'High'],
        ['Slash commands', '✅ Done', 'High'],
      ],
    },
    makeBlock('heading2', 'Columns'),
    {
      id: generateId(), type: 'columns', content: '',
      columns: [
        { id: generateId(), blocks: [makeBlock('paragraph', '<b>Left column</b> — you can put any blocks here.')] },
        { id: generateId(), blocks: [makeBlock('paragraph', '<b>Right column</b> — independent content.')] },
      ],
    },
    makeBlock('toc', ''),
    makeBlock('paragraph', ''),
  ];
}

// ---- Fix tab defaults (set activeTabId) ----
export function fixTabDefaults(blocks) {
  for (const b of blocks) {
    if (b.type === 'tabs' && b.tabs && b.tabs.length) {
      if (!b.activeTabId) b.activeTabId = b.tabs[0].id;
      for (const t of b.tabs) fixTabDefaults(t.blocks);
    }
    if (b.children) fixTabDefaults(b.children);
    if (b.type === 'columns' && b.columns) {
      for (const c of b.columns) fixTabDefaults(c.blocks);
    }
  }
}

// ---- Block search helpers ----
export function isBlockEmpty(block) {
  if (!block.content) return true;
  const tmp = document.createElement('div');
  tmp.innerHTML = block.content;
  return tmp.textContent.trim().length === 0;
}

export function getBlockById(blockId, blocks) {
  if (!blocks) return null;
  for (const b of blocks) {
    if (b.id === blockId) return b;
    if (b.children) { const r = getBlockById(blockId, b.children); if (r) return r; }
    if (b.type === 'tabs' && b.tabs) {
      for (const t of b.tabs) { const r = getBlockById(blockId, t.blocks); if (r) return r; }
    }
    if (b.type === 'columns' && b.columns) {
      for (const c of b.columns) { const r = getBlockById(blockId, c.blocks); if (r) return r; }
    }
  }
  return null;
}

export function findBlockContainer(blockId, blocks) {
  if (!blocks) return null;
  for (let i = 0; i < blocks.length; i++) {
    if (blocks[i].id === blockId) return { arr: blocks, index: i };
    if (blocks[i].children) {
      const r = findBlockContainer(blockId, blocks[i].children);
      if (r) return r;
    }
    if (blocks[i].type === 'tabs' && blocks[i].tabs) {
      for (const tab of blocks[i].tabs) {
        const r = findBlockContainer(blockId, tab.blocks);
        if (r) return r;
      }
    }
    if (blocks[i].type === 'columns' && blocks[i].columns) {
      for (const col of blocks[i].columns) {
        const r = findBlockContainer(blockId, col.blocks);
        if (r) return r;
      }
    }
  }
  return null;
}

export function flatVisibleBlocks(blocks) {
  const out = [];
  for (const b of blocks) {
    out.push(b);
    if (b.type === 'toggle' && b.open && b.children) out.push(...flatVisibleBlocks(b.children));
    if (b.type === 'tabs' && b.tabs) {
      const active = b.tabs.find(t => t.id === b.activeTabId);
      if (active) out.push(...flatVisibleBlocks(active.blocks));
    }
    if (b.type === 'columns' && b.columns) {
      for (const c of b.columns) out.push(...flatVisibleBlocks(c.blocks));
    }
  }
  return out;
}

// ---- Caret / selection utilities ----
export function getCaretPosition(el) {
  const sel = window.getSelection();
  if (!sel.rangeCount) return 0;
  const range = sel.getRangeAt(0);
  const pre = range.cloneRange();
  pre.selectNodeContents(el);
  pre.setEnd(range.startContainer, range.startOffset);
  return pre.toString().length;
}

export function setCaretPosition(el, offset) {
  if (!el) return;
  el.focus();
  const sel = window.getSelection();
  const range = document.createRange();
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
  let pos = 0;
  let node;
  while ((node = walker.nextNode())) {
    const len = node.textContent.length;
    if (pos + len >= offset) {
      range.setStart(node, offset - pos);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
      return;
    }
    pos += len;
  }
  range.selectNodeContents(el);
  range.collapse(false);
  sel.removeAllRanges();
  sel.addRange(range);
}

export function setCaretToEnd(el) {
  if (!el) return;
  el.focus();
  const sel = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  sel.removeAllRanges();
  sel.addRange(range);
}

export function getCaretCoordinates() {
  const sel = window.getSelection();
  if (!sel.rangeCount) return { x: 0, y: 0 };
  const range = sel.getRangeAt(0).cloneRange();
  range.collapse(true);
  let rect = range.getClientRects()[0];
  if (!rect) {
    const span = document.createElement('span');
    span.textContent = '\u200b';
    range.insertNode(span);
    rect = span.getBoundingClientRect();
    span.parentNode.removeChild(span);
    sel.removeAllRanges();
    sel.addRange(range);
  }
  return { x: rect.left, y: rect.bottom };
}

// ---- New block with type defaults ----
export function createNewBlock(type, content) {
  const b = makeBlock(type, content || '');
  if (type === 'toggle') { b.open = false; b.children = [makeBlock('paragraph', '')]; }
  if (type === 'todo') { b.checked = false; }
  if (type === 'callout') { b.calloutIcon = '💡'; }
  if (type === 'code') { b.language = 'javascript'; }
  if (type === 'table') { b.rows = [['Column 1', 'Column 2', 'Column 3'], ['', '', ''], ['', '', '']]; }
  if (type === 'columns') { b.columns = [{ id: generateId(), blocks: [makeBlock('paragraph', '')] }, { id: generateId(), blocks: [makeBlock('paragraph', '')] }]; }
  if (type === 'tabs') {
    b.tabs = [
      { id: generateId(), name: 'Tab 1', blocks: [makeBlock('paragraph', '')] },
      { id: generateId(), name: 'Tab 2', blocks: [makeBlock('paragraph', '')] },
    ];
    b.activeTabId = b.tabs[0].id;
  }
  if (type === 'image') { b.url = ''; b.caption = ''; }
  if (type === 'bookmark') { b.url = ''; b.bookmarkTitle = ''; b.description = ''; }
  return b;
}

// ---- Deep clone block with fresh IDs ----
export function deepCloneBlock(block) {
  const clone = JSON.parse(JSON.stringify(block));
  function reassignIds(b) {
    b.id = generateId();
    if (b.children) b.children.forEach(reassignIds);
    if (b.tabs) b.tabs.forEach(t => { t.id = generateId(); t.blocks.forEach(reassignIds); });
    if (b.columns) b.columns.forEach(c => { c.id = generateId(); c.blocks.forEach(reassignIds); });
  }
  reassignIds(clone);
  return clone;
}

// ---- Slash command menu data ----
export const slashMenuSections = [
  {
    label: 'Basic Blocks',
    items: [
      { icon: '📝', name: 'Text', desc: 'Plain text block', type: 'paragraph' },
      { icon: '𝗛₁', name: 'Heading 1', desc: 'Large section heading', type: 'heading1' },
      { icon: '𝗛₂', name: 'Heading 2', desc: 'Medium section heading', type: 'heading2' },
      { icon: '𝗛₃', name: 'Heading 3', desc: 'Small section heading', type: 'heading3' },
      { icon: '•', name: 'Bulleted List', desc: 'Simple bulleted list', type: 'bulleted_list' },
      { icon: '1.', name: 'Numbered List', desc: 'Numbered list', type: 'numbered_list' },
      { icon: '☑', name: 'To-do', desc: 'Task checkbox', type: 'todo' },
      { icon: '▶', name: 'Toggle', desc: 'Collapsible toggle block', type: 'toggle' },
    ],
  },
  {
    label: 'Media',
    items: [
      { icon: '🖼', name: 'Image', desc: 'Upload or embed an image', type: 'image' },
      { icon: '🔗', name: 'Bookmark', desc: 'Save a link as bookmark', type: 'bookmark' },
      { icon: '💻', name: 'Code', desc: 'Code block with syntax highlighting', type: 'code' },
      { icon: '—', name: 'Divider', desc: 'Horizontal divider', type: 'divider' },
    ],
  },
  {
    label: 'Advanced',
    items: [
      { icon: '📊', name: 'Table', desc: 'Simple table', type: 'table' },
      { icon: '▤', name: 'Columns', desc: 'Two column layout', type: 'columns' },
      { icon: '📑', name: 'Table of Contents', desc: 'Auto-generated TOC', type: 'toc' },
      { icon: '💡', name: 'Callout', desc: 'Callout box with icon', type: 'callout' },
      { icon: '❝', name: 'Quote', desc: 'Quote block', type: 'quote' },
      { icon: '🗂', name: 'Tabs', desc: 'Tabbed content block', type: 'tabs' },
    ],
  },
];
