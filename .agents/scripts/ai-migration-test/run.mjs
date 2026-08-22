/* ============================================================
   Briselle Platform — .agents/scripts/ai-migration-test/run.mjs
   Created At: 2026-08-22 | Last Modified: 2026-08-22
   Task: BRIS-AI-T185

   Headless test of AI routing against the v2 configuration document.
   Exercises the REAL router source — only the platformAiConfigService
   import is stubbed — so the mapping, the Platform Module master switch
   and the legacy fallback are all tested as written.

   Previous version tested migrateLegacyRegistry(), which T172 removed
   after this harness found that it minted model ids under an older slug
   scheme than normalizeModel() derives.

   Run: node .agents/scripts/ai-migration-test/run.mjs
   ============================================================ */
import fs from 'node:fs';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const SRC = 'C:/BriselleServer/Briselle-Lightiningv58/briselle-lightining.client/src/modules/ziva-chat-module/src/zivaApiRouterService.js';

/* ── The legacy browser registry, as the platform owner's Ziva settings
      screenshot showed it. Still present, because the localStorage
      fallback is deliberately retained until the gateway is live. ── */
const LEGACY = [{
  id: 'grok',
  providerSource: 'grok',
  name: 'Grok API (Whisper & Llama 3.3)',
  apiKey: 'gsk_EhZfakekeyfortestingonly000000',
  baseUrl: 'https://api.groq.com/openai/v1',
  active: true,
  scopes: ['stt', 'summarization', 'ziva_chat', 'translation'],
  models: [
    { id: 'whisper-large-v3-turbo', name: 'Whisper Large v3 Turbo (STT)', type: 'stt' },
    { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile', type: 'chat' },
  ],
  updatedAt: '2026-08-01T00:00:00.000Z',
}];

const store = new Map([['briselle_ziva_api_providers_v1', JSON.stringify(LEGACY)]]);
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};

/* Only the service import is rewritten, so everything under test is the
   real shipped code. */
const original = fs.readFileSync(SRC, 'utf8');
const rewritten = original.replace(
  /import \{[^}]*\} from '\.\.\/\.\.\/\.\.\/services\/platformAiConfigService';/,
  "import { loadAiDocument, onAiConfigChanged, saveAiDocument } from './stub.mjs';"
);
if (rewritten === original) throw new Error('could not rewrite the service import — the test would be meaningless');
const TMP = path.join(HERE, 'router.under-test.mjs');
fs.writeFileSync(TMP, rewritten);

const { ZivaApiRouterService } = await import('file://' + TMP.replace(/\\/g, '/'));
const stub = await import('./stub.mjs');

let pass = 0, fail = 0;
const check = (name, cond, detail = '') => {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (detail ? '\n          ' + detail : '')); }
};

/** A realistic v2 document: one provider, two models, four modules. */
const PROVIDER_ID = 'groq-primary';
const key = (name) => PROVIDER_ID + '::' + name;

function v2Document({ credentialRef = '', modules = {} } = {}) {
  const enabled = (id, dflt = true) => (modules[id] === undefined ? dflt : modules[id]);
  return {
    version: 2,
    providers: [{
      id: PROVIDER_ID,
      name: 'Groq (Production)',
      protocol: 'openai-compatible',
      isSystemDefined: true,
      baseUrl: 'https://api.groq.com/openai/v1',
      credentialRef,
      enabled: true,
      order: 0,
      capabilities: [],
    }],
    models: [
      { id: key('whisper-large-v3-turbo'), providerId: PROVIDER_ID, name: 'whisper-large-v3-turbo', displayName: 'Whisper v3 Turbo', type: 'stt', enabled: true, contextWindow: null, maxTokensPerRequest: null, moduleTags: ['stt'], order: 0 },
      { id: key('llama-3.1-8b-instant'), providerId: PROVIDER_ID, name: 'llama-3.1-8b-instant', displayName: 'Llama 3.1 8B', type: 'chat', enabled: true, contextWindow: 128000, maxTokensPerRequest: 2048, moduleTags: ['summarization', 'translation', 'chat'], order: 1 },
    ],
    configurations: [
      { id: 'stt',           name: 'Speech to Text',    providerId: PROVIDER_ID, modelId: key('whisper-large-v3-turbo'), parameters: {}, enabled: true, capabilities: ['stt'] },
      { id: 'summarization', name: 'Summarization',     providerId: PROVIDER_ID, modelId: key('llama-3.1-8b-instant'),   parameters: {}, enabled: true, capabilities: ['summarization'] },
      { id: 'translation',   name: 'Translation',       providerId: PROVIDER_ID, modelId: key('llama-3.1-8b-instant'),   parameters: {}, enabled: true, capabilities: ['translation'] },
      { id: 'chat',          name: 'Chat Orchestrator', providerId: PROVIDER_ID, modelId: key('llama-3.1-8b-instant'),   parameters: {}, enabled: true, capabilities: ['chat'] },
    ],
    mcpServers: [],
    capabilities: [
      { id: 'stt',           label: 'Speech to Text',     aiEnabled: enabled('stt'),           order: 0 },
      { id: 'summarization', label: 'Summarization',      aiEnabled: enabled('summarization'), order: 1 },
      { id: 'translation',   label: 'Translation Engine', aiEnabled: enabled('translation'),   order: 2 },
      { id: 'chat',          label: 'Chat Orchestrator',  aiEnabled: enabled('chat'),          order: 3 },
    ],
    missing: false,
  };
}

