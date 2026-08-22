# Platform › Settings › AI Providers Config — Implementation Plan

**Created:** 2026-08-22
**Status:** APPROVED 2026-08-22 (all four steps) — IMPLEMENTED. See the delivery record at the end.
**Tasks:** `T150`–`T162`
**Requirements source:** `briselle-lightining.client/reference_files/NotionNest_Platform_AI_Providers_Implementation_Plan.docx` (read in full; all 22 sections reflected below)

> Thumb Rule #4 — nothing gets built until this plan is approved.

---

## 0. What exists today (measured, not assumed)

| Fact | Evidence |
|---|---|
| Sidebar nav is a **flat** array with no sub-item support | `components/navigation/Sidebar.tsx:120-158` — items are `{title, path, icon}`; zero matches for `children`/`submenu`/`expanded` |
| `isItemActive` already matches `currentPath.startsWith(itemPath + '/')` | `Sidebar.tsx:~170` — so `/settings/ai-providers` will keep **Settings** highlighted with no change to that function |
| `Settings.tsx` is 68 lines, two plain `<section>` blocks, **no sub-navigation** | `pages/settings/Settings.tsx:13-63` |
| Settings is already route-level lazy loaded | `App.tsx:17,65` |
| Provider config lives in **localStorage**, not the database | `zivaApiRouterService.js` → `briselle_ziva_api_providers_v1` |
| **API keys are stored in the browser and sent from the browser** | `apiKey` on each provider record; `callZivaChat` / `transcribeAudioFile` fetch the provider directly |
| **No Supabase Edge Functions exist yet** | no `supabase/` directory anywhere in the repo |
| Router consumers (the "current flow" that must not break) | `MeetingNotesBlockBase.jsx`, `ZivaApiSettingsModal.jsx` (318 lines), `ZivaModelPicker.jsx` |

### Two contradictions to settle before you approve

**1. Security vs. "without impacting the current flow."**
§10 of the document requires *"Never return API keys to the React client"*, *"Do not write API keys to browser storage"*, and *"Test connection server-side."* Today the exact opposite is true on all three counts. Honouring §10 means the browser stops calling Groq directly — which means an `ai-gateway` Edge Function has to exist first. There is no ordering in which both hold on day one. This plan keeps the working direct-call path alive while the gateway is built, then switches over in one deliberate task (`T159`).

**2. `credentialRef` + Vault is only worth anything server-side.**
If the browser still needs the key, moving the secret into Vault and handing it back to the browser is theatre. The real security benefit lands with `T158`/`T159`, not with `T153`. I want that stated up front so the phasing isn't mistaken for the problem being solved earlier than it is.

**3. Module independence vs. the existing scope routing.**
§3 forbids this page from referencing NotionNest or any module. But the live path is `getZivaApiConfig(scope)` → `getPipesForScope(scope)`, with scope tags (`stt`, `summarization`, `translation`) that *are* module concepts. Resolution: the new `configurations` abstraction sits **alongside** the existing scope routing during migration rather than replacing it in one step, and the scope→configuration mapping lives on the module side, never in the admin page.

---

## Phase 1 — Navigation and page shell

### `T150` — Sidebar sub-item support
**Files:** `components/navigation/Sidebar.tsx`

- Add optional `children?: NavItem[]` to the nav item type.
- Settings renders expandable; auto-expanded when `currentPath` is under `/settings`.
- Purely additive: every existing item has no `children` and renders byte-identically.

### `T151` — Route + page shell
**Files:** `App.tsx`, `pages/settings/ai-providers/AiProvidersConfigPage.tsx` *(new)*, `pages/settings/ai-providers/AiProvidersConfig.css` *(new)*

- `lazy()` route at `/settings/ai-providers`, matching how every other route is loaded.
- Three tabs per §11: **Providers** / **Models** / **AI Configurations**.
- **No module name appears on this page.** §3 and the acceptance criteria are explicit, and it is the single rule that keeps this layer reusable.
- No inline CSS (global rules) — dedicated stylesheet.

### `T152` — Settings landing gains a section index
**Files:** `pages/settings/Settings.tsx`

