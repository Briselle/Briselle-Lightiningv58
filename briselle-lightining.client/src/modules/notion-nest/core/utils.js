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
  if (!blocks) return;
  for (const b of blocks) {
    if (b.type === 'tabs' && b.tabs && b.tabs.length) {
      if (!b.activeTabId) b.activeTabId = b.tabs[0]?.id;
      for (const t of b.tabs) if (t?.blocks) fixTabDefaults(t.blocks);
    }
    if (b.children) fixTabDefaults(b.children);
    if (b.type === 'columns' && b.columns) {
      for (const c of b.columns) if (c?.blocks) fixTabDefaults(c.blocks);
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
    if (b.children && b.children.length > 0) {
      const isToggle = b.type === 'toggle' || b.type.startsWith('toggle_heading');
      if (!isToggle || b.open) {
        out.push(...flatVisibleBlocks(b.children));
      }
    }
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
  try {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return 0;
    const range = sel.getRangeAt(0);
    const pre = range.cloneRange();
    pre.selectNodeContents(el);
    pre.setEnd(range.startContainer, range.startOffset);
    return pre.toString().length;
  } catch (e) {
    return 0;
  }
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
  if (type === 'toggle' || type === 'toggle_heading1' || type === 'toggle_heading2' || type === 'toggle_heading3' || type === 'toggle_heading4' || type === 'toggle_heading5') { b.open = false; b.children = [makeBlock('paragraph', '')]; }
  if (type === 'todo') { b.checked = false; }
  if (type === 'callout') { b.calloutIcon = '💡'; }
  if (type === 'code') { b.language = 'javascript'; }
  if (type === 'table') { b.rows = [['','',''],['','',''],['','','']]; b.hasHeader = false; }
  if (type === 'columns' || type === 'columns2') { b.type = 'columns'; b.columns = [{ id: generateId(), blocks: [makeBlock('paragraph', '')] }, { id: generateId(), blocks: [makeBlock('paragraph', '')] }]; }
  if (type === 'columns3') { b.type = 'columns'; b.columns = [{ id: generateId(), blocks: [makeBlock('paragraph', '')] }, { id: generateId(), blocks: [makeBlock('paragraph', '')] }, { id: generateId(), blocks: [makeBlock('paragraph', '')] }]; }
  if (type === 'columns4') { b.type = 'columns'; b.columns = [{ id: generateId(), blocks: [makeBlock('paragraph', '')] }, { id: generateId(), blocks: [makeBlock('paragraph', '')] }, { id: generateId(), blocks: [makeBlock('paragraph', '')] }, { id: generateId(), blocks: [makeBlock('paragraph', '')] }]; }
  if (type === 'columns5') { b.type = 'columns'; b.columns = [{ id: generateId(), blocks: [makeBlock('paragraph', '')] }, { id: generateId(), blocks: [makeBlock('paragraph', '')] }, { id: generateId(), blocks: [makeBlock('paragraph', '')] }, { id: generateId(), blocks: [makeBlock('paragraph', '')] }, { id: generateId(), blocks: [makeBlock('paragraph', '')] }]; }
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
  if (type === 'bookmark') { b.url = ''; b.bookmarkTitle = ''; b.description = ''; b.image = ''; b.favicon = ''; b.isVisualBookmark = true; }
  if (type === 'sub_page') { b.pageTitle = 'Untitled'; }
  if (type === 'button') { b.buttonIcon = ''; b.buttonStyle = 'primary'; b.actions = []; }
  if (type === 'meeting_notes') {
    b.title = 'Meeting';
    b.date = new Date().toISOString().split('T')[0];
    b.participants = [];
    b.transcription = '';
    b.isRecording = false;
    b.mode = 'auto';
    b.includeSummary = true;
    b.includeBullets = true;
    b.includeActionItems = true;
    b.includeFollowUp = true;
    b.summary = '';
    b.bulletPoints = [];
    b.aiInsights = [];
  }
  return b;
}

// ---- Deep clone block with fresh IDs ----
export function deepCloneBlock(block) {
  const clone = JSON.parse(JSON.stringify(block));
  const idMap = new Map();
  function reassignIds(b) {
    const oldId = b.id;
    b.id = generateId();
    idMap.set(oldId, b.id);
    if (b.children) b.children.forEach(reassignIds);
    if (b.tabs) {
      const oldActiveId = b.activeTabId;
      b.tabs.forEach(t => {
        const oldTabId = t.id;
        t.id = generateId();
        idMap.set(oldTabId, t.id);
        t.blocks.forEach(reassignIds);
      });
      if (oldActiveId && idMap.has(oldActiveId)) {
        b.activeTabId = idMap.get(oldActiveId);
      } else if (b.tabs.length > 0) {
        b.activeTabId = b.tabs[0].id;
      }
    }
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
      { icon: 'FileText', name: 'Text', desc: 'Plain text block', type: 'paragraph', keywords: ['text', 'p', 'paragraph', 'plain'], shortcut: 'txt' },
      { icon: 'File', name: 'Page', desc: 'Embed a sub-page', type: 'sub_page', keywords: ['page', 'subpage', 'doc', 'embed'], shortcut: 'pg' },
      { icon: 'CheckSquare', name: 'To-do List', desc: 'Track tasks with checkboxes', type: 'todo', keywords: ['todo', 'task', 'list', 'check', 'checkbox'], shortcut: '[]' },
      { icon: 'Heading1', name: 'Heading 1', desc: 'Large section heading', type: 'heading1', keywords: ['h1', 'heading1', 'title', 'large'], shortcut: '# / h1' },
      { icon: 'Heading2', name: 'Heading 2', desc: 'Medium section heading', type: 'heading2', keywords: ['h2', 'heading2', 'subtitle', 'medium'], shortcut: '## / h2' },
      { icon: 'Heading3', name: 'Heading 3', desc: 'Small section heading', type: 'heading3', keywords: ['h3', 'heading3', 'small'], shortcut: '### / h3' },
      { icon: 'Heading1', name: 'Heading 4', desc: 'Extra small section heading', type: 'heading4', keywords: ['h4', 'heading4', 'tiny'], shortcut: '#### / h4' },
      { icon: 'Heading1', name: 'Heading 5', desc: 'Mini section heading', type: 'heading5', keywords: ['h5', 'heading5', 'mini'], shortcut: '##### / h5' },
      { icon: 'List', name: 'Bulleted List', desc: 'Simple bulleted list', type: 'bulleted_list', keywords: ['bullet', 'list', 'bulleted'], shortcut: '-' },
      { icon: 'ListOrdered', name: 'Numbered List', desc: 'Numbered list', type: 'numbered_list', keywords: ['number', 'ordered', 'list', 'numbered'], shortcut: '1.' },
      { icon: 'ChevronRight', name: 'Toggle List', desc: 'Collapsible toggle block', type: 'toggle', keywords: ['toggle', 'list', 'collapsible', 'expand'], shortcut: '> / tl' },
      { icon: 'Quote', name: 'Quote', desc: 'Capture a quote', type: 'quote', keywords: ['quote', 'blockquotes', 'citation'], shortcut: '"' },
      { icon: 'Minus', name: 'Divider', desc: 'Horizontal divider line', type: 'divider', keywords: ['divider', 'line', 'hr', 'split'], shortcut: '---' },
      { icon: 'Lightbulb', name: 'Callout', desc: 'Callout box with icon', type: 'callout', keywords: ['callout', 'box', 'tip', 'info', 'alert'], shortcut: 'cl' },
    ],
  },
  {
    label: 'Media',
    items: [
      { icon: 'Image', name: 'Image', desc: 'Upload or embed an image', type: 'image', keywords: ['image', 'photo', 'picture', 'file'], shortcut: 'img' },
      { icon: 'Video', name: 'Video', desc: 'Embed a video', type: 'video', keywords: ['video', 'youtube', 'vimeo', 'movie'], shortcut: 'vid' },
      { icon: 'Music', name: 'Audio', desc: 'Embed audio', type: 'audio', keywords: ['audio', 'music', 'sound', 'mp3'], shortcut: 'au' },
      { icon: 'Paperclip', name: 'File', desc: 'Upload or link a file', type: 'file', keywords: ['file', 'attachment', 'upload', 'pdf'], shortcut: 'fl' },
      { icon: 'Code', name: 'Code', desc: 'Code block with syntax highlighting', type: 'code', keywords: ['code', 'pre', 'script', 'javascript', 'html'], shortcut: '<>' },
      { icon: 'Bookmark', name: 'Web Bookmark', desc: 'Save a link as visual bookmark', type: 'bookmark', keywords: ['bookmark', 'link', 'web', 'url'], shortcut: 'wbm' },
      { icon: 'Link', name: 'Link Embed', desc: 'Inline link preview', type: 'link_preview', keywords: ['link', 'url', 'preview', 'inline', 'embed'], shortcut: 'le' },
    ],
  },
  {
    label: 'Advanced',
    items: [
      { icon: 'Table', name: 'Table', desc: 'Simple table', type: 'table', keywords: ['table', 'grid', 'matrix', 'data'], shortcut: 'tbl' },
      { icon: 'Columns', name: '2 Columns', desc: 'Two-column layout', type: 'columns2', keywords: ['columns', 'columns2', '2col', '2 columns', 'layout', 'grid', 'split'], shortcut: 'col2' },
      { icon: 'Columns', name: '3 Columns', desc: 'Three-column layout', type: 'columns3', keywords: ['columns3', '3col', '3 columns', 'layout', 'grid'], shortcut: 'col3' },
      { icon: 'Columns', name: '4 Columns', desc: 'Four-column layout', type: 'columns4', keywords: ['columns4', '4col', '4 columns', 'layout', 'grid'], shortcut: 'col4' },
      { icon: 'Columns', name: '5 Columns', desc: 'Five-column layout', type: 'columns5', keywords: ['columns5', '5col', '5 columns', 'layout', 'grid'], shortcut: 'col5' },
      { icon: 'BookOpen', name: 'Table of Contents', desc: 'Auto-generated from headings', type: 'toc', keywords: ['toc', 'table of contents', 'index', 'headings'], shortcut: 'tc' },
      { icon: 'Layers', name: 'Tabs', desc: 'Tabbed content block', type: 'tabs', keywords: ['tabs', 'layout', 'pages', 'cards'], shortcut: 'tab' },
      { icon: 'Sigma', name: 'Equation', desc: 'LaTeX math equation', type: 'equation', keywords: ['equation', 'math', 'latex', 'sigma'], shortcut: 'eq' },
      { icon: 'Heading1', name: 'Toggle Heading 1', desc: 'Collapsible large heading', type: 'toggle_heading1', keywords: ['toggle heading1', 'h1', 'heading1', 'toggle', 'h1t'], shortcut: '#> / h1t' },
      { icon: 'Heading2', name: 'Toggle Heading 2', desc: 'Collapsible medium heading', type: 'toggle_heading2', keywords: ['toggle heading2', 'h2', 'heading2', 'toggle', 'h2t'], shortcut: '##> / h2t' },
      { icon: 'Heading3', name: 'Toggle Heading 3', desc: 'Collapsible small heading', type: 'toggle_heading3', keywords: ['toggle heading3', 'h3', 'heading3', 'toggle', 'h3t'], shortcut: '###> / h3t' },
      { icon: 'Heading1', name: 'Toggle Heading 4', desc: 'Collapsible extra small heading', type: 'toggle_heading4', keywords: ['toggle heading4', 'h4', 'heading4', 'toggle', 'h4t'], shortcut: '####> / h4t' },
      { icon: 'Heading1', name: 'Toggle Heading 5', desc: 'Collapsible mini heading', type: 'toggle_heading5', keywords: ['toggle heading5', 'h5', 'heading5', 'toggle', 'h5t'], shortcut: '#####> / h5t' },
      { icon: 'MousePointerClick', name: 'Button', desc: 'Clickable button with link', type: 'button', keywords: ['button', 'link', 'action', 'cta'], shortcut: 'btn' },
      { icon: 'Mic', name: 'ZIVA AI Meeting Notes', desc: 'AI meeting notes with recording & transcription', type: 'meeting_notes', keywords: ['meeting', 'notes', 'transcription', 'recording', 'ai', 'minutes', 'voice', 'ziva'], shortcut: 'mt' },
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
  { pattern: /^#### $/, type: 'heading4' },
  { pattern: /^##### $/, type: 'heading5' },
  { pattern: /^- $/, type: 'bulleted_list' },
  { pattern: /^\* $/, type: 'bulleted_list' },
  { pattern: /^\d+\. $/, type: 'numbered_list' },
  { pattern: /^\[\] $/, type: 'todo' },
  { pattern: /^> $/, type: 'toggle' },
  { pattern: /^#> $/, type: 'toggle_heading1' },
  { pattern: /^##> $/, type: 'toggle_heading2' },
  { pattern: /^###> $/, type: 'toggle_heading3' },
  { pattern: /^####> $/, type: 'toggle_heading4' },
  { pattern: /^#####> $/, type: 'toggle_heading5' },
  { pattern: /^" $/, type: 'quote' },
  { pattern: /^--- ?$/, type: 'divider' },
  { pattern: /^```$/, type: 'code' },
  { pattern: /^\|\| $/, type: 'toggle' },
  { pattern: /^h1 $/, type: 'heading1' },
  { pattern: /^h2 $/, type: 'heading2' },
  { pattern: /^h3 $/, type: 'heading3' },
  { pattern: /^h4 $/, type: 'heading4' },
  { pattern: /^h5 $/, type: 'heading5' },
  { pattern: /^h1t $/, type: 'toggle_heading1' },
  { pattern: /^h2t $/, type: 'toggle_heading2' },
  { pattern: /^h3t $/, type: 'toggle_heading3' },
  { pattern: /^h4t $/, type: 'toggle_heading4' },
  { pattern: /^h5t $/, type: 'toggle_heading5' },
  { pattern: /^tl $/, type: 'toggle' },
  { pattern: /^<> $/, type: 'code' },
  { pattern: /^tbl $/, type: 'table' },
  { pattern: /^cl $/, type: 'callout' },
  { pattern: /^img $/, type: 'image' },
  { pattern: /^vid $/, type: 'video' },
  { pattern: /^fl $/, type: 'file' },
  { pattern: /^au $/, type: 'audio' },
  { pattern: /^wbm $/, type: 'bookmark' },
  { pattern: /^tab $/, type: 'tabs' },
  { pattern: /^tc $/, type: 'toc' },
  { pattern: /^pg $/, type: 'sub_page' },
  { pattern: /^txt $/, type: 'paragraph' },
  { pattern: /^col2 $/, type: 'columns2' },
  { pattern: /^col3 $/, type: 'columns3' },
  { pattern: /^col4 $/, type: 'columns4' },
  { pattern: /^col5 $/, type: 'columns5' },
  { pattern: /^btn $/, type: 'button' },
  { pattern: /^mt $/, type: 'meeting_notes' },
  { pattern: /^eq $/, type: 'equation' },
  { pattern: /^le $/, type: 'link_preview' },
];

/* ══════════════════════════════════════════════════════════════════
   BRIS-NN-T97 — block-type exclusion helpers.

   A host can embed the page editor with part of the registry switched
   off (see PageProvider's `excludedBlockTypes`). A type is reachable
   from three places, so all three are filtered through these helpers
   rather than each consumer rolling its own check:

     • the slash menu           → filterSlashSections
     • the markdown shortcuts   → filterBlockShortcuts  (e.g. "mt ")
     • already-stored content   → BlockRenderer

   Both return the ORIGINAL array when nothing is excluded, so the
   common case allocates nothing and memo identity is preserved.
   ══════════════════════════════════════════════════════════════════ */

/** @param {Array} sections @param {string[]} excluded */
export function filterSlashSections(sections, excluded) {
  if (!excluded || !excluded.length) return sections;
  const drop = new Set(excluded);
  return sections
    .map(section => ({ ...section, items: section.items.filter(i => !drop.has(i.type)) }))
    .filter(section => section.items.length > 0);
}

/** @param {Array} shortcuts @param {string[]} excluded */
export function filterBlockShortcuts(shortcuts, excluded) {
  if (!excluded || !excluded.length) return shortcuts;
  const drop = new Set(excluded);
  return shortcuts.filter(s => !drop.has(s.type));
}

// ---- Recent blocks tracking ----
const RECENT_KEY = 'nn_recent';
export function getRecentBlocks() {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Object.entries(data)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([type]) => type);
  } catch { return []; }
}
export function trackBlockUsage(type) {
  if (!type) return;
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const data = raw ? JSON.parse(raw) : {};
    if (data[type]) { data[type].count += 1; data[type].lastUsed = Date.now(); }
    else { data[type] = { count: 1, lastUsed: Date.now() }; }
    localStorage.setItem(RECENT_KEY, JSON.stringify(data));
  } catch { /* ignore */ }
}

// ---- Code block languages ----
export const CODE_LANGUAGES = [
  { value: 'plain', label: 'Plain Text', color: '#6b7280', category: 'Basic' },
  { value: 'javascript', label: 'JavaScript', color: '#f7df1e', category: 'Basic' },
  { value: 'typescript', label: 'TypeScript', color: '#3178c6', category: 'Basic' },
  { value: 'python', label: 'Python', color: '#3776ab', category: 'Basic' },
  { value: 'java', label: 'Java', color: '#ed8b00', category: 'Basic' },
  { value: 'c', label: 'C', color: '#555555', category: 'Basic' },
  { value: 'cpp', label: 'C++', color: '#00599c', category: 'Basic' },
  { value: 'csharp', label: 'C#', color: '#239120', category: 'Basic' },
  { value: 'go', label: 'Go', color: '#00add8', category: 'Basic' },
  { value: 'rust', label: 'Rust', color: '#dea584', category: 'Basic' },
  { value: 'ruby', label: 'Ruby', color: '#cc342d', category: 'Basic' },
  { value: 'php', label: 'PHP', color: '#777bb4', category: 'Basic' },
  { value: 'swift', label: 'Swift', color: '#f05138', category: 'Basic' },
  { value: 'kotlin', label: 'Kotlin', color: '#7f52ff', category: 'Basic' },
  { value: 'scala', label: 'Scala', color: '#dc322f', category: 'Basic' },
  { value: 'r', label: 'R', color: '#276dc3', category: 'Basic' },
  { value: 'dart', label: 'Dart', color: '#0175c2', category: 'Basic' },
  { value: 'lua', label: 'Lua', color: '#000080', category: 'Basic' },
  { value: 'perl', label: 'Perl', color: '#39457e', category: 'Basic' },
  { value: 'html', label: 'HTML', color: '#e34c26', category: 'Web' },
  { value: 'css', label: 'CSS', color: '#1572b6', category: 'Web' },
  { value: 'scss', label: 'SCSS', color: '#c6538c', category: 'Web' },
  { value: 'less', label: 'Less', color: '#1d365d', category: 'Web' },
  { value: 'sass', label: 'Sass', color: '#cc6699', category: 'Web' },
  { value: 'xml', label: 'XML', color: '#0060ac', category: 'Web' },
  { value: 'svg', label: 'SVG', color: '#ffb13b', category: 'Web' },
  { value: 'jsx', label: 'JSX', color: '#61dafb', category: 'Web' },
  { value: 'tsx', label: 'TSX', color: '#3178c6', category: 'Web' },
  { value: 'vue', label: 'Vue', color: '#42b883', category: 'Web' },
  { value: 'svelte', label: 'Svelte', color: '#ff3e00', category: 'Web' },
  { value: 'json', label: 'JSON', color: '#292929', category: 'Data' },
  { value: 'yaml', label: 'YAML', color: '#cb171e', category: 'Data' },
  { value: 'toml', label: 'TOML', color: '#9c4221', category: 'Data' },
  { value: 'sql', label: 'SQL', color: '#e38c00', category: 'Data' },
  { value: 'graphql', label: 'GraphQL', color: '#e10098', category: 'Data' },
  { value: 'markdown', label: 'Markdown', color: '#083fa1', category: 'Data' },
  { value: 'csv', label: 'CSV', color: '#292929', category: 'Data' },
  { value: 'bash', label: 'Bash', color: '#4eaa25', category: 'Shell' },
  { value: 'powershell', label: 'PowerShell', color: '#012456', category: 'Shell' },
  { value: 'zsh', label: 'Zsh', color: '#ea4a8a', category: 'Shell' },
  { value: 'fish', label: 'Fish', color: '#405d95', category: 'Shell' },
  { value: 'dockerfile', label: 'Dockerfile', color: '#2496ed', category: 'DevOps' },
  { value: 'makefile', label: 'Makefile', color: '#427819', category: 'DevOps' },
  { value: 'cmake', label: 'CMake', color: '#064f8c', category: 'DevOps' },
  { value: 'nginx', label: 'Nginx', color: '#009639', category: 'DevOps' },
  { value: 'apache', label: 'Apache', color: '#d22128', category: 'DevOps' },
  { value: 'terraform', label: 'Terraform', color: '#844fba', category: 'DevOps' },
  { value: 'hcl', label: 'HCL', color: '#844fba', category: 'DevOps' },
  { value: 'protobuf', label: 'Protocol Buffers', color: '#4a82c7', category: 'DevOps' },
  { value: 'elixir', label: 'Elixir', color: '#6e4a7e', category: 'Functional' },
  { value: 'erlang', label: 'Erlang', color: '#a90533', category: 'Functional' },
  { value: 'haskell', label: 'Haskell', color: '#5e5086', category: 'Functional' },
  { value: 'clojure', label: 'Clojure', color: '#5881d8', category: 'Functional' },
  { value: 'lisp', label: 'Lisp', color: '#3fb68b', category: 'Functional' },
  { value: 'scheme', label: 'Scheme', color: '#1e4aec', category: 'Functional' },
  { value: 'ocaml', label: 'OCaml', color: '#3be133', category: 'Functional' },
  { value: 'fsharp', label: 'F#', color: '#b845fc', category: 'Functional' },
  { value: 'rust', label: 'Rust', color: '#dea584', category: 'Functional' },
  { value: 'matlab', label: 'MATLAB', color: '#e16737', category: 'Other' },
  { value: 'groovy', label: 'Groovy', color: '#4298b8', category: 'Other' },
  { value: 'assembly', label: 'Assembly', color: '#6e4c13', category: 'Other' },
  { value: 'zig', label: 'Zig', color: '#ec915c', category: 'Other' },
  { value: 'nim', label: 'Nim', color: '#ffc207', category: 'Other' },
  { value: 'v', label: 'V', color: '#4f87c4', category: 'Other' },
  { value: 'julia', label: 'Julia', color: '#a270ca', category: 'Other' },
  { value: 'objective-c', label: 'Objective-C', color: '#438eff', category: 'Other' },
  { value: 'coffeescript', label: 'CoffeeScript', color: '#244776', category: 'Other' },
  { value: 'dart', label: 'Dart', color: '#0175c2', category: 'Other' },
  { value: 'elm', label: 'Elm', color: '#60b5cc', category: 'Other' },
  { value: 'purescript', label: 'PureScript', color: '#14274c', category: 'Other' },
  { value: 'reasonml', label: 'ReasonML', color: '#e54845', category: 'Other' },
  { value: 'dhall', label: 'Dhall', color: '#dfafff', category: 'Other' },
  { value: 'bnf', label: 'BNF', color: '#a9a9a9', category: 'Other' },
  { value: 'diff', label: 'Diff', color: '#41b883', category: 'Other' },
];

export const CODE_LANGUAGE_CATEGORIES = [...new Set(CODE_LANGUAGES.map(l => l.category))];

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

export function isCaretOnFirstLine(el) {
  try {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return true;
    const range = sel.getRangeAt(0);
    
    // Clone range and collapse to start of selection to get caret rect
    const caretRange = range.cloneRange();
    caretRange.collapse(true);
    let caretRect = caretRange.getBoundingClientRect();
    
    // Fallback if caretRect has 0 width/height
    if (caretRect.top === 0) {
      const rects = caretRange.getClientRects();
      if (rects && rects.length > 0) caretRect = rects[0];
    }
    
    // Create a range at the beginning of the contenteditable element
    const startRange = document.createRange();
    startRange.selectNodeContents(el);
    startRange.collapse(true);
    let startRect = startRange.getBoundingClientRect();
    if (startRect.top === 0) {
      const rects = startRange.getClientRects();
      if (rects && rects.length > 0) startRect = rects[0];
    }
    
    if (caretRect.top === 0 || startRect.top === 0) return true;
    
    // Get computed line height
    const style = window.getComputedStyle(el);
    const fontSize = parseFloat(style.fontSize) || 16;
    const lineHeight = parseFloat(style.lineHeight) || (fontSize * 1.5);
    
    return (caretRect.top - startRect.top) < (lineHeight * 0.8);
  } catch (e) {
    return true;
  }
}

export function isCaretOnLastLine(el) {
  try {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return true;
    const range = sel.getRangeAt(0);
    
    // Clone range and collapse to start of selection to get caret rect
    const caretRange = range.cloneRange();
    caretRange.collapse(true);
    let caretRect = caretRange.getBoundingClientRect();
    if (caretRect.top === 0) {
      const rects = caretRange.getClientRects();
      if (rects && rects.length > 0) caretRect = rects[0];
    }
    
    // Create a range at the very end of the contenteditable element
    const endRange = document.createRange();
    endRange.selectNodeContents(el);
    endRange.collapse(false);
    let endRect = endRange.getBoundingClientRect();
    if (endRect.top === 0) {
      const rects = endRange.getClientRects();
      if (rects && rects.length > 0) endRect = rects[0];
    }
    
    if (caretRect.top === 0 || endRect.top === 0) return true;
    
    // Get computed line height
    const style = window.getComputedStyle(el);
    const fontSize = parseFloat(style.fontSize) || 16;
    const lineHeight = parseFloat(style.lineHeight) || (fontSize * 1.5);
    
    return (endRect.top - caretRect.top) < (lineHeight * 0.8);
  } catch (e) {
    return true;
  }
}

const OBFUSCATION_KEY = 42;

export function obfuscateText(text) {
  if (!text) return '';
  const charCodes = Array.from(text).map(char => char.charCodeAt(0) ^ OBFUSCATION_KEY);
  const binaryString = String.fromCharCode(...charCodes);
  return 'nnobf:' + btoa(unescape(encodeURIComponent(binaryString)));
}

export function deobfuscateText(obfuscated) {
  if (!obfuscated) return '';
  if (obfuscated.startsWith('nnobf:')) {
    try {
      const base64Part = obfuscated.slice(6);
      const binaryString = decodeURIComponent(escape(atob(base64Part)));
      const charCodes = Array.from(binaryString).map(char => char.charCodeAt(0) ^ OBFUSCATION_KEY);
      return String.fromCharCode(...charCodes);
    } catch (e) {
      console.error("Failed to de-obfuscate:", e);
      return obfuscated;
    }
  }
  return obfuscated;
}

/* ---- Secure Redaction (in-memory only, no DOM storage) ---- */

const _sessionKey = (() => {
  const arr = new Uint8Array(32);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < 32; i++) arr[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(arr);
})();

function _deriveKey(byteArr) {
  let h = 0x811c9dc5;
  for (let i = 0; i < byteArr.length; i++) {
    h ^= byteArr[i];
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const _derivedKey = _deriveKey(_sessionKey);

function _secureXor(text, key) {
  const charCodes = Array.from(text).map((ch, i) => ch.charCodeAt(0) ^ ((key >>> ((i % 4) * 8)) & 0xff) ^ (key >>> 24));
  return String.fromCharCode(...charCodes);
}

function _shiftChars(text, offset) {
  return Array.from(text).map(ch => {
    const code = ch.charCodeAt(0);
    return String.fromCharCode(code + offset);
  }).join('');
}

export function obfuscateTextSecure(text) {
  if (!text) return '';
  const shifted = _shiftChars(text, 3);
  const xored = _secureXor(shifted, _derivedKey);
  const encoded = btoa(unescape(encodeURIComponent(xored)));
  return 'nns:' + encoded;
}

export function deobfuscateTextSecure(obfuscated) {
  if (!obfuscated || !obfuscated.startsWith('nns:')) return obfuscated || '';
  try {
    const base64Part = obfuscated.slice(4);
    const xored = decodeURIComponent(escape(atob(base64Part)));
    const shifted = _secureXor(xored, _derivedKey);
    return _shiftChars(shifted, -3);
  } catch (e) {
    return '';
  }
}

export const redactedContentMap = new Map();

export function storeRedactedContent(blockId, originalHtml) {
  redactedContentMap.set(blockId, originalHtml);
}

export function getRedactedContent(blockId) {
  return redactedContentMap.get(blockId) || null;
}

export function clearRedactedContent(blockId) {
  redactedContentMap.delete(blockId);
}

export function clearAllRedactedContent() {
  redactedContentMap.clear();
}

/* ---- Syntax Highlighting Engine ---- */

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const JS_KEYWORDS = new Set(['const','let','var','function','return','if','else','for','while','do','switch','case','break','continue','new','this','class','extends','super','import','export','default','from','async','await','try','catch','finally','throw','typeof','instanceof','in','of','void','delete','yield','static','get','set','true','false','null','undefined','NaN','Infinity']);
const PY_KEYWORDS = new Set(['def','class','if','elif','else','for','while','return','import','from','as','try','except','finally','raise','with','yield','lambda','pass','break','continue','and','or','not','is','in','True','False','None','self','print','del','global','nonlocal','assert','async','await']);
const CSS_PROPS = new Set(['background','background-color','background-image','background-size','background-position','background-repeat','background-origin','background-clip','border','border-color','border-style','border-width','border-radius','border-top','border-bottom','border-left','border-right','color','display','flex','flex-direction','flex-wrap','justify-content','align-items','align-self','gap','grid','grid-template','grid-column','grid-row','width','height','min-width','min-height','max-width','max-height','margin','padding','position','top','left','right','bottom','z-index','font','font-family','font-size','font-weight','font-style','line-height','text-align','text-decoration','text-transform','letter-spacing','word-spacing','white-space','overflow','overflow-x','overflow-y','cursor','opacity','visibility','box-shadow','text-shadow','transition','transform','animation','content','outline','resize','user-select','box-sizing','clear','float','vertical-align','list-style','caption-side','border-collapse','border-spacing','table-layout','empty-cells','quotes','counter-reset','counter-increment','clip','clip-path','filter','object-fit','object-position','order','flex-grow','flex-shrink','flex-basis','justify-self','place-items','place-content','place-self','scroll-margin','scroll-padding','scroll-snap','scroll-behavior','overscroll-behavior','touch-action','will-change','backdrop-filter','mix-blend-mode','isolation','accent-color','appearance','caret-color','image-rendering','pointer-events','shape-margin','shape-outside','shape-image-threshold']);
const CSS_UNITS = /^(px|em|rem|%|vh|vw|vmin|vmax|ch|ex|cm|mm|in|pt|pc|s|ms|deg|rad|grad|turn|fr)$/;

function highlightJS(code) {
  const tokens = [];
  let i = 0;
  while (i < code.length) {
    if (code[i] === '/' && code[i+1] === '/') {
      let end = code.indexOf('\n', i); if (end === -1) end = code.length;
      tokens.push({ type: 'comment', value: code.slice(i, end) }); i = end;
    } else if (code[i] === '/' && code[i+1] === '*') {
      let end = code.indexOf('*/', i+2); if (end === -1) end = code.length; else end += 2;
      tokens.push({ type: 'comment', value: code.slice(i, end) }); i = end;
    } else if (code[i] === '"' || code[i] === "'" || code[i] === '`') {
      const q = code[i]; let j = i + 1;
      while (j < code.length && code[j] !== q) { if (code[j] === '\\') j++; j++; }
      j = Math.min(j + 1, code.length);
      tokens.push({ type: 'string', value: code.slice(i, j) }); i = j;
    } else if (/[0-9]/.test(code[i])) {
      let j = i; while (j < code.length && /[0-9.xXa-fA-F_]/.test(code[j])) j++;
      tokens.push({ type: 'number', value: code.slice(i, j) }); i = j;
    } else if (/[a-zA-Z_$]/.test(code[i])) {
      let j = i; while (j < code.length && /[a-zA-Z0-9_$]/.test(code[j])) j++;
      const word = code.slice(i, j);
      if (JS_KEYWORDS.has(word)) tokens.push({ type: 'keyword', value: word });
      else if (j < code.length && code[j] === '(') tokens.push({ type: 'function', value: word });
      else tokens.push({ type: 'plain', value: word });
      i = j;
    } else {
      tokens.push({ type: 'plain', value: code[i] }); i++;
    }
  }
  return tokens;
}

function highlightPython(code) {
  const tokens = [];
  let i = 0;
  while (i < code.length) {
    if (code[i] === '#') {
      let end = code.indexOf('\n', i); if (end === -1) end = code.length;
      tokens.push({ type: 'comment', value: code.slice(i, end) }); i = end;
    } else if (code.slice(i, i+3) === '"""' || code.slice(i, i+3) === "'''") {
      const q = code.slice(i, i+3); let end = code.indexOf(q, i+3); if (end === -1) end = code.length; else end += 3;
      tokens.push({ type: 'string', value: code.slice(i, end) }); i = end;
    } else if (code[i] === '"' || code[i] === "'") {
      const q = code[i]; let j = i + 1;
      while (j < code.length && code[j] !== q) { if (code[j] === '\\') j++; j++; }
      j = Math.min(j + 1, code.length);
      tokens.push({ type: 'string', value: code.slice(i, j) }); i = j;
    } else if (/[0-9]/.test(code[i])) {
      let j = i; while (j < code.length && /[0-9._xXeE]/.test(code[j])) j++;
      tokens.push({ type: 'number', value: code.slice(i, j) }); i = j;
    } else if (/[a-zA-Z_]/.test(code[i])) {
      let j = i; while (j < code.length && /[a-zA-Z0-9_]/.test(code[j])) j++;
      const word = code.slice(i, j);
      if (PY_KEYWORDS.has(word)) tokens.push({ type: 'keyword', value: word });
      else if (j < code.length && code[j] === '(') tokens.push({ type: 'function', value: word });
      else tokens.push({ type: 'plain', value: word });
      i = j;
    } else {
      tokens.push({ type: 'plain', value: code[i] }); i++;
    }
  }
  return tokens;
}

function highlightCSS(code) {
  const tokens = [];
  let i = 0;
  while (i < code.length) {
    if (code[i] === '/' && code[i+1] === '*') {
      let end = code.indexOf('*/', i+2); if (end === -1) end = code.length; else end += 2;
      tokens.push({ type: 'comment', value: code.slice(i, end) }); i = end;
    } else if (code[i] === '"' || code[i] === "'") {
      const q = code[i]; let j = i + 1;
      while (j < code.length && code[j] !== q) { if (code[j] === '\\') j++; j++; }
      j = Math.min(j + 1, code.length);
      tokens.push({ type: 'string', value: code.slice(i, j) }); i = j;
    } else if (code[i] === '#') {
      let j = i + 1; while (j < code.length && /[0-9a-fA-F]/.test(code[j])) j++;
      if (j > i + 1) tokens.push({ type: 'number', value: code.slice(i, j) }); i = j;
    } else if (/[0-9]/.test(code[i])) {
      let j = i; while (j < code.length && /[0-9.%a-zA-Z]/.test(code[j])) j++;
      tokens.push({ type: 'number', value: code.slice(i, j) }); i = j;
    } else if (code[i] === '.' && /[a-zA-Z_-]/.test(code[i+1] || '')) {
      let j = i + 1; while (j < code.length && /[a-zA-Z0-9_-]/.test(code[j])) j++;
      tokens.push({ type: 'selector', value: code.slice(i, j) }); i = j;
    } else if (code[i] === '@') {
      let j = i + 1; while (j < code.length && /[a-zA-Z-]/.test(code[j])) j++;
      tokens.push({ type: 'keyword', value: code.slice(i, j) }); i = j;
    } else if (/[a-zA-Z_-]/.test(code[i])) {
      let j = i; while (j < code.length && /[a-zA-Z0-9_-]/.test(code[j])) j++;
      const word = code.slice(i, j);
      if (j < code.length && code[j] === ':') tokens.push({ type: 'property', value: word });
      else if (CSS_PROPS.has(word)) tokens.push({ type: 'property', value: word });
      else tokens.push({ type: 'plain', value: word });
      i = j;
    } else {
      tokens.push({ type: 'plain', value: code[i] }); i++;
    }
  }
  return tokens;
}

function highlightHTML(code) {
  const tokens = [];
  let i = 0;
  while (i < code.length) {
    if (code.slice(i, i+6) === '&lt;!--') {
      let end = code.indexOf('--&gt;', i+6); if (end === -1) end = code.length; else end += 6;
      tokens.push({ type: 'comment', value: code.slice(i, end) }); i = end;
    } else if (code.slice(i, i+4) === '<!--') {
      let end = code.indexOf('-->', i+4); if (end === -1) end = code.length; else end += 3;
      tokens.push({ type: 'comment', value: code.slice(i, end) }); i = end;
    } else if (code[i] === '<') {
      let j = i + 1; while (j < code.length && code[j] !== '>') j++;
      j = Math.min(j + 1, code.length);
      tokens.push({ type: 'tag', value: code.slice(i, j) }); i = j;
    } else if (code[i] === '"' || code[i] === "'") {
      const q = code[i]; let j = i + 1;
      while (j < code.length && code[j] !== q) j++;
      j = Math.min(j + 1, code.length);
      tokens.push({ type: 'string', value: code.slice(i, j) }); i = j;
    } else {
      tokens.push({ type: 'plain', value: code[i] }); i++;
    }
  }
  return tokens;
}

function highlightGeneric(code) {
  const tokens = [];
  let i = 0;
  while (i < code.length) {
    if (code[i] === '/' && code[i+1] === '/') {
      let end = code.indexOf('\n', i); if (end === -1) end = code.length;
      tokens.push({ type: 'comment', value: code.slice(i, end) }); i = end;
    } else if (code[i] === '"' || code[i] === "'") {
      const q = code[i]; let j = i + 1;
      while (j < code.length && code[j] !== q) { if (code[j] === '\\') j++; j++; }
      j = Math.min(j + 1, code.length);
      tokens.push({ type: 'string', value: code.slice(i, j) }); i = j;
    } else if (/[0-9]/.test(code[i])) {
      let j = i; while (j < code.length && /[0-9.]/.test(code[j])) j++;
      tokens.push({ type: 'number', value: code.slice(i, j) }); i = j;
    } else {
      tokens.push({ type: 'plain', value: code[i] }); i++;
    }
  }
  return tokens;
}

function tokensToHtml(tokens) {
  return tokens.map(t => {
    const escaped = escapeHtml(t.value);
    switch (t.type) {
      case 'keyword': return `<span class="hl-keyword">${escaped}</span>`;
      case 'string': return `<span class="hl-string">${escaped}</span>`;
      case 'number': return `<span class="hl-number">${escaped}</span>`;
      case 'comment': return `<span class="hl-comment">${escaped}</span>`;
      case 'function': return `<span class="hl-function">${escaped}</span>`;
      case 'property': return `<span class="hl-property">${escaped}</span>`;
      case 'selector': return `<span class="hl-selector">${escaped}</span>`;
      case 'tag': return `<span class="hl-tag">${escaped}</span>`;
      default: return escaped;
    }
  }).join('');
}

export function highlightCode(code, language) {
  if (!code) return '';
  const lang = (language || 'plain').toLowerCase();
  let tokens;
  switch (lang) {
    case 'javascript': case 'js': case 'jsx': case 'typescript': case 'ts': case 'tsx':
      tokens = highlightJS(code); break;
    case 'python': case 'py':
      tokens = highlightPython(code); break;
    case 'css': case 'scss': case 'less': case 'sass':
      tokens = highlightCSS(code); break;
    case 'html': case 'xml': case 'svg':
      tokens = highlightHTML(code); break;
    case 'json':
      tokens = highlightJS(code); break;
    default:
      tokens = highlightGeneric(code); break;
  }
  return tokensToHtml(tokens);
}