console.log('\n1. No usable platform config — the legacy registry must still serve\n');
await ZivaApiRouterService.ready();
{
  const stt = ZivaApiRouterService.getTopPipeForScope('stt');
  const sum = ZivaApiRouterService.getTopPipeForScope('summarization');
  check('stt resolves from localStorage', !!stt && stt.model === 'whisper-large-v3-turbo', JSON.stringify(stt));
  check('summarization resolves from localStorage', !!sum && sum.model === 'llama-3.3-70b-versatile', JSON.stringify(sum));
  check('legacy pipes are NOT gateway-backed', !!stt && stt.viaGateway === false);
  check('legacy pipe carries the key (the current direct-call path)', !!stt && stt.apiKey.startsWith('gsk_'));
}

console.log('\n2. A configured document with NO credential must not hijack routing\n');
{
  /* The defect this harness caught once already: a document holding
     configurations but no credentialRef made every pipe inactive, and a
     length-based check handed routing to it anyway — suppressing the
     legacy registry that still worked. */
  stub.setDoc(v2Document({ credentialRef: '' }));
  await ZivaApiRouterService.refresh();
  const stt = ZivaApiRouterService.getTopPipeForScope('stt');
  check('stt STILL resolves', !!stt, 'got ' + JSON.stringify(stt));
  check('still on the working direct-call path', !!stt && stt.viaGateway === false);
  check('isPlatformBacked() is false without a credential', ZivaApiRouterService.isPlatformBacked() === false);
}

console.log('\n3. With a Vault credential, the gateway takes over\n');
{
  stub.setDoc(v2Document({ credentialRef: 'ai:1000000000:groq-primary' }));
  await ZivaApiRouterService.refresh();

  const stt = ZivaApiRouterService.getTopPipeForScope('stt');
  const sum = ZivaApiRouterService.getTopPipeForScope('summarization');
  const tr = ZivaApiRouterService.getTopPipeForScope('translation');
  const chat = ZivaApiRouterService.getTopPipeForScope('ziva_chat');

  check('stt is gateway-backed', !!stt && stt.viaGateway === true, JSON.stringify(stt));
  check('stt resolves the whisper wire id', stt?.model === 'whisper-large-v3-turbo', stt?.model);
  check('summarization is gateway-backed', !!sum && sum.viaGateway === true);
  check('summarization resolves the chat wire id', sum?.model === 'llama-3.1-8b-instant', sum?.model);
  check('translation resolves', !!tr, JSON.stringify(tr));
  /* The legacy scope tag must keep working: CAPABILITY_TO_SCOPE maps
     chat -> ziva_chat, and callers still use the old spelling. */
  check('legacy scope tag ziva_chat still resolves', !!chat, JSON.stringify(chat));
  check('gateway pipes carry a configurationId', !!stt?.configurationId && !!sum?.configurationId);
  check('gateway pipes carry NO apiKey', stt?.apiKey === '' && sum?.apiKey === '');
  check('isPlatformBacked() is true', ZivaApiRouterService.isPlatformBacked() === true);
}

