/* ============================================================
   NotionNest — BlockRenderer.jsx
   Routes block type → component, wraps with drag handle
   ============================================================ */
import { useCallback, useRef, memo } from 'react';
import { usePageContext } from './PageContext';
import { TextBlock, ListBlock, TodoBlock, ToggleBlock, QuoteBlock, CalloutBlock, DividerBlock, CodeBlock, ImageBlock, BookmarkBlock, TableBlock, ColumnsBlock, TocBlock, VideoBlock, AudioBlock, FileBlock, EquationBlock, ToggleHeadingBlock, SubPageBlock } from './blocks';
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
  video: VideoBlock,
  audio: AudioBlock,
  file: FileBlock,
  bookmark: BookmarkBlock,
  table: TableBlock,
  columns: ColumnsBlock,
  toc: TocBlock,
  tabs: TabBlock,
  equation: EquationBlock,
  toggle_heading1: ToggleHeadingBlock,
  toggle_heading2: ToggleHeadingBlock,
  toggle_heading3: ToggleHeadingBlock,
  sub_page: SubPageBlock,
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
      { label: '🎨 Color', submenu: true, action: () => {
        // Show a color sub-menu
        showContextMenu(e.clientX + 200, e.clientY, [
          { label: 'Text Color', header: true },
          ...[
            { name: 'Default', color: '#e3e3e3' },
            { name: 'Gray', color: '#9b9b9b' },
            { name: 'Brown', color: '#a47d5e' },
            { name: 'Orange', color: '#d9730d' },
            { name: 'Yellow', color: '#dfab01' },
            { name: 'Green', color: '#0f7b6c' },
            { name: 'Blue', color: '#2383e2' },
            { name: 'Purple', color: '#9065b0' },
            { name: 'Pink', color: '#c14c8a' },
            { name: 'Red', color: '#eb5757' },
          ].map(c => ({
            label: c.name,
            swatch: c.color,
            action: () => {
              const el = document.querySelector(`[data-block-id="${block.id}"] [contenteditable]`);
              if (el) el.style.color = c.color;
            }
          })),
          { divider: true },
          { label: 'Background', header: true },
          ...[
            { name: 'Default', color: 'transparent' },
            { name: 'Gray', color: '#2c2c2c' },
            { name: 'Brown', color: '#3b2d20' },
            { name: 'Orange', color: '#3e2b15' },
            { name: 'Yellow', color: '#3d3415' },
            { name: 'Green', color: '#1a3229' },
            { name: 'Blue', color: '#192f45' },
            { name: 'Purple', color: '#2c233a' },
            { name: 'Pink', color: '#351a2c' },
            { name: 'Red', color: '#3e2024' },
          ].map(c => ({
            label: c.name,
            swatch: c.color,
            swatchBorder: true,
            action: () => {
              const blockEl = document.querySelector(`[data-block-id="${block.id}"]`);
              if (blockEl) blockEl.style.background = c.color;
            }
          })),
        ]);
      }},
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

  const typeClass = `block-${block.type.replace(/_/g, '-')}`;
  const extraClasses = [];
  if ((block.type === 'toggle' || block.type.startsWith('toggle_heading')) && block.open) extraClasses.push('open');
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
