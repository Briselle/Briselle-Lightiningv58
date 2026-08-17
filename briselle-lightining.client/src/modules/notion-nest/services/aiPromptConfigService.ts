/* ============================================================
   Briselle Enterprise Platform — NotionNest Services
   aiPromptConfigService.ts — AI prompt library in platform_config
   Created At: 2026-08-16 | Last Modified: 2026-08-16
   Previous Version Back URL: (new file — no previous version)

   Task: BRIS-NN-MNB-T94 / T95
   Purpose: Read and write the AI prompt library that backs the Meeting
            Notes instruction menu.

   ── Where it lives ─────────────────────────────────────────────
   Table  : platform_config
   Scope  : entity_id 1000000000 (Briselle org)
            dobj_id   1000000002 (AI Meeting Notes prompts)
            config_type 8        (AIPromptsLoader)
   Name   : 'AIMeetingNotesPrompt'

   config_type 8 is new and deliberately generic: every future AI
   feature routes its prompts through the same loader rather than
   inventing another storage path.

   The table's UNIQUE (entity_id, dobj_id, config_type) constraint
   gives exactly one prompt document per scope, so there is no
   "which row wins" question to answer.

   ── Prompts are ORG-LEVEL ──────────────────────────────────────
   A prompt edited from one meeting block changes for every meeting
   block in the org. Per-block state (which instruction is selected,
   which are hidden, the default) stays on the block itself.
   ============================================================ */
import { supabase } from '../../../utils/supabase';
/* BRIS-NN-MNB-T102: NO prompt text is imported. The database row seeded by
   database/019_add_ai_prompts_config_type.sql is the only source. If the row
   is absent the caller is told so — the client does not invent a library,
   because a code-side default is exactly what "all prompts in the database"
   rules out. */

/** platform_config.config_type — 8 = AIPromptsLoader. */
export const AI_PROMPTS_CONFIG_TYPE = 8;
export const AI_MEETING_NOTES_CONFIG_NAME = 'AIMeetingNotesPrompt';

/** Briselle org scope. Matches DB_ENTITY_ID in tabletemplates/utils/configService.ts. */
export const AI_PROMPTS_ENTITY_ID = 1000000000;
/** Dedicated dobj_id for the meeting-notes prompt document. */
export const AI_MEETING_NOTES_DOBJ_ID = 1000000002;

export const PROMPT_DOC_SCHEMA_VERSION = '1.0';

