/* ============================================================
   NotionNest — blocks/CalloutBlock.jsx
   Callout block with customizable icon
   Created At: 2026-07-20 | Last Modified: 2026-07-20
   Previous Version Back URL: file:///c:/BriselleServer/Briselle-Lightiningv58/briselle-lightining.client/src/modules/notion-nest/blocks.jsx#L634
   ============================================================ */
import { memo, useState, useRef, useEffect } from 'react';
import { usePageContext } from '../core/PageContext';
import { useEditable } from './shared/useEditable';
import { NotionIconPicker, renderPageIcon } from '../menus/menus';

export const CalloutBlock = memo(function CalloutBlock({ block }) {
  const { ref, handleInput, handleKeyDown, handleFocus } = useEditable(block, { placeholder: 'Callout' });
  const { updateBlockProperty, activeMediaPickerId, setActiveMediaPickerId } = usePageContext();
  const [pickerPos, setPickerPos] = useState({ x: 0, y: 30 });
  const iconSpanRef = useRef(null);

  const icon = block.calloutIcon || '💡';
  const showPicker = activeMediaPickerId === `callout-${block.id}`;
  const setShowPicker = (val) => {
    setActiveMediaPickerId(val ? `callout-${block.id}` : null);
  };

  const handleIconClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowPicker(!showPicker);
  };

  useEffect(() => {
    if (!showPicker) return;
    const updatePosition = () => {
      if (iconSpanRef.current) {
        const rect = iconSpanRef.current.getBoundingClientRect();
        const leftVal = Math.min(rect.left, window.innerWidth - 360);
        const finalLeft = Math.max(10, leftVal);
        const finalTop = rect.bottom + 6;
        setPickerPos({ x: finalLeft, y: finalTop });
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

  return (
    <div className="block-content" style={{ position: 'relative' }}>
      <span className="block-callout-icon" ref={iconSpanRef} onMouseDown={handleIconClick} style={{ cursor: 'pointer' }}>
        {renderPageIcon(icon, '20px') || '💡'}
      </span>
      <div ref={ref} contentEditable suppressContentEditableWarning data-placeholder="Callout"
        onInput={handleInput} onKeyDown={handleKeyDown} onFocus={handleFocus} style={{ flex: 1 }} />
      {showPicker && (
        <NotionIconPicker
          position={pickerPos}
          currentIcon={icon}
          onSelect={(icon) => { updateBlockProperty(block.id, 'calloutIcon', icon); }}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
});
