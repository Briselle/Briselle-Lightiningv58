const fs = require('fs');

// Fix menus.jsx
let menus = fs.readFileSync('c:/BriselleServer/NotionNest/src/lib/menus.jsx', 'utf8');

// Fix handleComment
menus = menus.replace(
  /const handleComment = useCallback\(\(\) => \{[\s\S]*?\}, \[restoreRange, blockId, addComment\]\);/,
  `const handleComment = useCallback(() => {
    restoreRange();
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;
    const selectedText = sel.toString();
    const commentText = prompt('Add a comment:');
    if (!commentText) return;
    restoreRange();
    document.execCommand('styleWithCSS', false, true);
    document.execCommand('insertHTML', false,
      \`<mark class="inline-comment" data-comment-text="\${commentText.replace(/"/g, '&quot;')}" title="\${commentText.replace(/"/g, '&quot;')}">\${selectedText}</mark>\`
    );
    addComment(blockId, selectedText, commentText);
  }, [restoreRange, blockId, addComment]);`
);

// Fix applyColor
menus = menus.replace(
  /const applyColor = useCallback\(\(color\) => \{[\s\S]*?\}, \[restoreRange\]\);/,
  `const applyColor = useCallback((color) => {
    restoreRange();
    document.execCommand('styleWithCSS', false, true);
    document.execCommand('foreColor', false, color);
    setColorOpen(false);
  }, [restoreRange]);`
);

// Fix applyBg
menus = menus.replace(
  /const applyBg = useCallback\(\(color\) => \{[\s\S]*?\}, \[restoreRange\]\);/,
  `const applyBg = useCallback((color) => {
    restoreRange();
    document.execCommand('styleWithCSS', false, true);
    if (color === 'transparent') {
      document.execCommand('removeFormat', false, 'hiliteColor');
    } else {
      document.execCommand('hiliteColor', false, color);
    }
    setColorOpen(false);
  }, [restoreRange]);`
);

// Fix handleEmojiInsert
menus = menus.replace(
  /const handleEmojiInsert = useCallback\(\(emoji\) => \{[\s\S]*?\}, \[restoreRange\]\);/,
  `const handleEmojiInsert = useCallback((emoji) => {
    restoreRange();
    if (emoji) {
      if (emoji.startsWith('svg:')) {
        const svgContent = emoji.replace('svg:', '');
        document.execCommand('insertHTML', false, \`<span class="inline-icon" style="display:inline-block;width:1.2em;height:1.2em;vertical-align:middle;color:inherit;" dangerouslySetInnerHTML="false">\${svgContent}</span>\`);
      } else if (emoji.startsWith('data:image')) {
        document.execCommand('insertHTML', false, \`<img src="\${emoji}" style="width:1.2em;height:1.2em;vertical-align:middle;display:inline-block;" />\`);
      } else {
        document.execCommand('insertText', false, emoji);
      }
    }
    setEmojiOpen(false);
  }, [restoreRange]);`
);

// Fix ContextMenu stopPropagation
menus = menus.replace(
  /className=\{`context-menu-item\$\{item\.danger[\s\S]*?onClick=\{\(e\) => \{[\s\S]*?if \(!item\.submenu\)/,
  `className={\`context-menu-item\${item.danger ? ' danger' : ''}\${item.disabled ? ' disabled' : ''}\`}
            onClick={(e) => {
              e.stopPropagation();
              if (item.disabled) return;
              if (item.action) item.action(e);
              // Don't hide if this item opens a submenu
              if (!item.submenu)`
);
menus = menus.replace(
  /className=\{`context-menu-item\$\{item\.danger[\s\S]*?onClick=\{\(\) => \{[\s\S]*?if \(!item\.submenu\)/,
  `className={\`context-menu-item\${item.danger ? ' danger' : ''}\${item.disabled ? ' disabled' : ''}\`}
            onClick={(e) => {
              e.stopPropagation();
              if (item.disabled) return;
              if (item.action) item.action(e);
              // Don't hide if this item opens a submenu
              if (!item.submenu)`
);

fs.writeFileSync('c:/BriselleServer/NotionNest/src/lib/menus.jsx', menus);

// Fix blocks.jsx
let blocks = fs.readFileSync('c:/BriselleServer/NotionNest/src/lib/blocks.jsx', 'utf8');

blocks = blocks.replace(
  /import \{ TextBlock, ListBlock/,
  "import { NotionIconPicker } from './menus';\nimport { TextBlock, ListBlock"
);

blocks = blocks.replace(
  /const emojis = \['\?\?','\?\?'[\s\S]*?\];/,
  ""
);
blocks = blocks.replace(
  /const emojis = \['.*?\];/,
  ""
);

blocks = blocks.replace(
  /\{showPicker && \([\s\S]*?<div className="emoji-picker-menu[\s\S]*?<\/div>\s*<\/div>\s*\)\}/,
  `{showPicker && (
        <NotionIconPicker
          position={{ x: 0, y: 30 }}
          onSelect={(icon) => { updateBlockProperty(block.id, 'calloutIcon', icon); setShowPicker(false); }}
          onClose={() => setShowPicker(false)}
        />
      )}`
);

fs.writeFileSync('c:/BriselleServer/NotionNest/src/lib/blocks.jsx', blocks);

console.log('Fixed menus and blocks');
