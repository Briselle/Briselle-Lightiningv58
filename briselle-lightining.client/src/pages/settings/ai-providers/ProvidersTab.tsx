/* ============================================================
   Briselle Enterprise Platform — Settings / AI Providers Config
   ProvidersTab.tsx — provider CRUD
   Created At: 2026-08-22 | Last Modified: 2026-08-22
   Previous Version Back URL: .agents-backups/ProvidersTab.tsx.20260822-124934

   Task: BRIS-AI-T166 / T167 / T168 / T169 / T170 / T171 / T172

   ── Credentials ────────────────────────────────────────────────
   The API key field is WRITE-ONLY. A stored key is never read back into
   this component — it cannot be, the RPC that returns a secret is
   granted to service_role alone. The list shows only whether one exists.

   ── Verify (T170) ──────────────────────────────────────────────
   Two paths, because the key lives in two different places:
     BEFORE saving  the admin has just typed it, so the browser can ping
                    the provider directly (aiProviderPreSaveVerify).
     AFTER saving   the key is in Vault and only the ai-gateway Edge
                    Function can read it, so the test runs server-side.

   ── Routing Order (T166) ───────────────────────────────────────
   Owned exclusively by drag-and-drop. There is no manual number input:
   two mechanisms writing one value is how they drift apart.

   ── T172 ───────────────────────────────────────────────────────
   The legacy localStorage migration banner and its ZivaApiRouterService
   import are gone. Providers are administered here and nowhere else.
   ============================================================ */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, BadgeCheck, Check, KeyRound,
  Loader2, Pencil, Plug, Plus, Settings2, Trash2, X,
} from 'lucide-react';
import type { AiProvider, ProviderProtocol } from '../../../services/platformAiConfigTypes';
import { PROTOCOL_LABELS, detectProtocol } from '../../../services/platformAiConfigTypes';

import { canDeleteProvider, validateProvider } from '../../../services/platformAiConfigValidation';
import {
  credentialExists,
  deleteCredential,
  deleteProvider,
  reorderProviders,
  setProviderEnabled,
  storeCredential,
  upsertProvider,
  fetchLastUsed,
  emptyLastUsed,
  type LastUsedMap,
} from '../../../services/platformAiConfigService';

import { verifyProviderPreSave } from '../../../services/aiProviderPreSaveVerify';
import { useConfirm } from '../../../components/ui/ConfirmDialog';
import { useDragReorder } from '../../../components/ui/useDragReorder';
import { DragHandle } from '../../../components/ui/DragHandle';
import { InfoHint, FieldLabel, LastUsedCell, ModelCountBadge, ToggleField, VerifyIcon } from './AiConfigBits';
import { persistCascade, runProviderCascade } from './verifyCascade';
import type { AiConfigState } from './useAiConfig';

const PROTOCOL_OPTIONS: ProviderProtocol[] = ['openai-compatible', 'anthropic', 'custom'];

function blankProvider(nextOrder: number): AiProvider {
  return {
    id: '', name: '', protocol: 'openai-compatible', isSystemDefined: false,
    baseUrl: '', credentialRef: '', enabled: true, order: nextOrder, capabilities: [],
  };
}

interface VerifyState { ok: boolean; message: string; busy: boolean }

