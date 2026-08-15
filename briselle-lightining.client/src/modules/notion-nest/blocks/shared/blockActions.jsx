/* ============================================================
   NotionNest — blocks/shared/blockActions.jsx
   Recovered from pre-refactor blocks.jsx (L4110-4411).
   Action definitions and executor shared by ButtonBlock.
   ============================================================ */
import { useState } from 'react';
import { ChevronDown, GripVertical, Plus, Trash2 } from 'lucide-react';

export const ACTION_DEFS = {
  insertBlock: { label: 'Insert block', icon: 'Plus', color: '#2383e2' },
  openUrl: { label: 'Open URL', icon: 'ExternalLink', color: '#0f7b6c' },
  showConfirmation: { label: 'Show confirmation', icon: 'AlertTriangle', color: '#d9730d' },
  openPage: { label: 'Open page', icon: 'FileText', color: '#9065b0' },
  sendNotification: { label: 'Send notification', icon: 'Bell', color: '#eb5757' },
  addToDatabase: { label: 'Add pages to', icon: 'Database', color: '#2383e2' },
  editDatabase: { label: 'Edit pages in', icon: 'Edit3', color: '#dfab01' },
  form: { label: 'Form', icon: 'Variable', color: '#c14c8a' },
  defineVariables: { label: 'Define variables', icon: 'Variable', color: '#706e6b' },
};

export function genId() { return Math.random().toString(36).slice(2, 10); }

export function defaultActionConfig(type) {
  const cfgs = {
    insertBlock: { blockType: 'paragraph', content: '' },
    openUrl: { url: '', newTab: true },
    showConfirmation: { title: 'Are you sure?', confirmText: 'Continue', cancelText: 'Cancel' },
    openPage: { pageId: '', pageTitle: '' },
    sendNotification: { title: '', message: '', type: 'info' },
    addToDatabase: { databaseId: '', databaseName: '', values: [] },
    editDatabase: { databaseId: '', databaseName: '', filter: '', updates: [] },
    form: { fields: [], submitLabel: 'Submit' },
    defineVariables: { variables: [] },
  };
  return cfgs[type] || {};
}

export function createAction(type) {
  return { id: genId(), type, enabled: true, label: ACTION_DEFS[type]?.label || type, config: defaultActionConfig(type) };
}

/* ── Action config editor sub-components ── */
export function ActionConfigInsertBlock({ config, onChange, blockTypes }) {
  return (
    <div className="btn-act-config">
      <label>Block type</label>
      <select value={config.blockType || 'paragraph'} onChange={e => onChange({ ...config, blockType: e.target.value })}>
        {blockTypes.map(t => <option key={t} value={t}>{t}</option>)}
      </select>
      <label>Initial content</label>
      <input type="text" value={config.content || ''} onChange={e => onChange({ ...config, content: e.target.value })} placeholder="Optional" />
    </div>
  );
}

export function ActionConfigOpenUrl({ config, onChange }) {
  return (
    <div className="btn-act-config">
      <label>URL</label>
      <input type="text" value={config.url || ''} onChange={e => onChange({ ...config, url: e.target.value })} placeholder="https://..." />
      <label className="btn-act-row">
        <input type="checkbox" checked={config.newTab !== false} onChange={e => onChange({ ...config, newTab: e.target.checked })} />
        Open in new tab
      </label>
    </div>
  );
}

export function ActionConfigConfirmation({ config, onChange }) {
  return (
    <div className="btn-act-config">
      <label>Title</label>
      <input type="text" value={config.title || ''} onChange={e => onChange({ ...config, title: e.target.value })} />
      <label>Confirm button</label>
      <input type="text" value={config.confirmText || 'Continue'} onChange={e => onChange({ ...config, confirmText: e.target.value })} />
      <label>Cancel button</label>
      <input type="text" value={config.cancelText || 'Cancel'} onChange={e => onChange({ ...config, cancelText: e.target.value })} />
    </div>
  );
}

