/* ============================================================
   NotionNest — blocks/AudioBlock.jsx
   Created At: 2026-07-20 | Last Modified: 2026-07-20
   Previous Version Back URL: file:///c:/BriselleServer/Briselle-Lightiningv58/briselle-lightining.client/src/modules/notion-nest/blocks.jsx#L2046
   ============================================================ */
import { useState, memo } from 'react';
import { usePageContext } from '../core/PageContext';
import { MediaBlockPicker } from './shared/MediaBlockPicker';
import { LucideIcon } from '../menus/menus';

export const AudioBlock = memo(function AudioBlock({ block }) {
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
                onClick={() => updateBlockProperty(block.id, 'url', '')}
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
          <div style={{ background: '#f3f4f6', padding: '24px 16px', borderRadius: '4px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <LucideIcon name="Music" className="w-8 h-8 text-gray-400" />
            <audio controls src={block.url} style={{ width: '100%' }}>Your browser does not support audio.</audio>
          </div>
        </div>
      ) : (
        <MediaBlockPicker blockId={block.id} blockType="audio" onSelect={(url) => updateBlockProperty(block.id, 'url', url)} />
      )}
    </div>
  );
});
