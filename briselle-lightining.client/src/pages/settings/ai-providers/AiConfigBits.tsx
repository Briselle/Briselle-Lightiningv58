/* ============================================================
   Briselle Enterprise Platform — Settings / AI Providers Config
   AiConfigBits.tsx — small shared presentational pieces
   Created At: 2026-08-22 | Last Modified: 2026-08-22
   Previous Version Back URL: (new file — no previous version)

   Task: BRIS-AI-T194

   Declared at module scope, all of them. A component defined inside
   another component's render body gets a new type every render, which
   remounts its subtree and silently breaks click handling — the bug that
   cost four rounds on the meeting-notes instruction list.
   ============================================================ */
import { useState } from 'react';
import { BadgeCheck, Info, ShieldQuestion, Trash2 } from 'lucide-react';
import type { VerifyStamp } from '../../../services/platformAiConfigTypes';
import type { LastUsedEntry } from '../../../services/platformAiConfigService';

/* ════════════════════════════════════════════════════════════
   BRIS-AI-T205 — InfoHint + FieldLabel.

   Explanatory text moves from a permanent line under every field into
   an info icon on the label. Six always-visible paragraphs of guidance
   made a form twice as tall as the fields it described and pushed the
   Save button below the fold.

   Hover AND focus reveal it, and the icon is a real <button> with
   aria-describedby — a hover-only tooltip is invisible to keyboard and
   screen-reader users, which is how "clean" usually becomes
   "inaccessible".

   ERROR text is deliberately NOT moved here. A validation message the
   user must act on cannot live behind a hover.
   ════════════════════════════════════════════════════════════ */
export function InfoHint({ text, id }: { text: string; id?: string }) {
  const [open, setOpen] = useState(false);
  const tipId = id || `aipc-tip-${text.slice(0, 12).replace(/\W+/g, '')}`;

  return (
    <span className="aipc-info-wrap">
      <button
        type="button"
        className="aipc-info-btn"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        /* type=button and preventDefault: inside a <label>, a click would
           otherwise focus the field and dismiss the tip immediately. */
        onClick={(e) => { e.preventDefault(); setOpen((v) => !v); }}
        aria-label="More information"
        aria-describedby={open ? tipId : undefined}
      >
        <Info size={12} />
      </button>
      {open && <span className="aipc-info-tip" id={tipId} role="tooltip">{text}</span>}
    </span>
  );
}

export interface FieldLabelProps {
  text: string;
  /** Explanation, shown behind the info icon. */
  info?: string;
  /** An action pinned to the label's right edge, e.g. a refresh icon. */
  action?: React.ReactNode;
}

export function FieldLabel({ text, info, action }: FieldLabelProps) {
  return (
    <span className="aipc-label aipc-label-row">
      <span className="aipc-label-text">{text}</span>
      {info && <InfoHint text={info} />}
      {action && <span className="aipc-label-action">{action}</span>}
    </span>
  );
}

/* ════════════════════════════════════════════════════════════
   ToggleField — a switch, for edit forms.

   Forms used a checkbox while lists used a switch, so the same setting
   looked like two different controls depending on where you met it.
   ════════════════════════════════════════════════════════════ */
export interface ToggleFieldProps {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  hint?: string;
  disabled?: boolean;
}