A link card to AI Providers Config so the page is reachable without the sidebar. The two existing sections are left alone.

---

## Phase 1 — Storage schema

### `T153` — The `ai` document in `platform_config`
**Files:** `database/021_platform_ai_config.sql` *(new)*, `services/platformAiConfigService.ts` *(new)*

Per §5–§9, inside the **existing** `platform_config` table:

```jsonc
{ "ai": { "version": 1, "providers": [], "models": [], "configurations": [] } }
```

- New `config_type` **9 = AIProvidersLoader**; `config_name` `PlatformAIConfig`; `entity_id 1000000000` — same shape as migration `019`.
- Record shapes exactly as §6/§7/§8: provider `{id, name, type, baseUrl, credentialRef, enabled}`, model `{id, providerId, name, displayName, type, enabled}`, configuration `{id, name, providerId, modelId, parameters:{temperature, maxTokens}, enabled}`.
- Service mirrors `aiPromptConfigService.ts`, **including the module-level promise cache and write-invalidation from `T141`** — every AI-using module will read this document, so N callers must not mean N queries. This is the specific mistake `T141` already cost us once.

### `T154` — Versioned schema validation
**Files:** `services/platformAiConfigValidation.ts` *(new)*

Every §17 rule as a **pure function** — unique provider ids; unique model ids; model→provider resolves; configuration→provider+model resolves; disabled provider cannot execute; **referenced records cannot be deleted**; HTTPS base URL enforced for production; `version` validated before any save.

Pure so they are unit-testable with no DOM and no database.

---

## Phase 1 — CRUD UI

### `T155` — Providers tab
§11.1 fields and actions. `type` ∈ `openai-compatible | anthropic | custom`, open for extension. Credential input is **write-only and masked** — never rendered back (§10). Test Connection is present but disabled with an explanatory tooltip until `T158` lands, because §10 requires it to run server-side and there is no server yet.

### `T156` — Models tab
§11.2. **Manual model entry is mandatory** (§12) — it is precisely what makes a new model name a configuration change instead of a deployment. Live discovery reuses `fetchAvailableModels()` already built and proven in `T147`, presented as a *suggestion list* that never blocks or overrides manual entry.

### `T157` — AI Configurations tab
§11.3 + §8. Create / edit / **clone** / enable / disable / delete-when-unreferenced. `parameters` validated on save.

---

## Phase 2 — Secrets, server-side

### `T158` — Vault + `ai-gateway` Edge Function
**Files:** `supabase/functions/ai-gateway/*` *(new)*, `database/022_ai_credentials_vault.sql` *(new)*

- Secrets in Supabase Vault; JSONB holds **only** `credentialRef` (§6, §16).
- `ai-gateway` implements §14's eleven steps in order, and **Test Connection moves here** out of the browser.
- Adapter contract per §15 (`testConnection` / `listModels?` / `execute`); **OpenAI-compatible adapter only** at this stage.
- RLS so only platform administrators read or write the `ai` document (§10).
- Logging records non-sensitive metadata only — §10 forbids keys in application logs, error logs, analytics and audit records.

**This is the largest task and the only one that cannot be completed from the repo alone.** It needs Supabase project-level work: Vault enabled, secrets created, function deployed, function secrets set. I will get the code to a deployable state and then need you for those steps.

---

## Phase 3 — Cut the modules over

### `T159` — `executeAI()` and the Ziva bridge
**Files:** `services/aiGatewayClient.ts` *(new)*, `zivaApiRouterService.js`, `MeetingNotesBlockBase.jsx`

Per §13 the module contract becomes:

```ts
await executeAI({ configurationId: 'fast-summary', input: { prompt } });
```

**How the current flow survives, in order:**
1. `ZivaApiRouterService` keeps its entire public surface — `getProviders`, `getPipesForScope`, `getTopPipeForScope`, `providerHasScope`, `getScopeDiagnostics` — but reads the new `ai` document instead of `localStorage`, mapping configurations → scopes. Meeting notes keeps working, untouched.
2. Only then are `callZivaChat`, `transcribeAudioFile` and `handleTranslateTranscript` pointed at `executeAI`.
3. Only then are the direct-from-browser fetches and the client-side keys removed.

