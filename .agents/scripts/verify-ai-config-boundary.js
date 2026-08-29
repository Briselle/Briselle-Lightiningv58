#!/usr/bin/env node
/* ============================================================
   Briselle Platform — .agents/scripts/verify-ai-config-boundary.js
   Created At: 2026-08-22 | Task: BRIS-AI-T162v

   Two invariants that a green `vite build` will never catch, and that a
   code review will eventually forget:

     1. MODULE INDEPENDENCE. The AI configuration layer must not name
        any module. The moment it does, the abstraction is gone and the
        next module needs its own branch.

     2. NO CREDENTIALS IN THE CLIENT. No plaintext API key may be
        written into the AI configuration document, stored in browser
        storage, or sent from the browser to a provider.

   Run:  node .agents/scripts/verify-ai-config-boundary.js
   Exit: 0 clean, 1 violations found.
   ============================================================ */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const CLIENT = path.join(ROOT, 'briselle-lightining.client', 'src');

/* ── Rule 1: the AI config layer names no module ────────────────── */
const INDEPENDENT_PATHS = [
  path.join(CLIENT, 'pages', 'settings', 'ai-providers'),
  path.join(CLIENT, 'services', 'platformAiConfigTypes.ts'),
  path.join(CLIENT, 'services', 'platformAiConfigService.ts'),
  path.join(CLIENT, 'services', 'platformAiConfigValidation.ts'),
  path.join(CLIENT, 'services', 'aiGatewayClient.ts'),
  path.join(CLIENT, 'services', 'aiProviderPreSaveVerify.ts'),
  path.join(CLIENT, 'components', 'ui', 'useDragReorder.ts'),
  path.join(CLIENT, 'components', 'ui', 'TagMultiSelect.tsx'),
  path.join(ROOT, 'supabase', 'functions', 'ai-gateway'),
];

/* Module names that must not appear as identifiers or imports.
   Deliberately NOT matched inside comments or user-facing strings: the
   point is that no CODE branches on a module, not that the word may
   never be written down. */
const FORBIDDEN_MODULES = ['NotionNest', 'notion-nest', 'notionNest', 'MeetingNotes', 'ZivaChat', 'ziva-chat'];

/* ── Rule 2: no credentials client-side ────────────────────────── */
const SECRET_WRITE_PATTERNS = [
  { re: /localStorage\s*\.\s*setItem\s*\(\s*[^)]*(?:key|token|secret|api)/i, why: 'writes a credential-looking value to localStorage' },
  { re: /sessionStorage\s*\.\s*setItem\s*\(\s*[^)]*(?:key|token|secret|api)/i, why: 'writes a credential-looking value to sessionStorage' },
  { re: /\bapiKey\s*:/, why: 'puts an apiKey field on an object in the AI config layer' },
];

const errors = [];
const warnings = [];

function walk(target, out = []) {
  if (!fs.existsSync(target)) return out;
  const stat = fs.statSync(target);
  if (stat.isFile()) { out.push(target); return out; }
  fs.readdirSync(target).forEach((name) => walk(path.join(target, name), out));
  return out;
}

