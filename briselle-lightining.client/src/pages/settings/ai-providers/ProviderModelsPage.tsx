/* ============================================================
   Briselle Enterprise Platform — Settings / AI Providers Config
   ProviderModelsPage.tsx — models, as a sub-page of one provider
   Created At: 2026-08-22 | Last Modified: 2026-08-22
   Previous Version Back URL: (new file — replaces the Models TAB in
   pages/settings/ai-providers/ModelsTab.tsx)

   Task: BRIS-AI-T173 / T174 / T175 / T176

   Route: /settings/ai-providers/:providerId/models

   ── Why a sub-page and not a tab ──────────────────────────────
   A model has no meaning apart from its provider: the wire id is only
   valid against one endpoint, and discovery can only ask one provider at
   a time. A flat tab forced a provider dropdown into every row and let
   an admin build provider/model pairs that cannot work. Nesting makes
   the parent implicit and that mistake unreachable.

   ── No internal id (T173) ─────────────────────────────────────
   There is no "Internal id" field. A model is keyed by provider + wire
   name, derived in the service. Two ids for one thing is a
   troubleshooting trap, and the id shown here is the one the provider
   itself reports in its own logs.
   ============================================================ */
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle, ArrowLeft, BadgeCheck, Check, Cpu, KeyRound,
  Loader2, Pencil, Plus, RefreshCw, Trash2, X,
} from 'lucide-react';
import type { AiModel, ModelType } from '../../../services/platformAiConfigTypes';
import { modelKey } from '../../../services/platformAiConfigTypes';
import { canDeleteModel, validateModel } from '../../../services/platformAiConfigValidation';
import {
  deleteModel,
  emptyLastUsed,
  fetchLastUsed,
  reorderModels,
  saveModelCatalogue,
  setModelEnabled,
  upsertModel,
  type LastUsedMap,
} from '../../../services/platformAiConfigService';
import { listProviderModels, testProviderConnection } from '../../../services/aiGatewayClient';
import { useDragReorder } from '../../../components/ui/useDragReorder';
import { DragHandle } from '../../../components/ui/DragHandle';
import { TagMultiSelect } from '../../../components/ui/TagMultiSelect';
import { useConfirm } from '../../../components/ui/ConfirmDialog';
import { ago, FieldLabel, LastUsedCell, ModelCountBadge, ToggleField, VerifyIcon } from './AiConfigBits';
import { persistCascade, runProviderCascade } from './verifyCascade';
import { useAiConfig } from './useAiConfig';
import './AiProvidersConfig.css';

const MODEL_TYPES: Array<{ value: ModelType; label: string }> = [
  { value: 'chat', label: 'Chat / completion' },
  { value: 'stt', label: 'Speech to text' },
  { value: 'tts', label: 'Text to speech' },
  { value: 'embedding', label: 'Embedding' },
  { value: 'vision', label: 'Vision' },
  { value: 'other', label: 'Other' },
];

/** Guess the type from the wire name. A starting point, always editable. */
function guessType(name: string): ModelType {
  const n = name.toLowerCase();
  if (/whisper|transcrib|speech-to-text|\bstt\b/.test(n)) return 'stt';
  if (/\btts\b|text-to-speech|speech-\d|voice/.test(n)) return 'tts';
  if (/embed/.test(n)) return 'embedding';
  if (/vision|\bvl\b|image/.test(n)) return 'vision';
  return 'chat';
}

/** The sentinel for "I will type the id myself". */
const CUSTOM = '__custom__';

function blankModel(providerId: string, nextOrder: number): AiModel {
  return {
    id: '', providerId, name: '', displayName: '', type: 'chat',
    enabled: true, contextWindow: null, maxTokensPerRequest: null,
    moduleTags: [], order: nextOrder,
  };
}

