/**
 * Client-side Ziva service URL resolution (host app → Ziva API).
 * Host apps should set VITE_ZIVA_API_URL in their .env (see example.env.ziva.txt).
 */

/** Default port when running `npm run server` inside ziva-chat-module. */
export const ZIVA_DEFAULT_SERVICE_PORT = 5199;

export const ZIVA_DEFAULT_STANDALONE_API_URL = `http://127.0.0.1:${ZIVA_DEFAULT_SERVICE_PORT}/api/ziva`;

/**
 * Resolve Groq API base for chat + object-fields.
 * Priority: ZivaChat config.api.baseUrl → VITE_ZIVA_API_URL → same-origin /api/ziva
 */
export function resolveZivaApiBaseUrl(config) {
  const fromConfig = config?.api?.baseUrl;
  if (fromConfig && String(fromConfig).trim()) return String(fromConfig).trim().replace(/\/$/, '');

  try {
    const v =
      typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_ZIVA_API_URL;
    if (v && String(v).trim()) return String(v).trim().replace(/\/$/, '');
  } catch {
    /* non-Vite */
  }

  return '/api/ziva';
}
