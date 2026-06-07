/* ============================================================
   NotionNest — NotionPage.jsx
   Main exported component — wraps everything
   ============================================================ */
import { useState, useCallback, useEffect } from 'react';
import { PageProvider, usePageContext } from './PageContext';
import { Sidebar, Topbar, PageHeader } from './layout';
import BlockRenderer from './BlockRenderer';
import { SlashMenu, ContextMenu, InlineToolbar } from './menus';
import './NotionPage.css';

export default function NotionPage({ initialBlocks, showSidebar: showSidebarProp = true }) {
  return (
    <PageProvider initialBlocks={initialBlocks}>
      <NotionPageInner showSidebarProp={showSidebarProp} />
    </PageProvider>
  );
}

function NotionPageInner({ showSidebarProp }) {
  const { pageState, addBlock, hideSlashMenu, hideContextMenu } = usePageContext();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleSidebar = useCallback(() => setSidebarCollapsed(v => !v), []);

  /* ---- Global Escape handler ---- */
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        hideSlashMenu();
        hideContextMenu();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [hideSlashMenu, hideContextMenu]);

  /* ---- Click bottom space to add block ---- */
  const handleBottomClick = useCallback(() => {
    const last = pageState.blocks[pageState.blocks.length - 1];
    const nb = addBlock('paragraph', last?.id);
    if (nb) {
      requestAnimationFrame(() => {
        const el = document.querySelector(`[data-block-id="${nb.id}"] [contenteditable]`);
        if (el) el.focus();
      });
    }
  }, [pageState.blocks, addBlock]);

  return (
    <div className="notion-app">
      {showSidebarProp && <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />}
      <div className="main-content">
        <Topbar onToggleSidebar={toggleSidebar} />
        <div className="page-scroll">
          <div className="page-content">
            <PageHeader />
            <div className="blocks-container">
              {pageState.blocks.map((block, i) => (
                <BlockRenderer key={block.id} block={block} blocksArray={pageState.blocks} blockIndex={i} />
              ))}
            </div>
            <div className="page-bottom-space" onClick={handleBottomClick} />
          </div>
        </div>
      </div>
      <SlashMenu />
      <ContextMenu />
      <InlineToolbar />
    </div>
  );
}