export default function ProviderModelsPage() {
  const { providerId = '' } = useParams();
  const navigate = useNavigate();
  const state = useAiConfig();
  const confirm = useConfirm();
  const { doc, loading, error, notice, run, setError, setNotice } = state;

  const [editing, setEditing] = useState<AiModel | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  /* Which entry of the Model dropdown is chosen: a discovered id, or
     CUSTOM. Held separately from the record because "custom" is a UI
     mode, not data. */
  const [pick, setPick] = useState<string>(CUSTOM);
  /* BRIS-AI-T198: the id the edit STARTED from. Without it, changing the
     wire name produced a second row instead of replacing the first,
     because the id is derived from the name. */
  const [originalId, setOriginalId] = useState<string>('');

  const [verifying, setVerifying] = useState('');
  const [lastUsed, setLastUsed] = useState<LastUsedMap>(() => emptyLastUsed());
  const [formVerify, setFormVerify] = useState<{ ok: boolean; message: string } | null>(null);
  const [discovering, setDiscovering] = useState(false);
  const [discovered, setDiscovered] = useState<string[]>([]);
  const [discoverNote, setDiscoverNote] = useState('');

  const provider = useMemo(
    () => doc.providers.find((p) => p.id === providerId),
    [doc.providers, providerId]
  );

  const models = useMemo(
    () => doc.models.filter((m) => m.providerId === providerId).sort((a, b) => a.order - b.order),
    [doc.models, providerId]
  );

  /* Platform Modules, straight from the document — never a hardcoded
     list, so adding one in SQL needs no code change here. */
  const moduleOptions = useMemo(
    () => doc.capabilities.map((c) => ({ id: c.id, label: c.label, description: c.description })),
    [doc.capabilities]
  );

  /* A provider id in the URL that does not exist is a dead end. Send the
     admin back rather than rendering an empty shell they cannot escape. */
  useEffect(() => {
    if (!loading && !doc.missing && !provider) {
      setError(`No provider with id "${providerId}".`);
    }
  }, [loading, doc.missing, provider, providerId, setError]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const map = await fetchLastUsed();
      if (!cancelled) setLastUsed(map);
    })();
    return () => { cancelled = true; };
  }, [providerId, doc.models.length]);

  /* BRIS-AI-T197: the catalogue is cached on the provider, so the
     dropdown is populated on arrival without a provider round trip. It
     is re-fetched only when the administrator asks. */
  useEffect(() => {
    const cached = provider?.modelCatalogue;
    if (cached?.models?.length) setDiscovered(cached.models);
  }, [provider?.id, provider?.modelCatalogue?.fetchedAt]);

  const drag = useDragReorder({
    count: models.length,
    onReorder: (from, to) => {
      void run(() => reorderModels(providerId, from, to), 'Model order updated.');
    },
  });

  const startNew = () => {
    setEditing(blankModel(providerId, models.length));
    setIsNew(true);
    setOriginalId('');
    setPick(discovered.length ? '' : CUSTOM);
    setFormVerify(null);
    setError('');
  };

  const startEdit = (m: AiModel) => {
    setEditing({ ...m, moduleTags: [...(m.moduleTags || [])] });
    setIsNew(false);
    setOriginalId(m.id);
    /* An existing model shows its own id in the dropdown when the
       provider still lists it, otherwise it is treated as custom. */
    setPick(discovered.includes(m.name) ? m.name : CUSTOM);
    /* BRIS-AI-T201: seeded from what was last recorded, so an already
       verified model does not have to be re-verified to be re-saved. */
    setFormVerify(m.lastVerify?.ok ? { ok: true, message: m.lastVerify.message || 'Previously verified.' } : null);
    setError('');
  };

  const cancel = () => { setEditing(null); setIsNew(false); };

  const discover = async () => {
    setDiscovering(true);
    setDiscoverNote('');
    try {
      const { models: found, error: err } = await listProviderModels(providerId);
      if (err) {
        /* Discovery failing is not a blocker — manual entry is the
           supported path and must keep working. Say so explicitly, and
           keep whatever catalogue was cached rather than blanking it. */
        setDiscoverNote(`${err} You can still type a model id by hand.`);
        return;
      }
      setDiscovered(found);
      /* Persisted so the next visit costs no provider call. */
      await run(() => saveModelCatalogue(providerId, found), `${found.length} model(s) fetched.`);
      setDiscoverNote(found.length ? '' : 'The provider returned no models. Type the id by hand.');
    } finally {
      setDiscovering(false);
    }
  };

  /** Choosing from the dropdown fills the record; CUSTOM unlocks the field. */
  const onPick = (value: string) => {
    setPick(value);
    /* BRIS-AI-T201: a different model is a different thing. Carrying the
       previous pass forward would let an unverified id be saved behind a
       tick earned by another model. */
    setFormVerify(null);
    if (value === CUSTOM || !value) return;
    setEditing((prev) => prev && ({
      ...prev,
      name: value,
      displayName: prev.displayName && prev.displayName !== prev.name ? prev.displayName : value,
      type: guessType(value),
    }));
  };

  /**
   * BRIS-AI-T193 — the same cascade the Providers tab runs.
   *
   * Verifying one model and verifying all of them cost the same single
   * gateway call, because GET /models returns the whole catalogue. So
   * there is no narrow variant: every trigger refreshes the provider and
   * all of its models at once, and the parent status updates itself.
   */
  const runCascade = async (notice: string) => {
    setVerifying('all');
    try {
      const result = await runProviderCascade(doc, providerId);
      await run(() => persistCascade(providerId, result), notice);
      return result;
    } finally {
      setVerifying('');
    }
  };

  /** Verify the id typed in the form, before it is saved. */
  const verifyInForm = async () => {
    if (!editing?.name) {
      setFormVerify({ ok: false, message: 'Enter a model id first.' });
      return;
    }
    setFormVerify({ ok: false, message: 'Verifying…' });
    const result = await testProviderConnection(providerId, editing.name);
    setFormVerify({ ok: result.ok, message: result.message });
  };

  const save = async () => {
    if (!editing || !provider) return;
    setError('');

    const record: AiModel = { ...editing, id: modelKey(providerId, editing.name) };

    if (isNew && doc.models.some((m) => m.id === record.id)) {
      setError(`"${record.name}" is already registered for this provider.`);
      return;
    }

    const issues = validateModel(record, doc.providers).filter((i) => i.severity === 'error');
    if (issues.length) { setError(issues.map((i) => i.message).join(' ')); return; }

    setSaving(true);
    try {
      const ok = await run(() => upsertModel(record, originalId), isNew ? 'Model added.' : 'Model saved.');
      if (!ok) return;
      cancel();
      /* Saving re-verifies this model AND refreshes the parent provider,
         so the counts on both screens are right without another click. */
      await runCascade('Saved and re-verified.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (m: AiModel) => {
    const tags = (m.moduleTags || []).map((t) => doc.capabilities.find((c) => c.id === t)?.label || t);
    const ok = await confirm({
      title: `Delete "${m.displayName || m.name}"?`,
      message: `This model is removed from ${provider?.name || 'this provider'}.`,
      details: [
        `Sent to the provider as: ${m.name}`,
        tags.length
          ? `Stops serving: ${tags.join(', ')}`
          : 'It is not tagged for any platform module.',
      ],
      confirmLabel: 'Delete model',
      tone: 'danger',
    });
    if (!ok) return;
    await run(() => deleteModel(m.id), 'Model deleted.');
  };

  const customLocked = pick !== CUSTOM && pick !== '';

  return (
    <div className="aipc-page">
      <div className="aipc-header">
        <Link to="/settings/ai-providers" className="aipc-back">
          <ArrowLeft size={15} /> AI Providers Config
        </Link>
        <div className="aipc-title-row">
          <Cpu size={22} />
          <h1 className="aipc-title">Models</h1>
        </div>
      </div>

      {/* The provider, highlighted — this page is meaningless without
          knowing which endpoint these models belong to. */}
      {provider ? (
        <div className="aipc-parent-strip">
          <div className="aipc-parent-main">
            <span className="aipc-parent-label">Provider</span>
            <span className="aipc-parent-name">{provider.name}</span>
            <span className="aipc-cell-id">{provider.id}</span>
          </div>
          <div className="aipc-parent-meta">
            <span className="aipc-cell-url">{provider.baseUrl}</span>
            <span className={`aipc-badge ${provider.isSystemDefined ? 'ok' : 'neutral'}`}>
              {provider.isSystemDefined ? 'System' : 'Custom'}
            </span>
            {String(provider.credentialRef || '').trim()
              ? <span className="aipc-badge ok"><KeyRound size={11} /> Key stored</span>
              : <span className="aipc-badge warn"><AlertTriangle size={11} /> No key</span>}
            {!provider.enabled && <span className="aipc-badge warn">Disabled</span>}
            <VerifyIcon stamp={provider.lastVerify} size={16} />
            <ModelCountBadge
              verified={models.filter((m) => m.lastVerify?.ok === true && provider.lastVerify?.ok === true).length}
              total={models.length}
              items={models.map((m) => ({
                name: m.name,
                displayName: m.displayName || m.name,
                ok: m.lastVerify?.ok === true && provider.lastVerify?.ok === true,
                message: m.lastVerify?.message,
              }))}
            />
            <button
              type="button"
              className="aipc-btn aipc-btn-ghost"
              onClick={() => runCascade('Verification recorded.')}
              disabled={verifying === 'all'}
            >
              {verifying === 'all' ? <Loader2 size={14} className="aipc-spin" /> : <BadgeCheck size={14} />}
              Verify all
            </button>
            {/* T206: the two actions that operate on this provider's model
                set now sit together, rather than one here and one in a
                heading two rows down. */}
            <button type="button" className="aipc-btn aipc-btn-primary" onClick={startNew}>
              <Plus size={15} /> Add model
            </button>
          </div>
        </div>
      ) : !loading && (
        <div className="aipc-notice error">
          <AlertTriangle size={16} />
          <div>
            <strong>Provider not found.</strong>
            <div>
              No provider with id <code className="aipc-code">{providerId}</code>.{' '}
              <button type="button" className="aipc-link-btn" onClick={() => navigate('/settings/ai-providers')}>
                Back to providers
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="aipc-notice error" role="alert">
          <AlertTriangle size={16} />
          <div>{error}</div>
          <button type="button" className="aipc-icon-btn" onClick={() => setError('')} aria-label="Dismiss"><X size={15} /></button>
        </div>
      )}
      {notice && (
        <div className="aipc-notice ok" role="status">
          <Check size={16} />
          <div>{notice}</div>
          <button type="button" className="aipc-icon-btn" onClick={() => setNotice('')} aria-label="Dismiss"><X size={15} /></button>
        </div>
      )}

      {loading ? (
        <div className="aipc-loading"><Loader2 size={20} className="aipc-spin" /><span>Loading models…</span></div>
      ) : provider && (
        <div className="aipc-tab">
          <div className="aipc-tab-head">
            <div>
              <h2 className="aipc-tab-title">Registered models</h2>
              <p className="aipc-tab-sub">
                Any model id works — type one by hand and it is usable immediately, with no code
                change. Drag rows to set the order this provider's models are preferred in.
              </p>
            </div>
            {/* T206: Add model moved up beside "Verify all"; T197 moved
                discovery next to the Model dropdown where it is used. */}
          </div>

          {discoverNote && (
            <div className="aipc-notice warn">
              <AlertTriangle size={15} />
              <span>{discoverNote}</span>
            </div>
          )}

          {editing && (
            <div className="aipc-form">
              <div className="aipc-form-head">
                <h3>{isNew ? 'New model' : `Edit ${editing.displayName || editing.name}`}</h3>
                <button type="button" className="aipc-icon-btn" onClick={cancel} aria-label="Close"><X size={16} /></button>
              </div>

              <div className="aipc-grid">
                {/* 1. Model dropdown, populated by discovery, plus Custom */}
                <label className="aipc-field">
                  <FieldLabel
                    text="Model"
                    info={
                      discovered.length === 0
                        ? 'No catalogue cached yet. Refresh to ask the provider what it offers, or choose Custom and type the id by hand.'
                        : `${discovered.length} model(s) cached${provider.modelCatalogue?.fetchedAt ? ` · fetched ${ago(provider.modelCatalogue.fetchedAt)}` : ''}. Refresh only when the provider's catalogue may have changed — the cache avoids a call on every visit.`
                    }
                    action={
                      <button
                        type="button"
                        className="aipc-icon-btn aipc-refresh-btn"
                        onClick={discover}
                        disabled={discovering}
                        title="Refresh this provider's model list"
                      >
                        {discovering ? <Loader2 size={13} className="aipc-spin" /> : <RefreshCw size={13} />}
                      </button>
                    }
                  />
                  <select className="aipc-input" value={pick} onChange={(e) => onPick(e.target.value)}>
                    {discovered.length === 0 && <option value="">— run discovery, or choose Custom —</option>}
                    {discovered.map((id) => <option key={id} value={id}>{id}</option>)}
                    <option value={CUSTOM}>Custom — type the id myself</option>
                  </select>
                </label>

                {/* 2. Wire id — editable only under Custom */}
                <label className="aipc-field">
                  <FieldLabel
                    text="Model id (sent to the provider)"
                    info={customLocked
                      ? 'Locked because a discovered model is selected. Choose Custom to type your own id.'
                      : 'Exactly as the provider expects it. Any value is accepted — a brand-new model name works immediately, with no code change.'}
                  />
                  <input
                    className="aipc-input"
                    value={editing.name}
                    disabled={customLocked}
                    placeholder="llama-3.1-8b-instant"
                    onChange={(e) => {
                      const name = e.target.value;
                      setFormVerify(null);
                      setEditing((prev) => prev && ({
                        ...prev,
                        name,
                        displayName: !prev.displayName || prev.displayName === prev.name ? name : prev.displayName,
                        /* T202: type follows the name, since the selector is gone. */
                        type: guessType(name),
                      }));
                    }}
                  />
                </label>

                {/* 4. Display name (3 — internal id — deliberately absent) */}
                <label className="aipc-field">
                  <FieldLabel text="Display name" info="What administrators read in this list and in the module pickers. It is never sent to the provider." />
                  <input
                    className="aipc-input"
                    value={editing.displayName}
                    placeholder="Llama 3.1 8B Instant"
                    onChange={(e) => setEditing({ ...editing, displayName: e.target.value })}
                  />
                </label>

                {/* BRIS-AI-T202: the Model type selector is gone.
                    It duplicated what the module tags already say, and
                    what the wire name already implies — whisper is a
                    speech model whatever a dropdown claims. The field is
                    still stored (routing distinguishes speech from chat)
                    but it is now DERIVED from the name, so there is one
                    less thing to get wrong. Verify takes its place. */}
                <div className="aipc-field">
                  <FieldLabel
                    text="Verification"
                    info="Confirms the provider actually offers this model id. Required before saving, so a typo is caught here rather than on the first real AI call."
                  />
                  <div className="aipc-input-row">
                    <button
                      type="button"
                      className="aipc-btn"
                      onClick={verifyInForm}
                      disabled={!editing.name || formVerify?.message === 'Verifying…'}
                    >
                      {formVerify?.message === 'Verifying…'
                        ? <Loader2 size={14} className="aipc-spin" />
                        : <BadgeCheck size={14} />}
                      Verify this model
                    </button>
                  </div>
                  {/* The RESULT stays visible — it is an outcome the user
                      must read, not an explanation. Only the explanation
                      moved behind the info icon. */}
                  {formVerify && formVerify.message !== 'Verifying…' && (
                    <span className={`aipc-test ${formVerify.ok ? 'ok' : 'bad'}`}>{formVerify.message}</span>
                  )}
                </div>

                {/* 5. Platform Modules — searchable multi-select */}
                <div className="aipc-field aipc-field-wide">
                  <FieldLabel
                    text="Briselle Platform Modules"
                    info="Which AI functions this model may serve. These tags are what link a model to a module — the Modules tab reads them and cannot be edited directly."
                  />
                  <TagMultiSelect
                    options={moduleOptions}
                    value={editing.moduleTags || []}
                    onChange={(next) => setEditing({ ...editing, moduleTags: next })}
                    placeholder="Which AI functions can use this model?"
                    ariaLabel="Platform modules for this model"
                  />
                </div>

                {/* 6. Context window */}
                <label className="aipc-field">
                  <FieldLabel
                    text="Context window (optional)"
                    info="How much text this model can consider at once, in tokens (128000 is roughly a 300-page book). Filling it in lets Briselle warn you before a long transcript is rejected, instead of the call failing with a provider error."
                  />
                  <input
                    className="aipc-input"
                    type="number" min="1"
                    value={editing.contextWindow ?? ''}
                    placeholder="128000"
                    onChange={(e) => setEditing({ ...editing, contextWindow: e.target.value === '' ? null : Number(e.target.value) })}
                  />
                </label>

                {/* 7. Max tokens per request */}
                <label className="aipc-field">
                  <FieldLabel
                    text="Max tokens per request"
                    info="Caps the length of the reply. On some providers it also counts toward the per-minute token budget, so an oversized value can fail a request that would otherwise pass."
                  />
                  <input
                    className="aipc-input"
                    type="number" min="1"
                    value={editing.maxTokensPerRequest ?? ''}
                    placeholder="2048"
                    onChange={(e) => setEditing({ ...editing, maxTokensPerRequest: e.target.value === '' ? null : Number(e.target.value) })}
                  />
                </label>

                {/* 8. Priority Order — drag-owned, read-only */}
                <div className="aipc-field">
                  <FieldLabel text="Priority Order" info="Which of this provider's models is preferred when several can serve the same module. Lower is tried first, and dragging rows in the list sets it." />
                  <div className="aipc-readonly">
                    #{(editing.order ?? 0) + 1}
                    {isNew && <span className="aipc-muted"> (appended to the end)</span>}
                  </div>
                </div>

                <ToggleField
                  label="Enabled"
                  checked={editing.enabled}
                  onChange={(next) => setEditing({ ...editing, enabled: next })}
                  hint="A disabled model is never routed to."
                />
              </div>

              <div className="aipc-form-actions">
                <button type="button" className="aipc-btn" onClick={cancel} disabled={saving}>Cancel</button>
                {/* T207: DISABLED, not hidden. A button that disappears
                    leaves no clue the action exists; a greyed one with a
                    reason on hover says both "this exists" and "here is
                    what is missing". */}
                <button
                  type="button"
                  className="aipc-btn aipc-btn-primary"
                  onClick={save}
                  disabled={saving || !formVerify?.ok}
                  title={
                    formVerify?.ok
                      ? undefined
                      : formVerify && formVerify.message !== 'Verifying…'
                        ? 'Verification failed. Correct the model id and verify again before saving.'
                        : 'Verify the model first — saving an id the provider does not offer would only fail on the first real AI call.'
                  }
                >
                  {saving ? <Loader2 size={15} className="aipc-spin" /> : <Check size={15} />}
                  {isNew ? 'Add model' : 'Save model'}
                </button>
              </div>
            </div>
          )}

          {models.length === 0 ? (
            <div className="aipc-empty">
              <Cpu size={26} />
              <p>No models registered for this provider.</p>
              <p className="aipc-empty-sub">
                Ask the provider what it offers, or add a model id by hand.
              </p>
            </div>
          ) : (
            <div className="aipc-table-wrap">
              <table className="aipc-table">
                <thead>
                  <tr>
                    <th className="aipc-col-grip">Order</th>
                    <th>Model</th>
                    <th>Sent as</th>
                    <th>Type</th>
                    <th>Platform Modules</th>
                    <th>Context</th>
                    <th>Max tokens</th>
                    <th>Last used</th>
                    <th>Enabled</th>
                    <th className="aipc-col-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {models.map((m, index) => (
                    <tr
                      key={m.id}
                      {...drag.getRowProps(index)}
                      tabIndex={0}
                      className={m.enabled ? '' : 'aipc-row-off'}
                      aria-label={`${m.displayName || m.name}, priority ${index + 1}`}
                    >
                      <td className="aipc-col-grip">
                        <DragHandle position={index + 1} label="Reorder model" />
                      </td>
                      <td><div className="aipc-cell-name">{m.displayName || m.name}</div></td>
                      <td><code className="aipc-code">{m.name}</code></td>
                      <td>{MODEL_TYPES.find((t) => t.value === m.type)?.label || m.type}</td>
                      <td>
                        <div className="aipc-chips small">
                          {(m.moduleTags || []).length === 0
                            ? <span className="aipc-muted">—</span>
                            : (m.moduleTags || []).map((t) => (
                                <span key={t} className="aipc-chip static">
                                  {doc.capabilities.find((c) => c.id === t)?.label || t}
                                </span>
                              ))}
                        </div>
                      </td>
                      <td>{m.contextWindow ? m.contextWindow.toLocaleString() : <span className="aipc-muted">—</span>}</td>
                      <td>{m.maxTokensPerRequest ? m.maxTokensPerRequest.toLocaleString() : <span className="aipc-muted">—</span>}</td>
                      <td><LastUsedCell entry={lastUsed.models[m.id]} /></td>
                      <td>
                        <button
                          type="button"
                          className={`aipc-toggle${m.enabled ? ' on' : ''}`}
                          onClick={() => run(() => setModelEnabled(m.id, !m.enabled), m.enabled ? 'Model disabled.' : 'Model enabled.')}
                          aria-label={m.enabled ? 'Disable model' : 'Enable model'}
                        >
                          <span />
                        </button>
                      </td>
                      <td className="aipc-col-actions">
                        <button
                          type="button"
                          className="aipc-icon-btn"
                          title="Verify this provider and all of its models"
                          disabled={verifying === 'all'}
                          onClick={() => runCascade('Verification recorded.')}
                        >
                          {verifying === 'all'
                            ? <Loader2 size={15} className="aipc-spin" />
                            : <VerifyIcon stamp={m.lastVerify} parentVerified={provider.lastVerify?.ok === true} />}
                        </button>
                        <button type="button" className="aipc-icon-btn" title="Edit" onClick={() => startEdit(m)}><Pencil size={15} /></button>
                        <button type="button" className="aipc-icon-btn danger" title="Delete" onClick={() => remove(m)}><Trash2 size={15} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
