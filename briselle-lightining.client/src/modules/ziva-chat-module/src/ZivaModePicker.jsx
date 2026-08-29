/**
 * Cursor-style assistant mode picker (Control / Plan / Learn / Explore).
 */

import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ZIVA_ASSISTANT_MODES, getAssistantMode } from './zivaAssistantModes.js';

const POPOVER_W = 268;
const GAP_PX = 8;

function computePopoverStyle(pillEl) {
  if (!pillEl) return null;
  const r = pillEl.getBoundingClientRect();
  let left = r.left;
  if (left + POPOVER_W > window.innerWidth - 8) left = window.innerWidth - POPOVER_W - 8;
  if (left < 8) left = 8;
  const bottom = window.innerHeight - r.top + GAP_PX;
  return { left, bottom, width: POPOVER_W };
}

function ModePopover({ popoverRef, fixedStyle, selectedMode, onSelect }) {
  return (
    <div
      ref={popoverRef}
      className="zmp-popover zmp-popover--portal zmode-popover"
      role="listbox"
      aria-label="Assistant mode"
      style={fixedStyle}
    >
      <div className="zmode-popover-header">Mode</div>
      <ul className="zmode-list">
        {ZIVA_ASSISTANT_MODES.map((m) => {
          const active = m.id === selectedMode;
          return (
            <li key={m.id}>
              <button
                type="button"
                role="option"
                aria-selected={active}
                className={`zmode-item${active ? ' zmode-item--active' : ''}`}
                onClick={() => onSelect(m.id)}
              >
                <span className="zmode-item-icon" aria-hidden="true">
                  <i className={`fas ${m.icon}`} />
                </span>
                <span className="zmode-item-body">
                  <span className="zmode-item-label">{m.label}</span>
                  <span className="zmode-item-desc">{m.description}</span>
                </span>
                {active ? <i className="fas fa-check zmode-item-check" aria-hidden="true" /> : null}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function ZivaModePicker({ selectedMode, onChange }) {
  const mode = getAssistantMode(selectedMode);
  const [open, setOpen] = useState(false);
  const [popoverStyle, setPopoverStyle] = useState(null);
  const pillRef = useRef(null);
  const popoverRef = useRef(null);

  const updatePosition = useCallback(() => {
    setPopoverStyle(computePopoverStyle(pillRef.current));
  }, []);

  useLayoutEffect(() => {
    if (!open) return undefined;
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onPointer = (e) => {
      const t = e.target;
      if (pillRef.current?.contains(t) || popoverRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer, true);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer, true);
    };
  }, [open]);

  const handleToggle = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setOpen((v) => {
      const next = !v;
      if (next) setPopoverStyle(computePopoverStyle(pillRef.current));
      else setPopoverStyle(null);
      return next;
    });
  };

  const handleSelect = (id) => {
    onChange(id);
    setOpen(false);
    setPopoverStyle(null);
  };

  const fixedStyle = popoverStyle
    ? {
        position: 'fixed',
        left: popoverStyle.left,
        bottom: popoverStyle.bottom,
        width: popoverStyle.width,
        zIndex: 100000,
      }
    : null;

  const portal =
    open && fixedStyle
      ? createPortal(
          <ModePopover
            popoverRef={popoverRef}
            fixedStyle={fixedStyle}
            selectedMode={selectedMode}
            onSelect={handleSelect}
          />,
          document.body,
        )
      : null;

  return (
    <div className="zmode-root">
      <button
        ref={pillRef}
        type="button"
        className={`ziva-composer-pill zmp-pill zmode-pill${open ? ' zmp-pill--open' : ''}`}
        onClick={handleToggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${mode.label} mode`}
        title={`${mode.label} — ${mode.description}`}
      >
        <i className={`fas ${mode.icon} zmode-pill-icon`} aria-hidden="true" />
        <span className="zmode-pill-label">{mode.label}</span>
        <i className={`fas fa-chevron-down ziva-composer-chevron zmp-chevron${open ? ' zmp-chevron--up' : ''}`} aria-hidden="true" />
      </button>
      {portal}
    </div>
  );
}
