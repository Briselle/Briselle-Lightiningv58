/* ============================================================
   NotionNest — BlockRenderer.jsx
   Routes block type → component, wraps with drag handle
   ============================================================ */
import { useCallback, useRef, memo } from 'react';
import { usePageContext } from './PageContext';
import { TextBlock, ListBlock, TodoBlock, ToggleBlock, QuoteBlock, CalloutBlock, DividerBlock, CodeBlock, ImageBlock, BookmarkBlock, TableBlock, ColumnsBlock, TocBlock, VideoBlock, AudioBlock, FileBlock, EquationBlock, ToggleHeadingBlock, SubPageBlock } from './blocks';
import TabBlock from './TabBlock';
import { slashMenuSections } from './utils';
import { POPULAR_FONTS } from './pages/NotionNestPage';

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
  const { addBlock, deleteBlock, duplicateBlock, changeBlockType, moveBlock, showContextMenu, updateBlockProperty } = usePageContext();
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
    const rect = e.currentTarget.getBoundingClientRect();
    showContextMenu(rect.left - 240, rect.top, [], rect, 'block', block.id);
  }, [block.id, showContextMenu]);

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

  const blockStyle = {};
  if (block.fontFamily) {
    const cssFont = POPULAR_FONTS.find(f => f.id === block.fontFamily)?.css || block.fontFamily;
    blockStyle['--nn-font-family-local'] = cssFont;
    blockStyle['fontFamily'] = cssFont;
  }
  if (block.fontSize !== undefined && block.fontSize !== null) {
    const sizeMap = {
      '-2': { title: '24px', h1: '20px', h2: '16px', h3: '14px', body: '12px' },
      '-1': { title: '30px', h1: '24px', h2: '20px', h3: '16px', body: '14px' },
      '0': { title: '40px', h1: '30px', h2: '24px', h3: '20px', body: '16px' },
      '1': { title: '40px', h1: '30px', h2: '30px', h3: '24px', body: '18px' },
      '2': { title: '40px', h1: '30px', h2: '30px', h3: '30px', body: '20px' },
    };
    const sizes = sizeMap[String(block.fontSize)] || sizeMap['0'];
    blockStyle['--nn-title-size-local'] = sizes.title;
    blockStyle['--nn-h1-size-local'] = sizes.h1;
    blockStyle['--nn-h2-size-local'] = sizes.h2;
    blockStyle['--nn-h3-size-local'] = sizes.h3;
    blockStyle['--nn-body-size-local'] = sizes.body;
  }
  if (block.textColor) {
    blockStyle['--nn-text-color-local'] = block.textColor;
  }
  if (block.backgroundColor) {
    blockStyle['--nn-bg-color-local'] = block.backgroundColor;
  }

  return (
    <div
      ref={blockRef}
      className={`block ${typeClass} ${extraClasses.join(' ')}`}
      data-block-id={block.id}
      style={blockStyle}
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