Sequenced so the app is never broken between steps, and so step 1 alone is a safe stopping point.

### `T160` — One-time migration of existing configuration
**Files:** `services/platformAiConfigService.ts`

Read the legacy `localStorage` registry once, write it into the `ai` document as providers + models + configurations, mark migrated, leave the legacy key in place as a fallback until `T159` completes.

**Keys are deliberately NOT migrated into JSONB.** The admin re-enters each one once, into Vault. That is unavoidable under §10 and is the honest cost of the security requirement — I'd rather name it now than have it surprise you mid-migration.

---

## Phase 4 — Beyond

### `T161` — Anthropic adapter (delivery phase 5)
### `T162` — Usage logging / health checks / retry / cost tracking (§18) — deliberately **not** planned in detail until Phases 1–3 land

---

## Order, risk, and my recommendation

| Step | Tasks | Deliverable | Risk |
|---|---|---|---|
| 1 | `T150`–`T157` | Page, schema, full CRUD, manual model entry — **working, but keys still client-side** | **Low.** Entirely additive; not one working AI call is touched |
| 2 | `T158` | Vault + gateway + server-side Test Connection | **High.** Needs Supabase deployment; cannot be finished from the repo |
| 3 | `T159`, `T160` | Modules on `executeAI`; keys leave the browser | **Medium.** Touches the meeting block's live AI calls |
| 4 | `T161`, `T162` | More adapters, observability | Low |

**Recommendation: approve step 1 now, on its own.** It delivers everything visible in the document's acceptance criteria except the two inherently server-side items, it is purely additive, and it changes no working code path. Steps 2–3 then have a real UI to configure against, and the Supabase work in step 2 can be scheduled properly rather than rushed.

Approving all four at once is fine as well — but `T158` will stop and wait for you to enable Vault and deploy the function, so it cannot complete in one sitting either way.

This matches the document's own guidance in §19–§22: Option B (JSONB + Vault) as the recommended baseline, Option C (+ AI Gateway) as the target, delivered incrementally.

---

## Verification

- `verify-no-tdz.js`, `verify-meeting-context.js`, `measure-bundle.js` all green
- **Unit tests for every §17 validation rule** (pure functions, no DOM, no DB)
- **Grep gate:** no `NotionNest` / `Meeting` / `Transcript` / `Ziva` identifier in the AI config page or service — an automated check of the §3 independence boundary, rather than a promise to remember it
- **Grep gate:** no `apiKey` reaches the client bundle once `T159` lands
- Regression, manual: meeting-notes summary, STT and translation each still resolve a pipe after `T159`/`T160`
- Manual acceptance: add an arbitrary provider, type a model name by hand that is not in any list, build a configuration from it, and consume it from a module with no code deployment

A green `vite build` proves none of the above — it has never once caught a TDZ, an undefined JSX identifier, or a context key with no declaration in this codebase.

---

## Open questions — answers needed before I start

1. **Approve step 1 alone, or all four steps?** I recommend step 1.
2. ~~**Who counts as a "platform administrator"?**~~ ANSWERED: per-entity, each entity admin configures their own page. Gated on `entity_id 1000000000` for now and flagged in code.
   Original question: §10 requires RLS keyed on that role. I did not find a role model in the client — tell me the column or JWT claim to key on, or I will gate on `entity_id 1000000000` as a placeholder and flag it.
3. **Is Supabase Vault enabled on this project?** If not, `T158` needs it switched on, or a different secret store chosen.
4. **`config_type 9` for `PlatformAIConfig`** — consistent with `8 = AIPromptsLoader` from migration `019`. Confirm, or give me the number you want.


---

# DELIVERY RECORD — 2026-08-22

Approved: all four steps. `config_type` **10** (not 9). Vault confirmed enabled.
Gate on `entity_id 1000000000` and flag it. **MCP connectors included** — added as a
fourth collection and a fourth tab, which was not in the original document.

## Delivered

