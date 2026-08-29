/* ============================================================
   NotionNest — blocks/shared/MediaBlockPicker.jsx
   Media placeholder card with upload/URL picker for image/video/audio/file blocks
   Created At: 2026-07-20 | Last Modified: 2026-07-20
   Previous Version Back URL: file:///c:/BriselleServer/Briselle-Lightiningv58/briselle-lightining.client/src/modules/notion-nest/blocks.jsx#L1042
   ============================================================ */
import { useState, useRef, useEffect } from 'react';
import { usePageContext } from '../../core/PageContext';
import { LucideIcon, NotionCoverPicker } from '../../menus/menus';

export function MediaBlockPicker({ blockId, blockType, onSelect }) {
  const { activeMediaPickerId, setActiveMediaPickerId } = usePageContext();
  const [coords, setCoords] = useState({ left: 0, top: 46 });
  const wrapperRef = useRef(null);

  const showPicker = activeMediaPickerId === blockId;
  const setShowPicker = (val) => {
    setActiveMediaPickerId(val ? blockId : null);
  };

  useEffect(() => {
    if (!showPicker) return;
    const updatePosition = () => {
      if (wrapperRef.current) {
        const rect = wrapperRef.current.getBoundingClientRect();
        const leftVal = Math.min(rect.left, window.innerWidth - 420);
        const finalLeft = Math.max(10, leftVal);
        const finalTop = rect.bottom + 6;
        setCoords({ left: finalLeft, top: finalTop });
      }
    };
    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [showPicker]);

  const getIcon = () => {
    switch (blockType) {
      case 'image': return <LucideIcon name="Image" className="w-5 h-5 text-gray-500" />;
      case 'video': return <LucideIcon name="Video" className="w-5 h-5 text-gray-500" />;
      case 'audio': return <LucideIcon name="Music" className="w-5 h-5 text-gray-500" />;
      default: return <LucideIcon name="Paperclip" className="w-5 h-5 text-gray-500" />;
    }
  };

  const getLabel = () => {
    switch (blockType) {
      case 'image': return 'Add an image';
      case 'video': return 'Add a video';
      case 'audio': return 'Add music / audio';
      default: return 'Add a file';
    }
  };

  return (
    <div className="media-block-placeholder-wrapper" ref={wrapperRef} style={{ position: 'relative', width: '100%' }} onMouseDown={e => e.stopPropagation()}>
      <div
        className="media-placeholder-card"
        onClick={() => setShowPicker(!showPicker)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 16px',
          background: '#f4f6f9',
          border: '1px dashed #dddbda',
          borderRadius: '6px',
          cursor: 'pointer',
          color: '#4f5052',
          transition: 'all 0.2s ease',
          fontSize: '14px',
          fontWeight: '500'
        }}
        onMouseOver={e => {
          e.currentTarget.style.background = '#eef1f6';
          e.currentTarget.style.borderColor = '#0176d3';
          e.currentTarget.style.color = '#0176d3';
        }}
        onMouseOut={e => {
          e.currentTarget.style.background = '#f4f6f9';
          e.currentTarget.style.borderColor = '#dddbda';
          e.currentTarget.style.color = '#4f5052';
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{getIcon()}</span>
        <span>{getLabel()}</span>
      </div>

      {showPicker && (
        <NotionCoverPicker
          position={{ x: coords.left, y: coords.top }}
          onSelect={(url, name) => {
            onSelect(url, name);
            setShowPicker(false);
          }}
          onClose={() => setShowPicker(false)}
          blockType={blockType}
        />
      )}
    </div>
  );
}