/** Strip comments and string literals so only code is inspected. */
function codeOnly(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ')
    .replace(/'(?:[^'\\\n]|\\.)*'/g, "''")
    .replace(/"(?:[^"\\\n]|\\.)*"/g, '""')
    .replace(/`(?:[^`\\]|\\.)*`/g, '``');
}

const files = INDEPENDENT_PATHS.flatMap((p) => walk(p))
  .filter((f) => /\.(ts|tsx|js|jsx)$/.test(f));

if (files.length === 0) {
  console.error('No AI config files found — check the paths in this script.');
  process.exit(1);
}

files.forEach((file) => {
  const rel = path.relative(ROOT, file);
  const source = fs.readFileSync(file, 'utf8');
  const code = codeOnly(source);

  FORBIDDEN_MODULES.forEach((name) => {
    if (code.includes(name)) {
      errors.push(`${rel}: references module "${name}" in code. The AI configuration layer must know nothing about modules — they consume it by configuration id.`);
    }
  });

  /* The ai-gateway Edge Function is the ONE component permitted to hold
     a credential — that is its entire purpose, and it runs server-side
     with the service-role key. Applying the client rule to it would
     flag the correct design as a violation. It is checked instead for
     sanitising its errors, below. */
  const relPosix = rel.split(path.sep).join('/');
  const isGateway = relPosix.includes('supabase/functions/ai-gateway');

  /* ── The single audited client-side exemption ──────────────────
     aiProviderPreSaveVerify.ts takes a raw key as a function ARGUMENT to
     ping GET /models before that key is stored. It is allowed because
     the key is one the administrator has just typed — it is already in
     the page — and because it is never assigned to state, persisted,
     or logged.

     Guarded, not merely exempted: the two checks below assert that the
     file continues to behave that way, so the exemption cannot quietly
     become a licence to store a credential. */
  const isPreSaveVerify = relPosix.endsWith('services/aiProviderPreSaveVerify.ts');
  if (isPreSaveVerify) {
    if (/localStorage|sessionStorage|useState|setState/.test(code)) {
      errors.push(`${rel}: the pre-save verify exemption permits a transient argument only — this file now stores or persists a credential.`);
    }
    if (!/function redact\(/.test(source)) {
      errors.push(`${rel}: lost its redact() helper. A provider error body can echo the key back, and this is the only thing stopping it being displayed.`);
    }
  }

  SECRET_WRITE_PATTERNS.forEach(({ re, why }) => {
    if (isGateway || isPreSaveVerify) return;
    const m = code.match(re);
    if (m) {
      const line = source.slice(0, source.indexOf(m[0].trim().slice(0, 20))).split('\n').length;
      errors.push(`${rel}:${line}: ${why} — credentials belong in Supabase Vault, referenced by credentialRef.`);
    }
  });
});

/* ── Rule 2b: the gateway must sanitise before returning or logging ──
   It holds the credential, so an unsanitised provider error body is the
   realistic way one leaks: providers do echo request context back. */
const gatewayFiles = files.filter((f) => f.split(path.sep).join("/").includes("supabase/functions/ai-gateway"));
gatewayFiles.forEach((file) => {
  const rel = path.relative(ROOT, file);
  const source = fs.readFileSync(file, "utf8");
  /* Only files that actually TALK to a provider. adapters/index.ts is a
     registry — it re-exports the sanitiser without calling one, and
     demanding a call there would be a rule about file names rather than
     about where a credential can leak. */
  if (!/\bfetch\s*\(/.test(source)) return;
  if (!/sanitizeProviderError/.test(source)) {
    errors.push(rel + ": handles provider errors without sanitizeProviderError. A provider error body can echo the Authorization header, which would then reach the response or the log.");
  }
});

/* ── Rule 3: the plaintext-key trigger is still in the migration ── */
const migration = path.join(ROOT, 'database', '021_platform_ai_config.sql');
if (!fs.existsSync(migration)) {
  errors.push('database/021_platform_ai_config.sql is missing.');
} else {
  const sql = fs.readFileSync(migration, 'utf8');
  if (!/check_no_plaintext_credentials/.test(sql)) {
    errors.push('021_platform_ai_config.sql no longer installs the check_no_plaintext_credentials trigger. Without it, "no plaintext keys in platform_config" is a convention rather than a constraint.');
  }
}

/* ── Rule 4: ai_credential_get is service_role only ─────────────── */
const vault = path.join(ROOT, 'database', '022_ai_credentials_vault.sql');
if (!fs.existsSync(vault)) {
  errors.push('database/022_ai_credentials_vault.sql is missing.');
} else {
  const sql = fs.readFileSync(vault, 'utf8');
  const grant = sql.match(/GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+ai_credential_get\s*\([^)]*\)\s*TO\s+([^;]+);/i);
  if (!grant) {
    errors.push('022_ai_credentials_vault.sql does not grant ai_credential_get to anyone. The gateway will not be able to read a credential.');
  } else {
    const roles = grant[1].split(',').map((r) => r.trim().toLowerCase());
    const leaked = roles.filter((r) => r === 'anon' || r === 'authenticated' || r === 'public');
    if (leaked.length) {
      errors.push(`022_ai_credentials_vault.sql grants ai_credential_get to ${leaked.join(', ')}. Only service_role may read a secret — otherwise the browser can fetch API keys directly.`);
    }
  }
  if (!/REVOKE\s+ALL\s+ON\s+FUNCTION\s+ai_credential_get/i.test(sql)) {
    warnings.push('022_ai_credentials_vault.sql does not REVOKE ai_credential_get from PUBLIC. SECURITY DEFINER functions are PUBLIC-executable by default.');
  }
}

/* ── Report ─────────────────────────────────────────────────────── */
console.log(`Scanned ${files.length} AI configuration file(s).\n`);

if (warnings.length) {
  console.log('WARNINGS');
  warnings.forEach((w) => console.log('  ! ' + w));
  console.log('');
}

if (errors.length) {
  console.log('VIOLATIONS');
  errors.forEach((e) => console.log('  x ' + e));
  console.log(`\n${errors.length} violation(s).`);
  process.exit(1);
}

console.log('Clean: no module references, no client-side credentials, secret RPC is service_role only.');
process.exit(0);
