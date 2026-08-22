/* ============================================================
   Ziva AI Chat Module — zivaApiRouterService.js
   Centralized AI API Provider Registry & Backend Module Router
   Created At: 2026-08-02 | Briselle Enterprise Platform
   ============================================================ */

/* ══════════════════════════════════════════════════════════════════
   BRIS-AI-T159 — this registry is now backed by platform_config.

   Providers used to live in localStorage with their API KEYS IN
   PLAINTEXT, and every AI call was made from the browser with the key
   attached. Both are now administered in Settings > AI Providers Config
   and executed by the ai-gateway Edge Function.

   The public surface below is UNCHANGED and still SYNCHRONOUS —
   getZivaApiConfig() calls getPipesForScope() inside a render path and
   cannot await. So the platform document is held in a snapshot,
   refreshed asynchronously, and every accessor reads the snapshot.

   Until the snapshot has content the legacy localStorage registry is
   used exactly as before, so nothing breaks the moment this ships.
   ══════════════════════════════════════════════════════════════════ */
import { loadAiDocument, onAiConfigChanged, saveAiDocument } from '../../../services/platformAiConfigService';

const STORAGE_KEY = 'briselle_ziva_api_providers_v1';

/* Legacy scope tag <-> platform capability id.
   The scope vocabulary predates the capability vocabulary and two names
   differ. Both spellings are written onto every mapped pipe so
   providerHasScope() matches either without any caller changing. */
const CAPABILITY_TO_SCOPE = {
  stt: 'stt',
  summarization: 'summarization',
  translation: 'translation',
  chat: 'ziva_chat',
  schema_controller: 'object_controller',
};

/** Snapshot of the platform document, provider-shaped. null = not loaded. */
let _platformPipes = null;

/**
 * Is the snapshot authoritative for routing?
 *
 * ONE predicate, used by both getProviders() and isPlatformBacked().
 * They previously disagreed — getProviders() required an ACTIVE pipe
 * while isPlatformBacked() only counted them — so the flag reported
 * "platform-backed" while routing was in fact still using localStorage.
 * The test at .agents/scripts/ai-migration-test caught it.
 */
function _snapshotIsAuthoritative() {
  return Array.isArray(_platformPipes) && _platformPipes.some(p => p && p.active);
}
let _hydratePromise = null;

export const PREDEFINED_MODULE_SCOPES = [
  { id: 'stt', label: 'Speech to Text (Whisper / Audio STT)', description: 'Audio file transcription & live speech engine' },
  { id: 'summarization', label: 'Meeting Notes Summarization', description: 'AI Meeting notes summary generation' },
  { id: 'ziva_chat', label: 'Ziva Chat Orchestrator', description: 'Interactive Ziva AI assistant response generation' },
  { id: 'object_controller', label: 'Object Module Scheme Controller', description: 'Schema building & field attribute orchestration' },
  { id: 'translation', label: 'Translation Engine', description: 'Multilingual transcription & notes translation' }
];