export function ToggleField({ label, checked, onChange, hint, disabled }: ToggleFieldProps) {
  return (
    <div className="aipc-field aipc-toggle-field">
      {/* T205: the hint rides on the label, so a toggle costs one row
          rather than three. */}
      <FieldLabel text={label} info={hint} />
      <div className="aipc-toggle-row">
        <button
          type="button"
          className={`aipc-toggle${checked ? ' on' : ''}`}
          onClick={() => !disabled && onChange(!checked)}
          disabled={disabled}
          role="switch"
          aria-checked={checked}
          aria-label={label}
        >
          <span />
        </button>
        <span className="aipc-toggle-state">{checked ? 'Enabled' : 'Disabled'}</span>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   VerifyIcon — the certificate, green only on a real pass.

   Replaces the old "Verified" column: the icon alone carries the state,
   so the table gets a column back.
   ════════════════════════════════════════════════════════════ */
export interface VerifyIconProps {
  stamp?: VerifyStamp | null;
  /** For a model: whether its parent provider passed. */
  parentVerified?: boolean;
  size?: number;
}

export function verifyTone(stamp?: VerifyStamp | null, parentVerified = true): 'ok' | 'bad' | 'pending' | 'unknown' {
  if (!stamp) return 'unknown';
  if (!stamp.ok) return 'bad';
  /* Passed on its own, but its provider has not — deliberately NOT
     green, because a tick on an unverified endpoint claims more than
     was actually tested. */
  return parentVerified ? 'ok' : 'pending';
}

export function ago(iso?: string | null): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';
  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days < 30 ? `${days}d ago` : new Date(then).toLocaleDateString();
}

const TONE_TITLE: Record<string, string> = {
  ok: 'Verified',
  bad: 'Verification failed',
  pending: 'Verified, but its provider has not been verified',
  unknown: 'Not verified yet',
};

export function VerifyIcon({ stamp, parentVerified = true, size = 15 }: VerifyIconProps) {
  const tone = verifyTone(stamp, parentVerified);
  const when = stamp?.at ? ` (${ago(stamp.at)})` : '';
  return (
    <span
      className={`aipc-vicon is-${tone}`}
      title={`${TONE_TITLE[tone]}${when}. ${stamp?.message || ''}`.trim()}
      aria-label={TONE_TITLE[tone]}
    >
      {tone === 'unknown' ? <ShieldQuestion size={size} /> : <BadgeCheck size={size} />}
    </span>
  );
}

/* ════════════════════════════════════════════════════════════
   ModelCountBadge — "1/3 models" with a hover breakdown.
   ════════════════════════════════════════════════════════════ */
export interface ModelCountItem {
  name: string;
  displayName: string;
  ok: boolean;
  message?: string;
}

export interface ModelCountBadgeProps {
  verified: number;
  total: number;
  items: ModelCountItem[];
  onOpen?: () => void;
}

export function ModelCountBadge({ verified, total, items, onOpen }: ModelCountBadgeProps) {
  const [open, setOpen] = useState(false);

  return (
    <span
      className="aipc-modelcount-wrap"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className={`aipc-modelcount ${verified > 0 ? 'is-ok' : 'is-zero'}`}
        onClick={onOpen}
        /* Focus opens it too — a hover-only affordance is unreachable by
           keyboard. */
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        aria-describedby={open ? 'aipc-modellist' : undefined}
      >
        <BadgeCheck size={12} />
        <span>{verified}/{total} models</span>
      </button>

      {open && total > 0 && (
        <span className="aipc-modellist" id="aipc-modellist" role="tooltip">
          {items.map((m) => (
            <span key={m.name} className={`aipc-modellist-row is-${m.ok ? 'ok' : 'bad'}`}>
              <BadgeCheck size={11} />
              <span className="aipc-modellist-name">{m.displayName || m.name}</span>
              <span className="aipc-modellist-state">{m.ok ? 'Verified' : 'Not verified'}</span>
            </span>
          ))}
        </span>
      )}

      {open && total === 0 && (
        <span className="aipc-modellist" role="tooltip">
          <span className="aipc-modellist-empty">No models registered yet.</span>
        </span>
      )}
    </span>
  );
}

/* ════════════════════════════════════════════════════════════
   LastUsedCell — last successful AI call.
   ════════════════════════════════════════════════════════════ */
export function LastUsedCell({ entry }: { entry?: LastUsedEntry }) {
  if (!entry?.lastUsedAt) {
    return <span className="aipc-muted" title="No successful AI call recorded yet.">Never</span>;
  }
  const exact = new Date(entry.lastUsedAt).toLocaleString();
  return (
    <span className="aipc-lastused" title={`${exact} · ${entry.callCount} successful call(s)`}>
      <span className="aipc-lastused-rel">{ago(entry.lastUsedAt)}</span>
      <span className="aipc-lastused-abs">{exact}</span>
    </span>
  );
}

/* ════════════════════════════════════════════════════════════
   TagList — non-editable linked tags.
   ════════════════════════════════════════════════════════════ */
export function TagList({ labels }: { labels: string[] }) {
  if (!labels.length) return <span className="aipc-muted">Not linked</span>;
  return (
    <span className="aipc-chips small">
      {labels.map((l) => <span key={l} className="aipc-chip static">{l}</span>)}
    </span>
  );
}

/** A delete button with a consistent look across the three screens. */
export function DeleteButton({ title, onClick, disabled }: { title: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" className="aipc-icon-btn danger" title={title} onClick={onClick} disabled={disabled}>
      <Trash2 size={15} />
    </button>
  );
}
