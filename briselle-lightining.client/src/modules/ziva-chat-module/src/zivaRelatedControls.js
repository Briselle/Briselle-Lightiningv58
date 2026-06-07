/**
 * Related controls — Objects L2 menu + phase-aware workflow actions.
 */

export function buildBaseRelatedControls(session = {}) {
  const flow = session.createFlow || null;
  const mode = session.workflowMode || null;
  const objectStep = session.objectPickStep || null;
  const wizardStep = session.wizardStep || null;
  /** @type {{ id: string, label: string, action: string, url?: string, value?: number | string }[]} */
  const controls = [];

  if (flow) {
    controls.push({ id: 'exit_create', label: 'Exit Object Creation', action: 'exit_create' });
    if (flow === 'confirm_schema') {
      controls.push({ id: 'create_it', label: 'Create the object', action: 'create_it' });
    }
    /* Top N field counts are AI Suggestions (sendText), not Related Controls. */
    controls.push({ id: 'exit_home', label: 'Exit to home', action: 'exit_home' });
    return controls;
  }

  if (mode && mode !== 'create_object') {
    /* Top N object list examples are AI Suggestions (sendText), not Related Controls. */
    if (objectStep === 'ready' && mode === 'load_object') {
      controls.push({ id: 'open_object', label: 'Open Object', action: 'edit_object' });
    }
    if (objectStep === 'ready' && mode === 'modify_object') {
      controls.push({ id: 'edit_object', label: 'Edit Object', action: 'edit_object' });
      controls.push({ id: 'rename_object', label: 'Rename Object', action: 'rename_object' });
      controls.push({ id: 'remove_object', label: 'Delete Object', action: 'remove_object' });
    }
    controls.push({ id: 'exit_objects_menu', label: 'Exit to Objects menu', action: 'exit_to_objects_menu' });
    controls.push({ id: 'exit_home', label: 'Exit to home', action: 'exit_home' });
    return controls;
  }

  if (wizardStep === 'object_actions') {
    controls.push({ id: 'exit_previous', label: 'Exit to previous step', action: 'exit_previous' });
    controls.push({ id: 'exit_home', label: 'Exit to home', action: 'exit_home' });
    return controls;
  }

  controls.push({ id: 'open_objects', label: 'Objects', action: 'open_objects_menu' });
  return controls;
}

const ALLOWED_ACTIONS = new Set([
  'start_create',
  'start_workflow',
  'open_objects_menu',
  'exit_create',
  'exit_workflow',
  'exit_to_objects_menu',
  'exit_previous',
  'exit_home',
  'rename_object',
  'edit_object',
  'remove_object',
  'delete_object',
  'select_object',
  'add_field',
  'remove_field',
  'rename_field',
  'create_it',
  'pick_count',
  'list_objects',
  'navigate',
]);

export function normalizeRelatedControls(raw, session) {
  const base = buildBaseRelatedControls(session);
  const byId = new Map(base.map((b) => [b.id, { ...b }]));

  for (const item of Array.isArray(raw) ? raw : []) {
    const action = String(item?.action ?? '').trim();
    if (!action || !ALLOWED_ACTIONS.has(action)) continue;
    const id = String(item?.id ?? `${action}_${item?.value ?? ''}`).trim() || action;
    const match = base.find((b) => b.id === id || (b.action === action && b.value === item?.value));
    byId.set(id, {
      id,
      label: String(item?.label ?? match?.label ?? action).trim() || action,
      action: action === 'delete_object' ? 'remove_object' : action,
      url: item?.url ?? match?.url,
      value: item?.value ?? match?.value,
    });
  }

  return [...byId.values()];
}

export function normalizeNavigateLinks(raw) {
  const out = [];
  const seen = new Set();
  for (const item of Array.isArray(raw) ? raw : []) {
    const url = String(item?.url ?? '').trim();
    const label = String(item?.label ?? '').trim();
    if (!url || !label || !url.startsWith('/')) continue;
    const key = `${label}:${url}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ label, url });
    if (out.length >= 6) break;
  }
  return out;
}

export function normalizeAiSuggestions(raw) {
  const out = [];
  for (const item of Array.isArray(raw) ? raw : []) {
    const command = String(item?.command ?? '').trim();
    const label = String(item?.label ?? '').trim();
    if (!command.toLowerCase().startsWith('add ')) continue;
    const spec = command.replace(/^add\s+/i, '').trim();
    if (!spec) continue;
    out.push({
      command,
      label: label || spec.replace(/\s*\([^)]+\)\s*$/, '').trim(),
      spec,
    });
    if (out.length >= 3) break;
  }
  return out;
}
