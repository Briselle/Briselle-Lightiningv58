/* ============================================================
   Briselle Enterprise Platform — Settings / AI Providers Config
   useAiConfig.ts — shared document state for the four tabs
   Created At: 2026-08-22 | Last Modified: 2026-08-22
   Previous Version Back URL: (new file — no previous version)

   Task: BRIS-AI-T151

   One hook so all four tabs read the same document and one save
   refreshes all of them. Four independent loaders would drift the
   moment a provider was renamed on one tab while another still showed
   the old name in its dropdown.
   ============================================================ */
import { useCallback, useEffect, useRef, useState } from 'react';
import { emptyAiDocument } from '../../../services/platformAiConfigTypes';
import type { AiDocument } from '../../../services/platformAiConfigTypes';
import {
  loadAiDocument,
  onAiConfigChanged,
  type SaveResult,
} from '../../../services/platformAiConfigService';

export interface AiConfigState {
  doc: AiDocument;
  loading: boolean;
  /** Set after a failed save, cleared on the next attempt. */
  error: string;
  /** Transient success text, e.g. "Provider saved". */
  notice: string;
  reload: () => Promise<void>;
  /** Run a mutation, then refresh. Reports failure into `error`. */
  run: (fn: () => Promise<SaveResult>, successMessage: string) => Promise<boolean>;
  setError: (message: string) => void;
  setNotice: (message: string) => void;
}

export function useAiConfig(): AiConfigState {
  const [doc, setDoc] = useState<AiDocument>(() => emptyAiDocument());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  /* Guards a setState after unmount — a save that resolves while the
     admin is navigating away would otherwise warn in the console. */
  const alive = useRef(true);
  useEffect(() => {
    /* The assignment in the BODY is not optional.
       useRef(true) initialises once, but StrictMode runs effects
       mount -> unmount -> remount. Registering only the cleanup left
       alive.current false after that first unmount with nothing to set
       it back, so every subsequent setState was skipped and the page
       spun on "Loading AI configuration" forever. */
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      /* Bounded wait. loadAiDocument() swallows its own errors, but a
         request that never settles at all — the intermittent "Failed to
         fetch" this project has seen — would leave the spinner up with
         nothing on screen to explain it. A page that says what went
         wrong beats one that spins indefinitely. */
      const timeout = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(
          'Timed out reading the AI configuration from platform_config. '
          + 'Check the network tab and that database/021_platform_ai_config.sql has been run.'
        )), 20000);
      });

      const next = await Promise.race([loadAiDocument(), timeout]);
      if (alive.current) setDoc(next);
    } catch (e: any) {
      if (alive.current) setError(String(e?.message || e));
    } finally {
      if (alive.current) setLoading(false);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  /* A save from anywhere in the app (including the Ziva bridge writing a
     migrated document) refreshes this page. */
  useEffect(() => onAiConfigChanged(() => { void reload(); }), [reload]);

  const run = useCallback(async (fn: () => Promise<SaveResult>, successMessage: string): Promise<boolean> => {
    setError('');
    setNotice('');
    let result: SaveResult;
    try {
      result = await fn();
    } catch (e: any) {
      if (alive.current) setError(String(e?.message || e));
      return false;
    }

    if (!result.ok) {
      /* Validation errors are listed in full rather than summarised —
         "invalid configuration" gives an admin nothing to act on.

         DEDUPED, and counted. Whole-document validation reports one issue
         per offending record, so three models with the same defect
         produced the same sentence three times in a row, which reads like
         a rendering bug rather than three findings. */
      let detail: string;
      if (result.errors?.length) {
        const counts = new Map<string, number>();
        result.errors.forEach((e) => counts.set(e, (counts.get(e) || 0) + 1));
        detail = [...counts.entries()]
          .map(([message, n]) => (n > 1 ? `${message} (${n} records)` : message))
          .join(' ');
      } else {
        detail = result.message || 'The change was not saved.';
      }
      if (alive.current) setError(detail);
      return false;
    }

    /* No invalidate here. Every write path in the service already
       invalidates and notifies, so doing it again fired a second round of
       listeners and a second query per save. Two queries where one will
       do is the same class of waste that produced the long page spinner. */
    await reload();
    if (alive.current) setNotice(successMessage);
    return true;
  }, [reload]);

  return { doc, loading, error, notice, reload, run, setError, setNotice };
}
