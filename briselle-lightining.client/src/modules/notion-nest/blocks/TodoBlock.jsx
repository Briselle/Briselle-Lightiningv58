/* ============================================================
   NotionNest — blocks/TodoBlock.jsx
   Checkbox to-do block
   Created At: 2026-07-20 | Last Modified: 2026-07-20
   Previous Version Back URL: file:///c:/BriselleServer/Briselle-Lightiningv58/briselle-lightining.client/src/modules/notion-nest/blocks.jsx#L547
   ============================================================ */
import { memo } from 'react';
import { usePageContext } from '../core/PageContext';
import { useEditable } from './shared/useEditable';

export const TodoBlock = memo(function TodoBlock({ block }) {
  const { ref, handleInput, handleKeyDown, handleFocus } = useEditable(block, { placeholder: 'To-do' });
  const { updateBlockProperty } = usePageContext();
  return (
    <div className="block-content">
      <div className={`todo-checkbox${block.checked ? ' checked' : ''}`} onClick={() => updateBlockProperty(block.id, 'checked', !block.checked)}>
        {block.checked ? '✓' : ''}
      </div>
      <div ref={ref} contentEditable suppressContentEditableWarning data-placeholder="To-do"
        onInput={handleInput} onKeyDown={handleKeyDown} onFocus={handleFocus} style={{ flex: 1 }} />
    </div>
  );
});
