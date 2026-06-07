/**
 * Chat model options.
 * `disabled: true` = shown in the picker but not selectable (Cursor-hosted models).
 * `group` = section header label in the picker list.
 */

export const ZIVA_CHAT_MODELS = [
  // ── Briselle / Groq (active) ─────────────────────────────────────────────
  { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B', group: 'Groq (active)' },
  { id: 'llama-3.1-8b-instant',    label: 'Llama 3.1 8B',  group: 'Groq (active)' },
  { id: 'mixtral-8x7b-32768',      label: 'Mixtral 8x7B',  group: 'Groq (active)' },
  { id: 'gemma2-9b-it',            label: 'Gemma 2 9B',    group: 'Groq (active)' },

  // ── Cursor / Anthropic (coming soon) ────────────────────────────────────
  { id: 'claude-opus-4-7-thinking-xhigh', label: 'Claude Opus (thinking)', group: 'Cursor models', disabled: true },
  { id: 'claude-4.6-sonnet-medium-thinking', label: 'Claude Sonnet 4.6', group: 'Cursor models', disabled: true },
  { id: 'claude-4.5-sonnet-thinking', label: 'Claude Sonnet 4.5', group: 'Cursor models', disabled: true },
  { id: 'claude-4.5-opus-high-thinking', label: 'Claude Opus 4.5', group: 'Cursor models', disabled: true },

  // ── Cursor / OpenAI (coming soon) ────────────────────────────────────────
  { id: 'gpt-5.5-medium',  label: 'GPT-5.5',   group: 'Cursor models', disabled: true },
  { id: 'gpt-5.3-codex',  label: 'GPT-5.3 Codex', group: 'Cursor models', disabled: true },
  { id: 'gpt-5.2-codex',  label: 'GPT-5.2 Codex', group: 'Cursor models', disabled: true },
  { id: 'gpt-5.1-codex-max-medium', label: 'GPT-5.1 Codex Max', group: 'Cursor models', disabled: true },

  // ── Cursor / Google (coming soon) ────────────────────────────────────────
  { id: 'composer-2.5-fast', label: 'Composer 2.5', group: 'Cursor models', disabled: true },
  { id: 'composer-2-fast',   label: 'Composer 2',   group: 'Cursor models', disabled: true },
];

export const ZIVA_DEFAULT_MODEL = 'llama-3.3-70b-versatile';

export function resolveModelForRequest(selectedModel) {
  if (!selectedModel || selectedModel === 'auto') {
    return ZIVA_DEFAULT_MODEL;
  }
  return selectedModel;
}