console.log('\n4. BRIS-AI-T180 — the Platform Module master switch\n');
{
  /* Fail-closed is a core requirement, so it is tested rather than
     assumed: a module switched off must not route even though its
     provider, model and credential are all perfectly fine. */
  stub.setDoc(v2Document({
    credentialRef: 'ai:1000000000:groq-primary',
    modules: { summarization: false },
  }));
  await ZivaApiRouterService.refresh();

  const stt = ZivaApiRouterService.getTopPipeForScope('stt');
  const sum = ZivaApiRouterService.getTopPipeForScope('summarization');

  check('an ENABLED module still routes', !!stt && stt.viaGateway === true, JSON.stringify(stt));
  check('a DISABLED module does not route via the gateway',
    !sum || sum.viaGateway !== true, 'got ' + JSON.stringify(sum));

  /* A switch that only works one way is worse than none. */
  stub.setDoc(v2Document({ credentialRef: 'ai:1000000000:groq-primary' }));
  await ZivaApiRouterService.refresh();
  const back = ZivaApiRouterService.getTopPipeForScope('summarization');
  check('re-enabling restores routing', !!back && back.viaGateway === true, JSON.stringify(back));
}

console.log('\n5. BRIS-AI-T166 — Routing Order drives the pipe sequence\n');
{
  const doc = v2Document({ credentialRef: 'ai:1000000000:groq-primary' });
  doc.providers.push({
    id: 'backup-provider',
    name: 'Backup',
    protocol: 'openai-compatible',
    isSystemDefined: false,
    baseUrl: 'https://api.example.com/v1',
    credentialRef: 'ai:1000000000:backup-provider',
    enabled: true,
    /* Deliberately ordered BEFORE the primary. */
    order: -1,
    capabilities: [],
  });
  doc.models.push({
    id: 'backup-provider::backup-chat', providerId: 'backup-provider', name: 'backup-chat',
    displayName: 'Backup Chat', type: 'chat', enabled: true,
    contextWindow: null, maxTokensPerRequest: null, moduleTags: ['summarization'], order: 0,
  });
  doc.configurations.push({
    id: 'summarization-backup', name: 'Summarization (backup)',
    providerId: 'backup-provider', modelId: 'backup-provider::backup-chat',
    parameters: {}, enabled: true, capabilities: ['summarization'],
  });

  stub.setDoc(doc);
  await ZivaApiRouterService.refresh();

  const pipes = ZivaApiRouterService.getPipesForScope('summarization');
  check('both providers offer summarization', pipes.length === 2, pipes.length + ' pipe(s)');
  check('the lower Routing Order is tried first',
    pipes[0]?.providerId === 'summarization-backup' || pipes[0]?.model === 'backup-chat',
    JSON.stringify(pipes.map((p) => p.model)));
}

console.log('\n6. BRIS-AI-T173 — derived model keys stay consistent\n');
{
  const doc = stub.currentDoc;
  check('every model id is providerId::name',
    doc.models.every((m) => m.id === m.providerId + '::' + m.name),
    JSON.stringify(doc.models.map((m) => m.id)));
  check('no configuration points at a missing model',
    doc.configurations.every((c) => doc.models.some((m) => m.id === c.modelId)),
    JSON.stringify(doc.configurations.map((c) => c.modelId)));
}

console.log('\n7. BRIS-AI-T172 — the legacy migration is gone\n');
{
  check('migrateLegacyRegistry() no longer exists',
    typeof ZivaApiRouterService.migrateLegacyRegistry === 'undefined');
  check('readLegacyRegistry() no longer exists',
    typeof ZivaApiRouterService.readLegacyRegistry === 'undefined');
  /* The fallback itself is retained on purpose — it is what keeps AI
     alive until the gateway is deployed. Asserted so its eventual
     removal is a deliberate act with a failing test to notice it. */
  check('the localStorage fallback is still present (intentional)',
    fs.readFileSync(SRC, 'utf8').includes('briselle_ziva_api_providers_v1'));
}

fs.unlinkSync(TMP);
console.log('\n' + '='.repeat(60));
console.log(pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