export function ProvidersTab({ state }: { state: AiConfigState }) {
  const { doc, run, setError } = state;
  const navigate = useNavigate();
  const confirm = useConfirm();

  const [editing, setEditing] = useState<AiProvider | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [secretInput, setSecretInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [formVerify, setFormVerify] = useState<VerifyState | null>(null);
  const [rowVerify, setRowVerify] = useState<Record<string, VerifyState>>({});

  /* Vault presence. Asked of Vault rather than inferred from
     credentialRef, because the pointer can outlive the secret. */
  const [hasCredential, setHasCredential] = useState<Record<string, boolean>>({});
  const [lastUsed, setLastUsed] = useState<LastUsedMap>(() => emptyLastUsed());
  const providerIds = useMemo(() => doc.providers.map((p) => p.id).join('|'), [doc.providers]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        doc.providers.map(async (p) => [p.id, await credentialExists(p.id)] as const)
      );
      if (!cancelled) setHasCredential(Object.fromEntries(entries));
    })();
    return () => { cancelled = true; };
    /* Keyed on the id list, not the array identity — reloading the
       document after an unrelated edit must not re-query Vault. */
  }, [providerIds]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const map = await fetchLastUsed();
      if (!cancelled) setLastUsed(map);
    })();
    return () => { cancelled = true; };
  }, [providerIds]);

  /* ── Drag reorder (T171) ─────────────────────────────────────── */
  const drag = useDragReorder({
    count: doc.providers.length,
    onReorder: (from, to) => {
      void run(() => reorderProviders(from, to), 'Routing order updated.');
    },
  });

  /* ── Form lifecycle ─────────────────────────────────────────── */
  const startNew = () => {
    setEditing(blankProvider(doc.providers.length));
    setIsNew(true);
    setSecretInput('');
    setFormVerify(null);
    setShowAdvanced(false);
    setError('');
  };

  const startEdit = (p: AiProvider) => {
    setEditing({ ...p, capabilities: [...(p.capabilities || [])] });
    setIsNew(false);
    setSecretInput('');
    setFormVerify(null);
    setShowAdvanced(false);
    setError('');
  };

  const cancel = () => {
    setEditing(null);
    setIsNew(false);
    setFormVerify(null);
    /* Clear the secret from component state the moment the form closes.
       Leaving it would keep a plaintext key in a React fibre for as long
       as the page stayed open. */
    setSecretInput('');
  };

  /* T167: the protocol follows the Base URL unless the admin has
     explicitly opened Advanced and overridden it. */
  const onBaseUrlChange = (baseUrl: string) => {
    setEditing((prev) => {
      if (!prev) return prev;
      return { ...prev, baseUrl, protocol: showAdvanced ? prev.protocol : detectProtocol(baseUrl) };
    });
    setFormVerify(null);
  };

  const verifyInForm = async () => {
    if (!editing) return;
    setFormVerify({ ok: false, message: 'Verifying…', busy: true });

    const typed = secretInput.trim();
    if (typed) {
      /* Pre-save: the key is in hand, so the browser can ask directly. */
      const result = await verifyProviderPreSave({
        baseUrl: editing.baseUrl,
        secret: typed,
        protocol: editing.protocol,
      });
      setFormVerify({ ok: result.ok, message: result.message, busy: false });
      return;
    }

    if (isNew) {
      setFormVerify({ ok: false, message: 'Enter an API key to verify.', busy: false });
      return;
    }

    /* No key typed on an existing provider means "test what is stored",
       which only the server can do. */
    const result = await testProviderConnection(editing.id);
    setFormVerify({ ok: result.ok, message: result.message, busy: false });
  };

  const save = async () => {
    if (!editing) return;
    setError('');

    if (isNew && doc.providers.some((p) => p.id.toLowerCase() === editing.id.trim().toLowerCase())) {
      setError(`A provider with id "${editing.id}" already exists.`);
      return;
    }

    const issues = validateProvider(editing).filter((i) => i.severity === 'error');
    if (issues.length) { setError(issues.map((i) => i.message).join(' ')); return; }

    setSaving(true);
    try {
      const ok = await run(() => upsertProvider(editing), isNew ? 'Provider created.' : 'Provider saved.');
      if (!ok) return;

      /* Stored separately, and only when one was typed — an empty field
         on an edit means "leave the existing key alone", never "delete". */
      const secret = secretInput.trim();
      if (secret) {
        const stored = await run(() => storeCredential(editing.id, secret), 'Provider saved and key stored in Vault.');
        setSecretInput('');
        if (!stored) return;
        setHasCredential((prev) => ({ ...prev, [editing.id]: true }));
      }
      /* BRIS-AI-T193: saving re-runs the whole cascade, so provider and
         model status are refreshed without the admin visiting three
         screens to do it by hand. */
      const savedId = editing.id;
      cancel();
      await runCascade(savedId, 'Saved and re-verified.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (p: AiProvider) => {
    if (p.isSystemDefined) {
      setError(`"${p.name}" is system defined and cannot be deleted. Disable it instead.`);
      return;
    }
    const check = canDeleteProvider(doc, p.id);
    if (!check.allowed) {
      setError(`${check.message} In use by: ${check.blockedBy.join(', ')}.`);
      return;
    }
    const mine = modelsOf(p.id);
    const ok = await confirm({
      title: `Delete provider "${p.name}"?`,
      message: `Its API key is removed from Supabase Vault and cannot be recovered.`,
      details: [
        `Base URL: ${p.baseUrl}`,
        mine.length ? `${mine.length} model(s) will be deleted with it.` : `It has no models.`,
        `Any platform module served by those models stops working.`,
      ],
      confirmLabel: 'Delete provider',
      tone: 'danger',
    });
    if (!ok) return;
    /* Credential first. If the row went first and this failed, the Vault
       entry would be orphaned with nothing pointing at it. */
    if (String(p.credentialRef || '').trim()) await deleteCredential(p.id);
    await run(() => deleteProvider(p.id), 'Provider deleted.');
  };

  /**
   * BRIS-AI-T193 — one cascade, shared with the models page.
   *
   * Verifies the provider AND every model beneath it in a single gateway
   * round trip, then persists both. Provider and model status therefore
   * always move together; there is no sequence of clicks that can leave
   * them disagreeing.
   */
  const runCascade = async (providerId: string, notice: string) => {
    setRowVerify((prev) => ({ ...prev, [providerId]: { ok: false, message: 'Verifying…', busy: true } }));
    try {
      const result = await runProviderCascade(doc, providerId);
      setRowVerify((prev) => ({ ...prev, [providerId]: { ok: result.providerOk, message: result.summary, busy: false } }));
      await run(() => persistCascade(providerId, result), notice);
      return result;
    } catch (e: any) {
      const message = String(e?.message || e);
      setRowVerify((prev) => ({ ...prev, [providerId]: { ok: false, message, busy: false } }));
      return null;
    }
  };

  const modelsOf = (providerId: string) => doc.models.filter((m) => m.providerId === providerId);

  const modelCount = (providerId: string) => doc.models.filter((m) => m.providerId === providerId).length;

  return (
    <div className="aipc-tab">
      <div className="aipc-tab-head">
        <div>
          <h2 className="aipc-tab-title aipc-tab-title-inline">Providers</h2>
          <InfoHint text="An AI service endpoint and its credential. Drag a row to change the routing order — the first enabled provider that can serve a request is used. Open a provider to manage its models." />
          
        </div>
        <button type="button" className="aipc-btn aipc-btn-primary" onClick={startNew}>
          <Plus size={15} /> Add provider
        </button>
      </div>

      {editing && (
        <div className="aipc-form">
          <div className="aipc-form-head">
            <h3>{isNew ? 'New provider' : `Edit ${editing.name || editing.id}`}</h3>
            <button type="button" className="aipc-icon-btn" onClick={cancel} aria-label="Close"><X size={16} /></button>
          </div>

          <div className="aipc-grid">
            {/* 1. Provider id */}
            <label className="aipc-field">
              <FieldLabel
                text="Provider id"
                info="Stable and lowercase. Models and platform modules reference it, so it cannot change once created."
              />
              <input
                className="aipc-input"
                value={editing.id}
                disabled={!isNew}
                placeholder="groq-primary"
                onChange={(e) => setEditing({ ...editing, id: e.target.value })}
              />
            </label>

            {/* 2. Display name */}
            <label className="aipc-field">
              <FieldLabel text="Display name" info="What administrators read in this list. Never sent to the provider." />
              <input
                className="aipc-input"
                value={editing.name}
                placeholder="Groq (Production)"
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              />
            </label>

            {/* 3. Base URL */}
            <label className="aipc-field aipc-field-wide">
              <FieldLabel text="Base URL" info="The API root, with no trailing slash — for example https://api.groq.com/openai/v1. Must be https outside local development. The protocol is detected from this." />
              <input
                className="aipc-input"
                value={editing.baseUrl}
                placeholder="https://api.groq.com/openai/v1"
                onChange={(e) => onBaseUrlChange(e.target.value)}
              />
            </label>

            {/* 4. API key + 9. Verify, side by side — verifying a key you
                   cannot see beside the field is a guessing game. */}
            <label className="aipc-field aipc-field-wide">
              <FieldLabel
                text={`API key${isNew ? '' : ' (leave blank to keep the stored key)'}`}
                info="Written straight to Supabase Vault on save. It is never stored in the configuration document, never in browser storage, and cannot be read back by this page."
              />
              <div className="aipc-input-row">
                <input
                  className="aipc-input"
                  type="password"
                  autoComplete="new-password"
                  value={secretInput}
                  placeholder={hasCredential[editing.id] ? '•••••••• stored in Vault' : 'Paste the provider API key'}
                  onChange={(e) => { setSecretInput(e.target.value); setFormVerify(null); }}
                />
                <button
                  type="button"
                  className="aipc-btn"
                  onClick={verifyInForm}
                  disabled={formVerify?.busy || !editing.baseUrl}
                  title="Ping the provider and report what it says"
                >
                  {formVerify?.busy ? <Loader2 size={14} className="aipc-spin" /> : <BadgeCheck size={14} />}
                  Verify
                </button>
              </div>
              {formVerify && !formVerify.busy && (
                <span className={`aipc-test ${formVerify.ok ? 'ok' : 'bad'}`}>{formVerify.message}</span>
              )}
            </label>

            {/* 5. Routing Order — read-only, drag-owned */}
            <div className="aipc-field">
              <FieldLabel text="Routing Order" info="Which provider is tried first when several can serve the same module. Lower wins, and dragging rows in the list sets it." />
              <div className="aipc-readonly">
                #{(editing.order ?? 0) + 1}
                {isNew && <span className="aipc-muted"> (appended to the end)</span>}
              </div>
            </div>

            {/* 6. System Defined / Custom — display only */}
            <div className="aipc-field">
              <FieldLabel text="Origin" info="System Defined providers ship with the platform and cannot be deleted — disable them instead. Every provider added here is Custom." />
              <div className="aipc-readonly">
                <span className={`aipc-badge ${editing.isSystemDefined ? 'ok' : 'neutral'}`}>
                  {editing.isSystemDefined ? 'System Defined' : 'Custom'}
                </span>
              </div>
              <span className="aipc-hint">
                {editing.isSystemDefined
                  ? 'Shipped with the platform. Not editable, and cannot be deleted — disable it instead.'
                  : 'Added by an administrator. Every provider created here is Custom.'}
              </span>
            </div>

            {/* 7. Enabled — a switch, matching the list. */}
            <ToggleField
              label="Enabled"
              checked={editing.enabled}
              onChange={(next) => setEditing({ ...editing, enabled: next })}
              hint="A disabled provider is never routed to, whatever else is configured."
            />
          </div>

          {/* 8. Protocol — detected, tucked behind Advanced */}
          <div className="aipc-advanced">
            <div className="aipc-advanced-head">
              <button
                type="button"
                className="aipc-btn aipc-btn-ghost"
                onClick={() => setShowAdvanced((v) => !v)}
                aria-expanded={showAdvanced}
              >
                <Settings2 size={14} /> Advanced
              </button>
              <span className="aipc-hint">
                Protocol: <strong>{PROTOCOL_LABELS[editing.protocol]}</strong>
                {!showAdvanced && ' — detected from the Base URL'}
              </span>
            </div>

            {showAdvanced && (
              <label className="aipc-field aipc-advanced-body">
                <span className="aipc-label">Protocol override</span>
                <select
                  className="aipc-input"
                  value={editing.protocol}
                  onChange={(e) => setEditing({ ...editing, protocol: e.target.value as ProviderProtocol })}
                >
                  {PROTOCOL_OPTIONS.map((v) => <option key={v} value={v}>{PROTOCOL_LABELS[v]}</option>)}
                </select>
                <span className="aipc-hint">
                  Which HTTP dialect this endpoint speaks. Anthropic authenticates with
                  <code className="aipc-code"> x-api-key</code>, requires an
                  <code className="aipc-code"> anthropic-version</code> header, puts the system prompt
                  at the top level and requires <code className="aipc-code">max_tokens</code> — none of
                  which can be inferred at call time. Change this only if the endpoint sits behind a
                  proxy that hides its true vendor.
                </span>
              </label>
            )}
          </div>

          <div className="aipc-form-actions">
            <button type="button" className="aipc-btn" onClick={cancel} disabled={saving}>Cancel</button>
            {/* T207: disabled with the reason on hover, not hidden. */}
            <button
              type="button"
              className="aipc-btn aipc-btn-primary"
              onClick={save}
              disabled={saving || !formVerify?.ok}
              title={
                formVerify?.ok
                  ? undefined
                  : formVerify && !formVerify.busy
                    ? 'Verification failed. Fix the base URL or API key and verify again before saving.'
                    : 'Verify the provider first — saving an endpoint or key that has never answered would only fail on the first real AI call.'
              }
            >
              {saving ? <Loader2 size={15} className="aipc-spin" /> : <Check size={15} />}
              {isNew ? 'Create provider' : 'Save provider'}
            </button>
          </div>
        </div>
      )}

      {doc.providers.length === 0 ? (
        <div className="aipc-empty">
          <Plug size={26} />
          <p>No providers yet.</p>
          <p className="aipc-empty-sub">
            Add one with its base URL and API key. Nothing is preconfigured — a shipped provider with
            a guessed model id fails on its first call, which is worse than an empty list.
          </p>
        </div>
      ) : (
        <div className="aipc-table-wrap">
          <table className="aipc-table">
            <thead>
              <tr>
                <th className="aipc-col-grip">Order</th>
                <th>Provider</th>
                <th>Base URL</th>
                <th>Protocol</th>
                <th>API key</th>
                <th>Origin</th>
                <th>Models</th>
                <th>Last used</th>
                <th>Enabled</th>
                <th className="aipc-col-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {doc.providers.map((p, index) => {
                const configured = hasCredential[p.id] === true;
                const verify = rowVerify[p.id];
                const mine = modelsOf(p.id);
                return (
                  <tr
                    key={p.id}
                    {...drag.getRowProps(index)}
                    tabIndex={0}
                    className={`aipc-row-clickable${p.enabled ? '' : ' aipc-row-off'}`}
                    aria-label={`${p.name}, routing order ${index + 1}`}
                    /* BRIS-AI-T190: the whole row opens the models page.
                       Clicks on a control are ignored, or the toggle and
                       the delete button would also navigate. HTML5 drag
                       does not emit a click afterwards, so dragging a row
                       cannot navigate either. */
                    onClick={(e) => {
                      const el = e.target as HTMLElement;
                      if (el.closest('button, select, input, a, .bui-drag-handle')) return;
                      navigate(`/settings/ai-providers/${encodeURIComponent(p.id)}/models`);
                    }}
                    onKeyDown={(e) => {
                      /* Alt+Arrow belongs to reordering; plain Enter opens. */
                      if (e.key === 'Enter' && !e.altKey) {
                        navigate(`/settings/ai-providers/${encodeURIComponent(p.id)}/models`);
                      }
                      drag.getRowProps(index).onKeyDown(e);
                    }}
                  >
                    <td className="aipc-col-grip">
                      <DragHandle position={index + 1} label="Reorder provider" />
                    </td>
                    <td>
                      <div className="aipc-cell-name">{p.name}</div>
                      <div className="aipc-cell-id">{p.id}</div>
                    </td>
                    <td className="aipc-cell-url">{p.baseUrl}</td>
                    <td>{PROTOCOL_LABELS[p.protocol] || p.protocol}</td>
                    <td>
                      {configured
                        ? <span className="aipc-badge ok"><KeyRound size={11} /> Stored</span>
                        : <span className="aipc-badge warn"><AlertTriangle size={11} /> Missing</span>}
                      {verify && !verify.busy && (
                        <div className={`aipc-test ${verify.ok ? 'ok' : 'bad'}`}>{verify.message}</div>
                      )}
                    </td>
                    <td>
                      <span className={`aipc-badge ${p.isSystemDefined ? 'ok' : 'neutral'}`}>
                        {p.isSystemDefined ? 'System' : 'Custom'}
                      </span>
                    </td>

                    <td>
                      {/* "1/3 models" with a hover breakdown, and a click
                          through to the sub-page. */}
                      <ModelCountBadge
                        verified={mine.filter((m) => m.lastVerify?.ok === true && p.lastVerify?.ok === true).length}
                        total={mine.length}
                        items={mine.map((m) => ({
                          name: m.name,
                          displayName: m.displayName || m.name,
                          ok: m.lastVerify?.ok === true && p.lastVerify?.ok === true,
                          message: m.lastVerify?.message,
                        }))}
                        onOpen={() => navigate(`/settings/ai-providers/${encodeURIComponent(p.id)}/models`)}
                      />
                    </td>
                    <td><LastUsedCell entry={lastUsed.providers[p.id]} /></td>
                    <td>
                      <button
                        type="button"
                        className={`aipc-toggle${p.enabled ? ' on' : ''}`}
                        onClick={() => run(() => setProviderEnabled(p.id, !p.enabled), p.enabled ? 'Provider disabled.' : 'Provider enabled.')}
                        aria-label={p.enabled ? 'Disable provider' : 'Enable provider'}
                      >
                        <span />
                      </button>
                    </td>
                    <td className="aipc-col-actions">
                      <button
                        type="button"
                        className="aipc-icon-btn"
                        title={configured ? 'Verify (server-side)' : 'Save an API key before verifying'}
                        disabled={!configured || verify?.busy}
                        onClick={() => runCascade(p.id, 'Verification recorded.')}
                      >
                        {verify?.busy
                          ? <Loader2 size={15} className="aipc-spin" />
                          : <VerifyIcon stamp={p.lastVerify} />}
                      </button>
                      <button type="button" className="aipc-icon-btn" title="Edit" onClick={() => startEdit(p)}>
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        className="aipc-icon-btn danger"
                        title={p.isSystemDefined ? 'System providers cannot be deleted' : 'Delete'}
                        disabled={p.isSystemDefined}
                        onClick={() => remove(p)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default ProvidersTab;
