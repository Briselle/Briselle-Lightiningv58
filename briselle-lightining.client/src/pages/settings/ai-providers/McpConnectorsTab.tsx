/* ============================================================
   Briselle Enterprise Platform — Settings / AI Providers Config
   McpConnectorsTab.tsx — MCP connector registry
   Created At: 2026-08-22 | Last Modified: 2026-08-22
   Previous Version Back URL: (new file — no previous version)

   Task: BRIS-AI-T157b

   MCP (Model Context Protocol) connectors registered here alongside AI
   providers, so tool access is administered in the same place and under
   the same credential rules: the secret goes to Vault, the document
   holds only a credentialRef.

   ── One honest limitation, stated in the UI ────────────────────
   A `stdio` connector runs a local process. It cannot be reached by the
   browser or by an Edge Function — neither has a shell. Registering one
   here records the configuration for a host that does; it does not make
   the browser able to call it. The form says so rather than letting an
   admin configure something that silently never works.
   ============================================================ */
import { useEffect, useState } from 'react';
import { AlertTriangle, Check, KeyRound, Loader2, Pencil, Plug2, Plus, Trash2, X } from 'lucide-react';
import type { McpServerConfig, McpTransport } from '../../../services/platformAiConfigTypes';
import { validateMcpServer } from '../../../services/platformAiConfigValidation';
import {
  credentialExists,
  deleteCredential,
  deleteMcpServer,
  setMcpServerEnabled,
  storeCredential,
  upsertMcpServer,
} from '../../../services/platformAiConfigService';
import { useConfirm } from '../../../components/ui/ConfirmDialog';
import type { AiConfigState } from './useAiConfig';

const TRANSPORTS: Array<{ value: McpTransport; label: string; hint: string }> = [
  { value: 'http', label: 'HTTP (streamable)', hint: 'A remote MCP server over HTTPS. Reachable from the AI gateway.' },
  { value: 'sse', label: 'SSE', hint: 'Server-sent events transport. Reachable from the AI gateway.' },
  { value: 'stdio', label: 'stdio (local process)', hint: 'Runs a command. Requires a host with shell access — not the browser or an Edge Function.' },
];

function blankServer(): McpServerConfig {
  return {
    id: '', name: '', description: '', transport: 'http', url: '',
    command: '', args: [], credentialRef: '', authHeader: '',
    enabled: true, allowedTools: [], capabilities: [],
  };
}