export interface InstructionEntry {
  name: string;
  icon: string;
  /** true for a shipped preset — editable, and resettable to the shipped text. */
  isSystem: boolean;
  /** NotionNest block JSON, so the editor round-trips without loss. */
  blocks: any[];
  /** Markdown actually sent to the model. */
  promptText: string;
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface PromptDocument {
  schemaVersion: string;
  order: string[];
  instructions: Record<string, InstructionEntry>;
  /** Shipped text, written only by the SQL seed. Source for reset. */
  defaults: Record<string, InstructionEntry>;
  /** true when the seed row is absent — the UI must say so. */
  missing?: boolean;
}

/** An empty library — used only when the seed row is missing. */
export function emptyPromptDocument(): PromptDocument {
  return { schemaVersion: PROMPT_DOC_SCHEMA_VERSION, order: [], instructions: {}, defaults: {}, missing: true };
}

/** Repair a document read from the DB so callers never handle a half-shape. */
function normalizeEntry(e: any, key: string): InstructionEntry {
  return {
    name: e?.name || key,
    icon: e?.icon || '',
    isSystem: e?.isSystem === true,
    blocks: Array.isArray(e?.blocks) ? e.blocks : [],
    promptText: typeof e?.promptText === 'string' ? e.promptText : '',
    updatedAt: e?.updatedAt || null,
    updatedBy: e?.updatedBy || null,
  };
}

function normalizeDocument(raw: any): PromptDocument {
  if (!raw || typeof raw !== 'object' || !raw.instructions) return emptyPromptDocument();

  const instructions: Record<string, InstructionEntry> = {};
  Object.keys(raw.instructions).forEach((k) => { instructions[k] = normalizeEntry(raw.instructions[k], k); });

  /* The shipped copy. Read-only as far as the app is concerned — it is what
     "Reset to default" restores from, so nothing here is ever written back. */
  const defaults: Record<string, InstructionEntry> = {};
  Object.keys(raw.defaults || {}).forEach((k) => { defaults[k] = normalizeEntry(raw.defaults[k], k); });

  const storedOrder: string[] = Array.isArray(raw.order) ? raw.order : [];
  const order = [
    ...storedOrder.filter((k) => instructions[k]),
    ...Object.keys(instructions).filter((k) => !storedOrder.includes(k)),
  ];

  return { schemaVersion: raw.schemaVersion || PROMPT_DOC_SCHEMA_VERSION, order, instructions, defaults, missing: false };
}

async function fetchRow(): Promise<any | null> {
  const { data, error } = await supabase
    .from('platform_config')
    .select('config_id, config_json')
    .eq('entity_id', AI_PROMPTS_ENTITY_ID)
    .eq('dobj_id', AI_MEETING_NOTES_DOBJ_ID)
    .eq('config_type', AI_PROMPTS_CONFIG_TYPE)
    .maybeSingle();

  if (error) {
    console.warn('[AIPrompts] platform_config read failed:', error.message);
    return null;
  }
  return data || null;
}

/**
 * Load the prompt library from the database.
 *
 * T102: no seeding. If the row does not exist the returned document has
 * missing:true and an empty list, and the UI says the library has not been
 * installed — rather than silently running on a compiled-in copy that would
 * then diverge from whatever the database eventually holds.
 */
export async function loadPromptDocument(): Promise<PromptDocument> {
  try {
    const row = await fetchRow();
    if (!row) {
      console.warn(
        '[AIPrompts] No AIMeetingNotesPrompt row for entity ' + AI_PROMPTS_ENTITY_ID +
        '. Run database/019_add_ai_prompts_config_type.sql.'
      );
      return emptyPromptDocument();
    }
    return normalizeDocument(row.config_json);
  } catch (e) {
    console.error('[AIPrompts] loadPromptDocument failed:', e);
    return emptyPromptDocument();
  }
}

/** Persist the whole document. Returns false on failure; never throws. */
export async function savePromptDocument(doc: PromptDocument): Promise<boolean> {
  try {
    const row = await fetchRow();
    if (!row) {
      const { error } = await supabase.from('platform_config').insert({
        entity_id: AI_PROMPTS_ENTITY_ID,
        dobj_id: AI_MEETING_NOTES_DOBJ_ID,
        config_name: AI_MEETING_NOTES_CONFIG_NAME,
        config_type: AI_PROMPTS_CONFIG_TYPE,
        config_description: 'AI Meeting Notes summarisation instruction prompts',
        is_default: true,
        is_active: true,
        config_json: doc,
      });
      if (error) throw new Error(error.message);
      return true;
    }

    const { error } = await supabase
      .from('platform_config')
      .update({ config_json: doc, lastmodified_ts: new Date().toISOString() })
      .eq('config_id', row.config_id);

    if (error) throw new Error(error.message);
    return true;
  } catch (e) {
    console.error('[AIPrompts] savePromptDocument failed:', e);
    return false;
  }
}

/** Add or replace one instruction. Returns the updated document, or null. */
export async function upsertInstruction(
  key: string,
  payload: Partial<InstructionEntry>
): Promise<PromptDocument | null> {
  const doc = await loadPromptDocument();
  /* Writing into an absent library would create a row holding only the one
     instruction just edited, with no defaults — the migration must run first. */
  if (doc.missing) return null;
  const previous = doc.instructions[key];

  doc.instructions[key] = {
    name: payload.name ?? previous?.name ?? key,
    icon: payload.icon ?? previous?.icon ?? 'FileText',
    isSystem: previous?.isSystem ?? false,
    blocks: payload.blocks ?? previous?.blocks ?? [],
    promptText: payload.promptText ?? previous?.promptText ?? '',
    updatedAt: new Date().toISOString(),
    updatedBy: payload.updatedBy ?? null,
  };

  if (!doc.order.includes(key)) doc.order.push(key);

  return (await savePromptDocument(doc)) ? doc : null;
}

/**
 * Rename in place, preserving the position in the menu order.
 * Shipped presets are not renameable — their key is the seed identity.
 */
export async function renameInstruction(
  fromKey: string,
  toKey: string
): Promise<PromptDocument | null> {
  if (!fromKey || !toKey || fromKey === toKey) return null;
  const doc = await loadPromptDocument();
  const entry = doc.instructions[fromKey];
  if (!entry || entry.isSystem || doc.instructions[toKey]) return null;

  delete doc.instructions[fromKey];
  doc.instructions[toKey] = { ...entry, name: toKey, updatedAt: new Date().toISOString() };
  doc.order = doc.order.map((k) => (k === fromKey ? toKey : k));

  return (await savePromptDocument(doc)) ? doc : null;
}

/** Delete a custom instruction. Shipped presets are reset, not deleted. */
export async function deleteInstruction(key: string): Promise<PromptDocument | null> {
  const doc = await loadPromptDocument();
  if (doc.missing) return null;
  const entry = doc.instructions[key];
  if (!entry || entry.isSystem) return null;

  delete doc.instructions[key];
  doc.order = doc.order.filter((k) => k !== key);

  return (await savePromptDocument(doc)) ? doc : null;
}

/**
 * Restore a shipped preset to its original text.
 *
 * T102: the source is config_json.defaults — the copy written by the SQL
 * seed and never touched by the app — NOT a constant in the client. A reset
 * therefore restores exactly what the database was installed with, and stays
 * correct if the shipped prompts are revised in a later migration.
 */
export async function resetInstructionToDefault(key: string): Promise<PromptDocument | null> {
  const doc = await loadPromptDocument();
  if (doc.missing) return null;

  const shipped = doc.defaults[key];
  if (!shipped) return null;   /* a custom instruction has no default */

  doc.instructions[key] = { ...shipped, updatedAt: new Date().toISOString() };
  return (await savePromptDocument(doc)) ? doc : null;
}
