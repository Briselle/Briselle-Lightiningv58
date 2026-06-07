/* ============================================================
   NotionNest — BlockRenderer.jsx
   Routes block type → component, wraps with drag handle
   ============================================================ */
import { useCallback, useRef, memo } from 'react';
import { usePageContext } from './PageContext';
import { TextBlock, ListBlock, TodoBlock, ToggleBlock, QuoteBlock, CalloutBlock, DividerBlock, CodeBlock, ImageBlock, BookmarkBlock, TableBlock, ColumnsBlock, TocBlock } from './blocks';
import TabBlock from './TabBlock';
import { slashMenuSections } from './utils';

const BLOCK_MAP = {
  paragraph: TextBlock,
  heading1: TextBlock,
  heading2: TextBlock,
  heading3: TextBlock,
  bulleted_list: ListBlock,
  numbered_list: ListBlock,
  todo: TodoBlock,
  toggle: ToggleBlock,
  quote: QuoteBlock,
  callout: CalloutBlock,
  divider: DividerBlock,
  code: CodeBlock,
  image: ImageBlock,
  bookmark: BookmarkBlock,
  table: TableBlock,
  columns: ColumnsBlock,
  toc: TocBlock,
  tabs: TabBlock,
};

const BlockRenderer = memo(function BlockRenderer({ block, blocksArray, blockIndex }) {
  const { addBlock, deleteBlock, duplicateBlock, changeBlockType, moveBlock, showContextMenu } = usePageContext();
  const blockRef = useRef(null);
  const Component = BLOCK_MAP[block.type] || TextBlock;

  /* ---- Plus button ---- */
  const handlePlusClick = useCallback(() => {
    const nb = addBlock('paragraph', block.id);
    if (nb) {
      requestAnimationFrame(() => {
        const el = document.querySelector(`[data-block-id="${nb.id}"] [contenteditable]`);
        if (el) el.focus();
      });
    }
  }, [block.id, addBlock]);

  /* ---- Handle click → block menu ---- */
  const handleHandleClick = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();

    const turnIntoTypes = slashMenuSections.flatMap(s => s.items).filter(i => i.type !== block.type);
    
    showContextMenu(e.clientX, e.clientY, [
      { label: 'Delete', danger: true, action: () => deleteBlock(block.id), shortcut: 'Del' },
      { label: 'Duplicate', action: () => duplicateBlock(block.id), shortcut: 'Ctrl+D' },
      { divider: true },
      { label: 'Move up', action: () => moveBlock(block.id, 'up'), disabled: blockIndex === 0 },
      { label: 'Move down', action: () => moveBlock(block.id, 'down'), disabled: blockIndex === blocksArray.length - 1 },
      { divider: true },
      ...turnIntoTypes.slice(0, 8).map(item => ({
        label: `Turn into ${item.name}`,
        action: () => changeBlockType(block.id, item.type),
      })),
    ]);
  }, [block.id, block.type, blockIndex, blocksArray, deleteBlock, duplicateBlock, moveBlock, changeBlockType, showContextMenu]);

  /* ---- Drag & Drop ---- */
  const handleDragStart = useCallback((e) => {
    e.dataTransfer.setData('text/block-id', block.id);
    e.dataTransfer.effectAllowed = 'move';
    if (blockRef.current) blockRef.current.classList.add('dragging');
  }, [block.id]);

  const handleDragEnd = useCallback(() => {
    if (blockRef.current) blockRef.current.classList.remove('dragging');
    document.querySelectorAll('.drag-over-top,.drag-over-bottom').forEach(el => {
      el.classList.remove('drag-over-top', 'drag-over-bottom');
    });
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    if (!blockRef.current) return;
    const rect = blockRef.current.getBoundingClientRect();
    const mid = rect.top + rect.height / 2;
    blockRef.current.classList.toggle('drag-over-top', e.clientY < mid);
    blockRef.current.classList.toggle('drag-over-bottom', e.clientY >= mid);
  }, []);

  const handleDragLeave = useCallback(() => {
    if (blockRef.current) {
      blockRef.current.classList.remove('drag-over-top', 'drag-over-bottom');
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/block-id');
    if (sourceId && sourceId !== block.id) {
      const rect = blockRef.current?.getBoundingClientRect();
      const above = rect && e.clientY < rect.top + rect.height / 2;
      moveBlock(sourceId, above ? 'up' : 'down');
    }
    if (blockRef.current) blockRef.current.classList.remove('drag-over-top', 'drag-over-bottom');
  }, [block.id, moveBlock]);

  const typeClass = `block-${block.type.replace('_', '-')}`;
  const extraClasses = [];
  if (block.type === 'toggle' && block.open) extraClasses.push('open');
  if (block.type === 'todo' && block.checked) extraClasses.push('checked');

  return (
    <div
      ref={blockRef}
      className={`block ${typeClass} ${extraClasses.join(' ')}`}
      data-block-id={block.id}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="block-controls">
        <div className="block-plus" onClick={handlePlusClick} title="Add block">+</div>
        <div
          className="block-handle"
          draggable
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onClick={handleHandleClick}
          title="Drag or click for options"
        >⠿</div>
      </div>
      <Component block={block} />
    </div>
  );
});

export default BlockRenderer;
