/**
 * Standalone Ziva API process — run separately from Briselle-Lightining.
 *
 *   cd src/modules/ziva-chat-module && npm run server
 *
 * Host app points chat widget at http://127.0.0.1:5199/api/ziva (see example.env.ziva.txt).
 */
import express from 'express';
import { createZivaApiRouter } from './createZivaApi.mjs';
import { getZivaServerConfig } from './zivaServerConfig.mjs';

const cfg = getZivaServerConfig();

const app = express();

app.use((req, res, next) => {
  const allow = process.env.ZIVA_CORS_ORIGIN || '*';
  res.setHeader('Access-Control-Allow-Origin', allow);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json({ limit: '1mb' }));

/** Verify Ziva process + Groq API key and reachability (not LLM field generation). */
async function handleGroqStatusCheck(_req, res) {
  const groqConfigured = Boolean(cfg.groqApiKey);
  let groqReachable = false;
  let groqCheckError = null;

  if (groqConfigured) {
    try {
      const check = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { Authorization: `Bearer ${cfg.groqApiKey}` },
      });
      groqReachable = check.ok;
      if (!check.ok) groqCheckError = `Groq API HTTP ${check.status}`;
    } catch (err) {
      groqCheckError = err instanceof Error ? err.message : String(err);
    }
  } else {
    groqCheckError = 'GROQ_API_KEY not set in .env.ziva or environment';
  }

  const body = {
    ok: groqConfigured && groqReachable,
    service: 'ziva',
    groqConfigured,
    groqReachable,
    groqCheckError,
    groqModel: cfg.groqModel,
    apiBaseUrl: cfg.apiBaseUrl,
    llmFieldEndpoint: `${cfg.apiBaseUrl}/object-fields`,
    note: 'Dynamic fields come from POST /api/ziva/object-fields with topic in body — not from this check.',
  };

  res.json(body);
}

app.get('/GroqStatusCheck', handleGroqStatusCheck);
/** @deprecated Use /GroqStatusCheck */
app.get('/health', handleGroqStatusCheck);

app.use(
  createZivaApiRouter({
    getContext: () => cfg.contextMarkdown,
    productName: cfg.productName,
    baseSiteUrl: cfg.baseSiteUrl,
    model: cfg.groqModel,
  }),
);

app.listen(cfg.port, cfg.host, () => {
  console.log(`[Ziva] API listening on ${cfg.apiBaseUrl}`);
  console.log(`[Ziva] Groq status: http://${cfg.host}:${cfg.port}/GroqStatusCheck`);
  if (!cfg.groqApiKey) {
    console.warn('[Ziva] GROQ_API_KEY is not set — AI routes will return 501/fallback.');
  }
});
