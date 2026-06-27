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
    makeBlock('paragraph', 'Start writing, or press <kbd>/</kbd> for commands. Try markdown shortcuts: <code># </code> for heading, <code>- </code> for bullets, <code>[] </code> for todos…'),
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
    makeBlock('heading2', 'Media'),
    makeBlock('video', '', { url: '' }),
    makeBlock('audio', '', { url: '' }),
    makeBlock('file', '', { url: '', fileName: '' }),
    makeBlock('heading2', 'Math'),
    makeBlock('equation', '', { expression: 'E = mc^2' }),
    makeBlock('equation', '', { expression: '\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}' }),
    makeBlock('heading2', 'Toggle Headings'),
    {
      id: generateId(), type: 'toggle_heading1', content: 'Toggle Heading 1 — Click to expand', open: false,
      children: [makeBlock('paragraph', 'Content inside a collapsible heading. Great for FAQs!')],
    },
    {
      id: generateId(), type: 'toggle_heading2', content: 'Toggle Heading 2', open: false,
      children: [makeBlock('paragraph', 'Nested content here.')],
    },
    makeBlock('heading2', 'Sub-pages'),
    makeBlock('sub_page', '', { pageTitle: 'Meeting Notes' }),
    makeBlock('sub_page', '', { pageTitle: 'Project Roadmap' }),
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
        ['Tab blocks', '✅ Done', 'Critical'],
        ['Markdown shortcuts', '✅ Done', 'High'],
        ['Toggle headings', '✅ Done', 'High'],
        ['Equation blocks', '✅ Done', 'Medium'],
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
    if ((b.type === 'toggle' || b.type.startsWith('toggle_heading')) && b.open && b.children) out.push(...flatVisibleBlocks(b.children));
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
  if (type === 'toggle' || type === 'toggle_heading1' || type === 'toggle_heading2' || type === 'toggle_heading3') { b.open = false; b.children = [makeBlock('paragraph', '')]; }
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
  if (type === 'video') { b.url = ''; }
  if (type === 'audio') { b.url = ''; }
  if (type === 'file') { b.url = ''; b.fileName = ''; }
  if (type === 'equation') { b.expression = ''; }
  if (type === 'bookmark') { b.url = ''; b.bookmarkTitle = ''; b.description = ''; }
  if (type === 'sub_page') { b.pageTitle = 'Untitled'; }
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
      { icon: 'FileText', name: 'Text', desc: 'Plain text block', type: 'paragraph', keywords: ['text', 'p', 'paragraph', 'plain'] },
      { icon: 'File', name: 'Page', desc: 'Embed a sub-page', type: 'sub_page', keywords: ['page', 'subpage', 'doc', 'embed'] },
      { icon: 'CheckSquare', name: 'To-do List', desc: 'Track tasks with checkboxes', type: 'todo', keywords: ['todo', 'task', 'list', 'check', 'checkbox'] },
      { icon: 'Heading1', name: 'Heading 1', desc: 'Large section heading', type: 'heading1', keywords: ['h1', 'heading1', 'title', 'large'] },
      { icon: 'Heading2', name: 'Heading 2', desc: 'Medium section heading', type: 'heading2', keywords: ['h2', 'heading2', 'subtitle', 'medium'] },
      { icon: 'Heading3', name: 'Heading 3', desc: 'Small section heading', type: 'heading3', keywords: ['h3', 'heading3', 'small'] },
      { icon: 'List', name: 'Bulleted List', desc: 'Simple bulleted list', type: 'bulleted_list', keywords: ['bullet', 'list', 'bulleted'] },
      { icon: 'ListOrdered', name: 'Numbered List', desc: 'Numbered list', type: 'numbered_list', keywords: ['number', 'ordered', 'list', 'numbered'] },
      { icon: 'ChevronRight', name: 'Toggle List', desc: 'Collapsible toggle block', type: 'toggle', keywords: ['toggle', 'list', 'collapsible', 'expand'] },
      { icon: 'Quote', name: 'Quote', desc: 'Capture a quote', type: 'quote', keywords: ['quote', 'blockquotes', 'citation'] },
      { icon: 'Minus', name: 'Divider', desc: 'Horizontal divider line', type: 'divider', keywords: ['divider', 'line', 'hr', 'split'] },
      { icon: 'Lightbulb', name: 'Callout', desc: 'Callout box with icon', type: 'callout', keywords: ['callout', 'box', 'tip', 'info', 'alert'] },
    ],
  },
  {
    label: 'Media',
    items: [
      { icon: 'Image', name: 'Image', desc: 'Upload or embed an image', type: 'image', keywords: ['image', 'photo', 'picture', 'file'] },
      { icon: 'Video', name: 'Video', desc: 'Embed a video', type: 'video', keywords: ['video', 'youtube', 'vimeo', 'movie'] },
      { icon: 'Music', name: 'Audio', desc: 'Embed audio', type: 'audio', keywords: ['audio', 'music', 'sound', 'mp3'] },
      { icon: 'Paperclip', name: 'File', desc: 'Upload or link a file', type: 'file', keywords: ['file', 'attachment', 'upload', 'pdf'] },
      { icon: 'Code', name: 'Code', desc: 'Code block with syntax highlighting', type: 'code', keywords: ['code', 'pre', 'script', 'javascript', 'html'] },
      { icon: 'Bookmark', name: 'Web Bookmark', desc: 'Save a link as visual bookmark', type: 'bookmark', keywords: ['bookmark', 'link', 'web', 'url'] },
    ],
  },
  {
    label: 'Advanced',
    items: [
      { icon: 'Table', name: 'Table', desc: 'Simple table', type: 'table', keywords: ['table', 'grid', 'matrix', 'data'] },
      { icon: 'Columns', name: 'Columns', desc: 'Two column layout', type: 'columns', keywords: ['columns', 'layout', 'grid', 'split'] },
      { icon: 'BookOpen', name: 'Table of Contents', desc: 'Auto-generated from headings', type: 'toc', keywords: ['toc', 'table of contents', 'index', 'headings'] },
      { icon: 'Layers', name: 'Tabs', desc: 'Tabbed content block', type: 'tabs', keywords: ['tabs', 'layout', 'pages', 'cards'] },
      { icon: 'Sigma', name: 'Equation', desc: 'LaTeX math equation', type: 'equation', keywords: ['equation', 'math', 'latex', 'sigma'] },
      { icon: 'Heading1', name: 'Toggle Heading 1', desc: 'Collapsible large heading', type: 'toggle_heading1', keywords: ['toggle heading1', 'h1', 'heading1', 'toggle'] },
      { icon: 'Heading2', name: 'Toggle Heading 2', desc: 'Collapsible medium heading', type: 'toggle_heading2', keywords: ['toggle heading2', 'h2', 'heading2', 'toggle'] },
      { icon: 'Heading3', name: 'Toggle Heading 3', desc: 'Collapsible small heading', type: 'toggle_heading3', keywords: ['toggle heading3', 'h3', 'heading3', 'toggle'] },
    ],
  },
];

