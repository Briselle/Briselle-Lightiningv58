/**
 * Ziva module server configuration (plug-and-play).
 * Loads from process.env, then optional `<moduleRoot>/.env.ziva`.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const ZIVA_MODULE_ROOT = join(__dirname, '..');

const DEFAULT_PORT = 5199;
const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_MODEL = 'llama-3.1-8b-instant';

function parseEnvFile(content) {
  const out = {};
  for (const line of content.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 1) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) out[key] = val;
  }
  return out;
}

function loadDotEnvZiva() {
  const path = join(ZIVA_MODULE_ROOT, '.env.ziva');
  if (!existsSync(path)) return;
  try {
    const parsed = parseEnvFile(readFileSync(path, 'utf8'));
    for (const [k, v] of Object.entries(parsed)) {
      if (process.env[k] === undefined) process.env[k] = v;
    }
  } catch (e) {
    console.warn('[Ziva] Could not read .env.ziva:', e?.message || e);
  }
}

loadDotEnvZiva();

function intPort(raw, fallback) {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 && n < 65536 ? n : fallback;
}

export function getZivaServerConfig() {
  const host = process.env.ZIVA_HOST || DEFAULT_HOST;
  const port = intPort(process.env.ZIVA_PORT, DEFAULT_PORT);
  const apiPath = '/api/ziva';
  const origin = `http://${host}:${port}`;

  return {
    host,
    port,
    apiPath,
    origin,
    apiBaseUrl: `${origin}${apiPath}`,
    groqApiKey: process.env.GROQ_API_KEY || '',
    groqModel: process.env.GROQ_MODEL || DEFAULT_MODEL,
    productName: process.env.ZIVA_PRODUCT_NAME || 'Briselle',
    baseSiteUrl: process.env.ZIVA_BASE_SITE_URL || 'https://www.briselle.com',
    /** Markdown/plain injected into general /api/ziva Q&A (object-fields uses its own prompt). */
    contextMarkdown: process.env.ZIVA_CONTEXT_MARKDOWN || '## Ziva\nAssistant for the host application.',
  };
}
