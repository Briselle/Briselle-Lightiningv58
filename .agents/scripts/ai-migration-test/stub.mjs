/* Stub for platformAiConfigService, so the REAL router logic can be
   exercised without Supabase. Only the import boundary is replaced. */
export let currentDoc = {
  version: 1,
  providers: [], models: [], configurations: [], mcpServers: [],
  capabilities: [
    { id: 'stt', label: 'Speech to Text' },
    { id: 'summarization', label: 'Summarization' },
    { id: 'translation', label: 'Translation Engine' },
    { id: 'chat', label: 'Chat Orchestrator' },
    { id: 'schema_controller', label: 'Schema Controller' },
  ],
  missing: true,
};

export const saved = [];

export async function loadAiDocument() {
  return JSON.parse(JSON.stringify(currentDoc));
}

export async function saveAiDocument(doc) {
  /* Mimic the real service's secret stripping so the test sees what would
     actually be persisted. */
  const SECRET_KEYS = ['apiKey', 'api_key', 'secret', 'token', 'password'];
  const strip = (r) => {
    const c = { ...r };
    SECRET_KEYS.forEach((k) => delete c[k]);
    return c;
  };
  const clean = {
    ...doc,
    providers: (doc.providers || []).map(strip),
    models: (doc.models || []).map(strip),
    configurations: (doc.configurations || []).map(strip),
    mcpServers: (doc.mcpServers || []).map(strip),
    missing: false,
  };
  saved.push(JSON.parse(JSON.stringify(clean)));
  currentDoc = clean;
  return { ok: true };
}

export function onAiConfigChanged() {
  return () => {};
}

export function setDoc(d) { currentDoc = d; }
