/* ============================================================
   Briselle Enterprise Platform — Settings / AI Providers Config
   AiProvidersConfigPage.tsx — page shell and tab router
   Created At: 2026-08-22 | Last Modified: 2026-08-22
   Previous Version Back URL: .agents-backups/AiProvidersConfigPage.tsx.20260822-130400

   Task: BRIS-AI-T151 / T174 / T187

   Route: /settings/ai-providers

   ── Tabs ───────────────────────────────────────────────────────
   Providers · Modules · MCP Connectors

   Two tabs went away in this round:
     Models              -> a sub-page of one provider, because a model
                            has no meaning apart from its endpoint
                            (ProviderModelsPage.tsx, T174)
     AI Configurations   -> folded into Modules, which derives the same
                            record from a provider + model choice
                            (ModulesTab.tsx, T187)

   ── This page names no product module ──────────────────────────
   Nothing here mentions NotionNest, Ziva or meeting notes. The "Platform
   Modules" tab lists AI FUNCTIONS read from the database — never a
   hardcoded product list. Checked by
   .agents/scripts/verify-ai-config-boundary.js.
   ============================================================ */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, BrainCircuit, Check, Layers, Loader2, Plug, Plug2, ShieldCheck, X } from 'lucide-react';
import { ProvidersTab } from './ProvidersTab';
import { ModulesTab } from './ModulesTab';
import { McpConnectorsTab } from './McpConnectorsTab';
import { InfoHint } from './AiConfigBits';
import { useAiConfig } from './useAiConfig';
import './AiProvidersConfig.css';

type TabKey = 'providers' | 'modules' | 'mcp';

const TABS: Array<{ key: TabKey; label: string; icon: React.ReactNode }> = [
  { key: 'providers', label: 'Providers', icon: <Plug size={15} /> },
  { key: 'modules', label: 'Briselle Platform Modules', icon: <Layers size={15} /> },
  { key: 'mcp', label: 'MCP Connectors', icon: <Plug2 size={15} /> },
];

export default function AiProvidersConfigPage() {
  const [tab, setTab] = useState<TabKey>('providers');
  const state = useAiConfig();
  const { doc, loading, error, notice, setError, setNotice } = state;

  const counts: Record<TabKey, number> = {
    providers: doc.providers.length,
    modules: doc.capabilities.filter((c) => c.aiEnabled).length,
    mcp: doc.mcpServers.length,
  };

  return (
    <div className="aipc-page">
      <div className="aipc-header">
        <Link to="/settings" className="aipc-back">
          <ArrowLeft size={15} /> Settings
        </Link>
        {/* T208: the page explanation and the security notice moved onto
            the title as info icons. Two permanent paragraphs above a table
            pushed the actual content below the fold on a laptop. */}
        <div className="aipc-title-row">
          <BrainCircuit size={22} />
          <h1 className="aipc-title">AI Providers Config</h1>
          <InfoHint text="Register AI providers and their models, then switch on the platform modules that use them. Every AI feature on the platform resolves through what is configured here." />
          <span className="aipc-title-note">
            <ShieldCheck size={13} />
            <span>Keys in Vault</span>
            <InfoHint text="API keys are stored in Supabase Vault. They are never written into the configuration document, never saved to browser storage, and cannot be read back by this page. Saved-provider verification and every AI call run server-side in the ai-gateway Edge Function." />
          </span>
        </div>
      </div>

      {/* The row is created on first save, so its absence is a warning
          rather than a blocker. 022 IS a blocker, but only for
          credentials — providers, models and modules save fine without
          it, which is why the two are stated separately. */}
      {doc.missing && !loading && (
        <div className="aipc-notice warn">
          <AlertTriangle size={16} />
          <div>
            <strong>Not yet initialised for this entity.</strong>
            <div>
              You can configure providers, models and modules now — the record is created on your
              first save. Two things still need the Supabase SQL editor:{' '}
              <code className="aipc-code">database/021_platform_ai_config.sql</code> installs the
              database-level guard against plaintext credentials and seeds the module vocabulary, and{' '}
              <code className="aipc-code">database/022_ai_credentials_vault.sql</code> is{' '}
              <strong>required before any API key can be stored</strong>.
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="aipc-notice error" role="alert">
          <AlertTriangle size={16} />
          <div>{error}</div>
          <button type="button" className="aipc-icon-btn" onClick={() => setError('')} aria-label="Dismiss">
            <X size={15} />
          </button>
        </div>
      )}

      {notice && (
        <div className="aipc-notice ok" role="status">
          <Check size={16} />
          <div>{notice}</div>
          <button type="button" className="aipc-icon-btn" onClick={() => setNotice('')} aria-label="Dismiss">
            <X size={15} />
          </button>
        </div>
      )}

      <div className="aipc-tabbar" role="tablist" aria-label="AI configuration sections">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            className={`aipc-tabbtn${tab === t.key ? ' active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.icon}
            <span>{t.label}</span>
            {counts[t.key] > 0 && <span className="aipc-count">{counts[t.key]}</span>}
          </button>
        ))}
      </div>

      <div className="aipc-body">
        {loading ? (
          <div className="aipc-loading">
            <Loader2 size={20} className="aipc-spin" />
            <span>Loading AI configuration…</span>
          </div>
        ) : (
          <>
            {tab === 'providers' && <ProvidersTab state={state} />}
            {tab === 'modules' && <ModulesTab state={state} />}
            {tab === 'mcp' && <McpConnectorsTab state={state} />}
          </>
        )}
      </div>
    </div>
  );
}
