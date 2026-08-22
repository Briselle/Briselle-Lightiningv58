/* ============================================================
   Briselle Enterprise Platform — Settings / AI Providers Config
   ModulesTab.tsx — Briselle Platform Modules
   Created At: 2026-08-22 | Last Modified: 2026-08-22
   Previous Version Back URL: .agents-backups/ModulesTab.tsx.20260822-1520

   Task: BRIS-AI-T192 / T195

   ── What a Platform Module is ─────────────────────────────────
   An AI FUNCTION any block or feature may call. Deliberately not a
   product area: "Summarization" is the module, and Meeting Notes is one
   consumer of it.

   ── Module API ID ─────────────────────────────────────────────
   The `id` IS the string backend code passes to
   executeAI({ configurationId: '<api id>' }). Renaming one would break
   every caller silently, so it is immutable after creation and shown
   as a copyable code value rather than an editable field.

   ── Linking lives on the row ──────────────────────────────────
   Provider and model are chosen inline. The Providers / Models columns
   are non-editable reflections of that link.
   ============================================================ */
import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, Layers, Loader2, Plus, X } from 'lucide-react';
import type { AiCapability } from '../../../services/platformAiConfigTypes';
import { moduleReadiness } from '../../../services/platformAiConfigTypes';
import {
  deleteCapability,
  fetchLastUsed,
  emptyLastUsed,
  reorderCapabilities,
  setModuleAiEnabled,
  upsertCapability,
  type LastUsedMap,
} from '../../../services/platformAiConfigService';
import { useDragReorder } from '../../../components/ui/useDragReorder';
import { DragHandle } from '../../../components/ui/DragHandle';
import { useConfirm } from '../../../components/ui/ConfirmDialog';
import { InfoHint, DeleteButton, LastUsedCell, TagList, ToggleField } from './AiConfigBits';
import type { AiConfigState } from './useAiConfig';

/** Module API IDs are called from code, so the shape is constrained. */
const API_ID_RE = /^[a-z][a-z0-9_]{1,63}$/;

function blankModule(nextOrder: number): AiCapability {
  return { id: '', label: '', description: '', aiEnabled: true, order: nextOrder };
}

