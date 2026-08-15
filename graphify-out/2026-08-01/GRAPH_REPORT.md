# Graph Report - Briselle-Lightiningv58  (2026-08-01)

## Corpus Check
- 261 files · ~249,717 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1618 nodes · 3386 edges · 110 communities (76 shown, 34 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 49 edges (avg confidence: 0.73)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a5a835ce`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- objectLoaderRecordModals.tsx
- zivaKnowledge.js
- ZivaChat.jsx
- blocks.jsx
- menus.jsx
- utils.js
- Container (Dockerfile)
- zivaWorkflow.js
- App.tsx
- ConfigurableListTemplate.tsx
- Graphify SKILL.md - Main Pipeline Documentation
- RecordsList.tsx
- ZivaController
- TableActionPanel.refactored.tsx
- NotionNestPage.jsx
- TableSettingsModal.tsx
- Briselle Global AI Instructions
- TabSettingsSection.tsx
- devDependencies
- BlockRenderer.jsx
- TableActionPanel.tsx
- configService.ts
- fieldTypeMaster.ts
- package.json
- zivaMultiCommand.js
- dependencies
- cn
- UndoHistoryManager
- ObjectDetail.tsx
- compilerOptions
- zivaAiSuggestions.js
- notionNestPageStorage.ts
- DisplaySettingsSection.tsx
- compilerOptions
- supabase.ts
- ObjectAdd.tsx
- zivaObjectCreateFromChat.ts
- helpers.ts
- PageContext.jsx
- zivaLlmOrchestrate.js
- zivaFieldAttributes.js
- TableConfig
- TabBlock.jsx
- zivaServerConfig.mjs
- RealtimeHub
- presets.ts
- index.ts
- TableConfigStorageService
- tableUserViewStorage.ts
- fieldDataTypeModel.tsx
- authStore.ts
- StatCard.tsx
- platformSystemFields.ts
- ZivaChat.jsx
- package.json
- TableSettingsModal.tsx
- zivaUpdateObjectFieldAttributes.ts
- ZivaModelPicker.jsx
- SignalRService
- Briselle-Lightining.Server
- ChartPanel.tsx
- index.ts
- notionNestPageDefaults.ts
- zivaGroqFields.js
- genId
- Ziva Chat Module
- fix_menus_dup.cjs
- notionNestPagePath
- NotionEditorErrorBoundary
- Briseille Brand Identity (Z)
- opencode.json
- zivaStandaloneServer.mjs
- ListPageTemplate1.tsx
- ListPageTemplate2.tsx
- UserDetail.tsx
- UsersList.tsx
- tsconfig.json
- graphify.js
- clsx
- html2canvas
- lucide-react
- react
- react-hook-form
- @supabase/supabase-js
- zustand
- @eslint/js
- @types/react
- UploadZone.jsx
- Briselle Server CHANGELOG
- Table Templates Architecture Document
- ZIVA Chat Module README
- Obsidian For My Project
- Briselle Logo
- Ziva Sparkle White
- Logo Black CT Icon
- Briselle Logo (Black Full)
- Logo Black Square Icon
- White CT Icon Logo
- Logo White Square Icon
- deletePresetFromDB
- savePresetToDB
- TAB_BAR_ICON_OPTIONS

## God Nodes (most connected - your core abstractions)
1. `cn()` - 72 edges
2. `ZivaChat()` - 65 edges
3. `ConfigurableListTemplate()` - 52 edges
4. `usePageContext()` - 36 edges
5. `ObjectDetail()` - 30 edges
6. `RecordsList()` - 30 edges
7. `ObjectAdd()` - 23 edges
8. `processWorkflowUserMessage()` - 22 edges
9. `TableConfig` - 21 edges
10. `UndoHistoryManager` - 20 edges

## Surprising Connections (you probably didn't know these)
- `Graphify SKILL.md - Main Pipeline Documentation` --semantically_similar_to--> `AGENTS.md - Project Graphify Instructions`  [INFERRED] [semantically similar]
  .opencode/skills/graphify/SKILL.md → AGENTS.md
- `AGENTS.md - Project Graphify Instructions` --references--> `Knowledge Graph`  [EXTRACTED]
  AGENTS.md → .opencode/skills/graphify/SKILL.md
- `ToggleSwitch()` --calls--> `cn()`  [EXTRACTED]
  briselle-lightining.client/src/components/ui/tabletemplates/action-components/Action_FreezePane.tsx → briselle-lightining.client/src/utils/helpers.ts
- `Action_Preset()` --calls--> `cn()`  [EXTRACTED]
  briselle-lightining.client/src/components/ui/tabletemplates/action-components/Action_Preset.tsx → briselle-lightining.client/src/utils/helpers.ts
- `Toggle()` --calls--> `cn()`  [EXTRACTED]
  briselle-lightining.client/src/components/ui/tabletemplates/modal-settings-sections/DisplaySettingsSection.tsx → briselle-lightining.client/src/utils/helpers.ts

## Import Cycles
- 3-file cycle: `briselle-lightining.client/src/components/ui/tabletemplates/ConfigurableListTemplate.tsx -> briselle-lightining.client/src/components/ui/tabletemplates/utils/loadTableConfig.ts -> briselle-lightining.client/src/utils/tableConfigStorage.ts -> briselle-lightining.client/src/components/ui/tabletemplates/ConfigurableListTemplate.tsx`

## Hyperedges (group relationships)
- **Graphify Extraction Pipeline** — concept_extraction_pipeline, concept_ast_extraction, concept_semantic_extraction, concept_extraction_caching, concept_node_id_format [EXTRACTED 1.00]
- **Graphify Query Traversal System** — opencode_skills_graphify_references_query_md, concept_bfs_traversal, concept_vocabulary_expansion, concept_knowledge_graph [EXTRACTED 1.00]
- **Ziva Chat Module Static Assets and Config** — concept_ziva_chat_module, concept_briselle_logo, briselle_lightining_client_src_modules_ziva_chat_module_assets_readme_txt, briselle_lightining_client_src_modules_ziva_chat_module_example_env_ziva_txt [EXTRACTED 1.00]
- **Briselle Rules** — agents_rules_briselle_enterprise_architecture_doc, agents_rules_briselle_global_rules_doc [EXTRACTED 1.00]
- **Briselle Workflows** — agents_workflows_b_code_review_workflow, agents_workflows_b_create_api_workflow, agents_workflows_b_design_database_workflow, agents_workflows_b_documentation_workflow, agents_workflows_b_fix_bug_workflow, agents_workflows_b_implement_features_workflow, agents_workflows_b_improve_performance_workflow, agents_workflows_b_improve_ui_workflow, agents_workflows_b_plan_features_workflow, agents_workflows_b_refactor_module_workflow, agents_workflows_b_update_memory_workflow [EXTRACTED 1.00]
- **Default List Page Component Composition** — briselle-lightining_client_src_components_ui_tabletemplates_configurablelisttemplate, briselle-lightining_client_src_components_ui_tabletemplates_tabletitlepanel, briselle-lightining_client_src_components_ui_tabletemplates_tabletabpanel, briselle-lightining_client_src_components_ui_tabletemplates_tableactionpanel, briselle-lightining_client_src_components_ui_tabletemplates_datatable, briselle-lightining_client_src_components_ui_tabletemplates_tablefooter [EXTRACTED 1.00]
- **ZIVA Chat Module Core Components** — briselle-lightining_client_src_modules_ziva_chat_module_src_zivachat, briselle-lightining_client_src_modules_ziva_chat_module_src_zivaknowledge, briselle-lightining_client_src_modules_ziva_chat_module_src_defaultconfig, briselle-lightining_client_src_modules_ziva_chat_module_src_simplezivacontactform, briselle-lightining_client_src_modules_ziva_chat_module_src_zivapage, briselle-lightining_client_src_modules_ziva_chat_module_src_zivaserviceconfig [EXTRACTED 1.00]
- **ZIVA Chat Module Server Components** — briselle-lightining_client_src_modules_ziva_chat_module_server_createzivapi_mjs, briselle-lightining_client_src_modules_ziva_chat_module_server_zivastandaloneserver_mjs, briselle-lightining_client_src_modules_ziva_chat_module_server_zivaserverconfig_mjs [EXTRACTED 1.00]

## Communities (110 total, 34 thin omitted)

### Community 0 - "objectLoaderRecordModals.tsx"
Cohesion: 0.05
Nodes (60): buildCopyPlain(), buildCopyTable(), buildMergedJsonColumnUpdate(), BulkEditModal(), coerceInputValue(), coercePostgrestNumericId(), coerceSysStatusScalar(), collectValidationErrors() (+52 more)

### Community 1 - "zivaKnowledge.js"
Cohesion: 0.09
Nodes (46): defaultZivaConfig, mergeZivaConfig(), resolveFieldSpecsForObject(), BRISHELLE_MODULES, buildContextualFieldSpecLines(), buildNotesAddChip(), buildTopicDerivedFieldSpecs(), CONTEXT_TOKEN_EXPANSIONS (+38 more)

### Community 2 - "ZivaChat.jsx"
Cohesion: 0.10
Nodes (34): ZivaPlanChecklist(), SimpleZivaContactForm(), mergeAiSuggestionSources(), mergePanelSources(), buildAssistantModePromptBlock(), canApplyFieldAttributesInChat(), canRunComprehensiveCreate(), canRunCreateObject() (+26 more)

### Community 3 - "blocks.jsx"
Cohesion: 0.05
Nodes (30): ACTION_DEFS, ActionConfigForm(), ActionConfigVariables(), AudioBlock, BookmarkBlock, ButtonBlock, CalloutBlock, CodeBlock (+22 more)

### Community 4 - "menus.jsx"
Cohesion: 0.06
Nodes (28): deobfuscateText(), getBlockById(), obfuscateText(), formatAuditDateTime(), resolveUserDisplayName(), AttachmentPopover, BG_COLORS, bgColors (+20 more)

### Community 5 - "utils.js"
Cohesion: 0.09
Nodes (27): CODE_LANG_LIST(), CODE_LANGUAGE_CATEGORIES, CODE_LANGUAGES, CSS_PROPS, deobfuscateTextSecure(), _derivedKey, escapeHtml(), findBlockContainer() (+19 more)

### Community 6 - "Container (Dockerfile)"
Cohesion: 0.06
Nodes (38): commandName, environmentVariables, launchBrowser, launchUrl, publishAllPorts, useSSL, ASPNETCORE_ENVIRONMENT, ASPNETCORE_HOSTINGSTARTUPASSEMBLIES (+30 more)

### Community 7 - "zivaWorkflow.js"
Cohesion: 0.13
Nodes (32): buildExploreContextForSession(), applyActiveFilter(), displayNameFromRow(), fetchDobjObjectListForChat(), fetchObjectFieldsForChat(), formatObjectListChatMarkdown(), LIST_LIMITS, mapRows() (+24 more)

### Community 8 - "App.tsx"
Cohesion: 0.06
Nodes (22): Dashboard, EntityDetail, EntityList, Login, NotionNestPage, ObjectAdd, ObjectConfig, ObjectDetail (+14 more)

### Community 9 - "ConfigurableListTemplate.tsx"
Cohesion: 0.08
Nodes (46): cellRangeExteriorBoxShadow(), CellRangePoint, checkboxColumnRightBorderClass(), checkboxLeadSelectionShadow(), composeDataCellSelectionShadow(), ConfigurableListTemplate(), CustomRowBadgeOverflowMode, findCheckboxRowRangeForFlatRow() (+38 more)

### Community 10 - "Graphify SKILL.md - Main Pipeline Documentation"
Cohesion: 0.08
Nodes (31): AGENTS.md - Project Graphify Instructions, AST Extraction, BFS Traversal, Community Detection, Confidence Score Rubric, Cross-Repo Merge, Dual Extraction Model, Extraction Caching (+23 more)

### Community 11 - "RecordsList.tsx"
Cohesion: 0.14
Nodes (29): allocateAutoNumberFromLedger(), buildRecordsInlineEditCandidateKeys(), buildRecordsTemplateConfig(), composePhoneValue(), DbObjectRow, DbObjectSchemaField, DdataRow, generateHierarchyNodeId() (+21 more)

### Community 12 - "ZivaController"
Cohesion: 0.08
Nodes (23): WeatherForecastController, string, ObjectFieldsRequest, ZivaController, string, Task, CancellationToken, ControllerBase (+15 more)

### Community 13 - "TableActionPanel.refactored.tsx"
Cohesion: 0.08
Nodes (16): Action_ChangeOwnerProps, Action_ChartProps, Action_ExportProps, ExportFormat, Action_FilterProps, FilterCriteria, Action_Preset(), Action_PresetProps (+8 more)

### Community 14 - "NotionNestPage.jsx"
Cohesion: 0.12
Nodes (18): BlockRenderer, AiRephrasePopover(), convertHtmlToBlocks(), NotionNestPage(), NotionPageInner(), UndoPopover(), unescapeHtml(), flatVisibleBlocks() (+10 more)

### Community 15 - "TableSettingsModal.tsx"
Cohesion: 0.38
Nodes (5): Action_FreezePane(), Action_FreezePaneProps, ToggleSwitch(), applyFreezePaneConsistency(), FreezePaneConfigSlice

### Community 16 - "Briselle Global AI Instructions"
Cohesion: 0.12
Nodes (26): Briselle Enterprise Architecture, Briselle Global AI Instructions, Code Review Workflow, Create API Workflow, Design Database Workflow, Documentation Workflow, Fix Bug Workflow, Implement Features Workflow (+18 more)

### Community 17 - "TabSettingsSection.tsx"
Cohesion: 0.09
Nodes (28): TabSettingsSection(), TabSettingsSectionProps, Toggle(), hexToRgba(), TabBarPlacement, TabItem, TableTabPanel(), TableTabPanelProps (+20 more)

### Community 18 - "devDependencies"
Cohesion: 0.08
Nodes (25): autoprefixer, devDependencies, autoprefixer, eslint, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, postcss (+17 more)

### Community 19 - "BlockRenderer.jsx"
Cohesion: 0.12
Nodes (23): AudioBlock, BookmarkBlock, ButtonBlock, CalloutBlock, CodeBlock, ColumnsBlock, DividerBlock, EquationBlock (+15 more)

### Community 20 - "TableActionPanel.tsx"
Cohesion: 0.08
Nodes (24): Action_ChangeOwner.tsx, Action_Chart.tsx, Action_ColumnVisibility.tsx, Action_Export.tsx, Action_Filter.tsx, Action_FreezePane.tsx, Action_Group.tsx, Action_Import.tsx (+16 more)

### Community 21 - "configService.ts"
Cohesion: 0.12
Nodes (39): DataSettingsSection(), DataSettingsSectionProps, PresetSettingsSection(), PresetSettingsSectionProps, TableSettingsModal(), TableSettingsModalProps, CANONICAL_DEFAULT_TAB_ITEM, CanonicalTabItem (+31 more)

### Community 22 - "fieldTypeMaster.ts"
Cohesion: 0.12
Nodes (20): buildSectionRows(), FIELD_ATTRIBUTE_UI_SECTIONS, FieldAttributesSectionedPanel(), FieldAttributesSectionedPanelProps, FieldAttributeUiSection, getObjectPrefix(), ATTRIBUTE_CATALOG, EFFECTIVE_KEYS_EVERY_TYPE (+12 more)

### Community 23 - "package.json"
Cohesion: 0.08
Nodes (23): dependencies, express, description, react, react-dom, react-router-dom, name, peerDependencies (+15 more)

### Community 24 - "zivaMultiCommand.js"
Cohesion: 0.22
Nodes (17): extractObjectTopic(), norm(), parseComprehensiveCreateObjectRequest(), parseFieldCount(), extractExplicitColumnLabels(), extractObjectLabelFromCreateMessage(), norm(), normalizeColumnToSpecLine() (+9 more)

### Community 25 - "dependencies"
Cohesion: 0.09
Nodes (23): axios, @blocknote/core, @blocknote/mantine, @blocknote/react, dependencies, axios, @blocknote/core, @blocknote/mantine (+15 more)

### Community 26 - "cn"
Cohesion: 0.05
Nodes (43): StatCard(), StatCardProps, NavItem, Sidebar(), SidebarProps, Action_ColumnVisibility(), Action_ColumnVisibilityProps, ColumnWidthPxInput() (+35 more)

### Community 27 - "UndoHistoryManager"
Cohesion: 0.10
Nodes (4): NotionPagePayload, PositionalCheckpoint, UndoHistoryManager, VersionEntry

### Community 28 - "ObjectDetail.tsx"
Cohesion: 0.12
Nodes (31): BehaviorSettingsSection(), isNotionNestPageFieldApi(), isReservedNotionNestFieldApi(), NOTION_NEST_PAGE_FIELD_API, INLINE_EDIT_EXCLUDED_EXTRA, INLINE_EDIT_EXCLUDED_SYSTEM_SET, isExcludedFromInlineEditSystemPicker(), isFixedPlatformSystemApi() (+23 more)

### Community 29 - "compilerOptions"
Cohesion: 0.09
Nodes (22): compilerOptions, allowImportingTsExtensions, allowJs, isolatedModules, jsx, lib, module, moduleDetection (+14 more)

### Community 30 - "zivaAiSuggestions.js"
Cohesion: 0.17
Nodes (19): buildAiSuggestionsForSession(), buildObjectListExampleAiSuggestions(), buildObjectMenuAiSuggestions(), buildObjectMenuRelatedControls(), buildRelatedControlsForSession(), buildSessionMessagePanels(), chipIsRelatedControl(), controlToAiChip() (+11 more)

### Community 31 - "notionNestPageStorage.ts"
Cohesion: 0.21
Nodes (14): loadNotionRecordContext(), loadPageVersionData(), loadPageVersions(), mergeObjectConfigIcon(), safeParseConfig(), saveNotionPage(), savePageVersion(), NotionRecordContext (+6 more)

### Community 32 - "DisplaySettingsSection.tsx"
Cohesion: 0.10
Nodes (15): DisplaySettingsSection(), DisplaySettingsSectionProps, Toggle(), TableActionPanel(), BUTTON_DEFINITIONS, ButtonDefinition, DEFAULT_ACTION_PANEL_ORDER, getButtonOrder() (+7 more)

### Community 33 - "compilerOptions"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, isolatedModules, lib, module, moduleDetection, moduleResolution, noEmit (+9 more)

### Community 34 - "supabase.ts"
Cohesion: 0.22
Nodes (5): EntityDetail, Field, Entity, fieldMappings, supabase

### Community 35 - "ObjectAdd.tsx"
Cohesion: 0.25
Nodes (17): getAutoNumberDisplayFormatFromObjectLabel(), readIncludeInInlineEdit(), readIncludeInTableView(), withDataViewDefaults(), getDefaultAttributesForFieldType(), recordDisplayFieldApiForDataType(), createField(), createMandatoryFirstField() (+9 more)

### Community 36 - "zivaObjectCreateFromChat.ts"
Cohesion: 0.22
Nodes (18): ensureObjectLoaderPlatformConfigRow(), toUserDefinedApiName(), getFieldTypeMasterEntry(), buildFixedPlatformSystemFieldRows(), PLATFORM_SYSTEM_API_SET, allocateApiNames(), buildConfigurationPayload(), buildCustomFieldRow() (+10 more)

### Community 37 - "helpers.ts"
Cohesion: 0.33
Nodes (7): focusBlock(), useEditable(), usePageContext(), getCaretCoordinates(), getCaretPosition(), isCaretOnFirstLine(), isCaretOnLastLine()

### Community 38 - "PageContext.jsx"
Cohesion: 0.28
Nodes (15): cleanBlockContentOrphans(), PageContext, PageProvider(), buildDefaultBlocks(), calculateInitials(), clearAllRedactedContent(), clearRedactedContent(), createNewBlock() (+7 more)

### Community 39 - "zivaLlmOrchestrate.js"
Cohesion: 0.28
Nodes (14): applyAssistantModeToOrchestrate(), getModeAwareFallback(), normalizePlanSteps(), buildZivaSessionPayload(), fallbackOrchestrate(), fetchZivaOrchestrate(), normalizeOrchestratePayload(), ALLOWED_ACTIONS (+6 more)

### Community 40 - "zivaFieldAttributes.js"
Cohesion: 0.31
Nodes (14): applyFieldAttributesToDraft(), ATTRIBUTE_PHRASES, findFieldIndex(), formatFieldAttrsForPreview(), labelKeyFromLine(), looksLikeFieldAttributeMessage(), mergeAttrMap(), norm() (+6 more)

### Community 41 - "TableConfig"
Cohesion: 0.31
Nodes (6): MediaBlockPicker(), DamPageIcon(), LucideIcon(), UploadProgressModal(), extractUuid(), useEnterpriseFile()

### Community 42 - "TabBlock.jsx"
Cohesion: 0.19
Nodes (13): fetchLucideIcons(), hasPageIcon(), ICON_COLORS, NotionIconPicker, renderIconSvg(), renderPageIcon(), SVG_ICONS, toPascalCase() (+5 more)

### Community 43 - "zivaServerConfig.mjs"
Cohesion: 0.18
Nodes (10): createZivaApiRouter(), safeSendJson(), __dirname, getZivaServerConfig(), intPort(), loadDotEnvZiva(), parseEnvFile(), ZIVA_MODULE_ROOT (+2 more)

### Community 44 - "RealtimeHub"
Cohesion: 0.15
Nodes (8): RealtimeHub, Task, Program, WeatherForecast, Briselle_Lightining.Server, Briselle_Lightining.Server.Hubs, DateOnly, Hub

### Community 45 - "presets.ts"
Cohesion: 0.15
Nodes (12): Enterprise Audio Transcript Upload UX & Processing Workflow, Future Sources, Objective, Processing Architecture, Stage 1 -- File Selection, Stage 2 -- Upload, Stage 3 -- Preparing Audio, Stage 4 -- Transcribing (+4 more)

### Community 46 - "index.ts"
Cohesion: 0.15
Nodes (12): ActivityLog, Dashboard, FieldDefinition, FieldType, Notification, ObjectDefinition, Permission, Record (+4 more)

### Community 47 - "TableConfigStorageService"
Cohesion: 0.14
Nodes (8): TableConfig, loadTableConfig(), loadTablePresets(), DEFAULT_CONFIG, StoredTableConfig, TableConfigPreset, tableConfigStorage, TableConfigStorageService

### Community 48 - "tableUserViewStorage.ts"
Cohesion: 0.53
Nodes (5): applyNotionNestFieldPolicy(), buildNotionNestPageFieldRow(), NOTION_NEST_PAGE_FIELD_API_LOWER, reindexFieldOrders(), syncNotionNestFieldRows()

### Community 49 - "fieldDataTypeModel.tsx"
Cohesion: 0.21
Nodes (11): FIELD_TYPE_CATEGORY_ORDER, FieldDefinitionRowColumnLayout, FieldDefinitionRowErrors, FieldDefinitionRowForm(), FieldDefinitionRowFormProps, FieldRowTypePicker, groupedFieldTypes(), InlineFieldSwitch() (+3 more)

### Community 50 - "authStore.ts"
Cohesion: 0.17
Nodes (10): listNotionPages(), Login(), api, authApi, objectsApi, recordsApi, usersApi, AuthState (+2 more)

### Community 53 - "ZivaChat.jsx"
Cohesion: 0.20
Nodes (10): defaultConfig.js, index.js, SimpleZivaContactForm.jsx, ZivaChat.jsx, ZivaChat.css, ZivaContactForm.css, zivaKnowledge.js, ZivaPage.jsx (+2 more)

### Community 54 - "package.json"
Cohesion: 0.20
Nodes (9): name, private, scripts, build, dev, lint, preview, type (+1 more)

### Community 56 - "TableSettingsModal.tsx"
Cohesion: 0.22
Nodes (9): BehaviorSettingsSection.tsx, DataSettingsSection.tsx, DeviceSettingsSection.tsx, DisplaySettingsSection.tsx, LayoutSettingsSection.tsx, PresetSettingsSection.tsx, TabSettingsSection.tsx, ThemeSettingsSection.tsx (+1 more)

### Community 57 - "zivaUpdateObjectFieldAttributes.ts"
Cohesion: 0.39
Nodes (8): validateFieldAttributes(), isPlatformSystemApi(), applyFieldAttributeUpdatesOnObject(), ApplyFieldAttributeUpdatesResult, FieldAttributeUpdateItem, findFieldIndex(), norm(), safeParseConfig()

### Community 58 - "ZivaModelPicker.jsx"
Cohesion: 0.36
Nodes (6): ACTIVE_MODELS, computePopoverStyle(), filterModels(), getGroups(), ZivaModelPicker(), ZIVA_CHAT_MODELS

### Community 60 - "Briselle-Lightining.Server"
Cohesion: 0.29
Nodes (7): Briselle-Lightining.Server, briselle-lightining.client, net8.0, Microsoft.AspNetCore.SpaProxy, Microsoft.VisualStudio.Azure.Containers.Tools.Targets (1.21.0), Swashbuckle.AspNetCore (6.6.2), Microsoft.NET.Sdk.Web

### Community 61 - "ChartPanel.tsx"
Cohesion: 0.46
Nodes (7): barHeights(), ChartPanel(), ChartPanelProps, hBarWidths(), pivotRows(), toActiveLike(), toBoolLike()

### Community 65 - "notionNestPageDefaults.ts"
Cohesion: 0.52
Nodes (6): createDefaultNotionPage(), createEmptyNotionBlocks(), migrateBlockNoteToNotionZest(), parseNotionPageFromValues(), sanitizeNotionBlocks(), createNotionNestRecord()

### Community 66 - "zivaGroqFields.js"
Cohesion: 0.53
Nodes (5): ALLOWED_TYPES, fetchFieldSpecsFromGroq(), fieldItemToSpecLine(), normalizeFieldSpecLine(), parseObjectFieldsPayload()

### Community 68 - "genId"
Cohesion: 0.11
Nodes (9): ACTION_DEFS, ActionConfigForm(), ActionConfigVariables(), createAction(), defaultActionConfig(), genId(), LANGUAGE_CODE_MAP, NATIVE_LANGUAGE_DISPLAY (+1 more)

### Community 69 - "Ziva Chat Module"
Cohesion: 0.50
Nodes (5): Ziva Chat Module Static Assets README, Ziva Chat Module Environment Variables, Briselle Logo, Groq API Integration, Ziva Chat Module

### Community 70 - "fix_menus_dup.cjs"
Cohesion: 0.50
Nodes (3): c, fs, l

### Community 74 - "notionNestPagePath"
Cohesion: 0.44
Nodes (8): notionNestPagePath(), DobjObjectTypeColumn, isNotionNestObjectType(), parsePlatformObjectType(), PlatformObjectType, readConfigObjectType(), RecordDetail(), safeParseConfig()

### Community 76 - "Briseille Brand Identity (Z)"
Cohesion: 0.83
Nodes (4): Circular Logo with Stylized Z, Briseille Brand Identity (Z), Ziva Chat Module, Briseille Ziva Chat Module Logo

### Community 77 - "opencode.json"
Cohesion: 0.50
Nodes (3): plugin, $schema, .opencode/plugins/graphify.js

### Community 78 - "zivaStandaloneServer.mjs"
Cohesion: 0.67
Nodes (3): createZivaApi.mjs, zivaServerConfig.mjs, zivaStandaloneServer.mjs

### Community 95 - "UploadZone.jsx"
Cohesion: 0.17
Nodes (15): UploadZone(), ensureNullableUuid(), ensureUuid(), extractUuid(), FileService, resolveDataEntityType(), UploadParams, UploadResult (+7 more)

## Knowledge Gaps
- **438 isolated node(s):** `TextBlock`, `ListBlock`, `TodoBlock`, `ToggleBlock`, `QuoteBlock` (+433 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **34 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `supabase` connect `supabase.ts` to `objectLoaderRecordModals.tsx`, `ObjectAdd.tsx`, `genId`, `zivaObjectCreateFromChat.ts`, `PageContext.jsx`, `zivaWorkflow.js`, `ConfigurableListTemplate.tsx`, `notionNestPagePath`, `RecordsList.tsx`, `configService.ts`, `zivaUpdateObjectFieldAttributes.ts`, `cn`, `ObjectDetail.tsx`, `UploadZone.jsx`, `notionNestPageStorage.ts`?**
  _High betweenness centrality (0.085) - this node is a cross-community bridge._
- **Why does `cn()` connect `cn` to `DisplaySettingsSection.tsx`, `objectLoaderRecordModals.tsx`, `ObjectAdd.tsx`, `ConfigurableListTemplate.tsx`, `TableActionPanel.refactored.tsx`, `TableSettingsModal.tsx`, `TabSettingsSection.tsx`, `fieldDataTypeModel.tsx`, `configService.ts`, `ObjectDetail.tsx`?**
  _High betweenness centrality (0.080) - this node is a cross-community bridge._
- **Why does `useAuthStore` connect `authStore.ts` to `ConfigurableListTemplate.tsx`, `menus.jsx`, `NotionNestPage.jsx`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `ZivaChat()` (e.g. with `buildObjectMenuRelatedControls()` and `controlToAiChip()`) actually correct?**
  _`ZivaChat()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `TextBlock`, `ListBlock`, `TodoBlock` to the rest of the system?**
  _438 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `objectLoaderRecordModals.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05477477477477478 - nodes in this community are weakly interconnected._
- **Should `zivaKnowledge.js` be split into smaller, more focused modules?**
  _Cohesion score 0.08941176470588236 - nodes in this community are weakly interconnected._