export const PREDEFINED_PROVIDERS = [
  {
    id: 'grok',
    name: 'Grok API (xAI / Whisper & Llama 3.3)',
    defaultBaseUrl: 'https://api.groq.com/openai/v1',
    models: [
      { id: 'whisper-large-v3-turbo', name: 'Whisper Large v3 Turbo (STT)', type: 'stt' },
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile', type: 'chat' },
      { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7b 32k', type: 'chat' }
    ],
    defaultScopes: ['stt', 'summarization', 'ziva_chat', 'translation']
  },
  {
    id: 'opencode',
    name: 'OpenCode API',
    defaultBaseUrl: 'https://api.opencode.ai/v1',
    models: [
      { id: 'opencode-coder-v2', name: 'OpenCode Coder v2', type: 'chat' },
      { id: 'opencode-orchestrator-70b', name: 'OpenCode Orchestrator 70B', type: 'chat' }
    ],
    defaultScopes: ['object_controller', 'ziva_chat']
  },
  {
    id: 'router',
    name: 'Router API Key (Unified Gateway)',
    defaultBaseUrl: 'https://router.briselle.ai/v1',
    models: [
      { id: 'router-auto-best', name: 'Router Auto (Best Available)', type: 'chat' },
      { id: 'router-fast-whisper', name: 'Router Fast Whisper', type: 'stt' }
    ],
    defaultScopes: ['stt', 'summarization', 'ziva_chat', 'object_controller', 'translation']
  },
  {
    id: 'custom',
    name: 'Custom Provider (User Defined)',
    defaultBaseUrl: '',
    models: [
      { id: 'custom-default-model', name: 'Custom Model (Default)', type: 'chat' }
    ],
    defaultScopes: ['ziva_chat']
  }
];

export class ZivaApiRouterService {
  /** Get all stored providers */
  static getProviders() {
    /* T159: the platform document wins only once it has a USABLE pipe.
       "Usable" means active, which requires a credential in Vault.

       The test at scratchpad/aitest caught why `length > 0` was wrong:
       immediately after migrating, the document holds four configurations
       but no credentialRef yet, so every mapped pipe is inactive. A
       length check therefore handed routing to a document that could not
       answer, while suppressing the legacy registry that still could —
       so the moment an admin pressed "Move providers into this page",
       every AI call died until someone had run 022 and re-entered a key.

       Requiring an active pipe means the working path keeps working right
       through the migration, and the gateway takes over the instant a
       credential lands. */
    if (_snapshotIsAuthoritative()) {
      return _platformPipes;
    }
    try {
      if (typeof localStorage === 'undefined') return ZivaApiRouterService._getDefaultProviders();
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const defaults = ZivaApiRouterService._getDefaultProviders();
        ZivaApiRouterService.saveProviders(defaults);
        return defaults;
      }
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : ZivaApiRouterService._getDefaultProviders();
    } catch (e) {
      console.warn('[ZivaApiRouter] Error loading providers:', e);
      return ZivaApiRouterService._getDefaultProviders();
    }
  }

  /** Save full providers array */
  static saveProviders(providers) {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(providers));
      }
    } catch (e) {
      console.error('[ZivaApiRouter] Failed to save providers:', e);
    }
  }

  /** Add or Update a provider configuration */
  static saveProvider(config) {
    const providers = ZivaApiRouterService.getProviders();
    const existingIdx = providers.findIndex(p => p.id === config.id);

    const providerObj = {
      id: config.id || `custom_${Date.now()}`,
      providerSource: config.providerSource || 'custom',
      name: config.name || 'Custom Provider',
      apiKey: (config.apiKey || '').trim(),
      baseUrl: (config.baseUrl || '').trim(),
      active: config.active !== false,
      scopes: Array.isArray(config.scopes) ? config.scopes : ['ziva_chat'],
      models: Array.isArray(config.models) ? config.models : [{ id: 'custom-model', name: config.name || 'Custom Model', type: 'chat' }],
      updatedAt: new Date().toISOString()
    };

    // If saving grok API key, sync to legacy localStorage key for backward compatibility
    if (providerObj.providerSource === 'grok' && providerObj.apiKey) {
      try { localStorage.setItem('briselle_groq_key', providerObj.apiKey); } catch {}
    }

    if (existingIdx >= 0) {
      providers[existingIdx] = providerObj;
    } else {
      providers.push(providerObj);
    }

    ZivaApiRouterService.saveProviders(providers);
    return providerObj;
  }

  /** Delete a provider configuration */
  static deleteProvider(providerId) {
    const providers = ZivaApiRouterService.getProviders().filter(p => p.id !== providerId);
    ZivaApiRouterService.saveProviders(providers);
  }

  /** Toggle active state of a provider */
  static toggleActive(providerId) {
    const providers = ZivaApiRouterService.getProviders();
    const item = providers.find(p => p.id === providerId);
    if (item) {
      item.active = !item.active;
      ZivaApiRouterService.saveProviders(providers);
    }
  }

  /**
   * Get the active API Key for a specific module scope tag (e.g. 'stt', 'summarization', 'ziva_chat')
   * Searches active providers that include the scope tag.
   */
  static getKeyForModuleScope(scopeTag) {
    const providers = ZivaApiRouterService.getProviders();

    // Look for active provider with key for this specific scope
    // T84: same tolerant scope matching as getPipesForScope, so STT/chat/
    // translation callers are not defeated by a label-spelled scope either.
    const match = providers.find(p =>
      p.active && p.apiKey && ZivaApiRouterService.providerHasScope(p, scopeTag)
    );
    if (match) return match.apiKey;

    // Fallback: check legacy Groq key
    try {
      const legacyKey = localStorage.getItem('briselle_groq_key');
      if (legacyKey && legacyKey.trim()) return legacyKey.trim();
    } catch {}

    // Fallback: return key from any active provider with a key
    const anyKey = providers.find(p => p.active && p.apiKey);
    return anyKey ? anyKey.apiKey : '';
  }

  /* ══════════════════════════════════════════════════════════════════
     BRIS-ZIVA-ROUTER-T83 — module-scoped provider pipeline.

     The routing contract, in order:
       1. query every configured provider;
       2. keep only those that are active, hold an API key, AND declare
          the requested module scope;
       3. order them into a sequence (explicit `priority`, else the
          stored order);
       4. callers push to pipe #1 and may fall back down the list.

     Returns a fully resolved pipe — key, baseUrl and a model suited to
     the scope — so a caller never has to hardcode a provider URL. This
     lives here rather than in a consumer because every module (STT,
     summarization, chat, translation) routes the same way.
     ══════════════════════════════════════════════════════════════════ */

  /**
   * BRIS-ZIVA-ROUTER-T84 — every spelling a stored scope may take.
   *
   * ZivaApiSettingsModal stores scope IDS ('summarization') and only
   * RENDERS the label ('Meeting Notes Summarization'). A registry written
   * by any other path — an older build, an import, a hand-edited entry —
   * can hold the label instead, and an exact `includes(id)` test then
   * reports the provider as not enabled for the module even though the
   * settings screen plainly shows the scope ticked.
   *
   * Matching accepts the id, the full label, and the label without its
   * parenthetical qualifier, all case- and whitespace-insensitive.
   */
  static _scopeAliases(scopeTag) {
    const aliases = new Set([String(scopeTag)]);
    const def = PREDEFINED_MODULE_SCOPES.find(s => s.id === scopeTag);
    if (def && def.label) {
      aliases.add(def.label);
      aliases.add(def.label.split(' (')[0]);
    }
    return new Set([...aliases].map(v => v.trim().toLowerCase()));
  }

  /** Does this provider declare the given module scope, however spelled? */
  static providerHasScope(provider, scopeTag) {
    if (!provider || !Array.isArray(provider.scopes)) return false;
    const aliases = ZivaApiRouterService._scopeAliases(scopeTag);
    return provider.scopes.some(s => aliases.has(String(s).trim().toLowerCase()));
  }

  /**
   * Why a scope did or did not resolve — so a caller can tell the user
   * whether the problem is a missing key, an inactive provider, or a
   * scope that was never ticked, instead of one blank "unavailable".
   */
  static getScopeDiagnostics(scopeTag) {
    const providers = ZivaApiRouterService.getProviders();
    const scoped = providers.filter(p => ZivaApiRouterService.providerHasScope(p, scopeTag));
    return {
      totalProviders: providers.length,
      scopedProviders: scoped.length,
      scopedMissingKey: scoped.filter(p => !String(p.apiKey || '').trim()).map(p => p.name || p.id),
      scopedInactive: scoped.filter(p => p.active === false).map(p => p.name || p.id),
      /* Every distinct scope string present in the registry. If the user
         says a module is enabled and it is not in this list, the stored
         spelling is the problem. */
      knownScopes: [...new Set(providers.flatMap(p => Array.isArray(p.scopes) ? p.scopes : []))],
    };
  }

  /** Base URL declared by the predefined catalogue for a provider. */
  static _catalogueBaseUrl(provider) {
    const match = PREDEFINED_PROVIDERS.find(
      pp => pp.id === (provider.providerSource || provider.id)
    );
    return match ? match.defaultBaseUrl : '';
  }

  /** Best model on a provider for a scope: STT scopes want an stt model. */
  static _modelForScope(provider, scopeTag) {
    const models = Array.isArray(provider.models) ? provider.models : [];
    if (!models.length) return '';
    const wanted = scopeTag === 'stt' ? 'stt' : 'chat';
    const typed = models.find(m => (m.type || 'chat') === wanted);
    return (typed || models[0]).id;
  }

  /**
   * Every provider able to serve `scopeTag`, in call order.
   * @returns {Array<{providerId,providerName,apiKey,baseUrl,model,scopes}>}
   */
  static getPipesForScope(scopeTag) {
    const providers = ZivaApiRouterService.getProviders();

    return providers
      .map((provider, order) => ({ provider, order }))
      .filter(({ provider }) =>
        provider &&
        provider.active !== false &&
        /* T159: a gateway-backed pipe deliberately has NO apiKey — the
           credential lives in Vault and only the Edge Function can read
           it. Requiring a key here would filter out every correctly
           configured platform provider. */
        (String(provider.apiKey || '').trim() || provider.viaGateway === true) &&
        /* T84: tolerant of scope id OR the label the settings UI shows. */
        ZivaApiRouterService.providerHasScope(provider, scopeTag)
      )
      /* An explicit priority wins; otherwise configuration order is the
         sequence, so reordering providers reorders the pipeline. */
      .sort((a, b) =>
        (a.provider.priority ?? a.order) - (b.provider.priority ?? b.order)
      )
      .map(({ provider }) => ({
        providerId: provider.id,
        providerName: provider.name || provider.id,
        apiKey: String(provider.apiKey).trim(),
        baseUrl: String(provider.baseUrl || '').trim()
          || ZivaApiRouterService._catalogueBaseUrl(provider),
        model: ZivaApiRouterService._modelForScope(provider, scopeTag),
        scopes: provider.scopes,
        /* T159: when true the caller must route through executeAI()
           rather than fetching the provider directly — there is no key
           to fetch with. */
        viaGateway: provider.viaGateway === true,
        configurationId: provider.configurationId || '',
      }))
      /* A pipe with no endpoint cannot be called — drop it rather than
         let a caller fail mysteriously on an empty URL. A gateway pipe is
         exempt: the Edge Function resolves the URL server-side, so an
         empty one here is not a defect. */
      .filter(pipe => pipe.baseUrl || pipe.viaGateway);
  }

  /** Pipe #1 for a scope, or null when the module is not routed. */
  static getTopPipeForScope(scopeTag) {
    return ZivaApiRouterService.getPipesForScope(scopeTag)[0] || null;
  }

  /* ══════════════════════════════════════════════════════════════════
     BRIS-NN-T147 — ask the provider which models it actually has.

     PREDEFINED_PROVIDERS and _getDefaultProviders both hardcode model ids
     (llama-3.3-70b-versatile, whisper-large-v3-turbo, ...). Those lists go
     stale the moment a vendor retires or renames a model, and the symptom
     is a 404 "the model does not exist" on every AI call — with no way to
     discover a working name from inside the product.

     OpenAI-compatible providers (Groq included) expose GET /models. Asking
     is always more accurate than a list compiled months earlier.

     Returns [] on any failure — a settings screen falls back to the
     configured list rather than showing nothing.
     ══════════════════════════════════════════════════════════════════ */
  static async fetchAvailableModels(provider) {
    const baseUrl = String(provider && provider.baseUrl ? provider.baseUrl : '').replace(/[/]+$/, '');
    const apiKey = String(provider?.apiKey || '').trim();
    if (!baseUrl || !apiKey) return [];

    try {
      const res = await fetch(`${baseUrl}/models`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) {
        console.warn(`[ZivaApiRouter] GET /models failed: ${res.status} ${res.statusText}`);
        return [];
      }
      const body = await res.json();
      const list = Array.isArray(body?.data) ? body.data : [];
      return list
        .map((m) => String(m?.id || ''))
        .filter(Boolean)
        .sort()
        /* Best-effort classification so a picker can offer the right kind
           for a scope. A name is a weak signal, so anything unrecognised
           is treated as chat rather than hidden. */
        .map((id) => ({
          id,
          name: id,
          type: /whisper|transcrib|speech|stt/i.test(id) ? 'stt' : 'chat',
        }));
    } catch (e) {
      console.warn('[ZivaApiRouter] GET /models exception:', e);
      return [];
    }
  }

  /** Is a model id present on the provider right now? */
  static async isModelAvailable(provider, modelId) {
    if (!modelId) return false;
    const models = await this.fetchAvailableModels(provider);
    /* No list means we could not check — do not report a false negative. */
    if (!models.length) return true;
    return models.some((m) => m.id === modelId);
  }

  /** Get all available models from active configured providers */
  static getAllAvailableModels() {
    const providers = ZivaApiRouterService.getProviders();
    const activeProviders = providers.filter(p => p.active && p.apiKey);

    const modelsList = [];
    activeProviders.forEach(p => {
      if (Array.isArray(p.models)) {
        p.models.forEach(m => {
          modelsList.push({
            id: `${p.id}::${m.id}`,
            rawModelId: m.id,
            name: m.name,
            providerName: p.name,
            providerId: p.id,
            type: m.type || 'chat'
          });
        });
      }
    });

    if (modelsList.length === 0) {
      // Default fallback models if no custom provider is configured yet
      return [
        { id: 'grok::llama-3.3-70b-versatile', rawModelId: 'llama-3.3-70b-versatile', name: 'Groq Llama 3.3 70B', providerName: 'Grok API', providerId: 'grok', type: 'chat' },
        { id: 'grok::mixtral-8x7b-32768', rawModelId: 'mixtral-8x7b-32768', name: 'Groq Mixtral 8x7b', providerName: 'Grok API', providerId: 'grok', type: 'chat' }
      ];
    }

    return modelsList;
  }

  /* ══════════════════════════════════════════════════════════════════
     BRIS-AI-T159 — platform document hydration.

     getPipesForScope() is called synchronously from inside a render
     path, so it cannot await a database read. hydrate() does the read
     once and writes the result into the module-level snapshot; every
     accessor stays synchronous and simply reads what is there.

     Callers who CAN await should await ready() first, so the very first
     AI call of a session is not resolved against a snapshot that has
     not arrived yet.
     ══════════════════════════════════════════════════════════════════ */

  /** Map the platform AI document into legacy provider-shaped pipes. */
  static _mapPlatformDocument(doc) {
    if (!doc || doc.missing) return [];

    const providers = Array.isArray(doc.providers) ? doc.providers : [];
    const models = Array.isArray(doc.models) ? doc.models : [];
    const configurations = Array.isArray(doc.configurations) ? doc.configurations : [];

    /* Platform Modules by id, so the switch can be consulted per pipe
       without an O(n) scan inside the map. */
    const capabilityIndex = {};
    (Array.isArray(doc.capabilities) ? doc.capabilities : []).forEach(c => {
      if (c && c.id) capabilityIndex[c.id] = c;
    });

    /* One pipe per CONFIGURATION, not per provider. A configuration is
       what the gateway can execute, and it is the level at which the
       admin has already chosen a model — mapping providers instead would
       put this code back in the business of guessing one, which is the
       exact failure that produced a 404 on every AI call. */
    return configurations
      .map((config, order) => {
        const provider = providers.find(x => x.id === config.providerId);
        const model = models.find(x => x.id === config.modelId);
        if (!provider || !model) return null;

        const capabilities = Array.isArray(config.capabilities) && config.capabilities.length
          ? config.capabilities
          : (Array.isArray(provider.capabilities) ? provider.capabilities : []);

        /* BRIS-AI-T180 — the Platform Module master switch.
           A configuration whose module has AI switched off must not be
           routable. Filtering here rather than at each call site means one
           place decides, and a new caller cannot forget to check. */
        const moduleOff = capabilities.length > 0 && capabilities.every(cap => {
          const record = capabilityIndex[cap];
          return record && record.aiEnabled === false;
        });

        /* Both vocabularies on every pipe, so providerHasScope() matches
           whichever spelling a caller uses. */
        const scopes = [];
        capabilities.forEach(cap => {
          scopes.push(cap);
          const legacy = CAPABILITY_TO_SCOPE[cap];
          if (legacy && legacy !== cap) scopes.push(legacy);
        });

        return {
          id: config.id,
          providerSource: provider.id,
          name: config.name || config.id,
          /* Never a key. There is none in the browser to put here. */
          apiKey: '',
          baseUrl: String(provider.baseUrl || '').trim(),
          active: config.enabled !== false
            && provider.enabled !== false
            && model.enabled !== false
            && !moduleOff
            && !!String(provider.credentialRef || '').trim(),
          scopes: [...new Set(scopes)],
          models: [{ id: model.name, name: model.displayName || model.name, type: model.type || 'chat' }],
          /* T166: provider Routing Order first — that is the value the
             drag-and-drop list writes and the admin can actually see.
             config.priority is a v1 leftover, kept only as a fallback. */
          priority: Number.isFinite(provider.order) ? provider.order
            : (Number.isFinite(config.priority) ? config.priority : order),
          viaGateway: true,
          configurationId: config.id,
          updatedAt: config.updatedAt || null,
        };
      })
      .filter(Boolean);
  }

  /** Read the platform document into the snapshot. */
  static async hydrate() {
    try {
      const doc = await loadAiDocument();
      _platformPipes = ZivaApiRouterService._mapPlatformDocument(doc);
      return _platformPipes;
    } catch (e) {
      /* A failed read must leave the snapshot alone rather than blank it:
         blanking would drop a working configuration back to the legacy
         registry in the middle of a session. */
      console.warn('[ZivaApiRouter] platform AI document hydrate failed:', e && e.message ? e.message : e);
      return _platformPipes || [];
    }
  }

  /** Await the first hydration. Safe to call repeatedly. */
  static ready() {
    if (!_hydratePromise) _hydratePromise = ZivaApiRouterService.hydrate();
    return _hydratePromise;
  }

  /** True when routing resolves from platform_config, not localStorage. */
  static isPlatformBacked() {
    return _snapshotIsAuthoritative();
  }

  /** Force a re-read. Called when the settings page saves. */
  static refresh() {
    _hydratePromise = ZivaApiRouterService.hydrate();
    return _hydratePromise;
  }

  /* ══════════════════════════════════════════════════════════════════
     BRIS-AI-T172 — the legacy registry migration has been REMOVED.

     migrateLegacyRegistry() and readLegacyRegistry() lived here.
     Providers are administered in Settings > AI Providers Config and
     the platform owner has configured them there directly, so a
     one-time importer had no remaining purpose.

     Removing it also removed a real defect the test at
     .agents/scripts/ai-migration-test caught: the migration minted
     model ids with an older slug scheme (provider-model) while
     normalizeModel() derives providerId::name. The ids therefore
     changed on the first read after import and every
     configurations[].modelId pointed at a model that no longer
     existed. Deleting the path was the honest fix; patching a code
     path already scheduled for deletion was not.

     The localStorage FALLBACK in getProviders() is deliberately
     retained for now — see the comment there. It is what keeps AI
     working until the ai-gateway function is deployed and keys are
     in Vault.
     ══════════════════════════════════════════════════════════════════ */

  /** Internal default providers generator */
  static _getDefaultProviders() {
    let legacyGroqKey = '';
    try { legacyGroqKey = localStorage.getItem('briselle_groq_key') || ''; } catch {}

    return [
      {
        id: 'grok',
        providerSource: 'grok',
        name: 'Grok API (Whisper & Llama 3.3)',
        apiKey: legacyGroqKey,
        baseUrl: 'https://api.groq.com/openai/v1',
        active: true,
        scopes: ['stt', 'summarization', 'ziva_chat', 'translation'],
        models: [
          { id: 'whisper-large-v3-turbo', name: 'Whisper Large v3 Turbo (STT)', type: 'stt' },
          { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile', type: 'chat' }
        ],
        updatedAt: new Date().toISOString()
      }
    ];
  }
}

/* ══════════════════════════════════════════════════════════════════
   BRIS-AI-T159 — keep the snapshot current.

   Hydrate once at import so the snapshot is usually present before the
   first AI call, and re-read whenever the settings page saves. Without
   the subscription a provider change would not take effect until a full
   page reload — and an admin who had just corrected a model id would see
   the same failure and conclude the fix had not worked.
   ══════════════════════════════════════════════════════════════════ */
void ZivaApiRouterService.ready();
onAiConfigChanged(() => { void ZivaApiRouterService.refresh(); });
