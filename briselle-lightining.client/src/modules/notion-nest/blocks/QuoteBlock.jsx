/* ============================================================
   NotionNest — blocks/QuoteBlock.jsx
   Blockquote block
   Created At: 2026-07-20 | Last Modified: 2026-07-20
   Previous Version Back URL: file:///c:/BriselleServer/Briselle-Lightiningv58/briselle-lightining.client/src/modules/notion-nest/blocks.jsx#L613
   ============================================================ */
import { memo } from 'react';
import { usePageContext } from '../core/PageContext';
import { useEditable } from './shared/useEditable';

export const QuoteBlock = memo(function QuoteBlock({ block }) {
  const { ref, handleInput, handleKeyDown, handleFocus } = useEditable(block, { placeholder: 'Quote' });
  const { showContextMenu } = usePageContext();

  const handleMouseDown = (e) => {
    if (e.target === e.currentTarget) {
      e.preventDefault();
      e.stopPropagation();
      const rect = e.currentTarget.getBoundingClientRect();
      showContextMenu(e.clientX, e.clientY, [], rect, 'block', block.id, 'color-artifacts');
    }
  };

  return (
    <div className="block-content" onMouseDown={handleMouseDown}>
      <div ref={ref} contentEditable suppressContentEditableWarning data-placeholder="Quote"
        onInput={handleInput} onKeyDown={handleKeyDown} onFocus={handleFocus} />
    </div>
  );
});
