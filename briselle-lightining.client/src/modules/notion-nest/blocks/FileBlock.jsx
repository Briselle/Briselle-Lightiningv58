/* ============================================================
   NotionNest — blocks/FileBlock.jsx
   Created At: 2026-07-20 | Last Modified: 2026-07-20
   Previous Version Back URL: file:///c:/BriselleServer/Briselle-Lightiningv58/briselle-lightining.client/src/modules/notion-nest/blocks.jsx#L2089
   ============================================================ */
import { useState, memo } from 'react';
import { usePageContext } from '../core/PageContext';
import { MediaBlockPicker } from './shared/MediaBlockPicker';
import { LucideIcon } from '../menus/menus';

export const FileBlock = memo(function FileBlock({ block }) {
  const { updateBlockProperty } = usePageContext();
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="block-content"
      style={{ position: 'relative' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {block.url ? (
        <div style={{ position: 'relative', width: '100%' }}>
          {hovered && (
            <div style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 10 }}>
              <button
                onClick={() => {
                  updateBlockProperty(block.id, 'url', '');
                  updateBlockProperty(block.id, 'fileName', '');
                }}
                style={{
                  background: 'rgba(255,255,255,0.95)',
                  border: '1px solid #d8dde6',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontSize: '12px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}
              >
                Change / Remove
              </button>
            </div>
          )}
          <div className="block-file">
            <a href={block.url} target="_blank" rel="noopener noreferrer" className="file-card">
              <LucideIcon name="Paperclip" className="w-4 h-4 text-gray-500 mr-2 flex-shrink-0" />
              <span className="file-name">{block.fileName || block.url.split('/').pop() || 'File'}</span>
            </a>
          </div>
        </div>
      ) : (
        <MediaBlockPicker
          blockId={block.id}
          blockType="file"
          onSelect={(url, fileName) => {
            updateBlockProperty(block.id, 'url', url);
            updateBlockProperty(block.id, 'fileName', fileName || url.split('/').pop());
          }}
        />
      )}
    </div>
  );
});