export function ModulesTab({ state }: { state: AiConfigState }) {
  const { doc, run, setError } = state;
  const confirm = useConfirm();

  const [editing, setEditing] = useState<AiCapability | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState('');
  const [lastUsed, setLastUsed] = useState<LastUsedMap>(() => emptyLastUsed());

  const modules = useMemo(
    () => [...doc.capabilities].sort((a, b) => a.order - b.order),
    [doc.capabilities]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const map = await fetchLastUsed();
      if (!cancelled) setLastUsed(map);
    })();
    return () => { cancelled = true; };
  }, [doc.capabilities.length]);

  const drag = useDragReorder({
    count: modules.length,
    onReorder: (from, to) => { void run(() => reorderCapabilities(from, to), 'Module order updated.'); },
  });

  /**
   * BRIS-AI-T199 — Supported Providers / Models are DERIVED.
   *
   * A model's own "Briselle Platform Modules" tags are the single author
   * of this relationship. This tab used to carry its own provider and
   * model selectors, which meant the same fact could be stated in two
   * places and the two could disagree. It is now purely a reflection:
   * to change what serves a module, tag the model.
   */
  const supportFor = (capId: string) => {
    const models = doc.models
      .filter((m) => (m.moduleTags || []).includes(capId))
      .sort((x, y) => x.order - y.order);

    const providerNames: string[] = [];
    models.forEach((m) => {
      const prov = doc.providers.find((pr) => pr.id === m.providerId);
      const label = prov ? prov.name : m.providerId;
      if (!providerNames.includes(label)) providerNames.push(label);
    });

    return {
      providerNames,
      modelNames: models.map((m) => m.displayName || m.name),
    };
  };



  /* ── Add / edit form ────────────────────────────────────────── */
  const startNew = () => {
    setEditing(blankModule(modules.length));
    setIsNew(true);
    setError('');
  };

  const startEdit = (cap: AiCapability) => {
    setEditing({ ...cap });
    setIsNew(false);
    setError('');
  };

  const cancel = () => { setEditing(null); setIsNew(false); };

  /* The Save button is inactive until every required field is valid.
     Validating on click instead would let someone press Save and be
     told no — the button itself is the clearer signal. */
  const formValid = (() => {
    if (!editing) return false;
    if (!API_ID_RE.test(editing.id.trim())) return false;
    if (!editing.label.trim()) return false;
    if (!Number.isFinite(editing.order)) return false;
    if (isNew && doc.capabilities.some((c) => c.id === editing.id.trim())) return false;
    return true;
  })();

  const save = async () => {
    if (!editing || !formValid) return;
    setSaving(true);
    try {
      const ok = await run(
        () => upsertCapability({ ...editing, id: editing.id.trim(), label: editing.label.trim() }),
        isNew ? 'Module created.' : 'Module saved.'
      );
      if (ok) cancel();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (cap: AiCapability) => {
    const tagged = doc.models.filter((m) => (m.moduleTags || []).includes(cap.id));
    const ok = await confirm({
      title: `Delete the "${cap.label}" module?`,
      message: `Backend code calling executeAI({ configurationId: '${cap.id}' }) will stop working.`,
      details: [
        `API ID: ${cap.id}`,
        tagged.length
          ? `Removed from ${tagged.length} tagged model(s): ${tagged.map((m) => m.displayName || m.name).join(', ')}`
          : 'No models are tagged with it.',
        'Its derived AI configuration is removed as well.',
      ],
      confirmLabel: 'Delete module',
      tone: 'danger',
    });
    if (!ok) return;
    await run(() => deleteCapability(cap.id), 'Module deleted.');
  };

  const onToggle = async (capId: string, next: boolean) => {
    setBusy(capId);
    try {
      await run(() => setModuleAiEnabled(capId, next), next ? 'AI enabled for this module.' : 'AI disabled for this module.');
    } finally { setBusy(''); }
  };



  const enabledCount = modules.filter((m) => m.aiEnabled).length;
  const readyCount = modules.filter((m) => moduleReadiness(doc, m.id).ready).length;

  return (
    <div className="aipc-tab">
      <div className="aipc-tab-head">
        <div>
          <h2 className="aipc-tab-title aipc-tab-title-inline">Briselle Platform Modules</h2>
          <InfoHint text="The AI functions this platform offers. The Module API ID is what backend code calls, so it cannot change once created. Supported providers and models are read from the module tags on each model — tag a model under its provider to link it here." />
          
        </div>
        <div className="aipc-head-actions">
          <span className="aipc-summary-pills">
            <span className="aipc-badge neutral">{modules.length} modules</span>
            <span className={`aipc-badge ${enabledCount ? 'ok' : 'warn'}`}>{enabledCount} enabled</span>
            <span className={`aipc-badge ${readyCount ? 'ok' : 'warn'}`}>{readyCount} ready</span>
          </span>
          <button type="button" className="aipc-btn aipc-btn-primary" onClick={startNew}>
            <Plus size={15} /> Add module
          </button>
        </div>
      </div>

      {doc.providers.length === 0 && (
        <div className="aipc-notice warn">
          <AlertTriangle size={15} />
          <span>No providers exist yet. Add one on the Providers tab, give it a model, then link it here.</span>
        </div>
      )}

      {editing && (
        <div className="aipc-form">
          <div className="aipc-form-head">
            <h3>{isNew ? 'New platform module' : `Edit ${editing.label || editing.id}`}</h3>
            <button type="button" className="aipc-icon-btn" onClick={cancel} aria-label="Close"><X size={16} /></button>
          </div>

          <div className="aipc-grid">
            <label className="aipc-field">
              <span className="aipc-label">Module API ID</span>
              <input
                className="aipc-input"
                value={editing.id}
                disabled={!isNew}
                placeholder="summarization"
                onChange={(e) => setEditing({ ...editing, id: e.target.value })}
              />
              <span className={`aipc-hint${isNew && editing.id && !API_ID_RE.test(editing.id.trim()) ? ' warn' : ''}`}>
                {!isNew
                  ? 'Immutable — backend code calls this string.'
                  : 'Lowercase letters, digits and underscores; must start with a letter. This is the value passed to executeAI({ configurationId }).'}
              </span>
              {isNew && editing.id.trim() && doc.capabilities.some((c) => c.id === editing.id.trim()) && (
                <span className="aipc-test bad">A module with this API ID already exists.</span>
              )}
            </label>

            <label className="aipc-field">
              <span className="aipc-label">Module Display Name</span>
              <input
                className="aipc-input"
                value={editing.label}
                placeholder="Summarization"
                onChange={(e) => setEditing({ ...editing, label: e.target.value })}
              />
              <span className="aipc-hint">What administrators read in this list.</span>
            </label>

            <label className="aipc-field">
              <span className="aipc-label">Priority Order</span>
              <input
                className="aipc-input"
                type="number"
                value={Number.isFinite(editing.order) ? editing.order : ''}
                onChange={(e) => setEditing({ ...editing, order: e.target.value === '' ? NaN : Number(e.target.value) })}
              />
              <span className="aipc-hint">Also settable by dragging rows in the list.</span>
            </label>

            <ToggleField
              label="Enable AI function"
              checked={editing.aiEnabled}
              onChange={(next) => setEditing({ ...editing, aiEnabled: next })}
              hint="Off means every call to this module fails with a named reason."
            />
          </div>

          <div className="aipc-form-actions">
            {!isNew && (
              <button
                type="button"
                className="aipc-btn aipc-btn-danger"
                onClick={() => { const c = editing; cancel(); void remove(c); }}
                disabled={saving}
              >
                Delete
              </button>
            )}
            <span className="aipc-actions-spacer" />
            <button type="button" className="aipc-btn" onClick={cancel} disabled={saving}>Cancel</button>
            <button
              type="button"
              className="aipc-btn aipc-btn-primary"
              onClick={save}
              disabled={saving || !formValid}
              title={formValid ? undefined : 'Fill in a valid API ID, display name and priority order first.'}
            >
              {saving ? <Loader2 size={15} className="aipc-spin" /> : <Check size={15} />}
              {isNew ? 'Save module' : 'Save changes'}
            </button>
          </div>
        </div>
      )}

      {modules.length === 0 ? (
        <div className="aipc-empty">
          <Layers size={26} />
          <p>No platform modules defined.</p>
          <p className="aipc-empty-sub">
            Add one, or run <code className="aipc-code">database/021_platform_ai_config.sql</code> to
            seed the standard set.
          </p>
        </div>
      ) : (
        <div className="aipc-table-wrap">
          <table className="aipc-table">
            <thead>
              <tr>
                <th className="aipc-col-grip">Order</th>
                <th>Platform Module</th>
                <th>Module API ID</th>
                <th>Supported Providers</th>
                <th>Supported Models</th>
                <th>Last call</th>
                <th>Status</th>
                <th className="aipc-col-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {modules.map((cap, index) => {
                const readiness = moduleReadiness(doc, cap.id);
                const support = supportFor(cap.id);
                const working = busy === cap.id;

                return (
                  <tr
                    key={cap.id}
                    {...drag.getRowProps(index)}
                    tabIndex={0}
                    className={cap.aiEnabled ? '' : 'aipc-row-off'}
                    aria-label={`${cap.label}, order ${index + 1}`}
                  >
                    <td className="aipc-col-grip">
                      <DragHandle position={index + 1} label="Reorder module" />
                    </td>

                    <td>
                      <button type="button" className="aipc-cell-name aipc-name-btn" onClick={() => startEdit(cap)}>
                        {cap.label}
                      </button>
                      {cap.description && <div className="aipc-cell-desc">{cap.description}</div>}
                      {!readiness.ready && <div className="aipc-test bad">{readiness.reason}</div>}
                    </td>

                    <td><code className="aipc-code">{cap.id}</code></td>

                    {/* Read-only. Tag the model to change these. */}
                    <td><TagList labels={support.providerNames} /></td>
                    <td><TagList labels={support.modelNames} /></td>

                    <td><LastUsedCell entry={lastUsed.modules[cap.id]} /></td>

                    <td>
                      <div className="aipc-toggle-row">
                        <button
                          type="button"
                          className={`aipc-toggle${cap.aiEnabled ? ' on' : ''}`}
                          disabled={working}
                          onClick={() => onToggle(cap.id, !cap.aiEnabled)}
                          role="switch"
                          aria-checked={cap.aiEnabled}
                          aria-label={cap.aiEnabled ? `Disable AI for ${cap.label}` : `Enable AI for ${cap.label}`}
                        >
                          <span />
                        </button>
                        {working
                          ? <Loader2 size={13} className="aipc-spin" />
                          : <span className="aipc-toggle-state">{cap.aiEnabled ? 'Enabled' : 'Disabled'}</span>}
                      </div>
                    </td>

                    <td className="aipc-col-actions">
                      <DeleteButton title={`Delete ${cap.label}`} onClick={() => remove(cap)} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="aipc-footnote">
        Last call is the most recent <em>successful</em> AI call, recorded automatically by the
        gateway. A run of failures does not count as usage — a fresh timestamp for calls that never
        worked would be misleading.
      </p>
    </div>
  );
}

export default ModulesTab;