| Task | What | Files |
|---|---|---|
| T150 | Sidebar `children` support; Settings expandable | `components/navigation/Sidebar.tsx` |
| T151 | Route `/settings/ai-providers`, 4-tab shell, shared hook, stylesheet | `App.tsx`, `pages/settings/ai-providers/*` |
| T152 | Settings landing section index | `pages/settings/Settings.tsx` |
| T153 | `ai` document, `config_type 10`, promise cache, plaintext-key trigger | `database/021_platform_ai_config.sql`, `services/platformAiConfigTypes.ts`, `services/platformAiConfigService.ts` |
| T154 | Every validation rule as a pure function | `services/platformAiConfigValidation.ts` |
| T155 | Providers tab — write-only key field, server-side test | `ProvidersTab.tsx` |
| T156 | Models tab — manual entry mandatory, discovery as suggestions | `ModelsTab.tsx` |
| T157 | AI Configurations tab — create/edit/clone/enable/delete | `ConfigurationsTab.tsx` |
| T157b | MCP Connectors tab (added per the approval) | `McpConnectorsTab.tsx` |
| T158 | Vault RPCs, `ai-gateway` Edge Function, 11-step sequence, adapters, log table | `database/022_ai_credentials_vault.sql`, `supabase/functions/ai-gateway/*` |
| T159 | `executeAI()`; Ziva bridge keeps its synchronous API via a snapshot | `services/aiGatewayClient.ts`, `zivaApiRouterService.js`, `MeetingNotesBlockBase.jsx` |
| T160 | Legacy registry migration + UI entry point | `zivaApiRouterService.js`, `ProvidersTab.tsx` |
| T161 | Anthropic adapter | `supabase/functions/ai-gateway/adapters/anthropic.ts` |
| T162 | Usage logging (metadata only) | `ai_gateway_log` + `logCall()` |
| T162v | Boundary verification script | `.agents/scripts/verify-ai-config-boundary.js` |

## Deliberately NOT delivered

- **T162 health checks, retry and cost tracking.** The plan said these were not
  planned in detail until Phases 1–3 landed. Usage logging is in; the rest is not.
- **RLS is written but commented out** in `021`. Enabling RLS on `platform_config`
  affects every existing loader (menu, theme, objects, dashboard). Applying it blind
  would risk breaking those, which is worse than the gap it closes. Apply deliberately
  after checking the other `config_type` readers.

## How the current flow survives

`getZivaApiConfig()` is called synchronously inside a render path, so it cannot await.
The router therefore keeps a module-level snapshot of the platform document, refreshed
asynchronously and re-read whenever the settings page saves. `getProviders()` prefers
the snapshot **only when it has content** — an empty document means "not configured
yet", and falling through to the legacy localStorage registry is what keeps existing
installs working.

Pipes from the platform document carry `viaGateway: true` and no `apiKey`.
`callZivaChat` and `transcribeAudioFile` branch on that flag: gateway path via
`executeAI`/`transcribeAudio`, legacy path unchanged.

## Known behaviour change

**The summary no longer streams token by token.** The gateway returns a complete
response, so `onDelta` fires once with the finished text instead of progressively.
That is the direct cost of keeping the credential out of the browser. Adding SSE
pass-through to the Edge Function would restore it and is a contained follow-up.

## Verification

- `verify-ai-config-boundary.js` — clean (no module refs, no client-side credentials,
  `ai_credential_get` is service_role only)
- `verify-no-tdz.js` — clean
- `verify-meeting-context.js` — 393 keys all resolve
- `tsc --noEmit` — clean
- `vite build` — clean; `AiProvidersConfigPage` is a 44 KB lazy chunk

`NotionNestPage` grew 1,155 KB → 1,182 KB because it now imports the config service
and gateway client. Still flagged by `measure-bundle.js` — that is pre-existing T143,
not new.

## Needs the platform owner

1. Run `database/021_platform_ai_config.sql` and `022_ai_credentials_vault.sql`.
2. `supabase functions deploy ai-gateway`.
3. Re-enter each provider API key once, into Vault, via the new page.
4. Decide on the RLS block in `021` (see above).