export function McpConnectorsTab({ state }: { state: AiConfigState }) {
  const { doc, run, setError } = state;
  const confirm = useConfirm();

  const [editing, setEditing] = useState<McpServerConfig | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [secretInput, setSecretInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [hasCredential, setHasCredential] = useState<Record<string, boolean>>({});

  const serverIds = doc.mcpServers.map((s) => s.id).join('|');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        doc.mcpServers
          .filter((s) => String(s.credentialRef || '').trim())
          .map(async (s) => [s.id, await credentialExists(s.id)] as const)
      );
      if (!cancelled) setHasCredential(Object.fromEntries(entries));
    })();
    return () => { cancelled = true; };
  }, [serverIds]);

  const startNew = () => { setEditing(blankServer()); setIsNew(true); setSecretInput(''); setError(''); };
  const startEdit = (s: McpServerConfig) => {
    setEditing({ ...s, args: [...(s.args || [])], allowedTools: [...(s.allowedTools || [])], capabilities: [...(s.capabilities || [])] });
    setIsNew(false);
    setSecretInput('');
    setError('');
  };
  const cancel = () => { setEditing(null); setIsNew(false); setSecretInput(''); };

  const save = async () => {
    if (!editing) return;
    setError('');

    if (isNew && doc.mcpServers.some((s) => s.id.toLowerCase() === editing.id.trim().toLowerCase())) {
      setError(`A connector with id "${editing.id}" already exists.`);
      return;
    }

    const issues = validateMcpServer(editing).filter((i) => i.severity === 'error');
    if (issues.length) { setError(issues.map((i) => i.message).join(' ')); return; }

    setSaving(true);
    try {
      const ok = await run(() => upsertMcpServer(editing), isNew ? 'Connector created.' : 'Connector saved.');
      if (!ok) return;

      const secret = secretInput.trim();
      if (secret) {
        /* Same Vault path as a provider — one credential mechanism for
           the platform, not a second one for MCP. */
        const stored = await run(() => storeCredential(editing.id, secret), 'Connector saved and credential stored in Vault.');
        setSecretInput('');
        if (!stored) return;
        setHasCredential((prev) => ({ ...prev, [editing.id]: true }));
      }
      cancel();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (s: McpServerConfig) => {
    const ok = await confirm({
      title: `Delete connector "${s.name}"?`,
      message: 'Its Vault credential is removed as well and cannot be recovered.',
      details: [`Transport: ${s.transport}`, s.url ? `Endpoint: ${s.url}` : 'Local process connector.'],
      confirmLabel: 'Delete connector',
      tone: 'danger',
    });
    if (!ok) return;
    if (String(s.credentialRef || '').trim()) await deleteCredential(s.id);
    await run(() => deleteMcpServer(s.id), 'Connector deleted.');
  };

  const toggleCapability = (capId: string) => {
    setEditing((prev) => {
      if (!prev) return prev;
      const current = prev.capabilities || [];
      return { ...prev, capabilities: current.includes(capId) ? current.filter((x) => x !== capId) : [...current, capId] };
    });
  };

  const isStdio = editing?.transport === 'stdio';

  return (
    <div className="aipc-tab">
      <div className="aipc-tab-head">
        <div>
          <h2 className="aipc-tab-title">MCP Connectors</h2>
          <p className="aipc-tab-sub">
            Model Context Protocol servers that expose tools to AI calls. Credentials follow the same
            rule as providers: stored in Vault, never in this document and never in the browser.
          </p>
        </div>
        <button type="button" className="aipc-btn aipc-btn-primary" onClick={startNew}>
          <Plus size={15} /> Add connector
        </button>
      </div>

      {editing && (
        <div className="aipc-form">
          <div className="aipc-form-head">
            <h3>{isNew ? 'New connector' : `Edit ${editing.name || editing.id}`}</h3>
            <button type="button" className="aipc-icon-btn" onClick={cancel} aria-label="Close"><X size={16} /></button>
          </div>

          <div className="aipc-grid">
            <label className="aipc-field">
              <span className="aipc-label">Connector id</span>
              <input
                className="aipc-input"
                value={editing.id}
                disabled={!isNew}
                placeholder="notion-workspace"
                onChange={(e) => setEditing({ ...editing, id: e.target.value })}
              />
            </label>

            <label className="aipc-field">
              <span className="aipc-label">Display name</span>
              <input
                className="aipc-input"
                value={editing.name}
                placeholder="Notion Workspace"
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              />
            </label>

            <label className="aipc-field aipc-field-wide">
              <span className="aipc-label">Description</span>
              <input
                className="aipc-input"
                value={editing.description || ''}
                placeholder="Read and write pages in the shared workspace"
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
              />
            </label>

            <label className="aipc-field">
              <span className="aipc-label">Transport</span>
              <select
                className="aipc-input"
                value={editing.transport}
                onChange={(e) => setEditing({ ...editing, transport: e.target.value as McpTransport })}
              >
                {TRANSPORTS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <span className="aipc-hint">{TRANSPORTS.find((t) => t.value === editing.transport)?.hint}</span>
            </label>

            {isStdio ? (
              <>
                <label className="aipc-field">
                  <span className="aipc-label">Command</span>
                  <input
                    className="aipc-input"
                    value={editing.command || ''}
                    placeholder="npx"
                    onChange={(e) => setEditing({ ...editing, command: e.target.value })}
                  />
                </label>
                <label className="aipc-field aipc-field-wide">
                  <span className="aipc-label">Arguments</span>
                  <input
                    className="aipc-input"
                    value={(editing.args || []).join(' ')}
                    placeholder="-y @modelcontextprotocol/server-filesystem /data"
                    onChange={(e) => setEditing({ ...editing, args: e.target.value.split(/\s+/).filter(Boolean) })}
                  />
                  <span className="aipc-hint">Space separated.</span>
                </label>
                <div className="aipc-notice warn aipc-field-wide">
                  <AlertTriangle size={15} />
                  <span>
                    A stdio connector runs a local process. Neither the browser nor the AI gateway has a
                    shell, so this record configures a host that does — it will not be callable from the
                    platform itself.
                  </span>
                </div>
              </>
            ) : (
              <label className="aipc-field aipc-field-wide">
                <span className="aipc-label">Server URL</span>
                <input
                  className="aipc-input"
                  value={editing.url || ''}
                  placeholder="https://mcp.example.com/v1"
                  onChange={(e) => setEditing({ ...editing, url: e.target.value })}
                />
                <span className="aipc-hint">Must be https outside local development.</span>
              </label>
            )}

            <label className="aipc-field">
              <span className="aipc-label">
                <KeyRound size={13} /> Credential {isNew ? '(optional)' : '(leave blank to keep)'}
              </span>
              <input
                className="aipc-input"
                type="password"
                autoComplete="new-password"
                value={secretInput}
                placeholder={hasCredential[editing.id] ? '•••••••• stored in Vault' : 'Token, if the server needs one'}
                onChange={(e) => setSecretInput(e.target.value)}
              />
              <span className="aipc-hint">Written straight to Vault. Not every MCP server requires auth.</span>
            </label>

            <label className="aipc-field">
              <span className="aipc-label">Auth header (optional)</span>
              <input
                className="aipc-input"
                value={editing.authHeader || ''}
                placeholder="Authorization"
                onChange={(e) => setEditing({ ...editing, authHeader: e.target.value })}
              />
              <span className="aipc-hint">Blank sends <code className="aipc-code">Authorization: Bearer …</code>.</span>
            </label>

            <label className="aipc-field aipc-field-wide">
              <span className="aipc-label">Allowed tools (optional)</span>
              <input
                className="aipc-input"
                value={(editing.allowedTools || []).join(', ')}
                placeholder="search, fetch, create_page"
                onChange={(e) => setEditing({ ...editing, allowedTools: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) })}
              />
              <span className="aipc-hint">
                Comma separated. Blank exposes every tool the server offers — name them explicitly to
                keep a server's future additions from being enabled without review.
              </span>
            </label>

            <label className="aipc-field aipc-field-inline">
              <input type="checkbox" checked={editing.enabled} onChange={(e) => setEditing({ ...editing, enabled: e.target.checked })} />
              <span className="aipc-label">Enabled</span>
            </label>

            <div className="aipc-field aipc-field-wide">
              <span className="aipc-label">Capabilities</span>
              <div className="aipc-chips">
                {doc.capabilities.map((cap) => {
                  const on = (editing.capabilities || []).includes(cap.id);
                  return (
                    <button
                      key={cap.id}
                      type="button"
                      className={`aipc-chip${on ? ' on' : ''}`}
                      title={cap.description}
                      onClick={() => toggleCapability(cap.id)}
                    >
                      {on && <Check size={12} />} {cap.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="aipc-form-actions">
            <button type="button" className="aipc-btn" onClick={cancel} disabled={saving}>Cancel</button>
            <button type="button" className="aipc-btn aipc-btn-primary" onClick={save} disabled={saving}>
              {saving ? <Loader2 size={15} className="aipc-spin" /> : <Check size={15} />}
              {isNew ? 'Create connector' : 'Save connector'}
            </button>
          </div>
        </div>
      )}

      {doc.mcpServers.length === 0 ? (
        <div className="aipc-empty">
          <Plug2 size={26} />
          <p>No MCP connectors yet.</p>
          <p className="aipc-empty-sub">Register an MCP server to give AI calls access to its tools.</p>
        </div>
      ) : (
        <div className="aipc-table-wrap">
          <table className="aipc-table">
            <thead>
              <tr>
                <th>Connector</th>
                <th>Transport</th>
                <th>Endpoint</th>
                <th>Credential</th>
                <th>Tools</th>
                <th>Status</th>
                <th className="aipc-col-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {doc.mcpServers.map((s) => (
                <tr key={s.id} className={s.enabled ? '' : 'aipc-row-off'}>
                  <td>
                    <div className="aipc-cell-name">{s.name}</div>
                    <div className="aipc-cell-id">{s.id}</div>
                    {s.description && <div className="aipc-cell-desc">{s.description}</div>}
                  </td>
                  <td>{TRANSPORTS.find((t) => t.value === s.transport)?.label || s.transport}</td>
                  <td className="aipc-cell-url">
                    {s.transport === 'stdio'
                      ? <code className="aipc-code">{[s.command, ...(s.args || [])].join(' ')}</code>
                      : s.url}
                  </td>
                  <td>
                    {String(s.credentialRef || '').trim()
                      ? (hasCredential[s.id]
                          ? <span className="aipc-badge ok"><KeyRound size={11} /> Configured</span>
                          : <span className="aipc-badge warn"><AlertTriangle size={11} /> Ref without secret</span>)
                      : <span className="aipc-muted">none</span>}
                  </td>
                  <td>
                    {(s.allowedTools || []).length === 0
                      ? <span className="aipc-muted">all</span>
                      : <span>{(s.allowedTools || []).length} listed</span>}
                  </td>
                  <td>
                    <button
                      type="button"
                      className={`aipc-toggle${s.enabled ? ' on' : ''}`}
                      onClick={() => run(() => setMcpServerEnabled(s.id, !s.enabled), s.enabled ? 'Connector disabled.' : 'Connector enabled.')}
                      aria-label={s.enabled ? 'Disable connector' : 'Enable connector'}
                    >
                      <span />
                    </button>
                  </td>
                  <td className="aipc-col-actions">
                    <button type="button" className="aipc-icon-btn" title="Edit" onClick={() => startEdit(s)}><Pencil size={15} /></button>
                    <button type="button" className="aipc-icon-btn danger" title="Delete" onClick={() => remove(s)}><Trash2 size={15} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default McpConnectorsTab;
