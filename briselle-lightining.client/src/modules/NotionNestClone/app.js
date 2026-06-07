/* ============================================================
   NotionNest – app.js
   Comprehensive Notion.so page clone (Dark Theme)
   ============================================================ */
(function () {
  'use strict';

  /* ----------------------------------------------------------
     1. UTILITIES
  ---------------------------------------------------------- */
  let _idCounter = 0;
  function generateId() {
    return 'block_' + Date.now().toString(36) + '_' + (++_idCounter);
  }

  function debounce(fn, delay) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  function getCaretPosition(el) {
    const sel = window.getSelection();
    if (!sel.rangeCount) return 0;
    const range = sel.getRangeAt(0);
    const pre = range.cloneRange();
    pre.selectNodeContents(el);
    pre.setEnd(range.startContainer, range.startOffset);
    return pre.toString().length;
  }

  function setCaretPosition(el, offset) {
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
    // fallback – place at end
    range.selectNodeContents(el);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  function setCaretToEnd(el) {
    if (!el) return;
    el.focus();
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  function getCaretCoordinates() {
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

  function saveBlockContent(blockId, newContent) {
    const block = getBlockById(blockId, pageState.blocks);
    if (block) block.content = newContent;
  }

  function focusBlock(blockId, atEnd) {
    requestAnimationFrame(() => {
      const el = getBlockElement(blockId);
      if (!el) return;
      const editable = el.querySelector('[contenteditable="true"]');
      if (editable) {
        if (atEnd) setCaretToEnd(editable);
        else { editable.focus(); setCaretPosition(editable, 0); }
      }
    });
  }

  function getBlockElement(blockId) {
    return document.querySelector(`.block[data-block-id="${blockId}"]`);
  }

  function getBlockIdFromElement(el) {
    const blockEl = el.closest('.block');
    return blockEl ? blockEl.dataset.blockId : null;
  }

  function findBlockContainer(blockId, blocks) {
    blocks = blocks || pageState.blocks;
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

  function getBlockById(blockId, blocks) {
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

  function flatVisibleBlocks(blocks) {
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

  function isBlockEmpty(block) {
    if (!block.content) return true;
    const tmp = document.createElement('div');
    tmp.innerHTML = block.content;
    return tmp.textContent.trim().length === 0;
  }

  /* ----------------------------------------------------------
     2. PAGE STATE
  ---------------------------------------------------------- */
  const pageState = {
    title: 'Getting Started',
    icon: '📝',
    cover: null,
    blocks: []
  };

  /* -- helper to make default blocks -- */
  function makeBlock(type, content, extra) {
    const b = { id: generateId(), type, content: content || '' };
    if (extra) Object.assign(b, extra);
    return b;
  }

  function buildDefaultBlocks() {
    return [
      makeBlock('heading1', 'Welcome to NotionNest'),
      makeBlock('paragraph', 'Start writing, or press <span class="keyboard-shortcut">/</span> for commands…'),
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
          makeBlock('bulleted_list', 'Nested bullet B')
        ]
      }),
      makeBlock('heading2', 'Rich Content'),
      makeBlock('quote', 'The only limit to our realization of tomorrow is our doubts of today. — Franklin D. Roosevelt'),
      makeBlock('callout', 'This is a callout block — great for tips and important info!', { calloutIcon: '💡' }),
      makeBlock('divider', ''),
      makeBlock('code', 'function greet(name) {\n  console.log(`Hello, ${name}!`);\n}\ngreet("NotionNest");', { language: 'javascript' }),
      makeBlock('heading2', 'Tabs'),
      {
        id: generateId(), type: 'tabs',
        activeTabId: null,
        tabs: [
          {
            id: generateId(), name: 'Overview',
            blocks: [makeBlock('paragraph', 'This is the <b>Overview</b> tab. Tabs work just like in Notion — click to switch, drag to reorder, and nest any block type inside.')]
          },
          {
            id: generateId(), name: 'Details',
            blocks: [makeBlock('paragraph', 'The <b>Details</b> tab can contain any blocks — lists, code, images, even nested tabs!'), makeBlock('bulleted_list', 'Detail point A'), makeBlock('bulleted_list', 'Detail point B')]
          },
          {
            id: generateId(), name: 'Notes',
            blocks: [makeBlock('paragraph', 'Quick notes go here. Everything is editable and draggable.')]
          }
        ]
      },
      makeBlock('heading2', 'Table'),
      {
        id: generateId(), type: 'table',
        content: '',
        rows: [
          ['Feature', 'Status', 'Priority'],
          ['Dark theme', '✅ Done', 'High'],
          ['Slash commands', '✅ Done', 'High']
        ]
      },
      makeBlock('heading2', 'Columns'),
      {
        id: generateId(), type: 'columns', content: '',
        columns: [
          { id: generateId(), blocks: [makeBlock('paragraph', '<b>Left column</b> — you can put any blocks here.')] },
          { id: generateId(), blocks: [makeBlock('paragraph', '<b>Right column</b> — independent content.')] }
        ]
      },
      makeBlock('toc', ''),
      makeBlock('paragraph', '')
    ];
  }

  /* fix activeTabId */
  function fixTabDefaults(blocks) {
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

  /* ----------------------------------------------------------
     3. SLASH COMMAND MENU DATA
  ---------------------------------------------------------- */
  const slashMenuSections = [
    {
      label: 'Basic Blocks', items: [
        { icon: '📝', name: 'Text', desc: 'Plain text block', type: 'paragraph' },
        { icon: '𝗛₁', name: 'Heading 1', desc: 'Large section heading', type: 'heading1' },
        { icon: '𝗛₂', name: 'Heading 2', desc: 'Medium section heading', type: 'heading2' },
        { icon: '𝗛₃', name: 'Heading 3', desc: 'Small section heading', type: 'heading3' },
        { icon: '•', name: 'Bulleted List', desc: 'Simple bulleted list', type: 'bulleted_list' },
        { icon: '1.', name: 'Numbered List', desc: 'Numbered list', type: 'numbered_list' },
        { icon: '☑', name: 'To-do', desc: 'Task checkbox', type: 'todo' },
        { icon: '▶', name: 'Toggle', desc: 'Collapsible toggle block', type: 'toggle' },
      ]
    },
    {
      label: 'Media', items: [
        { icon: '🖼', name: 'Image', desc: 'Upload or embed an image', type: 'image' },
        { icon: '🔗', name: 'Bookmark', desc: 'Save a link as bookmark', type: 'bookmark' },
        { icon: '💻', name: 'Code', desc: 'Code block with syntax highlighting', type: 'code' },
        { icon: '—', name: 'Divider', desc: 'Horizontal divider', type: 'divider' },
      ]
    },
    {
      label: 'Advanced', items: [
        { icon: '📊', name: 'Table', desc: 'Simple table', type: 'table' },
        { icon: '▤', name: 'Columns', desc: 'Two column layout', type: 'columns' },
        { icon: '📑', name: 'Table of Contents', desc: 'Auto-generated TOC', type: 'toc' },
        { icon: '💡', name: 'Callout', desc: 'Callout box with icon', type: 'callout' },
        { icon: '❝', name: 'Quote', desc: 'Quote block', type: 'quote' },
        { icon: '🗂', name: 'Tabs', desc: 'Tabbed content block', type: 'tabs' },
      ]
    }
  ];

  /* ----------------------------------------------------------
     4. RENDERING — INDIVIDUAL BLOCK
  ---------------------------------------------------------- */
  function renderBlock(block) {
    const wrapper = document.createElement('div');
    wrapper.className = `block block-${block.type}`;
    wrapper.dataset.blockId = block.id;
    wrapper.setAttribute('draggable', 'false'); // dragging managed via handle

    /* Drag handle + plus */
    const handle = document.createElement('div');
    handle.className = 'block-handle';
    handle.innerHTML = '⠿';
    handle.setAttribute('draggable', 'true');
    handle.title = 'Drag to move / Click for options';
    wrapper.appendChild(handle);

    const plus = document.createElement('div');
    plus.className = 'block-plus';
    plus.innerHTML = '+';
    plus.title = 'Add a block below';
    wrapper.appendChild(plus);

    /* Content area */
    const content = document.createElement('div');
    content.className = 'block-content';

    switch (block.type) {
      case 'paragraph':
        content.innerHTML = buildEditable(block, 'div'); break;
      case 'heading1':
        content.innerHTML = buildEditable(block, 'h1'); break;
      case 'heading2':
        content.innerHTML = buildEditable(block, 'h2'); break;
      case 'heading3':
        content.innerHTML = buildEditable(block, 'h3'); break;
      case 'bulleted_list':
        content.innerHTML = `<div class="list-marker">•</div>${buildEditable(block, 'div')}`;
        break;
      case 'numbered_list':
        content.innerHTML = `<div class="list-marker">${getNumberedIndex(block)}.</div>${buildEditable(block, 'div')}`;
        break;
      case 'todo':
        renderTodo(block, content);
        break;
      case 'toggle':
        renderToggle(block, content, wrapper);
        break;
      case 'quote':
        content.innerHTML = buildEditable(block, 'div');
        break;
      case 'callout':
        renderCallout(block, content);
        break;
      case 'divider':
        content.innerHTML = '<hr/>';
        break;
      case 'code':
        renderCodeBlock(block, content);
        break;
      case 'image':
        renderImageBlock(block, content);
        break;
      case 'bookmark':
        renderBookmarkBlock(block, content);
        break;
      case 'table':
        renderTableBlock(block, content);
        break;
      case 'columns':
        renderColumnsBlock(block, content);
        break;
      case 'toc':
        renderTocBlock(content);
        break;
      case 'tabs':
        renderTabBlock(block, content);
        break;
      default:
        content.innerHTML = buildEditable(block, 'div');
    }

    wrapper.appendChild(content);

    if (block.type === 'todo' && block.checked) wrapper.classList.add('checked');
    if (block.type === 'toggle' && block.open) wrapper.classList.add('open');

    return wrapper;
  }

  /* editable element builder */
  function buildEditable(block, tag) {
    const placeholder = getPlaceholder(block.type);
    const isEmpty = !block.content || block.content.replace(/<[^>]*>/g, '').trim() === '';
    return `<${tag} contenteditable="true" data-placeholder="${placeholder}" class="${isEmpty ? 'is-empty' : ''}">${block.content || ''}</${tag}>`;
  }

  function getPlaceholder(type) {
    switch (type) {
      case 'heading1': return 'Heading 1';
      case 'heading2': return 'Heading 2';
      case 'heading3': return 'Heading 3';
      case 'bulleted_list': return 'List item';
      case 'numbered_list': return 'List item';
      case 'todo': return 'To-do';
      case 'toggle': return 'Toggle';
      case 'quote': return 'Quote';
      case 'callout': return 'Type something…';
      default: return "Type '/' for commands";
    }
  }

  /* numbered index helper */
  function getNumberedIndex(block) {
    const container = findBlockContainer(block.id);
    if (!container) return '1';
    let count = 0;
    for (let i = 0; i <= container.index; i++) {
      if (container.arr[i].type === 'numbered_list') count++;
      else if (i < container.index) count = 0; // reset if non-numbered in between
    }
    return count;
  }

  /* To-do */
  function renderTodo(block, content) {
    const cb = document.createElement('div');
    cb.className = 'todo-checkbox' + (block.checked ? ' checked' : '');
    cb.innerHTML = block.checked ? '☑' : '☐';
    content.appendChild(cb);
    const ed = document.createElement('div');
    ed.contentEditable = 'true';
    ed.dataset.placeholder = 'To-do';
    ed.innerHTML = block.content || '';
    if (!block.content || block.content.replace(/<[^>]*>/g, '').trim() === '') ed.classList.add('is-empty');
    content.appendChild(ed);
  }

  /* Toggle */
  function renderToggle(block, content, wrapper) {
    const icon = document.createElement('div');
    icon.className = 'toggle-icon';
    icon.innerHTML = '▶';
    content.appendChild(icon);
    const ed = document.createElement('div');
    ed.contentEditable = 'true';
    ed.dataset.placeholder = 'Toggle';
    ed.innerHTML = block.content || '';
    if (!block.content || block.content.replace(/<[^>]*>/g, '').trim() === '') ed.classList.add('is-empty');
    content.appendChild(ed);

    /* children container */
    const childContainer = document.createElement('div');
    childContainer.className = 'block-toggle-children';
    if (!block.children) block.children = [makeBlock('paragraph', '')];
    renderBlocks(block.children, childContainer);
    wrapper.appendChild(childContainer);
  }

  /* Callout */
  function renderCallout(block, content) {
    const icon = document.createElement('span');
    icon.className = 'block-callout-icon';
    icon.textContent = block.calloutIcon || '💡';
    icon.title = 'Click to change icon';
    content.appendChild(icon);
    const ed = document.createElement('div');
    ed.contentEditable = 'true';
    ed.dataset.placeholder = 'Type something…';
    ed.innerHTML = block.content || '';
    if (!block.content || block.content.replace(/<[^>]*>/g, '').trim() === '') ed.classList.add('is-empty');
    content.appendChild(ed);
  }

  /* Code */
  function renderCodeBlock(block, content) {
    const header = document.createElement('div');
    header.className = 'block-code-header';
    const sel = document.createElement('select');
    const langs = ['plain', 'javascript', 'python', 'html', 'css', 'java', 'c', 'cpp', 'go', 'rust', 'sql', 'json', 'bash', 'typescript', 'ruby', 'php'];
    langs.forEach(l => {
      const opt = document.createElement('option');
      opt.value = l; opt.textContent = l;
      if ((block.language || 'plain') === l) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.addEventListener('change', () => { block.language = sel.value; });
    header.appendChild(sel);

    const copyBtn = document.createElement('button');
    copyBtn.textContent = 'Copy';
    copyBtn.className = 'code-copy-btn';
    copyBtn.addEventListener('click', () => {
      const codeEl = content.querySelector('.block-code-content');
      navigator.clipboard.writeText(codeEl.textContent).then(() => {
        copyBtn.textContent = 'Copied!';
        setTimeout(() => copyBtn.textContent = 'Copy', 1500);
      });
    });
    header.appendChild(copyBtn);

    content.appendChild(header);
    const pre = document.createElement('pre');
    pre.className = 'block-code-content';
    pre.contentEditable = 'true';
    pre.spellcheck = false;
    pre.textContent = block.content || '';
    content.appendChild(pre);
  }

  /* Image */
  function renderImageBlock(block, content) {
    if (block.url) {
      const img = document.createElement('img');
      img.src = block.url;
      img.alt = block.caption || '';
      img.style.maxWidth = '100%';
      content.appendChild(img);
      if (block.caption) {
        const cap = document.createElement('div');
        cap.className = 'image-caption';
        cap.contentEditable = 'true';
        cap.textContent = block.caption;
        content.appendChild(cap);
      }
    } else {
      const placeholder = document.createElement('div');
      placeholder.className = 'image-placeholder';
      placeholder.innerHTML = '<span class="image-placeholder-icon">🖼</span> Add an image URL';
      placeholder.addEventListener('click', () => {
        const url = prompt('Enter image URL:');
        if (url) { block.url = url; rerenderBlock(block.id); }
      });
      content.appendChild(placeholder);
    }
  }

  /* Bookmark */
  function renderBookmarkBlock(block, content) {
    if (block.url) {
      const card = document.createElement('a');
      card.className = 'bookmark-card';
      card.href = block.url;
      card.target = '_blank';
      card.rel = 'noopener';
      card.innerHTML = `<div class="bookmark-info"><div class="bookmark-title">${block.bookmarkTitle || block.url}</div><div class="bookmark-desc">${block.description || ''}</div><div class="bookmark-url">${block.url}</div></div>`;
      content.appendChild(card);
    } else {
      const placeholder = document.createElement('div');
      placeholder.className = 'bookmark-placeholder';
      placeholder.innerHTML = '🔗 Add a bookmark URL';
      placeholder.addEventListener('click', () => {
        const url = prompt('Enter bookmark URL:');
        if (url) { block.url = url; block.bookmarkTitle = url; rerenderBlock(block.id); }
      });
      content.appendChild(placeholder);
    }
  }

  /* Table */
  function renderTableBlock(block, content) {
    if (!block.rows) block.rows = [['', '', ''], ['', '', '']];
    const table = document.createElement('table');
    block.rows.forEach((row, ri) => {
      const tr = document.createElement('tr');
      row.forEach((cell, ci) => {
        const td = document.createElement(ri === 0 ? 'th' : 'td');
        td.contentEditable = 'true';
        td.textContent = cell;
        td.addEventListener('input', () => { block.rows[ri][ci] = td.textContent; });
        tr.appendChild(td);
      });
      table.appendChild(tr);
    });
    content.appendChild(table);

    const controls = document.createElement('div');
    controls.className = 'table-controls';
    const addRow = document.createElement('button');
    addRow.textContent = '+ Row';
    addRow.addEventListener('click', () => {
      block.rows.push(new Array(block.rows[0].length).fill(''));
      rerenderBlock(block.id);
    });
    const addCol = document.createElement('button');
    addCol.textContent = '+ Column';
    addCol.addEventListener('click', () => {
      block.rows.forEach(r => r.push(''));
      rerenderBlock(block.id);
    });
    controls.appendChild(addRow);
    controls.appendChild(addCol);
    content.appendChild(controls);
  }

  /* Columns */
  function renderColumnsBlock(block, content) {
    if (!block.columns) block.columns = [
      { id: generateId(), blocks: [makeBlock('paragraph', '')] },
      { id: generateId(), blocks: [makeBlock('paragraph', '')] }
    ];
    block.columns.forEach(col => {
      const colEl = document.createElement('div');
      colEl.className = 'block-column';
      colEl.dataset.columnId = col.id;
      renderBlocks(col.blocks, colEl);
      content.appendChild(colEl);
    });
  }

  /* TOC */
  function renderTocBlock(content) {
    const headings = [];
    function collect(blocks) {
      for (const b of blocks) {
        if (['heading1', 'heading2', 'heading3'].includes(b.type)) headings.push(b);
        if (b.children) collect(b.children);
        if (b.type === 'tabs' && b.tabs) b.tabs.forEach(t => collect(t.blocks));
        if (b.type === 'columns' && b.columns) b.columns.forEach(c => collect(c.blocks));
      }
    }
    collect(pageState.blocks);
    if (!headings.length) {
      content.innerHTML = '<div class="toc-empty">No headings found</div>';
      return;
    }
    const ul = document.createElement('ul');
    ul.className = 'toc-list';
    headings.forEach(h => {
      const li = document.createElement('li');
      li.className = `toc-item toc-${h.type}`;
      const a = document.createElement('a');
      const tmp = document.createElement('div');
      tmp.innerHTML = h.content;
      a.textContent = tmp.textContent || 'Untitled';
      a.href = '#';
      a.addEventListener('click', e => {
        e.preventDefault();
        const el = getBlockElement(h.id);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      li.appendChild(a);
      ul.appendChild(li);
    });
    content.appendChild(ul);
  }

  /* ----------------------------------------------------------
     5. TAB BLOCK
  ---------------------------------------------------------- */
  function renderTabBlock(block, content) {
    if (!block.tabs) block.tabs = [{ id: generateId(), name: 'Tab 1', blocks: [makeBlock('paragraph', '')] }];
    if (!block.activeTabId || !block.tabs.find(t => t.id === block.activeTabId)) block.activeTabId = block.tabs[0].id;

    const container = document.createElement('div');
    container.className = 'tab-block';
    container.dataset.tabBlockId = block.id;

    /* Tab bar */
    const bar = document.createElement('div');
    bar.className = 'tab-bar';

    block.tabs.forEach((tab, idx) => {
      const item = document.createElement('div');
      item.className = 'tab-item' + (tab.id === block.activeTabId ? ' active' : '');
      item.dataset.tabId = tab.id;
      item.draggable = true;

      const nameSpan = document.createElement('span');
      nameSpan.className = 'tab-name';
      nameSpan.textContent = tab.name;
      item.appendChild(nameSpan);

      const close = document.createElement('span');
      close.className = 'tab-close';
      close.innerHTML = '×';
      item.appendChild(close);

      /* click to switch */
      item.addEventListener('click', (e) => {
        if (e.target === close) return;
        if (nameSpan.isContentEditable) return;
        switchTab(block, tab.id);
      });

      /* close tab */
      close.addEventListener('click', (e) => {
        e.stopPropagation();
        if (block.tabs.length <= 1) return;
        const removedIdx = block.tabs.findIndex(t => t.id === tab.id);
        block.tabs.splice(removedIdx, 1);
        if (block.activeTabId === tab.id) {
          block.activeTabId = block.tabs[Math.min(removedIdx, block.tabs.length - 1)].id;
        }
        rerenderBlock(block.id);
      });

      /* double-click to rename */
      nameSpan.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        nameSpan.contentEditable = 'true';
        nameSpan.focus();
        document.execCommand('selectAll', false, null);
      });
      nameSpan.addEventListener('blur', () => {
        nameSpan.contentEditable = 'false';
        tab.name = nameSpan.textContent.trim() || 'Untitled';
      });
      nameSpan.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); nameSpan.blur(); }
        if (e.key === 'Escape') { nameSpan.textContent = tab.name; nameSpan.blur(); }
      });

      /* right-click tab context */
      item.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showTabContextMenu(e, block, tab);
      });

      /* drag tab reorder */
      item.addEventListener('dragstart', (e) => {
        e.stopPropagation();
        e.dataTransfer.setData('text/tab-drag', JSON.stringify({ blockId: block.id, tabId: tab.id }));
        item.classList.add('dragging');
      });
      item.addEventListener('dragend', () => item.classList.remove('dragging'));
      item.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const data = e.dataTransfer.types.includes('text/tab-drag');
        if (!data) return;
        const rect = item.getBoundingClientRect();
        const mid = rect.left + rect.width / 2;
        item.classList.toggle('tab-drop-left', e.clientX < mid);
        item.classList.toggle('tab-drop-right', e.clientX >= mid);
      });
      item.addEventListener('dragleave', () => {
        item.classList.remove('tab-drop-left', 'tab-drop-right');
      });
      item.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        item.classList.remove('tab-drop-left', 'tab-drop-right');
        try {
          const data = JSON.parse(e.dataTransfer.getData('text/tab-drag'));
          if (data.blockId !== block.id) return;
          const fromIdx = block.tabs.findIndex(t => t.id === data.tabId);
          const toIdx = block.tabs.findIndex(t => t.id === tab.id);
          if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return;
          const rect = item.getBoundingClientRect();
          const mid = rect.left + rect.width / 2;
          const insertIdx = e.clientX < mid ? toIdx : toIdx + 1;
          const [moved] = block.tabs.splice(fromIdx, 1);
          const adjusted = insertIdx > fromIdx ? insertIdx - 1 : insertIdx;
          block.tabs.splice(adjusted, 0, moved);
          rerenderBlock(block.id);
        } catch (err) { /* ignore */ }
      });

      bar.appendChild(item);
    });

    /* Add tab button */
    const addBtn = document.createElement('div');
    addBtn.className = 'tab-add-btn';
    addBtn.innerHTML = '+';
    addBtn.title = 'Add tab';
    addBtn.addEventListener('click', () => {
      const newTab = { id: generateId(), name: `Tab ${block.tabs.length + 1}`, blocks: [makeBlock('paragraph', '')] };
      block.tabs.push(newTab);
      block.activeTabId = newTab.id;
      rerenderBlock(block.id);
    });
    bar.appendChild(addBtn);
    container.appendChild(bar);

    /* Tab content */
    const tabContent = document.createElement('div');
    tabContent.className = 'tab-content';
    const activeTab = block.tabs.find(t => t.id === block.activeTabId);
    if (activeTab) {
      renderBlocks(activeTab.blocks, tabContent);
    }
    container.appendChild(tabContent);
    content.appendChild(container);
  }

  function switchTab(block, tabId) {
    if (block.activeTabId === tabId) return;
    block.activeTabId = tabId;
    const blockEl = getBlockElement(block.id);
    if (!blockEl) return;
    const tabContent = blockEl.querySelector('.tab-content');
    if (!tabContent) return;
    tabContent.style.opacity = '0';
    setTimeout(() => {
      tabContent.innerHTML = '';
      const activeTab = block.tabs.find(t => t.id === tabId);
      if (activeTab) renderBlocks(activeTab.blocks, tabContent);
      tabContent.style.opacity = '1';
      // update active class
      blockEl.querySelectorAll('.tab-item').forEach(item => {
        item.classList.toggle('active', item.dataset.tabId === tabId);
      });
    }, 100);
  }

  function showTabContextMenu(e, block, tab) {
    closeAllMenus();
    const menu = document.createElement('div');
    menu.className = 'context-menu tab-context-menu';
    menu.style.left = e.clientX + 'px';
    menu.style.top = e.clientY + 'px';

    const items = [
      { label: 'Rename', action: () => { const el = getBlockElement(block.id); if (el) { const nameEl = el.querySelector(`.tab-item[data-tab-id="${tab.id}"] .tab-name`); if (nameEl) { nameEl.contentEditable = 'true'; nameEl.focus(); document.execCommand('selectAll', false, null); } } } },
      { label: 'Duplicate tab', action: () => { const clone = JSON.parse(JSON.stringify(tab)); clone.id = generateId(); clone.name += ' copy'; clone.blocks.forEach(function reassign(b) { b.id = generateId(); if (b.children) b.children.forEach(reassign); if (b.tabs) b.tabs.forEach(t => { t.id = generateId(); t.blocks.forEach(reassign); }); if (b.columns) b.columns.forEach(c => { c.id = generateId(); c.blocks.forEach(reassign); }); }); const idx = block.tabs.findIndex(t => t.id === tab.id); block.tabs.splice(idx + 1, 0, clone); block.activeTabId = clone.id; rerenderBlock(block.id); } },
      null, // divider
      { label: 'Move left', disabled: block.tabs[0].id === tab.id, action: () => { const idx = block.tabs.findIndex(t => t.id === tab.id); if (idx > 0) { [block.tabs[idx - 1], block.tabs[idx]] = [block.tabs[idx], block.tabs[idx - 1]]; rerenderBlock(block.id); } } },
      { label: 'Move right', disabled: block.tabs[block.tabs.length - 1].id === tab.id, action: () => { const idx = block.tabs.findIndex(t => t.id === tab.id); if (idx < block.tabs.length - 1) { [block.tabs[idx], block.tabs[idx + 1]] = [block.tabs[idx + 1], block.tabs[idx]]; rerenderBlock(block.id); } } },
      null,
      { label: 'Delete tab', disabled: block.tabs.length <= 1, action: () => { const idx = block.tabs.findIndex(t => t.id === tab.id); block.tabs.splice(idx, 1); if (block.activeTabId === tab.id) block.activeTabId = block.tabs[Math.min(idx, block.tabs.length - 1)].id; rerenderBlock(block.id); } }
    ];

    items.forEach(it => {
      if (it === null) {
        const d = document.createElement('div');
        d.className = 'context-menu-divider';
        menu.appendChild(d);
        return;
      }
      const mi = document.createElement('div');
      mi.className = 'context-menu-item' + (it.disabled ? ' disabled' : '');
      mi.textContent = it.label;
      if (!it.disabled) mi.addEventListener('click', () => { closeAllMenus(); it.action(); });
      menu.appendChild(mi);
    });

    document.body.appendChild(menu);
    requestAnimationFrame(() => keepMenuInView(menu));
  }

  /* ----------------------------------------------------------
     6. RENDER BLOCKS ARRAY & PAGE
  ---------------------------------------------------------- */
  function renderBlocks(blocks, container) {
    blocks.forEach(block => {
      container.appendChild(renderBlock(block));
    });
  }

  function renderPage() {
    const pageContent = document.querySelector('.page-content');
    if (!pageContent) return;
    pageContent.innerHTML = '';

    /* Page header */
    const header = document.createElement('div');
    header.className = 'page-header';

    if (pageState.cover) {
      const cover = document.createElement('div');
      cover.className = 'page-cover';
      cover.style.backgroundImage = `url(${pageState.cover})`;
      header.appendChild(cover);
    }

    const iconWrapper = document.createElement('div');
    iconWrapper.className = 'page-icon-wrapper';
    const icon = document.createElement('span');
    icon.className = 'page-icon';
    icon.textContent = pageState.icon;
    icon.title = 'Change icon';
    icon.addEventListener('click', () => showEmojiPicker(icon));
    iconWrapper.appendChild(icon);
    header.appendChild(iconWrapper);

    const title = document.createElement('div');
    title.className = 'page-title';
    title.contentEditable = 'true';
    title.dataset.placeholder = 'Untitled';
    title.textContent = pageState.title;
    if (!pageState.title) title.classList.add('is-empty');
    title.addEventListener('input', () => {
      pageState.title = title.textContent;
      title.classList.toggle('is-empty', !title.textContent.trim());
      updateBreadcrumb();
      updateSidebar();
    });
    title.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const first = pageState.blocks[0];
        if (first) focusBlock(first.id, false);
      }
    });
    header.appendChild(title);
    pageContent.appendChild(header);

    /* Blocks container */
    const blocksContainer = document.createElement('div');
    blocksContainer.className = 'blocks-container';
    renderBlocks(pageState.blocks, blocksContainer);
    pageContent.appendChild(blocksContainer);
  }

  function rerenderBlock(blockId) {
    const block = getBlockById(blockId, pageState.blocks);
    if (!block) return;
    const el = getBlockElement(blockId);
    if (!el) return;
    const newEl = renderBlock(block);
    el.replaceWith(newEl);
  }

  /* ----------------------------------------------------------
     7. BLOCK CRUD
  ---------------------------------------------------------- */
  function addBlock(type, afterBlockId, specificContainer) {
    const newBlock = makeBlock(type, '');
    if (type === 'toggle') { newBlock.open = false; newBlock.children = [makeBlock('paragraph', '')]; }
    if (type === 'todo') { newBlock.checked = false; }
    if (type === 'callout') { newBlock.calloutIcon = '💡'; }
    if (type === 'code') { newBlock.language = 'javascript'; }
    if (type === 'table') { newBlock.rows = [['Column 1', 'Column 2', 'Column 3'], ['', '', ''], ['', '', '']]; }
    if (type === 'columns') { newBlock.columns = [{ id: generateId(), blocks: [makeBlock('paragraph', '')] }, { id: generateId(), blocks: [makeBlock('paragraph', '')] }]; }
    if (type === 'tabs') {
      newBlock.tabs = [
        { id: generateId(), name: 'Tab 1', blocks: [makeBlock('paragraph', '')] },
        { id: generateId(), name: 'Tab 2', blocks: [makeBlock('paragraph', '')] }
      ];
      newBlock.activeTabId = newBlock.tabs[0].id;
    }
    if (type === 'image') { newBlock.url = ''; newBlock.caption = ''; }
    if (type === 'bookmark') { newBlock.url = ''; newBlock.bookmarkTitle = ''; newBlock.description = ''; }

    let container;
    if (specificContainer) {
      container = { arr: specificContainer, index: specificContainer.length };
    } else if (afterBlockId) {
      container = findBlockContainer(afterBlockId);
    }

    if (container) {
      container.arr.splice(container.index + 1, 0, newBlock);
    } else {
      pageState.blocks.push(newBlock);
    }

    /* Render into DOM */
    if (afterBlockId) {
      const afterEl = getBlockElement(afterBlockId);
      if (afterEl) {
        const newEl = renderBlock(newBlock);
        afterEl.after(newEl);
      } else {
        appendBlockToContainer(newBlock);
      }
    } else {
      appendBlockToContainer(newBlock);
    }

    return newBlock;
  }

  function appendBlockToContainer(block) {
    const container = document.querySelector('.blocks-container');
    if (container) container.appendChild(renderBlock(block));
  }

  function deleteBlock(blockId) {
    const container = findBlockContainer(blockId);
    if (!container) return;
    if (container.arr.length <= 1 && container.arr === pageState.blocks) return; // keep at least one block
    container.arr.splice(container.index, 1);
    const el = getBlockElement(blockId);
    if (el) el.remove();
  }

  function moveBlock(blockId, newIndex) {
    const container = findBlockContainer(blockId);
    if (!container) return;
    const [block] = container.arr.splice(container.index, 1);
    const clamped = Math.max(0, Math.min(newIndex, container.arr.length));
    container.arr.splice(clamped, 0, block);
  }

  function duplicateBlock(blockId) {
    const block = getBlockById(blockId, pageState.blocks);
    if (!block) return;
    const clone = JSON.parse(JSON.stringify(block));
    function reassignIds(b) {
      b.id = generateId();
      if (b.children) b.children.forEach(reassignIds);
      if (b.tabs) b.tabs.forEach(t => { t.id = generateId(); t.blocks.forEach(reassignIds); });
      if (b.columns) b.columns.forEach(c => { c.id = generateId(); c.blocks.forEach(reassignIds); });
    }
    reassignIds(clone);

    const container = findBlockContainer(blockId);
    if (container) {
      container.arr.splice(container.index + 1, 0, clone);
      const el = getBlockElement(blockId);
      if (el) el.after(renderBlock(clone));
    }
    return clone;
  }

  function changeBlockType(blockId, newType) {
    const block = getBlockById(blockId, pageState.blocks);
    if (!block) return;

    // strip html for content transfer
    const tmp = document.createElement('div');
    tmp.innerHTML = block.content || '';
    const textContent = tmp.textContent;

    block.type = newType;
    // reset type-specific props
    delete block.checked;
    delete block.open;
    delete block.children;
    delete block.calloutIcon;
    delete block.language;
    delete block.rows;
    delete block.columns;
    delete block.tabs;
    delete block.activeTabId;
    delete block.url;
    delete block.bookmarkTitle;
    delete block.description;
    delete block.caption;

    if (newType === 'todo') { block.checked = false; }
    if (newType === 'toggle') { block.open = false; block.children = [makeBlock('paragraph', '')]; }
    if (newType === 'callout') { block.calloutIcon = '💡'; }
    if (newType === 'code') { block.language = 'javascript'; block.content = textContent; }
    if (newType === 'table') { block.rows = [['Column 1', 'Column 2', 'Column 3'], ['', '', ''], ['', '', '']]; block.content = ''; }
    if (newType === 'columns') { block.content = ''; block.columns = [{ id: generateId(), blocks: [makeBlock('paragraph', textContent)] }, { id: generateId(), blocks: [makeBlock('paragraph', '')] }]; }
    if (newType === 'tabs') {
      block.content = '';
      block.tabs = [{ id: generateId(), name: 'Tab 1', blocks: [makeBlock('paragraph', textContent)] }, { id: generateId(), name: 'Tab 2', blocks: [makeBlock('paragraph', '')] }];
      block.activeTabId = block.tabs[0].id;
    }
    if (newType === 'divider') { block.content = ''; }
    if (newType === 'image') { block.url = ''; block.caption = ''; block.content = ''; }
    if (newType === 'bookmark') { block.url = ''; block.bookmarkTitle = ''; block.description = ''; block.content = ''; }

    rerenderBlock(blockId);
    if (['paragraph', 'heading1', 'heading2', 'heading3', 'bulleted_list', 'numbered_list', 'todo', 'toggle', 'quote', 'callout'].includes(newType)) {
      focusBlock(blockId, true);
    }
  }

  /* ----------------------------------------------------------
     8. KEYBOARD HANDLING
  ---------------------------------------------------------- */
  function setupKeyboardHandlers() {
    document.addEventListener('keydown', (e) => {
      const active = document.activeElement;
      if (!active) return;

      /* Close menus on Escape */
      if (e.key === 'Escape') {
        closeAllMenus();
        return;
      }

      /* Inline formatting shortcuts */
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'b') { e.preventDefault(); document.execCommand('bold'); return; }
        if (e.key === 'i') { e.preventDefault(); document.execCommand('italic'); return; }
        if (e.key === 'u') { e.preventDefault(); document.execCommand('underline'); return; }
        if (e.key === 'e') { e.preventDefault(); toggleInlineCode(); return; }
        if (e.key === 'S' && e.shiftKey) { e.preventDefault(); document.execCommand('strikeThrough'); return; }
      }

      const blockId = getBlockIdFromElement(active);
      if (!blockId) return;
      const block = getBlockById(blockId, pageState.blocks);
      if (!block) return;

      // only handle on contenteditable elements (not code select, table input, etc.)
      if (!active.isContentEditable) return;

      /* Tab name editing – don't handle block keys */
      if (active.closest('.tab-name')) return;

      /* ENTER */
      if (e.key === 'Enter' && !e.shiftKey) {
        if (block.type === 'code') return; // allow newlines in code
        e.preventDefault();
        // save current
        saveBlockContent(blockId, active.innerHTML);
        const newBlock = addBlock('paragraph', blockId);
        if (newBlock) focusBlock(newBlock.id, false);
        return;
      }

      /* BACKSPACE on empty */
      if (e.key === 'Backspace') {
        const text = active.textContent.trim();
        if (text.length === 0 && getCaretPosition(active) === 0) {
          const container = findBlockContainer(blockId);
          if (!container) return;
          if (container.arr.length <= 1 && container.arr === pageState.blocks) return;
          e.preventDefault();
          // focus previous
          const prevBlock = container.index > 0 ? container.arr[container.index - 1] : null;
          deleteBlock(blockId);
          if (prevBlock) focusBlock(prevBlock.id, true);
          return;
        }
      }

      /* Arrow Up/Down */
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        const allBlocks = flatVisibleBlocks(pageState.blocks);
        const idx = allBlocks.findIndex(b => b.id === blockId);
        if (idx === -1) return;
        if (e.key === 'ArrowUp' && idx > 0) {
          // only intercept at top of block
          if (getCaretPosition(active) === 0) {
            e.preventDefault();
            focusBlock(allBlocks[idx - 1].id, true);
          }
        }
        if (e.key === 'ArrowDown' && idx < allBlocks.length - 1) {
          const len = active.textContent.length;
          if (getCaretPosition(active) >= len) {
            e.preventDefault();
            focusBlock(allBlocks[idx + 1].id, false);
          }
        }
      }

      /* Tab / Shift+Tab for indent/outdent */
      if (e.key === 'Tab') {
        if (block.type === 'code') return; // allow tab in code
        e.preventDefault();
        // simple indent: convert to child of previous block if toggle
        // For simplicity, just insert spaces or do nothing fancy
        if (e.shiftKey) {
          // outdent – no-op for now in flat structure
        } else {
          // indent – no-op for now in flat structure
        }
        return;
      }
    });
  }

  function toggleInlineCode() {
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    if (range.collapsed) return;
    const parent = range.commonAncestorContainer;
    const codeParent = parent.nodeType === 1 ? parent.closest('code') : (parent.parentElement ? parent.parentElement.closest('code') : null);
    if (codeParent) {
      // unwrap
      const text = document.createTextNode(codeParent.textContent);
      codeParent.replaceWith(text);
    } else {
      const code = document.createElement('code');
      try {
        range.surroundContents(code);
      } catch (err) {
        // complex selection
        code.textContent = range.toString();
        range.deleteContents();
        range.insertNode(code);
      }
    }
  }

  /* ----------------------------------------------------------
     9. SLASH COMMAND MENU
  ---------------------------------------------------------- */
  let slashMenuState = { open: false, blockId: null, filter: '', selectedIndex: 0 };

  function setupSlashCommand() {
    document.addEventListener('input', (e) => {
      const el = e.target;
      if (!el.isContentEditable) return;
      const blockId = getBlockIdFromElement(el);
      if (!blockId) return;

      /* check empty-state class */
      el.classList.toggle('is-empty', el.textContent.trim().length === 0);

      /* save content */
      const block = getBlockById(blockId, pageState.blocks);
      if (block && block.type !== 'code') {
        block.content = el.innerHTML;
      } else if (block && block.type === 'code') {
        block.content = el.textContent;
      }

      /* Slash detection */
      const text = el.textContent;
      if (text.startsWith('/')) {
        slashMenuState.open = true;
        slashMenuState.blockId = blockId;
        slashMenuState.filter = text.slice(1).toLowerCase();
        slashMenuState.selectedIndex = 0;
        showSlashMenu();
      } else if (slashMenuState.open) {
        closeSlashMenu();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (!slashMenuState.open) return;
      const menu = document.querySelector('.slash-menu');
      if (!menu) return;

      const visibleItems = menu.querySelectorAll('.slash-menu-item:not(.hidden)');
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        slashMenuState.selectedIndex = (slashMenuState.selectedIndex + 1) % visibleItems.length;
        updateSlashSelection(visibleItems);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        slashMenuState.selectedIndex = (slashMenuState.selectedIndex - 1 + visibleItems.length) % visibleItems.length;
        updateSlashSelection(visibleItems);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = visibleItems[slashMenuState.selectedIndex];
        if (selected) selectSlashItem(selected.dataset.type);
      } else if (e.key === 'Escape') {
        closeSlashMenu();
      }
    });
  }

  function showSlashMenu() {
    let menu = document.querySelector('.slash-menu');
    if (!menu) {
      menu = document.createElement('div');
      menu.className = 'slash-menu';
      document.body.appendChild(menu);
    }
    menu.innerHTML = '';
    let hasItems = false;

    slashMenuSections.forEach(section => {
      const sectionHeader = document.createElement('div');
      sectionHeader.className = 'slash-menu-header';
      sectionHeader.textContent = section.label;
      let sectionHasVisible = false;
      const itemEls = [];

      section.items.forEach(item => {
        const el = document.createElement('div');
        el.className = 'slash-menu-item';
        el.dataset.type = item.type;
        const match = !slashMenuState.filter || item.name.toLowerCase().includes(slashMenuState.filter) || item.type.includes(slashMenuState.filter);
        if (!match) el.classList.add('hidden');
        else { sectionHasVisible = true; hasItems = true; }

        el.innerHTML = `<span class="slash-menu-item-icon">${item.icon}</span><div class="slash-menu-item-info"><span class="slash-menu-item-name">${item.name}</span><span class="slash-menu-item-description">${item.desc}</span></div>`;
        el.addEventListener('click', () => selectSlashItem(item.type));
        el.addEventListener('mouseenter', () => {
          menu.querySelectorAll('.slash-menu-item').forEach(i => i.classList.remove('selected'));
          el.classList.add('selected');
        });
        itemEls.push(el);
      });

      if (sectionHasVisible) {
        menu.appendChild(sectionHeader);
        itemEls.forEach(el => menu.appendChild(el));
      }
    });

    if (!hasItems) {
      menu.innerHTML = '<div class="slash-menu-empty">No results</div>';
    }

    /* position */
    const coords = getCaretCoordinates();
    menu.style.left = Math.max(8, coords.x - 16) + 'px';
    menu.style.top = (coords.y + 6) + 'px';
    menu.style.display = 'block';

    const visibleItems = menu.querySelectorAll('.slash-menu-item:not(.hidden)');
    updateSlashSelection(visibleItems);
    keepMenuInView(menu);
  }

  function updateSlashSelection(items) {
    items.forEach((it, i) => it.classList.toggle('selected', i === slashMenuState.selectedIndex));
    const selected = items[slashMenuState.selectedIndex];
    if (selected) selected.scrollIntoView({ block: 'nearest' });
  }

  function selectSlashItem(type) {
    const blockId = slashMenuState.blockId;
    closeSlashMenu();
    if (!blockId) return;
    // clear the slash text
    const block = getBlockById(blockId, pageState.blocks);
    if (block) block.content = '';
    changeBlockType(blockId, type);
  }

  function closeSlashMenu() {
    slashMenuState.open = false;
    const menu = document.querySelector('.slash-menu');
    if (menu) menu.style.display = 'none';
  }

  /* ----------------------------------------------------------
     10. INLINE FORMATTING TOOLBAR
  ---------------------------------------------------------- */
  function setupInlineToolbar() {
    let toolbar = null;

    function createToolbar() {
      toolbar = document.createElement('div');
      toolbar.className = 'inline-toolbar';
      toolbar.style.display = 'none';

      const buttons = [
        { label: 'B', cmd: 'bold', title: 'Bold (Ctrl+B)' },
        { label: 'I', cmd: 'italic', title: 'Italic (Ctrl+I)' },
        { label: 'U', cmd: 'underline', title: 'Underline (Ctrl+U)' },
        { label: 'S', cmd: 'strikeThrough', title: 'Strikethrough (Ctrl+Shift+S)' },
        { label: '</>', cmd: 'code', title: 'Inline code (Ctrl+E)' },
        null, // divider
        { label: '🔗', cmd: 'link', title: 'Add link' },
        null,
        { label: 'A', cmd: 'color', title: 'Text color' }
      ];

      buttons.forEach(btn => {
        if (btn === null) {
          const d = document.createElement('div');
          d.className = 'inline-toolbar-divider';
          toolbar.appendChild(d);
          return;
        }
        const b = document.createElement('button');
        b.className = 'inline-toolbar-btn';
        b.textContent = btn.label;
        b.title = btn.title;
        b.addEventListener('mousedown', (e) => {
          e.preventDefault(); // prevent losing selection
          if (btn.cmd === 'code') {
            toggleInlineCode();
          } else if (btn.cmd === 'link') {
            const url = prompt('Enter URL:');
            if (url) document.execCommand('createLink', false, url);
          } else if (btn.cmd === 'color') {
            showColorPicker(b);
          } else {
            document.execCommand(btn.cmd);
          }
        });
        toolbar.appendChild(b);
      });

      document.body.appendChild(toolbar);
    }

    createToolbar();

    const handleSelection = debounce(() => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
        toolbar.style.display = 'none';
        return;
      }
      const anchor = sel.anchorNode;
      const editable = anchor && (anchor.nodeType === 1 ? anchor : anchor.parentElement);
      if (!editable || !editable.closest('[contenteditable="true"]')) {
        toolbar.style.display = 'none';
        return;
      }
      // don't show for code blocks
      if (editable.closest('.block-code-content')) {
        toolbar.style.display = 'none';
        return;
      }
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      toolbar.style.display = 'flex';
      toolbar.style.left = (rect.left + rect.width / 2 - toolbar.offsetWidth / 2) + 'px';
      toolbar.style.top = (rect.top - toolbar.offsetHeight - 8 + window.scrollY) + 'px';
    }, 200);

    document.addEventListener('selectionchange', handleSelection);
  }

  function showColorPicker(anchor) {
    closeAllMenus('.color-picker-menu');
    const picker = document.createElement('div');
    picker.className = 'context-menu color-picker-menu';
    const colors = [
      { name: 'Default', value: '' },
      { name: 'Red', value: '#ff4d4d' },
      { name: 'Orange', value: '#ffa54d' },
      { name: 'Yellow', value: '#ffd84d' },
      { name: 'Green', value: '#4dff88' },
      { name: 'Blue', value: '#4da6ff' },
      { name: 'Purple', value: '#b84dff' },
      { name: 'Pink', value: '#ff4daf' },
      { name: 'Gray', value: '#888' },
    ];
    colors.forEach(c => {
      const item = document.createElement('div');
      item.className = 'context-menu-item';
      item.innerHTML = `<span style="color:${c.value || 'inherit'}; margin-right:8px;">A</span> ${c.name}`;
      item.addEventListener('mousedown', (e) => {
        e.preventDefault();
        if (c.value) document.execCommand('foreColor', false, c.value);
        else document.execCommand('removeFormat');
        picker.remove();
      });
      picker.appendChild(item);
    });
    const rect = anchor.getBoundingClientRect();
    picker.style.left = rect.left + 'px';
    picker.style.top = (rect.bottom + 4) + 'px';
    document.body.appendChild(picker);
  }

  /* ----------------------------------------------------------
     11. DRAG & DROP
  ---------------------------------------------------------- */
  function setupDragDrop() {
    let draggedBlockId = null;
    let dropIndicator = null;

    function getOrCreateIndicator() {
      if (!dropIndicator) {
        dropIndicator = document.createElement('div');
        dropIndicator.className = 'drop-indicator';
        document.body.appendChild(dropIndicator);
      }
      return dropIndicator;
    }

    document.addEventListener('dragstart', (e) => {
      const handle = e.target.closest('.block-handle');
      if (!handle) return;
      const blockEl = handle.closest('.block');
      if (!blockEl) return;
      draggedBlockId = blockEl.dataset.blockId;
      blockEl.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/block-id', draggedBlockId);
    });

    document.addEventListener('dragover', (e) => {
      if (!draggedBlockId) return;
      // check if this is a tab drag
      if (e.dataTransfer.types.includes('text/tab-drag')) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const blockEl = e.target.closest('.block');
      if (!blockEl || blockEl.dataset.blockId === draggedBlockId) return;
      const rect = blockEl.getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      const indicator = getOrCreateIndicator();
      indicator.style.display = 'block';
      indicator.style.width = rect.width + 'px';
      indicator.style.left = rect.left + 'px';
      if (e.clientY < mid) {
        indicator.style.top = (rect.top - 2 + window.scrollY) + 'px';
        blockEl.dataset.dropPos = 'before';
      } else {
        indicator.style.top = (rect.bottom - 2 + window.scrollY) + 'px';
        blockEl.dataset.dropPos = 'after';
      }
    });

    document.addEventListener('dragleave', (e) => {
      if (!draggedBlockId) return;
      // hide indicator if leaving blocks area
    });

    document.addEventListener('drop', (e) => {
      if (!draggedBlockId) return;
      // don't handle tab drops
      if (e.dataTransfer.types.includes('text/tab-drag')) return;
      e.preventDefault();
      const indicator = getOrCreateIndicator();
      indicator.style.display = 'none';

      const targetEl = e.target.closest('.block');
      if (!targetEl || targetEl.dataset.blockId === draggedBlockId) { cleanDrag(); return; }
      const targetId = targetEl.dataset.blockId;
      const dropPos = targetEl.dataset.dropPos || 'after';
      delete targetEl.dataset.dropPos;

      // Perform reorder
      const srcContainer = findBlockContainer(draggedBlockId);
      const tgtContainer = findBlockContainer(targetId);
      if (!srcContainer || !tgtContainer) { cleanDrag(); return; }

      const [movedBlock] = srcContainer.arr.splice(srcContainer.index, 1);
      // recalculate target index since array may have shifted
      const newTgtIdx = tgtContainer.arr.findIndex(b => b.id === targetId);
      const insertIdx = dropPos === 'before' ? newTgtIdx : newTgtIdx + 1;
      tgtContainer.arr.splice(insertIdx < 0 ? 0 : insertIdx, 0, movedBlock);

      // re-render
      const draggedEl = getBlockElement(draggedBlockId);
      if (draggedEl) draggedEl.remove();
      const newEl = renderBlock(movedBlock);
      const newTargetEl = getBlockElement(targetId);
      if (newTargetEl) {
        if (dropPos === 'before') newTargetEl.before(newEl);
        else newTargetEl.after(newEl);
      }

      cleanDrag();
    });

    document.addEventListener('dragend', () => cleanDrag());

    function cleanDrag() {
      if (draggedBlockId) {
        const el = getBlockElement(draggedBlockId);
        if (el) el.classList.remove('dragging');
      }
      draggedBlockId = null;
      if (dropIndicator) dropIndicator.style.display = 'none';
    }
  }

  /* ----------------------------------------------------------
     12. BLOCK HANDLE MENU (click on handle)
  ---------------------------------------------------------- */
  function setupBlockHandleMenu() {
    document.addEventListener('click', (e) => {
      const handle = e.target.closest('.block-handle');
      if (!handle) return;
      // don't open if drag started
      const blockEl = handle.closest('.block');
      if (!blockEl) return;
      const blockId = blockEl.dataset.blockId;
      showBlockHandleMenu(e, blockId);
    });

    /* Plus button */
    document.addEventListener('click', (e) => {
      const plus = e.target.closest('.block-plus');
      if (!plus) return;
      const blockEl = plus.closest('.block');
      if (!blockEl) return;
      const blockId = blockEl.dataset.blockId;
      const newBlock = addBlock('paragraph', blockId);
      if (newBlock) focusBlock(newBlock.id, false);
    });
  }

  function showBlockHandleMenu(e, blockId) {
    closeAllMenus();
    const menu = document.createElement('div');
    menu.className = 'context-menu block-handle-menu';

    const items = [
      { label: '🗑 Delete', action: () => deleteBlock(blockId) },
      { label: '📋 Duplicate', action: () => duplicateBlock(blockId) },
      null,
      { label: '⬆ Move up', action: () => { const c = findBlockContainer(blockId); if (c && c.index > 0) { moveBlock(blockId, c.index - 1); reRenderAll(); } } },
      { label: '⬇ Move down', action: () => { const c = findBlockContainer(blockId); if (c && c.index < c.arr.length - 1) { moveBlock(blockId, c.index + 1); reRenderAll(); } } },
      null,
      { label: '🔄 Turn into ▸', submenu: true, action: () => showTurnIntoMenu(e, blockId, menu) },
      { label: '🔗 Copy link', action: () => navigator.clipboard.writeText(`#${blockId}`) },
    ];

    items.forEach(it => {
      if (it === null) {
        const d = document.createElement('div');
        d.className = 'context-menu-divider';
        menu.appendChild(d);
        return;
      }
      const mi = document.createElement('div');
      mi.className = 'context-menu-item';
      mi.textContent = it.label;
      mi.addEventListener('click', (ev) => { ev.stopPropagation(); if (!it.submenu) closeAllMenus(); it.action(); });
      menu.appendChild(mi);
    });

    menu.style.left = e.clientX + 'px';
    menu.style.top = e.clientY + 'px';
    document.body.appendChild(menu);
    requestAnimationFrame(() => keepMenuInView(menu));
  }

  function showTurnIntoMenu(e, blockId, parentMenu) {
    closeAllMenus('.turn-into-menu');
    const menu = document.createElement('div');
    menu.className = 'context-menu turn-into-menu';

    const types = [
      { name: 'Text', type: 'paragraph' },
      { name: 'Heading 1', type: 'heading1' },
      { name: 'Heading 2', type: 'heading2' },
      { name: 'Heading 3', type: 'heading3' },
      { name: 'Bulleted List', type: 'bulleted_list' },
      { name: 'Numbered List', type: 'numbered_list' },
      { name: 'To-do', type: 'todo' },
      { name: 'Toggle', type: 'toggle' },
      { name: 'Quote', type: 'quote' },
      { name: 'Callout', type: 'callout' },
      { name: 'Code', type: 'code' },
    ];

    types.forEach(t => {
      const mi = document.createElement('div');
      mi.className = 'context-menu-item';
      mi.textContent = t.name;
      mi.addEventListener('click', () => { closeAllMenus(); changeBlockType(blockId, t.type); });
      menu.appendChild(mi);
    });

    const rect = parentMenu.getBoundingClientRect();
    menu.style.left = (rect.right + 4) + 'px';
    menu.style.top = rect.top + 'px';
    document.body.appendChild(menu);
    requestAnimationFrame(() => keepMenuInView(menu));
  }

  /* ----------------------------------------------------------
     13. CONTEXT MENU (right-click)
  ---------------------------------------------------------- */
  function setupContextMenu() {
    document.addEventListener('contextmenu', (e) => {
      const blockEl = e.target.closest('.block');
      if (!blockEl) return;
      // don't override tab context
      if (e.target.closest('.tab-item')) return;

      e.preventDefault();
      const blockId = blockEl.dataset.blockId;
      showContextMenu(e, blockId);
    });
  }

  function showContextMenu(e, blockId) {
    closeAllMenus();
    const menu = document.createElement('div');
    menu.className = 'context-menu';

    const items = [
      { label: 'Cut', shortcut: 'Ctrl+X', action: () => { document.execCommand('cut'); } },
      { label: 'Copy', shortcut: 'Ctrl+C', action: () => { document.execCommand('copy'); } },
      { label: 'Paste', shortcut: 'Ctrl+V', action: () => { document.execCommand('paste'); } },
      null,
      { label: 'Delete', shortcut: 'Del', action: () => deleteBlock(blockId) },
      { label: 'Duplicate', shortcut: '', action: () => duplicateBlock(blockId) },
      null,
      { label: 'Turn into ▸', shortcut: '', action: () => showTurnIntoMenu(e, blockId, menu) },
      { label: 'Color ▸', shortcut: '', action: () => showBlockColorMenu(e, blockId, menu) },
      null,
      { label: 'Comment', shortcut: '', action: () => { /* no-op placeholder */ } },
    ];

    items.forEach(it => {
      if (it === null) {
        const d = document.createElement('div');
        d.className = 'context-menu-divider';
        menu.appendChild(d);
        return;
      }
      const mi = document.createElement('div');
      mi.className = 'context-menu-item';
      mi.innerHTML = `<span>${it.label}</span>${it.shortcut ? `<span class="context-menu-shortcut">${it.shortcut}</span>` : ''}`;
      mi.addEventListener('click', () => { closeAllMenus(); it.action(); });
      menu.appendChild(mi);
    });

    menu.style.left = e.clientX + 'px';
    menu.style.top = e.clientY + 'px';
    document.body.appendChild(menu);
    requestAnimationFrame(() => keepMenuInView(menu));
  }

  function showBlockColorMenu(e, blockId, parentMenu) {
    closeAllMenus('.block-color-menu');
    const menu = document.createElement('div');
    menu.className = 'context-menu block-color-menu';
    const colors = [
      { name: 'Default', bg: '', text: '' },
      { name: 'Red', bg: 'rgba(255,77,77,0.15)', text: '#ff4d4d' },
      { name: 'Orange', bg: 'rgba(255,165,77,0.15)', text: '#ffa54d' },
      { name: 'Yellow', bg: 'rgba(255,216,77,0.15)', text: '#ffd84d' },
      { name: 'Green', bg: 'rgba(77,255,136,0.15)', text: '#4dff88' },
      { name: 'Blue', bg: 'rgba(77,166,255,0.15)', text: '#4da6ff' },
      { name: 'Purple', bg: 'rgba(184,77,255,0.15)', text: '#b84dff' },
    ];
    colors.forEach(c => {
      const mi = document.createElement('div');
      mi.className = 'context-menu-item';
      mi.innerHTML = `<span style="display:inline-block;width:16px;height:16px;border-radius:3px;background:${c.bg || '#555'};margin-right:8px;vertical-align:middle;"></span>${c.name}`;
      mi.addEventListener('click', () => {
        closeAllMenus();
        const el = getBlockElement(blockId);
        if (el) {
          el.style.backgroundColor = c.bg;
          el.style.color = c.text;
        }
      });
      menu.appendChild(mi);
    });
    const rect = parentMenu.getBoundingClientRect();
    menu.style.left = (rect.right + 4) + 'px';
    menu.style.top = rect.top + 'px';
    document.body.appendChild(menu);
    requestAnimationFrame(() => keepMenuInView(menu));
  }

  /* ----------------------------------------------------------
     14. SIDEBAR
  ---------------------------------------------------------- */
  const pages = [
    { id: 'page_1', icon: '📝', title: 'Getting Started', active: true },
    { id: 'page_2', icon: '📋', title: 'Tasks', active: false },
    { id: 'page_3', icon: '📓', title: 'Journal', active: false },
    { id: 'page_4', icon: '💡', title: 'Ideas', active: false },
  ];

  function renderSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;
    sidebar.innerHTML = '';

    /* Header */
    const header = document.createElement('div');
    header.className = 'sidebar-header';
    header.innerHTML = `<span class="sidebar-logo">🏠 NotionNest</span>`;
    sidebar.appendChild(header);

    /* Search */
    const search = document.createElement('div');
    search.className = 'sidebar-search';
    search.innerHTML = `<input type="text" placeholder="Search…" class="sidebar-search-input" />`;
    sidebar.appendChild(search);

    /* Nav */
    const nav = document.createElement('div');
    nav.className = 'sidebar-nav';

    /* Quick items */
    const quickItems = [
      { icon: '🔍', label: 'Search' },
      { icon: '⚙️', label: 'Settings' },
    ];
    quickItems.forEach(qi => {
      const item = document.createElement('div');
      item.className = 'sidebar-item';
      item.innerHTML = `<span class="sidebar-item-icon">${qi.icon}</span><span>${qi.label}</span>`;
      nav.appendChild(item);
    });

    /* Section */
    const section = document.createElement('div');
    section.className = 'sidebar-section';
    section.innerHTML = '<div class="sidebar-section-header">Private</div>';

    pages.forEach(p => {
      const item = document.createElement('div');
      item.className = 'sidebar-item' + (p.active ? ' active' : '');
      item.innerHTML = `<span class="sidebar-item-icon">${p.icon}</span><span>${p.title}</span>`;
      item.addEventListener('click', () => {
        pages.forEach(pp => pp.active = false);
        p.active = true;
        renderSidebar();
      });
      section.appendChild(item);
    });

    nav.appendChild(section);

    /* New page */
    const newPage = document.createElement('div');
    newPage.className = 'sidebar-item sidebar-new-page';
    newPage.innerHTML = '<span class="sidebar-item-icon">+</span><span>New page</span>';
    newPage.addEventListener('click', () => {
      const np = { id: 'page_' + Date.now(), icon: '📄', title: 'Untitled', active: true };
      pages.forEach(pp => pp.active = false);
      pages.push(np);
      renderSidebar();
    });
    nav.appendChild(newPage);
    sidebar.appendChild(nav);
  }

  function updateSidebar() {
    const activeP = pages.find(p => p.active);
    if (activeP) {
      activeP.title = pageState.title || 'Untitled';
      activeP.icon = pageState.icon;
    }
    renderSidebar();
  }

  /* ----------------------------------------------------------
     15. TOP BAR
  ---------------------------------------------------------- */
  function renderTopbar() {
    const topbar = document.querySelector('.topbar');
    if (!topbar) return;
    topbar.innerHTML = '';

    const breadcrumb = document.createElement('div');
    breadcrumb.className = 'topbar-breadcrumb';
    breadcrumb.innerHTML = `<span class="topbar-icon">${pageState.icon}</span> <span class="topbar-page-title">${pageState.title || 'Untitled'}</span>`;
    topbar.appendChild(breadcrumb);

    const actions = document.createElement('div');
    actions.className = 'topbar-actions';
    actions.innerHTML = `<button class="topbar-btn">Share</button><button class="topbar-btn topbar-favorite" title="Favorite">☆</button><button class="topbar-btn topbar-more" title="More">⋯</button>`;
    topbar.appendChild(actions);

    /* Favorite toggle */
    const fav = actions.querySelector('.topbar-favorite');
    fav.addEventListener('click', () => {
      fav.textContent = fav.textContent === '☆' ? '★' : '☆';
      fav.classList.toggle('favorited');
    });
  }

  function updateBreadcrumb() {
    const titleEl = document.querySelector('.topbar-page-title');
    if (titleEl) titleEl.textContent = pageState.title || 'Untitled';
    const iconEl = document.querySelector('.topbar-icon');
    if (iconEl) iconEl.textContent = pageState.icon;
  }

  /* ----------------------------------------------------------
     16. SIDEBAR TOGGLE
  ---------------------------------------------------------- */
  function setupSidebarToggle() {
    const toggleBtn = document.querySelector('.sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');
    if (!toggleBtn || !sidebar) return;
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
    });
  }

  /* ----------------------------------------------------------
     17. EMOJI PICKER (simple)
  ---------------------------------------------------------- */
  function showEmojiPicker(iconEl) {
    closeAllMenus();
    const picker = document.createElement('div');
    picker.className = 'context-menu emoji-picker-menu';
    const emojis = ['📝', '📋', '📓', '💡', '🎯', '🚀', '📊', '🗂', '🏠', '⭐', '🔥', '💻', '📌', '🎨', '🎵', '📸', '🌟', '❤️', '🐱', '🌍', '🎲', '📚', '🧪', '🔬', '🛠', '⚡', '🌈', '✅', '❌', '⚠️'];
    const grid = document.createElement('div');
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(6, 1fr)';
    grid.style.gap = '4px';
    grid.style.padding = '8px';
    emojis.forEach(em => {
      const btn = document.createElement('span');
      btn.style.cursor = 'pointer';
      btn.style.fontSize = '20px';
      btn.style.padding = '4px';
      btn.style.textAlign = 'center';
      btn.textContent = em;
      btn.addEventListener('click', () => {
        pageState.icon = em;
        iconEl.textContent = em;
        updateBreadcrumb();
        updateSidebar();
        picker.remove();
      });
      grid.appendChild(btn);
    });
    picker.appendChild(grid);
    const rect = iconEl.getBoundingClientRect();
    picker.style.left = rect.left + 'px';
    picker.style.top = (rect.bottom + 4) + 'px';
    document.body.appendChild(picker);
    requestAnimationFrame(() => keepMenuInView(picker));
  }

  /* ----------------------------------------------------------
     18. TODO CHECKBOX TOGGLE
  ---------------------------------------------------------- */
  function setupTodoToggle() {
    document.addEventListener('click', (e) => {
      const cb = e.target.closest('.todo-checkbox');
      if (!cb) return;
      const blockEl = cb.closest('.block');
      if (!blockEl) return;
      const blockId = blockEl.dataset.blockId;
      const block = getBlockById(blockId, pageState.blocks);
      if (!block) return;
      block.checked = !block.checked;
      cb.classList.toggle('checked', block.checked);
      cb.innerHTML = block.checked ? '☑' : '☐';
      blockEl.classList.toggle('checked', block.checked);
    });
  }

  /* ----------------------------------------------------------
     19. TOGGLE BLOCK EXPAND/COLLAPSE
  ---------------------------------------------------------- */
  function setupToggleBlocks() {
    document.addEventListener('click', (e) => {
      const icon = e.target.closest('.toggle-icon');
      if (!icon) return;
      const blockEl = icon.closest('.block');
      if (!blockEl) return;
      const blockId = blockEl.dataset.blockId;
      const block = getBlockById(blockId, pageState.blocks);
      if (!block) return;
      block.open = !block.open;
      blockEl.classList.toggle('open', block.open);
    });
  }

  /* ----------------------------------------------------------
     20. CALLOUT ICON CLICK
  ---------------------------------------------------------- */
  function setupCalloutIcons() {
    document.addEventListener('click', (e) => {
      const iconEl = e.target.closest('.block-callout-icon');
      if (!iconEl) return;
      const blockEl = iconEl.closest('.block');
      if (!blockEl) return;
      const blockId = blockEl.dataset.blockId;
      const block = getBlockById(blockId, pageState.blocks);
      if (!block) return;

      closeAllMenus();
      const picker = document.createElement('div');
      picker.className = 'context-menu emoji-picker-menu';
      const emojis = ['💡', '⚠️', '❗', '✅', '❌', '🔥', '📌', '🚀', '⭐', '❤️', '🎯', '📝', '🛠', '⚡', '🌟', '📢', '💬', '🧪'];
      const grid = document.createElement('div');
      grid.style.display = 'grid';
      grid.style.gridTemplateColumns = 'repeat(6, 1fr)';
      grid.style.gap = '4px';
      grid.style.padding = '8px';
      emojis.forEach(em => {
        const btn = document.createElement('span');
        btn.style.cursor = 'pointer';
        btn.style.fontSize = '20px';
        btn.style.padding = '4px';
        btn.style.textAlign = 'center';
        btn.textContent = em;
        btn.addEventListener('click', () => {
          block.calloutIcon = em;
          iconEl.textContent = em;
          picker.remove();
        });
        grid.appendChild(btn);
      });
      picker.appendChild(grid);
      const rect = iconEl.getBoundingClientRect();
      picker.style.left = rect.left + 'px';
      picker.style.top = (rect.bottom + 4) + 'px';
      document.body.appendChild(picker);
      requestAnimationFrame(() => keepMenuInView(picker));
    });
  }

  /* ----------------------------------------------------------
     21. MENU UTILITIES
  ---------------------------------------------------------- */
  function closeAllMenus(except) {
    const selectors = ['.context-menu', '.slash-menu', '.color-picker-menu', '.emoji-picker-menu', '.block-handle-menu', '.turn-into-menu', '.block-color-menu', '.tab-context-menu'];
    selectors.forEach(sel => {
      if (except && sel.includes(except)) return;
      document.querySelectorAll(sel).forEach(m => {
        if (sel === '.slash-menu') m.style.display = 'none';
        else m.remove();
      });
    });
    slashMenuState.open = false;
  }

  function keepMenuInView(menu) {
    const rect = menu.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (rect.right > vw - 8) menu.style.left = Math.max(8, vw - rect.width - 8) + 'px';
    if (rect.bottom > vh - 8) menu.style.top = Math.max(8, vh - rect.height - 8) + 'px';
  }

  /* close menus on click outside */
  document.addEventListener('mousedown', (e) => {
    if (!e.target.closest('.context-menu') && !e.target.closest('.slash-menu') && !e.target.closest('.inline-toolbar') && !e.target.closest('.block-handle') && !e.target.closest('.emoji-picker-menu')) {
      closeAllMenus();
    }
  });

  /* ----------------------------------------------------------
     22. RE-RENDER ALL (full page re-render, preserve focus)
  ---------------------------------------------------------- */
  function reRenderAll() {
    renderPage();
    renderTopbar();
    updateToc();
  }

  function updateToc() {
    document.querySelectorAll('.block-toc').forEach(tocEl => {
      const blockId = tocEl.dataset.blockId;
      const content = tocEl.querySelector('.block-content');
      if (content) {
        content.innerHTML = '';
        renderTocBlock(content);
      }
    });
  }

  /* ----------------------------------------------------------
     23. INITIALIZATION
  ---------------------------------------------------------- */
  function init() {
    pageState.blocks = buildDefaultBlocks();
    fixTabDefaults(pageState.blocks);

    /* Build DOM skeleton if not present */
    buildAppShell();

    renderSidebar();
    renderTopbar();
    renderPage();

    setupSidebarToggle();
    setupKeyboardHandlers();
    setupSlashCommand();
    setupInlineToolbar();
    setupDragDrop();
    setupBlockHandleMenu();
    setupContextMenu();
    setupTodoToggle();
    setupToggleBlocks();
    setupCalloutIcons();

    /* Focus last empty paragraph */
    const last = pageState.blocks[pageState.blocks.length - 1];
    if (last) focusBlock(last.id, false);
  }

  function buildAppShell() {
    const app = document.querySelector('.notion-app');
    if (!app) return;

    // Check if already built
    if (app.querySelector('.sidebar')) return;

    /* Sidebar toggle */
    const sidebarToggle = document.createElement('button');
    sidebarToggle.className = 'sidebar-toggle';
    sidebarToggle.innerHTML = '☰';
    sidebarToggle.title = 'Toggle sidebar';
    app.appendChild(sidebarToggle);

    /* Sidebar */
    const sidebar = document.createElement('div');
    sidebar.className = 'sidebar';
    app.appendChild(sidebar);

    /* Main content */
    const main = document.createElement('div');
    main.className = 'main-content';

    const topbar = document.createElement('div');
    topbar.className = 'topbar';
    main.appendChild(topbar);

    const pageContent = document.createElement('div');
    pageContent.className = 'page-content';
    main.appendChild(pageContent);

    app.appendChild(main);
  }

  /* ----------------------------------------------------------
     24. DOM READY
  ---------------------------------------------------------- */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
