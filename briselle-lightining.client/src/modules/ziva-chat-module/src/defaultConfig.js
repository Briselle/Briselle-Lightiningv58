/**
 * Briselle platform defaults for the Ziva floating assistant.
 */

export const defaultZivaConfig = {
  storageKey: 'ziva_platform_chat_v4',
  cacheTtlMs: 24 * 60 * 60 * 1000,

  strings: {
    welcomeMessage: 'Hi, I am Ziva, your Briselle AI. What can I help you with today?',
    modulePrompt: 'Choose a module to get started—or describe what you want to build (for example a Health Claims object).',
    objectActionPrompt: 'Pick what you want to do with Objects.',
    fieldActionPrompt: 'Next: work with fields on your object.',
    recordsActionPrompt: 'What would you like to do with Records?',
    backToModules: '← All modules',
    backToObjectActions: '← Object actions',
    inputPlaceholder: 'Ask Ziva, describe an object, or type a command…',
    composerAgentLabel: 'Ziva',
    attachImageAria: 'Attach image (coming soon)',
    voiceInputAria: 'Voice input (coming soon)',
    suggestionsLabel: 'Suggested:',
    aiSuggestionLabel: 'AI Suggestions',
    aiSuggestionsPlaceholder: 'Quick replies, Top N examples, or tap a field to add',
    relatedControlsLabel: 'Related Controls',
    relatedControlsPlaceholder: 'Workflow actions for this step',
    openChatAria: 'Open Ziva chat',
    closeChatAria: 'Close Ziva chat',
    messageZivaAria: 'Message Ziva',
    sendAria: 'Send',
    closePanelAria: 'Close chat',
    navigateLabel: 'Navigate:',
    apiUnavailablePrefix:
      'Ziva backend is not available right now. You can still use the tags and suggestions below. Details: ',
    contactIntroBot: 'Tell us briefly what you need and we will route it to your admin team.',
  },

  routes: {
    learnMorePath: '/dashboard',
    learnMoreLabel: 'Dashboard',
    homePath: '/dashboard',
  },

  assets: {
    logo: '/assets/briselle-logo.png',
    sparkle: '/assets/ziva_sparkle_white.svg',
  },

  /**
   * Groq API base. When null, client uses VITE_ZIVA_API_URL or same-origin /api/ziva.
   * Standalone module server default: http://127.0.0.1:5199/api/ziva (see example.env.ziva.txt).
   */
  api: {
    baseUrl: null,
  },

  /** Documented defaults for the optional standalone Ziva Node server (server/zivaStandaloneServer.mjs). */
  service: {
    host: '127.0.0.1',
    port: 5199,
    apiBaseUrl: 'http://127.0.0.1:5199/api/ziva',
  },

  auth: {
    openLogin: null,
    openSignup: null,
  },

  contactSubmitUrl: null,

  tagline: 'Briselle AI',
  fabLabel: 'Ziva',
};

export function mergeZivaConfig(partial) {
  if (!partial) return { ...defaultZivaConfig, strings: { ...defaultZivaConfig.strings } };
  return {
    ...defaultZivaConfig,
    ...partial,
    strings: { ...defaultZivaConfig.strings, ...(partial.strings || {}) },
    routes: { ...defaultZivaConfig.routes, ...(partial.routes || {}) },
    assets: { ...defaultZivaConfig.assets, ...(partial.assets || {}) },
    api: { ...defaultZivaConfig.api, ...(partial.api || {}) },
    service: { ...defaultZivaConfig.service, ...(partial.service || {}) },
    auth: { ...defaultZivaConfig.auth, ...(partial.auth || {}) },
  };
}