export function ActionConfigOpenPage({ config, onChange, notionPages }) {
  const [search, setSearch] = useState('');
  const filtered = notionPages.filter(p => p.title?.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="btn-act-config">
      <label>Search page</label>
      <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Type to search..." />
      {config.pageTitle && <div className="btn-act-selected">Selected: {config.pageTitle}</div>}
      {search && <div className="btn-act-page-list">
        {filtered.slice(0, 10).map(p => (
          <div key={p.id} className="btn-act-page-item" onClick={() => onChange({ pageId: p.id, pageTitle: p.title })}>
            {p.title || 'Untitled'}
          </div>
        ))}
        {filtered.length === 0 && <div className="btn-act-empty">No pages found</div>}
      </div>}
    </div>
  );
}

export function ActionConfigNotification({ config, onChange }) {
  return (
    <div className="btn-act-config">
      <label>Title</label>
      <input type="text" value={config.title || ''} onChange={e => onChange({ ...config, title: e.target.value })} />
      <label>Message</label>
      <input type="text" value={config.message || ''} onChange={e => onChange({ ...config, message: e.target.value })} />
      <label>Type</label>
      <select value={config.type || 'info'} onChange={e => onChange({ ...config, type: e.target.value })}>
        <option value="info">Info</option>
        <option value="success">Success</option>
        <option value="warning">Warning</option>
        <option value="error">Error</option>
      </select>
    </div>
  );
}

export function ActionConfigDatabase({ config, onChange, label }) {
  return (
    <div className="btn-act-config">
      <label>Database</label>
      <input type="text" value={config.databaseName || ''} onChange={e => onChange({ ...config, databaseName: e.target.value, databaseId: e.target.value })} placeholder="Database name or ID" />
      <p className="btn-act-hint">Enter the database name or ID. Database integration coming soon.</p>
    </div>
  );
}

export function ActionConfigForm({ config, onChange }) {
  const addField = () => {
    const fields = [...(config.fields || []), { id: genId(), label: '', type: 'text', required: false }];
    onChange({ ...config, fields });
  };
  const updField = (idx, updates) => {
    const fields = [...(config.fields || [])];
    fields[idx] = { ...fields[idx], ...updates };
    onChange({ ...config, fields });
  };
  const delField = (idx) => {
    const fields = (config.fields || []).filter((_, i) => i !== idx);
    onChange({ ...config, fields });
  };
  return (
    <div className="btn-act-config">
      <label>Submit label</label>
      <input type="text" value={config.submitLabel || 'Submit'} onChange={e => onChange({ ...config, submitLabel: e.target.value })} />
      <label>Fields</label>
      {(config.fields || []).map((f, i) => (
        <div key={f.id} className="btn-act-field-row">
          <input type="text" value={f.label} onChange={e => updField(i, { label: e.target.value })} placeholder="Field label" />
          <select value={f.type} onChange={e => updField(i, { type: e.target.value })}>
            <option value="text">Text</option>
            <option value="number">Number</option>
            <option value="email">Email</option>
            <option value="textarea">Textarea</option>
            <option value="select">Select</option>
          </select>
          <label className="btn-act-chk"><input type="checkbox" checked={f.required} onChange={e => updField(i, { required: e.target.checked })} />Req</label>
          <div className="btn-act-field-del" onClick={() => delField(i)}><Trash2 size={12} /></div>
        </div>
      ))}
      <div className="btn-act-add-field" onClick={addField}><Plus size={12} /> Add field</div>
    </div>
  );
}

export function ActionConfigVariables({ config, onChange }) {
  const addVar = () => {
    const variables = [...(config.variables || []), { id: genId(), name: '', value: '' }];
    onChange({ ...config, variables });
  };
  const updVar = (idx, updates) => {
    const variables = [...(config.variables || [])];
    variables[idx] = { ...variables[idx], ...updates };
    onChange({ ...config, variables });
  };
  const delVar = (idx) => {
    const variables = (config.variables || []).filter((_, i) => i !== idx);
    onChange({ ...config, variables });
  };
  return (
    <div className="btn-act-config">
      {(config.variables || []).map((v, i) => (
        <div key={v.id} className="btn-act-field-row">
          <input type="text" value={v.name} onChange={e => updVar(i, { name: e.target.value })} placeholder="Variable name" />
          <input type="text" value={v.value} onChange={e => updVar(i, { value: e.target.value })} placeholder="Value" />
          <div className="btn-act-field-del" onClick={() => delVar(i)}><Trash2 size={12} /></div>
        </div>
      ))}
      <div className="btn-act-add-field" onClick={addVar}><Plus size={12} /> Add variable</div>
    </div>
  );
}

