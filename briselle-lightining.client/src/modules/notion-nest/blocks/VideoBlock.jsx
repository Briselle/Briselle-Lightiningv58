/* ============================================================
   NotionNest — blocks/VideoBlock.jsx
   Created At: 2026-07-20 | Last Modified: 2026-07-20
   Previous Version Back URL: file:///c:/BriselleServer/Briselle-Lightiningv58/briselle-lightining.client/src/modules/notion-nest/blocks.jsx#L1990
   ============================================================ */
import { useState, memo } from 'react';
import { usePageContext } from '../core/PageContext';
import { MediaBlockPicker } from './shared/MediaBlockPicker';
import { Video } from 'lucide-react';

export const VideoBlock = memo(function VideoBlock({ block }) {
  const { updateBlockProperty } = usePageContext();
  const [hovered, setHovered] = useState(false);

  const getEmbedUrl = (url) => {
    if (!url) return url;
    const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
    if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
    const vim = url.match(/vimeo\.com\/(\d+)/);
    if (vim) return `https://player.vimeo.com/video/${vim[1]}`;
    return url;
  };

  const isEmbed = block.url && (block.url.includes('youtube.com') || block.url.includes('youtu.be') || block.url.includes('vimeo.com') || block.url.includes('embed'));

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
          {isEmbed ? (
            <iframe src={getEmbedUrl(block.url)} title="Video" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen style={{ width: '100%', height: '400px', borderRadius: '4px' }} />
          ) : (
            <video src={block.url} controls style={{ width: '100%', maxHeight: '400px', borderRadius: '4px', background: '#000' }} />
          )}
        </div>
      ) : (
        <MediaBlockPicker blockId={block.id} blockType="video" onSelect={(url) => updateBlockProperty(block.id, 'url', url)} />
      )}
    </div>
  );
});
