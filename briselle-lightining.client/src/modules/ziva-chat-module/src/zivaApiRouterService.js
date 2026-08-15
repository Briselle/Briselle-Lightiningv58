/* ============================================================
   Ziva AI Chat Module — zivaApiRouterService.js
   Centralized AI API Provider Registry & Backend Module Router
   Created At: 2026-08-02 | Briselle Enterprise Platform
   ============================================================ */

const STORAGE_KEY = 'briselle_ziva_api_providers_v1';

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
    const match = providers.find(p => p.active && p.apiKey && Array.isArray(p.scopes) && p.scopes.includes(scopeTag));
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
