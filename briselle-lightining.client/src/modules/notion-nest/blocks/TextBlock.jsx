/* ============================================================
   NotionNest — blocks/TextBlock.jsx
   Simple paragraph / heading block with contenteditable
   Created At: 2026-07-20 | Last Modified: 2026-07-20
   Previous Version Back URL: file:///c:/BriselleServer/Briselle-Lightiningv58/briselle-lightining.client/src/modules/notion-nest/blocks.jsx#L518
   ============================================================ */
import { memo } from 'react';
import { useEditable } from './shared/useEditable';

export const TextBlock = memo(function TextBlock({ block }) {
  const { ref, handleInput, handleKeyDown, handleFocus, placeholder } = useEditable(block);
  return (
    <div className="block-content">
      <div ref={ref} contentEditable suppressContentEditableWarning data-placeholder={placeholder}
        onInput={handleInput} onKeyDown={handleKeyDown} onFocus={handleFocus} />
    </div>
  );
});