export function ActionConfigEditor({ action, onChange, onDelete, notionPages, blockTypes }) {
  const [open, setOpen] = useState(false);
  const cfg = action.config || {};
  const def = ACTION_DEFS[action.type];

  const renderConfig = () => {
    const props = { config: cfg, onChange: (c) => onChange({ ...action, config: c }), notionPages, blockTypes, label: def?.label || '' };
    switch (action.type) {
      case 'insertBlock': return <ActionConfigInsertBlock {...props} />;
      case 'openUrl': return <ActionConfigOpenUrl {...props} />;
      case 'showConfirmation': return <ActionConfigConfirmation {...props} />;
      case 'openPage': return <ActionConfigOpenPage {...props} />;
      case 'sendNotification': return <ActionConfigNotification {...props} />;
      case 'addToDatabase': return <ActionConfigDatabase {...props} />;
      case 'editDatabase': return <ActionConfigDatabase {...props} />;
      case 'form': return <ActionConfigForm {...props} />;
      case 'defineVariables': return <ActionConfigVariables {...props} />;
      default: return null;
    }
  };

  return (
    <div className={`btn-act-item${open ? ' btn-act-open' : ''}`}>
      <div className="btn-act-header" onClick={() => setOpen(!open)}>
        <GripVertical size={14} className="btn-act-grip" />
        <span className={`btn-act-dot`} style={{ background: def?.color || '#999' }} />
        <span className="btn-act-type">{action.label || def?.label}</span>
        <label className="btn-act-toggle" onClick={e => e.stopPropagation()}>
          <input type="checkbox" checked={action.enabled !== false} onChange={e => onChange({ ...action, enabled: e.target.checked })} />
        </label>
        <div className="btn-act-del" onClick={(e) => { e.stopPropagation(); onDelete(); }}><Trash2 size={13} /></div>
        <ChevronDown size={14} className={`btn-act-chevron${open ? ' rotated' : ''}`} />
      </div>
      {open && renderConfig()}
    </div>
  );
}

/* ── Action execution engine ── */
export function executeActions(actions, ctx) {
  const { block, addBlock, updateBlockProperty, setDeleteConfirm } = ctx;
  const run = async (index) => {
    if (index >= actions.length) return;
    const action = actions[index];
    if (!action.enabled) { run(index + 1); return; }
    const cfg = action.config || {};
    try {
      switch (action.type) {
        case 'insertBlock': {
          addBlock(cfg.blockType || 'paragraph', block.id, cfg.content || '');
          run(index + 1);
          break;
        }
        case 'openUrl': {
          if (cfg.url) window.open(cfg.url, cfg.newTab !== false ? '_blank' : '_self', 'noopener');
          run(index + 1);
          break;
        }
        case 'showConfirmation': {
          setDeleteConfirm({
            type: 'action',
            blockId: block.id,
            title: cfg.title || 'Are you sure?',
            message: '',
            cancelText: cfg.cancelText || 'Cancel',
            confirmText: cfg.confirmText || 'Continue',
            onConfirm: () => { setDeleteConfirm(null); run(index + 1); },
            onCancel: () => setDeleteConfirm(null)
          });
          break;
        }
        case 'openPage': {
          if (cfg.pageId) {
            const navigate = ctx.navigateRef?.current;
            if (navigate) navigate(`/notion/${cfg.pageId}`);
          }
          run(index + 1);
          break;
        }
        case 'sendNotification': {
          if (cfg.message) {
            const notify = ctx.notifyRef?.current;
            if (notify) notify(cfg.message, cfg.type || 'info', cfg.title);
          }
          run(index + 1);
          break;
        }
        case 'addToDatabase':
        case 'editDatabase': {
          // Placeholder - will be integrated with database system
          run(index + 1);
          break;
        }
        case 'form': {
          // For now, just proceed
          run(index + 1);
          break;
        }
        case 'defineVariables': {
          const variables = cfg.variables || [];
          if (variables.length > 0 && ctx.setVariablesRef?.current) {
            ctx.setVariablesRef.current(variables);
          }
          run(index + 1);
          break;
        }
        default: run(index + 1);
      }
    } catch {
      run(index + 1);
    }
  };
  run(0);
}

