/* ============================================================
   NotionNest — blocks/ToggleBlock.jsx
   Collapsible toggle block with nested children
   Created At: 2026-07-20 | Last Modified: 2026-07-20
   Previous Version Back URL: file:///c:/BriselleServer/Briselle-Lightiningv58/briselle-lightining.client/src/modules/notion-nest/blocks.jsx#L561
   ============================================================ */
import { memo, useState, useEffect } from 'react';
import { usePageContext } from '../core/PageContext';
import { useEditable } from './shared/useEditable';
import { focusBlock } from './shared/focusBlock';

export const ToggleBlock = memo(function ToggleBlock({ block }) {
  const { ref, handleInput, handleKeyDown, handleFocus } = useEditable(block, { placeholder: 'Toggle' });
  const { updateBlockProperty, addBlock } = usePageContext();
  // Use dynamic import to avoid circular dep
  const [BR, setBR] = useState(null);
  useEffect(() => { import('../core/BlockRenderer').then(m => setBR(() => m.default)); }, []);
  const children = block.children || [];
  return (
    <>
      <div className="block-content" onClick={() => ref.current?.focus()} style={{ cursor: 'text' }}>
        <span
          className="toggle-icon"
          onClick={(e) => {
            e.stopPropagation();
            updateBlockProperty(block.id, 'open', !block.open);
          }}
          style={{ cursor: 'pointer', userSelect: 'none', marginRight: '4px' }}
        >
          ▶
        </span>
        <div ref={ref} contentEditable suppressContentEditableWarning data-placeholder="Toggle"
          onInput={handleInput} onKeyDown={handleKeyDown} onFocus={handleFocus} style={{ flex: 1 }} />
      </div>
      {block.open && (
        <div className="block-toggle-children" style={{ paddingLeft: '24px' }}>
          <div className="blocks-container">
            {BR && children.map((child, i) => <BR key={child.id} block={child} blocksArray={children} blockIndex={i} />)}
            {children.length === 0 && (
              <div
                className="toggle-empty-placeholder"
                style={{
                  color: '#aaa',
                  fontSize: '0.9em',
                  padding: '4px 8px',
                  cursor: 'pointer',
                  userSelect: 'none'
                }}
                onClick={() => {
                  const nb = addBlock('paragraph', block.id);
                  if (nb) focusBlock(nb.id);
                }}
              >
                + Empty toggle. Click to add a block inside
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
});
