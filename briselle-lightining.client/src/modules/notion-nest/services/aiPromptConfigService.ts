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
import {
  DEFAULT_INSTRUCTION_PROMPTS,
  INSTRUCTION_PRESET_ORDER,
  INSTRUCTION_PRESET_ICONS,
} from '../blocks/meeting-notes/constants';

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
}

/**
 * The shipped prompt set, as a document.
 * Exported so the SQL seed generator and the client seed cannot diverge.
 */
export function buildDefaultPromptDocument(): PromptDocument {
  const instructions: Record<string, InstructionEntry> = {};
  INSTRUCTION_PRESET_ORDER.forEach((name) => {
    instructions[name] = {
      name,
      icon: (INSTRUCTION_PRESET_ICONS as Record<string, string>)[name] || 'FileText',
      isSystem: true,
      /* Left empty on purpose: blocks are derived from promptText on first
         edit. Storing a parse of it here would be a second copy of the same
         content that could silently disagree with the text. */
      blocks: [],
      promptText: (DEFAULT_INSTRUCTION_PROMPTS as Record<string, string>)[name] || '',
      updatedAt: null,
      updatedBy: null,
    };
  });
  return {
    schemaVersion: PROMPT_DOC_SCHEMA_VERSION,
    order: [...INSTRUCTION_PRESET_ORDER],
    instructions,
  };
}

/** Repair a document read from the DB so callers never handle a half-shape. */
function normalizeDocument(raw: any): PromptDocument {
  const fallback = buildDefaultPromptDocument();
  if (!raw || typeof raw !== 'object' || !raw.instructions) return fallback;

  const instructions: Record<string, InstructionEntry> = {};
  Object.keys(raw.instructions).forEach((key) => {
    const e = raw.instructions[key] || {};
    instructions[key] = {
      name: e.name || key,
      icon: e.icon || (INSTRUCTION_PRESET_ICONS as Record<string, string>)[key] || 'FileText',
      isSystem: e.isSystem === true,
      blocks: Array.isArray(e.blocks) ? e.blocks : [],
      promptText: typeof e.promptText === 'string' ? e.promptText : '',
      updatedAt: e.updatedAt || null,
      updatedBy: e.updatedBy || null,
    };
  });

  /* A shipped preset missing from a stored document is restored rather than
     lost — an older document simply will not have Call or Workshop. */
  fallback.order.forEach((name) => {
    if (!instructions[name]) instructions[name] = fallback.instructions[name];
  });

  const storedOrder: string[] = Array.isArray(raw.order) ? raw.order : [];
  const order = [
    ...storedOrder.filter((k) => instructions[k]),
    ...Object.keys(instructions).filter((k) => !storedOrder.includes(k)),
  ];

  return { schemaVersion: raw.schemaVersion || PROMPT_DOC_SCHEMA_VERSION, order, instructions };
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
 * Load the prompt library, seeding the row on first use.
 *
 * Seeding is idempotent: it only inserts when no row exists for the scope,
 * and a duplicate-key error (another tab seeding concurrently) is treated as
 * success and re-read rather than overwriting an existing document.
 */
export async function loadPromptDocument(): Promise<PromptDocument> {
  try {
    const row = await fetchRow();
    if (row) return normalizeDocument(row.config_json);

    const seeded = buildDefaultPromptDocument();
    const { error } = await supabase.from('platform_config').insert({
      entity_id: AI_PROMPTS_ENTITY_ID,
      dobj_id: AI_MEETING_NOTES_DOBJ_ID,
      config_name: AI_MEETING_NOTES_CONFIG_NAME,
      config_type: AI_PROMPTS_CONFIG_TYPE,
      config_description: 'AI Meeting Notes summarisation instruction prompts',
      is_default: true,
      is_active: true,
      config_json: seeded,
    });

    if (error) {
      /* 23505 = unique violation: someone else seeded it first. */
      const existing = await fetchRow();
      if (existing) return normalizeDocument(existing.config_json);
      console.warn('[AIPrompts] seed failed, using in-memory defaults:', error.message);
    }
    return seeded;
  } catch (e) {
    console.error('[AIPrompts] loadPromptDocument failed:', e);
    /* Never leave the menu empty — fall back to the shipped set. */
    return buildDefaultPromptDocument();
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
  const entry = doc.instructions[key];
  if (!entry || entry.isSystem) return null;

  delete doc.instructions[key];
  doc.order = doc.order.filter((k) => k !== key);

  return (await savePromptDocument(doc)) ? doc : null;
}

/** Restore a shipped preset to its original text, discarding local edits. */
export async function resetInstructionToDefault(key: string): Promise<PromptDocument | null> {
  const shipped = buildDefaultPromptDocument().instructions[key];
  if (!shipped) return null;

  const doc = await loadPromptDocument();
  doc.instructions[key] = { ...shipped, updatedAt: new Date().toISOString() };

  return (await savePromptDocument(doc)) ? doc : null;
}
