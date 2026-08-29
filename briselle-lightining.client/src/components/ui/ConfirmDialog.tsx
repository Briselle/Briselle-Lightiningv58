/* ============================================================
   Briselle Enterprise Platform — Shared UI
   ConfirmDialog.tsx — platform-standard confirmation modal
   Created At: 2026-08-22 | Last Modified: 2026-08-22
   Previous Version Back URL: (new file — no previous version)

   Task: BRIS-AI-T200

   Replaces window.confirm() for destructive actions.

   ── Why the native dialog had to go ───────────────────────────
   window.confirm is unstyled, cannot be themed or translated, blocks the
   whole tab, truncates long text on some browsers, and can be suppressed
   entirely by the "prevent additional dialogs" checkbox — after which a
   delete button silently does nothing. It is also unusable for the one
   thing a destructive confirmation most needs: showing WHAT will break.

   ── Usage ─────────────────────────────────────────────────────
   Driven by a `useConfirm()` hook so a caller never manages open state:

     const confirm = useConfirm();
     if (await confirm({ title: 'Delete provider?', ... })) { ... }

   Await resolves true only on explicit confirmation, so an accidental
   dismissal is always the safe outcome.
   ============================================================ */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import './BriselleControls.css';

export interface ConfirmRequest {
  title: string;
  /** Main body. Plain text; kept simple so it stays translatable. */
  message: string;
  /** Consequences, listed. Use for "what will break". */
  details?: string[];
  confirmLabel?: string;
  cancelLabel?: string;
  /** 'danger' for destructive, 'default' otherwise. */
  tone?: 'danger' | 'default';
}

type Resolver = (value: boolean) => void;

const ConfirmContext = createContext<((req: ConfirmRequest) => Promise<boolean>) | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  const resolverRef = useRef<Resolver | null>(null);
  const confirmBtnRef = useRef<HTMLButtonElement | null>(null);

  const confirm = useCallback((req: ConfirmRequest) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setRequest(req);
    });
  }, []);

  const settle = useCallback((value: boolean) => {
    /* The resolver is cleared BEFORE resolving, so a double click cannot
       resolve the same promise twice. */
    const resolve = resolverRef.current;
    resolverRef.current = null;
    setRequest(null);
    if (resolve) resolve(value);
  }, []);

  /* Escape cancels. Registered only while open. */
  useEffect(() => {
    if (!request) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') settle(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [request, settle]);

  /* Focus the confirm button so the dialog is operable from the keyboard
     the moment it opens. */
  useEffect(() => {
    if (request && confirmBtnRef.current) confirmBtnRef.current.focus();
  }, [request]);

  /* A component that unmounts mid-question must not leave a caller
     awaiting forever. */
  useEffect(() => () => {
    if (resolverRef.current) resolverRef.current(false);
  }, []);

  const value = useMemo(() => confirm, [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {request && (
        <div
          className="bui-confirm-overlay"
          /* Only a click on the backdrop itself cancels — a click that
             started inside the card and drifted out must not. */
          onMouseDown={(e) => { if (e.target === e.currentTarget) settle(false); }}
        >
          <div
            className={`bui-confirm-card${request.tone === 'danger' ? ' is-danger' : ''}`}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="bui-confirm-title"
          >
            <div className="bui-confirm-head">
              <span className="bui-confirm-icon">
                <AlertTriangle size={18} />
              </span>
              <h2 className="bui-confirm-title" id="bui-confirm-title">{request.title}</h2>
              <button type="button" className="bui-confirm-x" onClick={() => settle(false)} aria-label="Cancel">
                <X size={16} />
              </button>
            </div>

            <div className="bui-confirm-body">
              <p>{request.message}</p>
              {request.details && request.details.length > 0 && (
                <ul className="bui-confirm-details">
                  {request.details.map((d, i) => <li key={i}>{d}</li>)}
                </ul>
              )}
            </div>

            <div className="bui-confirm-actions">
              <button type="button" className="bui-confirm-btn" onClick={() => settle(false)}>
                {request.cancelLabel || 'Cancel'}
              </button>
              <button
                ref={confirmBtnRef}
                type="button"
                className={`bui-confirm-btn is-primary${request.tone === 'danger' ? ' is-danger' : ''}`}
                onClick={() => settle(true)}
              >
                {request.confirmLabel || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

/**
 * Ask for confirmation.
 *
 * Falls back to window.confirm when no provider is mounted, so a caller
 * outside the provider degrades instead of crashing — but the fallback
 * loses the details list, which is why the provider wraps the app root.
 */
export function useConfirm(): (req: ConfirmRequest) => Promise<boolean> {
  const ctx = useContext(ConfirmContext);
  return useCallback(
    (req: ConfirmRequest) => {
      if (ctx) return ctx(req);
      console.warn('[ConfirmDialog] no ConfirmProvider mounted — falling back to window.confirm');
      const text = [req.title, '', req.message, ...(req.details || [])].join('\n');
      return Promise.resolve(window.confirm(text));
    },
    [ctx]
  );
}

export default ConfirmProvider;
