/* ============================================================
   NotionNest — blocks/ButtonBlock.jsx
   Created At: 2026-07-20 | Last Modified: 2026-07-20
   Previous Version Back URL: file:///c:/BriselleServer/Briselle-Lightiningv58/briselle-lightining.client/src/modules/notion-nest/blocks.jsx#L4369
   ============================================================ */
import { useRef, useCallback, useState, memo } from 'react';
import { usePageContext } from '../core/PageContext';
import { NotionIconPicker, renderPageIcon } from '../menus/menus';
import { Plus, Settings, X } from 'lucide-react';
import { ACTION_DEFS, createAction, ActionConfigEditor, executeActions } from './shared/blockActions';

export const ButtonBlock = memo(function ButtonBlock({ block }) {
  const { updateBlockProperty, showContextMenu, addBlock, insertBlocks, setDeleteConfirm } = usePageContext();
  const [editing, setEditing] = useState(false);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [stylePickerOpen, setStylePickerOpen] = useState(false);
  const [tab, setTab] = useState('setup'); // 'setup' | 'actions'
  const textRef = useRef(null);
  const iconBtnRef = useRef(null);
  const [iconPickerPos, setIconPickerPos] = useState({ x: 0, y: 0 });

  const label = block.content || 'Button';
  const buttonIcon = block.buttonIcon || '';
  const buttonStyle = block.buttonStyle || 'primary';
  const actions = block.actions || [];

  const saveProp = useCallback((key, val) => updateBlockProperty(block.id, key, val), [block.id, updateBlockProperty]);
  const setIcon = useCallback((icon) => { saveProp('buttonIcon', icon); setIconPickerOpen(false); }, [saveProp]);
  const setStyle = useCallback((s) => { saveProp('buttonStyle', s); setStylePickerOpen(false); }, [saveProp]);
  const setActions = useCallback((acts) => saveProp('actions', acts), [saveProp]);

  const handleLabelInput = () => {
    const val = textRef.current?.textContent?.trim();
    if (val) saveProp('content', val);
  };

  const handleClick = (e) => {
    if (editing) return;
    if (actions.length === 0) {
      setEditing(true);
      return;
    }
    const navigateRef = { current: (path) => { /* navigation will be provided */ } };
    executeActions(actions, {
      block, addBlock, updateBlockProperty, setDeleteConfirm,
      navigateRef, notifyRef: { current: null }, setVariablesRef: { current: null }
    });
  };

  const STYLES = ['primary', 'secondary', 'outline', 'text'];
  const NOTION_PAGES = [];
  const BLOCK_TYPES = ['paragraph', 'heading1', 'heading2', 'heading3', 'heading4', 'heading5', 'todo', 'bulleted_list', 'numbered_list', 'toggle', 'callout', 'quote', 'code', 'divider', 'image', 'video', 'file', 'bookmark', 'equation'];

  /* ── Editing panel ── */
  if (editing) {
    const STYLE_LABELS = { primary: 'Primary (default)', secondary: 'Secondary', outline: 'Outline', text: 'Text' };
    const actionTypes = Object.keys(ACTION_DEFS);

    const addAction = (type) => {
      setActions([...actions, createAction(type)]);
    };

    const updAction = (idx, upd) => {
      const copy = [...actions];
      copy[idx] = upd;
      setActions(copy);
    };

    const delAction = (idx) => {
      setActions(actions.filter((_, i) => i !== idx));
    };

    const moveAction = (idx, dir) => {
      const copy = [...actions];
      const target = idx + dir;
      if (target < 0 || target >= copy.length) return;
      [copy[idx], copy[target]] = [copy[target], copy[idx]];
      setActions(copy);
    };

    return (
      <div className="block-content">
        <div className="btn-edit-panel">
          <div className="btn-edit-header">
            <span className="btn-edit-title">Button configuration</span>
            <div className="btn-edit-close" onClick={() => setEditing(false)}><X size={16} /></div>
          </div>

          {/* ── Tab bar ── */}
          <div className="btn-edit-tabs">
            <div className={`btn-edit-tab${tab === 'setup' ? ' active' : ''}`} onClick={() => setTab('setup')}>Setup</div>
            <div className={`btn-edit-tab${tab === 'actions' ? ' active' : ''}`} onClick={() => setTab('actions')}>Actions ({actions.length})</div>
          </div>

          {/* ── Setup tab ── */}
          {tab === 'setup' && <div className="btn-edit-setup">
            {/* Button preview */}
            <div className="btn-edit-section">
              <div className="btn-edit-section-title">Preview</div>
              <button className={`block-button block-button-${buttonStyle}`} style={{ pointerEvents: 'none' }}>
                {buttonIcon && <span className="btn-label-icon">{renderPageIcon(buttonIcon, '16px')}</span>}
                <span className="block-button-text">{label || 'Button'}</span>
              </button>
            </div>

            {/* Icon */}
            <div className="btn-edit-section">
              <div className="btn-edit-section-title">Icon</div>
              <div className="btn-edit-icon-row">
                <div ref={iconBtnRef} className="btn-edit-icon-btn" onClick={() => {
                  if (iconBtnRef.current) {
                    const r = iconBtnRef.current.getBoundingClientRect();
                    setIconPickerPos({ x: r.left, y: r.bottom + 4 });
                  }
                  setIconPickerOpen(true);
                }}>
                  {buttonIcon ? renderPageIcon(buttonIcon, '18px') : <Plus size={16} />}
                </div>
                {buttonIcon && <div className="btn-edit-icon-remove" onClick={() => setIcon('')}><X size={12} /></div>}
              </div>
              {iconPickerOpen && (
                <NotionIconPicker
                  position={iconPickerPos}
                  currentIcon={buttonIcon || ''}
                  onSelect={setIcon}
                  onClose={() => setIconPickerOpen(false)}
                />
              )}
            </div>

            {/* Label */}
            <div className="btn-edit-section">
              <div className="btn-edit-section-title">Label</div>
              <input className="btn-edit-input" type="text" defaultValue={label} onChange={e => saveProp('content', e.target.value)} placeholder="Button" />
            </div>

            {/* Style */}
            <div className="btn-edit-section">
              <div className="btn-edit-section-title">Style</div>
              <div className="btn-edit-style-row">
                {STYLES.map(s => (
                  <div key={s} className={`btn-edit-style-opt${buttonStyle === s ? ' active' : ''}`} onClick={() => setStyle(s)}>
                    <div className={`btn-edit-style-sample block-button-${s}`}>Aa</div>
                    <span>{STYLE_LABELS[s]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>}

          {/* ── Actions tab ── */}
          {tab === 'actions' && <div className="btn-edit-actions">
            <div className="btn-edit-section-title">When button is clicked, do:</div>
            {actions.length === 0 && <div className="btn-act-empty-state">No actions yet. Add an action below.</div>}
            {actions.map((act, i) => (
              <ActionConfigEditor
                key={act.id}
                action={act}
                onChange={(upd) => updAction(i, upd)}
                onDelete={() => delAction(i)}
                notionPages={NOTION_PAGES}
                blockTypes={BLOCK_TYPES}
              />
            ))}
            <div className="btn-act-add-menu">
              <div className="btn-act-add-trigger" onClick={() => {
                // Show action type dropdown
                const firstType = actionTypes[0];
                if (firstType) addAction(firstType);
              }}><Plus size={14} /> Add action</div>
              <div className="btn-act-type-list">
                {actionTypes.map(type => {
                  const def = ACTION_DEFS[type];
                  return (
                    <div key={type} className="btn-act-type-item" onClick={() => addAction(type)}>
                      <span className="btn-act-dot" style={{ background: def.color }} />
                      <span>{def.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>}
        </div>
      </div>
    );
  }

  /* ── View mode ── */
  return (
    <div className="block-content block-button-wrapper">
      <button
        className={`block-button block-button-${buttonStyle}`}
        onClick={handleClick}
        onDoubleClick={() => setEditing(true)}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          showContextMenu(e.clientX, e.clientY, [], null, 'block', block.id);
        }}
      >
        {buttonIcon && <span className="btn-label-icon">{renderPageIcon(buttonIcon, '16px')}</span>}
        <span
          ref={textRef}
          contentEditable
          suppressContentEditableWarning
          className="block-button-text"
          onBlur={handleLabelInput}
          onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
          data-placeholder="Button text"
        >
          {label}
        </span>
      </button>
      {actions.length > 0 && <div className="block-button-actions-badge" title={`${actions.filter(a => a.enabled !== false).length} action(s) configured`}>
        <Settings size={12} />
      </div>}
    </div>
  );
});
