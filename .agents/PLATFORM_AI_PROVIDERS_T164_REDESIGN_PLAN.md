# AI Providers Config — Redesign Plan (Providers → Models → Modules)

**Created:** 2026-08-22
**Status:** AWAITING APPROVAL — no code changed (Thumb Rule #4)
**Tasks:** `T164`–`T186`
**Supersedes parts of:** `.agents/PLATFORM_AI_PROVIDERS_T150_PLAN.md`

> **On tooling:** `/graphify` is an OpenCode plugin skill and is not available in this
> session. The existing `graphify-out/` analysis is dated **2026-07-29** — it predates
> every file in this feature, so using it would have been misleading. I read the code
> directly instead and state the evidence inline below.

---

## 0. Evidence gathered (measured, not assumed)

| Question | Finding |
|---|---|
| Is there a reusable drag-reorder component to reuse? | **No.** No drag-drop library in `package.json`. Three *separate inline* native-HTML5 implementations exist. |
| Where is the "Objects Table settings" reorder you referred to? | `components/ui/tabletemplates/modal-settings-sections/PresetSettingsSection.tsx:233-254`, persisting a zero-based index into `platform_config.config_json.presets[].presetOrder` via `utils/configService.ts:571-591`. **This is the pattern to copy.** |
| Is there a reusable searchable multi-select? | **No.** Nothing in `components/`. |
| Does a Briselle Platform Modules registry exist? | **No.** `config_type 4 = ModuleLoader` is declared in `001_create_platform_config.sql:19` and **never used** — zero seeds, zero reads. Modules are currently identified three inconsistent ways: `zivaKnowledge.js:7-14` (6 hardcoded ids), `Sidebar.tsx:125-173` (nav array), and folder/route names. |

Two consequences that shape this plan:

1. **The Modules registry must be created.** It does not exist. `config_type 4` is the
   reserved slot it was always meant to occupy.
2. **Per the DRY / "reusable frameworks before feature-specific code" rules, the reorder
   and multi-select must be built as shared primitives**, not as a fourth and fifth
   inline copy. Three inline drag implementations already exist; I am not adding more.

---

## 1. Your two direct questions, answered

### #8 — "Type: I really don't understand this. Remove it, or explain the purpose."

**It must stay, but I can make it almost invisible.** `type` selects the *wire protocol
adapter*, and it is not cosmetic. Anthropic differs from OpenAI in four ways the gateway
cannot guess:

| | OpenAI-compatible | Anthropic |
|---|---|---|
| Auth header | `Authorization: Bearer …` | `x-api-key` |
| Version header | none | `anthropic-version` **required** |
| System prompt | a message with `role: system` | top-level `system` field |
| `max_tokens` | optional | **required** — request rejected without it |
| Endpoint | `/chat/completions` | `/messages` |

Delete `type` and every Anthropic provider returns 401 with no way to fix it from the UI.

**What I will do instead (`T167`):** derive it from the Base URL
(`api.anthropic.com` → Anthropic, otherwise OpenAI-compatible), show it as a read-only
**"Protocol: OpenAI-compatible (detected)"** line, and put a manual override behind an
**Advanced** disclosure. You stop having to think about it; the gateway keeps working.

### Models #3 — "Is Internal id a must? Won't it confuse troubleshooting?"

**You are right. I am removing it (`T173`).**

It existed so a configuration could keep pointing at "the summarization model" while the
wire id changed underneath. But two ids for one thing is a genuine troubleshooting trap,
and the justification is weak: if the wire id changes, it *is* a different model, and a
configuration silently following that change is arguably the worse behaviour.

Models will be keyed by **`providerId` + wire model name**, which is already unique.
One id, and it is the one the provider sees in its own logs.

### #5 — "Priority Order → rename it"

**I am removing the manual number input entirely (`T166`).** You also asked for
drag-and-drop that "automatically updates the priority order" — two mechanisms writing
one value is how they drift apart. Drag order becomes the single source of truth, shown
as a read-only **`#1`, `#2`, `#3`** badge labelled **Routing Order** ("which provider is
tried first"). Reordering the list *is* the edit.

---

## 2. BLOCKING DECISION — the Edge Function

You are seeing:

> *"The ai-gateway Edge Function is not reachable. Deploy it with `supabase functions deploy ai-gateway`."*

That is not a bug — the function is written but has never been deployed, and I cannot
deploy it for you (it needs the Supabase CLI against your linked project). **Verify,
and every AI call, is blocked until this is resolved**, so it gates the whole plan.

| | **A — Deploy the gateway (recommended)** | **B — Direct browser calls (interim)** |
|---|---|---|
| Where keys live | Supabase Vault | `platform_config.config_json` |
| Who calls the provider | Edge Function | the browser |
| Key reaches the browser | never | yes, on every call |
| Needs `022` + a deploy | yes | no |
| Works today with zero setup | no | yes |
| Matches the security requirements **you specified** in the original document | yes | **no** — it violates "never return API keys to the React client" and "do not store plaintext provider API keys in platform_config" |

I recommend **A**. It is the design you asked for, and B re-creates precisely the
plaintext-key exposure this page was built to remove.

**But B is a legitimate choice if deploying is not practical right now**, and if you
pick it I will implement it cleanly rather than half-way: a single
`executionMode: 'gateway' | 'direct'` setting on the AI document, the plaintext-key
trigger from `021` relaxed for `direct` mode only, and a permanent banner on the page
stating that keys are readable by the browser in this mode. Switching to A later is then
a setting change plus re-entering keys.

**A third, smaller option regardless of your choice (`T170`):** pre-save Verify can
always run in the browser, because at that instant *you have just typed the key* — it is
already in the page, so calling `GET /models` directly leaks nothing new. That gives you
a working Verify button inside the edit form today, with no deployment. Only
**post-save** verification of an already-stored provider needs the gateway, because by
then the key is in Vault and only the server can read it. I will build this either way.

---

## 3. Schema changes

All in `platform_config`. **Everything is stored in Supabase — no browser storage.**

### 3a. AI document (`config_type 10`) — `database/023_ai_config_v2.sql`

```jsonc
{ "ai": {
  "version": 2,
  "executionMode": "gateway",          // T164 — or "direct", per §2
  "providers": [{
    "id", "name", "baseUrl", "credentialRef", "enabled",
    "protocol": "openai-compatible",   // renamed from `type`, auto-detected  (T167)
    "isSystemDefined": false,          // NEW, non-editable                   (T168)
    "order": 0                         // NEW, drag-owned; replaces `priority`(T166)
  }],
  "models": [{
    "providerId", "name", "displayName", "enabled",
    "modelType": "chat",
    "contextWindow": null,
    "maxTokensPerRequest": null,       // NEW                                 (T175)
    "moduleTags": [],                  // NEW — platform module ids           (T174)
    "order": 0                         // NEW, drag-owned                     (T176)
    // `id` REMOVED — keyed by providerId + name                              (T173)
  }],
  "configurations": [ … unchanged … ],
  "mcpServers":     [ … unchanged … ]
}}
```

Migration `023` upgrades v1 → v2 in place: renames `type`→`protocol`, `priority`→`order`,
drops model `id` while rewriting every `configurations[].modelId` to the new key, and
backfills `isSystemDefined`. **Idempotent and non-destructive** — it will not touch a
document already at v2.

### 3b. Module registry (`config_type 4 = ModuleLoader`) — `database/024_platform_modules.sql`

The reserved-but-empty slot, finally used:

```jsonc
{ "modules": { "version": 1, "items": [{
  "id": "notion-nest",
  "label": "NotionNest",
  "description": "Block-based document pages",
  "aiCapable": true,
  "aiEnabled": false,            // the master switch — off means nothing works (T178)
  "aiConfigurationIds": [],      // which AI configurations this module may use (T179)
  "order": 0
}]}}
```

### 3c. The architectural point about direction

Your original document required that the AI layer **must not reference any module**.
You now want module↔provider linking. Both hold, because of *which side owns the
reference*:

```
Module registry  ──references──▶  AI configuration  ──▶  Model  ──▶  Provider
   (config_type 4)                        (config_type 10)
```

The module names the AI configuration. The AI layer never names a module. So provider,
model and configuration records stay reusable by anything, and
`verify-ai-config-boundary.js` keeps passing — the Modules tab reads module names *from
the database*, it does not hardcode them.

`models[].moduleTags` (your Models #5) is the one exception, and it is a **filter for the
picker UI**, not a routing decision — it narrows which models a module's dropdown offers.
Routing still goes through configurations. I will note this in code so nobody later
mistakes it for a dependency.

---

## 4. Tasks

### Reusable primitives — built first, because three lists need them

| Task | Deliverable |
|---|---|
| `T164` | `components/ui/ReorderableList.tsx` + `useDragReorder` hook. Native HTML5, pattern copied from `PresetSettingsSection.tsx:233-254`. Keyboard-accessible (`Alt+↑/↓`) — the existing three implementations are mouse-only, which fails the accessibility rule. Design-token CSS, one stylesheet. |
| `T165` | `components/ui/TagMultiSelect.tsx` — searchable popover multi-select with keyboard nav, for module tags. |

### Providers

| Task | Deliverable |
|---|---|
| `T166` | Replace the `priority` input with a drag-owned read-only **Routing Order** badge. |
| `T167` | `type` → `protocol`: auto-detected from Base URL, read-only display, manual override under **Advanced**. |
| `T168` | **System Defined / Custom** — `isSystemDefined`, rendered as a non-editable toggle + badge, persisted to Supabase. |
| `T169` | Reorder the form to your field order (id, name, Base URL, API key, Routing Order, System/Custom, Enabled, Advanced▸protocol). |
| `T170` | **Verify button inside the edit form, before saving** — browser-direct pre-save check (the key is in hand); gateway for saved providers. Reports the HTTP status, latency and whether the model list came back. |
| `T171` | Drag-reorder the provider list via `T164`; writes `order` to Supabase on drop. |
| `T172` | **Remove the legacy migration entirely** — banner, `migrateLegacyRegistry()`, `readLegacyRegistry()`, and the `localStorage` fallback in `getProviders()`. See the warning in §5. |

### Models — a sub-page under a provider, not a tab

| Task | Deliverable |
|---|---|
| `T173` | Drop model `id`; key by `providerId` + wire name; rewrite `configurations[].modelId` in migration `023`. |
| `T174` | Route `/settings/ai-providers/:providerId/models`, opened by clicking a provider row. Provider highlighted in a header strip; breadcrumb back. **Models tab removed** from the tab bar. |
| `T175` | Model form: **Model** dropdown populated from discovery + a `Custom…` option; the wire-id field is editable **only** when `Custom` is chosen; Display name; **Platform Modules** tag multi-select (`T165`); Context window; **Max tokens per request**; Enabled. |
| `T176` | **Ask the provider which models it has** on the sub-page; drag-reorder the model rows. |

### Briselle Platform Modules

| Task | Deliverable |
|---|---|
| `T177` | `database/024_platform_modules.sql` — `config_type 4` registry, seeded with the real module list (see §6 Q3). |
| `T178` | `services/platformModuleConfigService.ts` — load/save with the same promise-cache discipline; **`aiEnabled` master switch**. |
| `T179` | **Modules tab**: list all modules, `aiEnabled` toggle, and per-module linking to an AI configuration (which carries provider + model). Drag-reorder. |
| `T180` | Enforce the switch at the routing layer: `aiEnabled === false` → the module's AI calls fail closed with *"AI is disabled for <module> in Settings › AI Providers Config › Modules"*, never a silent no-op. |

### Cross-cutting

| Task | Deliverable |
|---|---|
| `T181` | Migration `023` (v1→v2) + `024`; extend `platformAiConfigValidation.ts` for every new field and for the "a module needs ≥1 linked configuration" rule. |
| `T182` | `executionMode` plumbing per your §2 answer. |
| `T183` | Update `zivaApiRouterService` mapping for `protocol`/`order`/module gating; keep the synchronous snapshot contract. |
| `T184` | Extend `verify-ai-config-boundary.js`: no hardcoded module names, no client-side credential writes (relaxed only if you choose mode B). |
| `T185` | Extend `.agents/scripts/ai-migration-test/` to cover the v1→v2 migration and module gating. **This is the test that caught the last silent breakage** — it stays load-bearing. |
| `T186` | Update `AI_MEMORY.md`, `COMPLETED_TASKS.md`, `DECISIONS.md`, `KEYWORD_MAP.md` per the global rules. |

---

## 5. Risk — please read before approving `T172`

You said the migration behaviour is no longer needed, and I agree it should go. But
removing the **`localStorage` fallback** has a consequence I must state plainly.

Right now your three configured providers almost certainly have **no `credentialRef`**,
because `022` has not been run and so no key can reach Vault. That makes every mapped
pipe inactive, and routing therefore falls back to the old localStorage Groq key — which
is why Meeting Notes still works today.

**Delete that fallback and AI stops working entirely** until either the gateway is
deployed with keys in Vault (option A) or `executionMode: 'direct'` is live (option B).

So `T172` must land **after** whichever of A or B you choose — not before. I will
sequence it that way unless you tell me you are fine with an AI outage in between.

---

## 6. Questions

1. **Option A or B in §2?** (I recommend A. B is honest and I will build it properly, but
   it re-introduces plaintext keys in the browser.)
2. **Which provider is "System Defined"?** You said Groq, the first one added. Confirm its
   provider id and I will mark exactly that one in migration `023`; everything else
   becomes Custom. What should a *newly added* provider default to — Custom always?
3. **Which modules go in the registry (`T177`)?** No registry exists, so I am seeding one.
   Proposed, from actual AI consumers plus the sidebar: **NotionNest**, **Meeting Notes**,
   **Ziva Chat**, **Object Schema Controller**, **Transcription/STT**, **Translation**.
   Add or remove any — and tell me whether Meeting Notes should be its own module or sit
   under NotionNest, since it is a block within it.
4. **`T172` sequencing** — confirm you want the legacy removal held until A or B is live.

---

## 7. Verification

- `verify-ai-config-boundary.js`, `verify-no-tdz.js`, `verify-meeting-context.js`
- `ai-migration-test/run.mjs` extended for v1→v2 and module gating
- `tsc --noEmit`, `vite build`
- **Duplicate-CSS gate** on every new stylesheet (this has cost four debugging rounds)
- Manual: reorder each of the three lists and confirm the order survives a reload;
  Verify inside the edit form before saving; turn `aiEnabled` off and confirm the module
  fails closed with a named message

## 8. Rules compliance

- **No code until approved** (Thumb Rule #4) — nothing has changed.
- **Reuse before creating** — two shared primitives instead of a fourth inline drag copy.
- **No inline CSS, no duplicate CSS, design tokens, keyboard accessible.**
- **Backups** — last 5 versions per file, pruned.
- **No Git** operations.
- **Accept/reject table** at the end of every round.

---

# REVISION 1 — 2026-08-22, after your answers

| Question | Answer | Effect |
|---|---|---|
| Option A or B | **A — deploy the gateway** | Keys in Vault, calls server-side. `T182` (`executionMode`) **dropped** — no dual mode needed. |
| System Defined provider | **Groq / Llama 3.3** | `T168` marks that provider id only; every new provider defaults to Custom. |
| Modules to seed | **The 8 AI functions** | Major simplification — see below. |
| Meeting Notes own module? | **Its own, others may use it too** | Confirms the capability reading below. |
| `T172` waits for A | **Yes** | Legacy removal sequenced last. |

## The terminology discovery — and why it removes work

You listed: *Speech to Text, Summarization, Translation Engine, Chat Orchestrator,
Schema Controller, Embeddings, Vision, Tool / MCP Access.*

Those are **verbatim, all eight, in order**, the `capabilities` already seeded by
`database/021_platform_ai_config.sql:119-126`.

So **"Briselle Platform Module" is your term for what the code calls an AI capability.**
The global rules require this to be recorded in `KEYWORD_MAP.md` rather than assumed —
this is exactly that case, and it is the second time the same vocabulary has appeared
(the legacy Ziva registry called them `PREDEFINED_MODULE_SCOPES`).

### KEYWORD_MAP entry

| Business term (yours) | Implementation term | Where it lives |
|---|---|---|
| Briselle Platform Module | AI capability / function | `platform_config` → `config_type 10` → `ai.capabilities[]` |
| Module is "linked" to a provider/model | An AI configuration binds capability → provider + model | `ai.configurations[]` |

### Three consequences

**1. `T177` and `T178` are DROPPED.** No `config_type 4` registry, no
`platformModuleConfigService.ts`, no migration `024`. The vocabulary already exists in the
AI document. That is one migration and one service removed — the reuse rule paying off.

**2. The independence tension in §3c evaporates.** I had worried a Modules tab would make
the AI layer reference product features. It does not: these eight are AI *functions*, not
product modules. Nothing references NotionNest, Ziva or Meeting Notes.
`verify-ai-config-boundary.js` stays as strict as it is.

**3. Your Meeting Notes answer now reads correctly.** "Summarization" is the standalone
module; Meeting Notes is one *consumer* of it, and other blocks can consume the same one.
That is precisely why it is its own module — which is what you said.

> **Correct me if I have this wrong**, because the whole Modules tab depends on it. My
> reading: a Platform Module is an AI function that any block or feature may call — not a
> product area like NotionNest. If you actually wanted product features listed *as well*,
> that is a second, separate list and I would need to add it back.

## Revised architecture

```
Provider            endpoint + Vault credential            (Providers tab)
   └── Model        wire id, tagged with Platform Modules  (sub-page per provider)

Platform Module     one of the 8 AI functions              (Modules tab)
   ├── Enable AI function        master switch — off, nothing works
   └── linked provider + model   written as an AI configuration behind the scenes
```

## The AI Configurations tab — my recommendation

You did not mention Configurations in the redesign, and your flow — *"modules must be
linked some AI provider and at least one model"* — **is** a configuration. So:

**Keep the concept, remove the tab (`T187`).** Each Platform Module row picks a provider +
model + parameters, and that maintains exactly one configuration per module, with the id
equal to the capability id (`summarization`, `stt`, …).

Why keep it underneath rather than delete it: the gateway, `executeAI()` and the Ziva
bridge all resolve through `configurationId`, and the gateway *already* resolves a
capability tag to a configuration. Keeping the record means **zero downstream change** —
`executeAI({ configurationId: 'summarization' })` keeps working exactly as it does now.
Deleting the concept would mean rewriting the gateway, the client and the bridge to gain
nothing a user can see.

**This is the one open question.** If you would rather keep the tab visible for advanced
tuning (temperature per module, several configurations per capability), say so and I will
leave it in place alongside the Modules tab.

## Revised task list

| Task | Status |
|---|---|
| `T164` `ReorderableList` + `useDragReorder`, keyboard accessible | as planned |
| `T165` `TagMultiSelect` searchable multi-select | as planned |
| `T166` Routing Order badge, drag-owned | as planned |
| `T167` `type` → auto-detected `protocol`, Advanced override | as planned |
| `T168` System Defined = **Groq/Llama 3.3**; new providers default Custom | confirmed |
| `T169` Provider form field order | as planned |
| `T170` **Verify inside the edit form** — browser pre-save, gateway post-save | as planned |
| `T171` Drag-reorder providers | as planned |
| `T172` Remove legacy migration + localStorage fallback | **sequenced LAST**, after the gateway is live |
| `T173` Drop model internal id | as planned |
| `T174` Models sub-page at `/settings/ai-providers/:providerId/models` | as planned |
| `T175` Model form incl. Platform Modules tags, Max tokens per request | as planned |
| `T176` Discovery + drag-reorder on the sub-page | as planned |
| ~~`T177`~~ | **DROPPED** — no `config_type 4` needed |
| ~~`T178`~~ | **DROPPED** — no new service needed |
| `T179` **Modules tab** over `ai.capabilities`: Enable AI function + provider/model link + drag-reorder | revised scope |
| `T180` Fail closed when a module is disabled, with a named message | as planned |
| `T181` Migration `023` (v1→v2) + validation for new fields | revised — `024` dropped |
| ~~`T182`~~ | **DROPPED** — Option A only, no dual mode |
| `T183` Ziva bridge mapping for `protocol` / `order` / module gating | as planned |
| `T184` Extend the boundary script | as planned |
| `T185` Extend the migration test for v1→v2 + module gating | as planned |
| `T186` `AI_MEMORY.md`, `DECISIONS.md`, **`KEYWORD_MAP.md`** | as planned |
| `T187` Fold AI Configurations into the Modules tab | **NEW** — pending your call above |

## Prerequisite you must run (Option A)

The gateway cannot be deployed from here. In the project root:

```bash
# 1. Supabase SQL editor, in order:
#    database/021_platform_ai_config.sql
#    database/022_ai_credentials_vault.sql

# 2. Deploy the function
supabase login
supabase link --project-ref <your-project-ref>
supabase functions deploy ai-gateway
```

`supabase/config.toml` already sets `verify_jwt = false` for this function because it
performs its own JWT check internally (step 1 of the eleven), so it can return an
actionable 401 body instead of an opaque platform rejection.

Until this is done, Verify works only in its pre-save form (`T170`) and no AI call can
run through the gateway.