// ---- Color palette (Notion text/background colors) ----
export const notionColors = [
  { name: 'Default', text: '#e3e3e3', bg: 'transparent' },
  { name: 'Gray', text: '#9b9b9b', bg: '#2c2c2c' },
  { name: 'Brown', text: '#a47d5e', bg: '#3b2d20' },
  { name: 'Orange', text: '#d9730d', bg: '#3e2b15' },
  { name: 'Yellow', text: '#dfab01', bg: '#3d3415' },
  { name: 'Green', text: '#0f7b6c', bg: '#1a3229' },
  { name: 'Blue', text: '#2383e2', bg: '#192f45' },
  { name: 'Purple', text: '#9065b0', bg: '#2c233a' },
  { name: 'Pink', text: '#c14c8a', bg: '#351a2c' },
  { name: 'Red', text: '#eb5757', bg: '#3e2024' },
];

// ---- Markdown shortcut map ----
export const markdownShortcuts = [
  { pattern: /^# $/, type: 'heading1' },
  { pattern: /^## $/, type: 'heading2' },
  { pattern: /^### $/, type: 'heading3' },
  { pattern: /^- $/, type: 'bulleted_list' },
  { pattern: /^\* $/, type: 'bulleted_list' },
  { pattern: /^\d+\. $/, type: 'numbered_list' },
  { pattern: /^\[\] $/, type: 'todo' },
  { pattern: /^> $/, type: 'quote' },
  { pattern: /^--- ?$/, type: 'divider' },
  { pattern: /^```$/, type: 'code' },
  { pattern: /^\|\| $/, type: 'toggle' },
];

export function calculateInitials(title, type, customVal = '') {
  if (type === 'custom') {
    return (customVal || '').slice(0, 2).toUpperCase();
  }
  
  const cleanTitle = (title || 'Untitled').trim();
  const words = cleanTitle.split(/\s+/).filter(Boolean);
  
  if (type === 'single') {
    if (words.length > 0) {
      return words[0].charAt(0).toUpperCase();
    }
    return 'U';
  }
  
  // Default: two letters
  if (words.length >= 2) {
    return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
  } else if (words.length === 1) {
    const word = words[0];
    return word.slice(0, 2).toUpperCase();
  }
  return 'UN';
}
