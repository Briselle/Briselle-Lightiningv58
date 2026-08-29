/* ============================================================
   Briselle Enterprise Platform — Shared UI
   TagMultiSelect.tsx — searchable multi-select popover
   Created At: 2026-08-22 | Last Modified: 2026-08-22
   Previous Version Back URL: (new file — no previous version)

   Task: BRIS-AI-T165

   A popover multi-select with a search field, built because nothing
   equivalent exists in components/ (checked: no MultiSelect, Combobox
   or token picker anywhere in the client).

   Selected values render as removable chips on the trigger, so the
   current state is readable without opening the popover.

   ── Declared at module scope, deliberately ────────────────────
   Every part of this lives at the top level of the module. A component
   declared inside another component's render body gets a new type on
   every render, which remounts its subtree and silently breaks click
   handling — that exact bug cost four debugging rounds on the meeting
   notes instruction list.
   ============================================================ */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import './BriselleControls.css';

export interface TagOption {
  id: string;
  label: string;
  description?: string;
}

export interface TagMultiSelectProps {
  options: TagOption[];
  /** Selected option ids. */
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  /** Show the search box. Auto-hidden below this many options. */
  searchThreshold?: number;
  disabled?: boolean;
  /** Accessible name, since the trigger is a chip row rather than a label. */
  ariaLabel?: string;
}

export function TagMultiSelect({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  searchThreshold = 6,
  disabled = false,
  ariaLabel = 'Multi-select',
}: TagMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

  /* Close on outside click or Escape. Registered only while open, so a
     page with many of these does not carry a listener per instance. */
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); setQuery(''); }
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    if (open && searchRef.current) searchRef.current.focus();
  }, [open]);

  const selected = useMemo(
    () => options.filter((o) => value.includes(o.id)),
    [options, value]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) => o.label.toLowerCase().includes(q)
        || o.id.toLowerCase().includes(q)
        || (o.description || '').toLowerCase().includes(q)
    );
  }, [options, query]);

  const toggle = (id: string) => {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  };

  const showSearch = options.length >= searchThreshold;

  return (
    <div className="bui-tms" ref={wrapRef}>
      <button
        type="button"
        className="bui-tms-trigger"
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
      >
        <span className="bui-tms-chips">
          {selected.length === 0 ? (
            <span className="bui-tms-placeholder">{placeholder}</span>
          ) : (
            selected.map((o) => (
              <span key={o.id} className="bui-tms-chip">
                {o.label}
                {/* A span, not a nested <button> — a button inside a button
                    is invalid markup and Firefox drops the inner click. */}
                <span
                  className="bui-tms-chip-x"
                  role="button"
                  tabIndex={-1}
                  aria-label={`Remove ${o.label}`}
                  onClick={(e) => { e.stopPropagation(); toggle(o.id); }}
                >
                  <X size={11} />
                </span>
              </span>
            ))
          )}
        </span>
        <ChevronDown size={15} className="bui-tms-caret" />
      </button>

      {open && (
        <div className="bui-tms-pop" role="listbox" aria-multiselectable="true">
          {showSearch && (
            <div className="bui-tms-search">
              <Search size={13} />
              <input
                ref={searchRef}
                type="text"
                value={query}
                placeholder="Search…"
                onChange={(e) => setQuery(e.target.value)}
                /* Enter picks the only remaining match — the fast path
                   when someone has typed enough to disambiguate. */
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && filtered.length === 1) {
                    e.preventDefault();
                    toggle(filtered[0].id);
                  }
                }}
              />
              {query && (
                <button type="button" className="bui-tms-search-clear" onClick={() => setQuery('')} aria-label="Clear search">
                  <X size={12} />
                </button>
              )}
            </div>
          )}

          <div className="bui-tms-list">
            {filtered.length === 0 ? (
              <div className="bui-tms-empty">No match for “{query}”.</div>
            ) : (
              filtered.map((o) => {
                const on = value.includes(o.id);
                return (
                  <button
                    key={o.id}
                    type="button"
                    role="option"
                    aria-selected={on}
                    className={`bui-tms-option${on ? ' is-on' : ''}`}
                    onClick={() => toggle(o.id)}
                  >
                    <span className="bui-tms-tick">{on && <Check size={13} />}</span>
                    <span className="bui-tms-option-text">
                      <span className="bui-tms-option-label">{o.label}</span>
                      {o.description && <span className="bui-tms-option-desc">{o.description}</span>}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {selected.length > 0 && (
            <div className="bui-tms-foot">
              <span>{selected.length} selected</span>
              <button type="button" className="bui-tms-clear" onClick={() => onChange([])}>
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default TagMultiSelect;
