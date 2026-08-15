/**
 * Cursor-style model picker for the Ziva composer toolbar.
 * Popover is portaled to document.body so it is not clipped by composer overflow.
 */

import { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { ZIVA_CHAT_MODELS } from './zivaModels.js';
import { ZivaApiRouterService } from './zivaApiRouterService.js';

const DEFAULT_MODELS = ZIVA_CHAT_MODELS;
const POPOVER_MIN_W = 232;
const POPOVER_MAX_W = 280;
const GAP_PX = 8;

function getGroups(list) {
  const map = new Map();
  for (const m of list) {
    const g = m.group || m.providerName || 'Models';
    if (!map.has(g)) map.set(g, []);
    map.get(g).push(m);
  }
  return [...map.entries()].map(([label, items]) => ({ label, items }));
}

function filterModels(list, query) {
  if (!query.trim()) return list;
  const q = query.toLowerCase();
  return list.filter((m) => (m.label || m.name || '').toLowerCase().includes(q) || (m.id || '').toLowerCase().includes(q));
}

function computePopoverStyle(pillEl) {
  if (!pillEl) return null;
  const r = pillEl.getBoundingClientRect();
  const width = Math.min(POPOVER_MAX_W, Math.max(POPOVER_MIN_W, r.width));
  let left = r.left;
  if (left + width > window.innerWidth - 8) left = window.innerWidth - width - 8;
  if (left < 8) left = 8;
  const bottom = window.innerHeight - r.top + GAP_PX;
  return { left, bottom, width };
}

function PopoverContent({
  popoverRef,
  fixedStyle,
  isAuto,
  query,
  setQuery,
  searchRef,
  onAutoToggle,
  onSelect,
  groups,
  selectedModel,
}) {
  return (
    <div
      ref={popoverRef}
      className="zmp-popover zmp-popover--portal"
      role="dialog"
      aria-label="Model selector"
      style={fixedStyle}
    >
      <div className="zmp-auto-row">
        <div className="zmp-auto-info">
          <span className="zmp-auto-label">Auto</span>
          <span className="zmp-auto-hint">Let Ziva pick the best model</span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={isAuto}
          className={`zmp-toggle${isAuto ? ' zmp-toggle--on' : ''}`}
          onClick={onAutoToggle}
          title={isAuto ? 'Disable auto-select' : 'Enable auto-select'}
        >
          <span className="zmp-toggle-knob" />
        </button>
      </div>

      {!isAuto && (
        <>
          <div className="zmp-divider" />
          <div className="zmp-search-wrap">
            <i className="fas fa-magnifying-glass zmp-search-icon" aria-hidden="true" />
            <input
              ref={searchRef}
              className="zmp-search"
              type="text"
              placeholder="Search models…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search models"
              autoComplete="off"
              spellCheck={false}
            />
            {query ? (
              <button type="button" className="zmp-search-clear" onClick={() => setQuery('')} aria-label="Clear search">
                <i className="fas fa-xmark" aria-hidden="true" />
              </button>
            ) : null}
          </div>
          <ul className="zmp-list" role="listbox" aria-label="Available models">
            {groups.map(({ label: groupLabel, items }) => (
              <li key={groupLabel} className="zmp-group">
                <span className="zmp-group-label">{groupLabel}</span>
                <ul role="group">
                  {items.map((m) => {
                    const active = m.id === selectedModel;
                    return (
                      <li
                        key={m.id}
                        role="option"
                        aria-selected={active}
                        aria-disabled={!!m.disabled}
                        className={[
                          'zmp-item',
                          active ? 'zmp-item--selected' : '',
                          m.disabled ? 'zmp-item--disabled' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        onClick={() => onSelect(m)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') onSelect(m);
                        }}
                        tabIndex={m.disabled ? -1 : 0}
                      >
                        <span className="zmp-item-label">{m.label}</span>
                        {active && !m.disabled ? (
                          <i className="fas fa-check zmp-item-check" aria-hidden="true" />
                        ) : null}
                        {m.disabled ? <span className="zmp-item-badge">soon</span> : null}
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
            {groups.length === 0 ? <li className="zmp-empty">No models match &quot;{query}&quot;</li> : null}
          </ul>
        </>
      )}
    </div>
  );
}

export default function ZivaModelPicker({ selectedModel, onChange }) {
  const dynamicApiModels = ZivaApiRouterService.getAllAvailableModels().map(m => ({
    id: m.id,
    label: m.name,
    group: m.providerName || 'Configured APIs',
    type: m.type
  }));

  const allAvailableModels = [
    ...DEFAULT_MODELS.map(m => ({ ...m, group: m.group || 'Standard Models' })),
    ...dynamicApiModels
  ];

  const isAuto = selectedModel === 'auto';
  const currentModel = allAvailableModels.find((m) => m.id === selectedModel) || null;
  const pillLabel = isAuto ? 'Auto' : (currentModel?.label ?? selectedModel);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [popoverStyle, setPopoverStyle] = useState(null);

  const pillRef = useRef(null);
  const popoverRef = useRef(null);
  const searchRef = useRef(null);

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
  }, [open, updatePosition, isAuto, query]);

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

  useEffect(() => {
    if (open && !isAuto) {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [open, isAuto]);

  const handleToggleOpen = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setOpen((v) => {
      const next = !v;
      if (next) setPopoverStyle(computePopoverStyle(pillRef.current));
      else setPopoverStyle(null);
      return next;
    });
    setQuery('');
  };

  const handleAutoToggle = useCallback(() => {
    if (isAuto) {
      onChange(ACTIVE_MODELS[0]?.id ?? 'llama-3.3-70b-versatile');
    } else {
      onChange('auto');
      setQuery('');
    }
  }, [isAuto, onChange]);

  const handleSelect = useCallback(
    (model) => {
      if (model.disabled) return;
      onChange(model.id);
      setOpen(false);
      setQuery('');
    },
    [onChange],
  );

  const displayedModels = filterModels(allAvailableModels, query);
  const groups = getGroups(displayedModels);

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
          <PopoverContent
            popoverRef={popoverRef}
            fixedStyle={fixedStyle}
            isAuto={isAuto}
            query={query}
            setQuery={setQuery}
            searchRef={searchRef}
            onAutoToggle={handleAutoToggle}
            onSelect={handleSelect}
            groups={groups}
            selectedModel={selectedModel}
          />,
          document.body,
        )
      : null;

  return (
    <div className="zmp-root">
      <button
        ref={pillRef}
        type="button"
        className={`ziva-composer-pill zmp-pill${open ? ' zmp-pill--open' : ''}`}
        onClick={handleToggleOpen}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={isAuto ? 'Auto (picks best available model)' : (currentModel?.label ?? selectedModel)}
      >
        <span className="zmp-pill-label">{pillLabel}</span>
        <i
          className={`fas fa-chevron-down ziva-composer-chevron zmp-chevron${open ? ' zmp-chevron--up' : ''}`}
          aria-hidden="true"
        />
      </button>
      {portal}
    </div>
  );
}
