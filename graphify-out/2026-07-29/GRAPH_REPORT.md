# Graph Report - .  (2026-07-29)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1543 nodes · 3062 edges · 128 communities (91 shown, 37 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 49 edges (avg confidence: 0.73)
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
- uiIconPickerCatalog.tsx
- TableSettingsModal.tsx
- zivaUpdateObjectFieldAttributes.ts
- ZivaModelPicker.jsx
- SignalRService
- Briselle-Lightining.Server
- ChartPanel.tsx
- BehaviorSettingsSection.tsx
- TableActionPanel.tsx
- index.ts
- notionNestPageDefaults.ts
- zivaGroqFields.js
- LayoutSettingsSection.tsx
- genId
- Ziva Chat Module
- fix_menus_dup.cjs
- Action_Import.tsx
- Action_TableLayoutSetup.tsx
- DataTable.tsx
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
- index.html
- clsx
- html2canvas
- lucide-react
- react
- react-hook-form
- @supabase/supabase-js
- zustand
- @eslint/js
- @types/react
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
- ACTION_DEFS

## God Nodes (most connected - your core abstractions)
1. `cn()` - 72 edges
2. `ZivaChat()` - 65 edges
3. `ConfigurableListTemplate()` - 52 edges
4. `ObjectDetail()` - 30 edges
5. `RecordsList()` - 27 edges
6. `ObjectAdd()` - 23 edges
7. `processWorkflowUserMessage()` - 22 edges
8. `TableConfig` - 20 edges
9. `UndoHistoryManager` - 20 edges
10. `TableSettingsModal()` - 18 edges

## Surprising Connections (you probably didn't know these)
- `Graphify SKILL.md - Main Pipeline Documentation` --semantically_similar_to--> `AGENTS.md - Project Graphify Instructions`  [INFERRED] [semantically similar]
  .opencode/skills/graphify/SKILL.md → AGENTS.md
- `AGENTS.md - Project Graphify Instructions` --references--> `Knowledge Graph`  [EXTRACTED]
  AGENTS.md → .opencode/skills/graphify/SKILL.md
- `StatCard()` --calls--> `cn()`  [EXTRACTED]
  briselle-lightining.client/src/components/dashboard/StatCard.tsx → briselle-lightining.client/src/utils/helpers.ts
- `Action_Export()` --calls--> `cn()`  [EXTRACTED]
  briselle-lightining.client/src/components/ui/tabletemplates/action-components/Action_Export.tsx → briselle-lightining.client/src/utils/helpers.ts
- `Action_Import()` --calls--> `cn()`  [EXTRACTED]
  briselle-lightining.client/src/components/ui/tabletemplates/action-components/Action_Import.tsx → briselle-lightining.client/src/utils/helpers.ts

## Import Cycles
- 3-file cycle: `briselle-lightining.client/src/components/ui/tabletemplates/ConfigurableListTemplate.tsx -> briselle-lightining.client/src/components/ui/tabletemplates/utils/loadTableConfig.ts -> briselle-lightining.client/src/utils/tableConfigStorage.ts -> briselle-lightining.client/src/components/ui/tabletemplates/ConfigurableListTemplate.tsx`

## Hyperedges (group relationships)
- **Graphify Extraction Pipeline** — concept_extraction_pipeline, concept_ast_extraction, concept_semantic_extraction, concept_extraction_caching, concept_node_id_format [EXTRACTED 1.00]
- **Graphify Query Traversal System** — opencode_skills_graphify_references_query_md, concept_bfs_traversal, concept_vocabulary_expansion, concept_knowledge_graph [EXTRACTED 1.00]
- **Ziva Chat Module Static Assets and Config** — concept_ziva_chat_module, concept_briselle_logo, briselle_lightining_client_src_modules_ziva_chat_module_assets_readme_txt, briselle_lightining_client_src_modules_ziva_chat_module_example_env_ziva_txt [EXTRACTED 1.00]
- **Briselle Rules** — agents_rules_briselle_enterprise_architecture_doc, agents_rules_briselle_global_rules_doc [EXTRACTED 1.00]
- **Briselle Workflows** — agents_workflows_b_code_review_workflow, agents_workflows_b_create_api_workflow, agents_workflows_b_design_database_workflow, agents_workflows_b_documentation_workflow, agents_workflows_b_fix_bug_workflow, agents_workflows_b_implement_features_workflow, agents_workflows_b_improve_performance_workflow, agents_workflows_b_improve_ui_workflow, agents_workflows_b_plan_features_workflow, agents_workflows_b_refactor_module_workflow, agents_workflows_b_update_memory_workflow [EXTRACTED 1.00]
- **Client Entry Point** — briselle_lightining_client_index_html, src_main_tsx [INFERRED 0.70]
- **Default List Page Component Composition** — briselle-lightining_client_src_components_ui_tabletemplates_configurablelisttemplate, briselle-lightining_client_src_components_ui_tabletemplates_tabletitlepanel, briselle-lightining_client_src_components_ui_tabletemplates_tabletabpanel, briselle-lightining_client_src_components_ui_tabletemplates_tableactionpanel, briselle-lightining_client_src_components_ui_tabletemplates_datatable, briselle-lightining_client_src_components_ui_tabletemplates_tablefooter [EXTRACTED 1.00]
- **ZIVA Chat Module Core Components** — briselle-lightining_client_src_modules_ziva_chat_module_src_zivachat, briselle-lightining_client_src_modules_ziva_chat_module_src_zivaknowledge, briselle-lightining_client_src_modules_ziva_chat_module_src_defaultconfig, briselle-lightining_client_src_modules_ziva_chat_module_src_simplezivacontactform, briselle-lightining_client_src_modules_ziva_chat_module_src_zivapage, briselle-lightining_client_src_modules_ziva_chat_module_src_zivaserviceconfig [EXTRACTED 1.00]
- **ZIVA Chat Module Server Components** — briselle-lightining_client_src_modules_ziva_chat_module_server_createzivapi_mjs, briselle-lightining_client_src_modules_ziva_chat_module_server_zivastandaloneserver_mjs, briselle-lightining_client_src_modules_ziva_chat_module_server_zivaserverconfig_mjs [EXTRACTED 1.00]

## Communities (128 total, 37 thin omitted)

### Community 0 - "objectLoaderRecordModals.tsx"
Cohesion: 0.05
Nodes (64): buildCopyPlain(), buildCopyTable(), buildMergedJsonColumnUpdate(), BulkEditModal(), coerceInputValue(), coerceSysStatusScalar(), collectValidationErrors(), composePhoneValue() (+56 more)

### Community 1 - "zivaKnowledge.js"
Cohesion: 0.09
Nodes (42): createObjectFromZivaChat(), defaultZivaConfig, mergeZivaConfig(), resolveFieldSpecsForObject(), BRISHELLE_MODULES, buildContextualFieldSpecLines(), buildTopicDerivedFieldSpecs(), CONTEXT_TOKEN_EXPANSIONS (+34 more)

### Community 2 - "ZivaChat.jsx"
Cohesion: 0.10
Nodes (33): ZivaPlanChecklist(), SimpleZivaContactForm(), mergeAiSuggestionSources(), mergePanelSources(), buildAssistantModePromptBlock(), canApplyFieldAttributesInChat(), canRunComprehensiveCreate(), canRunCreateObject() (+25 more)

### Community 3 - "blocks.jsx"
Cohesion: 0.05
Nodes (30): ACTION_DEFS, ActionConfigForm(), ActionConfigVariables(), AudioBlock, BookmarkBlock, ButtonBlock, CalloutBlock, CodeBlock (+22 more)

### Community 4 - "menus.jsx"
Cohesion: 0.06
Nodes (29): listNotionPages(), deobfuscateText(), getBlockById(), obfuscateText(), formatAuditDateTime(), resolveUserDisplayName(), AttachmentPopover, BG_COLORS (+21 more)

### Community 5 - "utils.js"
Cohesion: 0.09
Nodes (32): focusBlock(), useEditable(), CODE_LANGUAGE_CATEGORIES, CODE_LANGUAGES, CSS_PROPS, deobfuscateTextSecure(), _derivedKey, escapeHtml() (+24 more)

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
Cohesion: 0.11
Nodes (33): cellRangeExteriorBoxShadow(), CellRangePoint, checkboxColumnRightBorderClass(), checkboxLeadSelectionShadow(), composeDataCellSelectionShadow(), ConfigurableListTemplate(), CustomRowBadgeOverflowMode, findCheckboxRowRangeForFlatRow() (+25 more)

### Community 10 - "Graphify SKILL.md - Main Pipeline Documentation"
Cohesion: 0.08
Nodes (31): AGENTS.md - Project Graphify Instructions, AST Extraction, BFS Traversal, Community Detection, Confidence Score Rubric, Cross-Repo Merge, Dual Extraction Model, Extraction Caching (+23 more)

### Community 11 - "RecordsList.tsx"
Cohesion: 0.14
Nodes (30): applyNotionNestFieldPolicy(), allocateAutoNumberFromLedger(), buildRecordsInlineEditCandidateKeys(), buildRecordsTemplateConfig(), composePhoneValue(), DbObjectRow, DbObjectSchemaField, DdataRow (+22 more)

### Community 12 - "ZivaController"
Cohesion: 0.08
Nodes (22): WeatherForecastController, string, ObjectFieldsRequest, ZivaController, string, Task, CancellationToken, ControllerBase (+14 more)

### Community 13 - "TableActionPanel.refactored.tsx"
Cohesion: 0.09
Nodes (14): Action_ChangeOwnerProps, Action_ChartProps, ExportFormat, Action_FilterProps, FilterCriteria, Action_PresetProps, TablePreset, Action_PrintProps (+6 more)

### Community 14 - "NotionNestPage.jsx"
Cohesion: 0.11
Nodes (23): MediaBlockPicker(), BlockRenderer, AiRephrasePopover(), convertHtmlToBlocks(), NotionNestPage(), NotionPageInner(), UndoPopover(), unescapeHtml() (+15 more)

### Community 15 - "TableSettingsModal.tsx"
Cohesion: 0.13
Nodes (20): DataSettingsSection(), DataSettingsSectionProps, ThemeSettingsSectionProps, TableSettingsModal(), injectCanonicalDefaultTab(), buildMinimalObjectLoaderConfigFromCode(), extractObjectTabBarFromConfig(), pruneObjectLoaderToDefaultOnlyInDB() (+12 more)

### Community 16 - "Briselle Global AI Instructions"
Cohesion: 0.12
Nodes (26): Briselle Enterprise Architecture, Briselle Global AI Instructions, Code Review Workflow, Create API Workflow, Design Database Workflow, Documentation Workflow, Fix Bug Workflow, Implement Features Workflow (+18 more)

### Community 17 - "TabSettingsSection.tsx"
Cohesion: 0.13
Nodes (20): TabSettingsSection(), TabSettingsSectionProps, Toggle(), hexToRgba(), TabBarPlacement, TabItem, TableTabPanel(), TableTabPanelProps (+12 more)

### Community 18 - "devDependencies"
Cohesion: 0.08
Nodes (25): autoprefixer, devDependencies, autoprefixer, eslint, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, postcss (+17 more)

### Community 19 - "BlockRenderer.jsx"
Cohesion: 0.15
Nodes (23): AudioBlock, BookmarkBlock, ButtonBlock, CalloutBlock, CodeBlock, ColumnsBlock, DividerBlock, EquationBlock (+15 more)

### Community 20 - "TableActionPanel.tsx"
Cohesion: 0.08
Nodes (24): Action_ChangeOwner.tsx, Action_Chart.tsx, Action_ColumnVisibility.tsx, Action_Export.tsx, Action_Filter.tsx, Action_FreezePane.tsx, Action_Group.tsx, Action_Import.tsx (+16 more)

### Community 21 - "configService.ts"
Cohesion: 0.20
Nodes (22): PresetSettingsSection(), appendPresetToDB(), ConfigJsonPayload, deleteShareLinkFromDB(), deleteShareLinksForPresetFromDB(), ensureObjectLoaderPlatformConfigRow(), entryToPreset(), fetchPresetsFromDB() (+14 more)

### Community 22 - "fieldTypeMaster.ts"
Cohesion: 0.12
Nodes (20): buildSectionRows(), FIELD_ATTRIBUTE_UI_SECTIONS, FieldAttributesSectionedPanel(), FieldAttributesSectionedPanelProps, FieldAttributeUiSection, getObjectPrefix(), ATTRIBUTE_CATALOG, EFFECTIVE_KEYS_EVERY_TYPE (+12 more)

### Community 23 - "package.json"
Cohesion: 0.08
Nodes (23): dependencies, express, description, react, react-dom, react-router-dom, name, peerDependencies (+15 more)

### Community 24 - "zivaMultiCommand.js"
Cohesion: 0.17
Nodes (21): extractObjectTopic(), norm(), parseComprehensiveCreateObjectRequest(), parseFieldCount(), extractExplicitColumnLabels(), extractObjectLabelFromCreateMessage(), norm(), normalizeColumnToSpecLine() (+13 more)

### Community 25 - "dependencies"
Cohesion: 0.09
Nodes (23): axios, @blocknote/core, @blocknote/mantine, @blocknote/react, dependencies, axios, @blocknote/core, @blocknote/mantine (+15 more)

### Community 26 - "cn"
Cohesion: 0.12
Nodes (18): Action_ColumnVisibility(), Action_ColumnVisibilityProps, ColumnWidthPxInput(), Action_Filter(), Action_FreezePane(), Action_FreezePaneProps, ToggleSwitch(), Action_Group() (+10 more)

### Community 27 - "UndoHistoryManager"
Cohesion: 0.10
Nodes (4): NotionPagePayload, PositionalCheckpoint, UndoHistoryManager, VersionEntry

### Community 28 - "ObjectDetail.tsx"
Cohesion: 0.16
Nodes (21): applyFieldPatchToConfig(), DbObjectRow, formatDateLabel(), NewFieldFormState, normalizeConfigurationFields(), normalizeFieldRow(), normalizeObjectType(), OBJECT_MANAGER_MENU (+13 more)

### Community 29 - "compilerOptions"
Cohesion: 0.09
Nodes (22): compilerOptions, allowImportingTsExtensions, allowJs, isolatedModules, jsx, lib, module, moduleDetection (+14 more)

### Community 30 - "zivaAiSuggestions.js"
Cohesion: 0.16
Nodes (20): buildAiSuggestionsForSession(), buildObjectListExampleAiSuggestions(), buildObjectMenuAiSuggestions(), buildObjectMenuRelatedControls(), buildRelatedControlsForSession(), buildSessionMessagePanels(), chipIsRelatedControl(), controlToAiChip() (+12 more)

### Community 31 - "notionNestPageStorage.ts"
Cohesion: 0.23
Nodes (13): createNotionNestRecord(), loadNotionRecordContext(), loadPageVersionData(), loadPageVersions(), mergeObjectConfigIcon(), safeParseConfig(), saveNotionPage(), savePageVersion() (+5 more)

### Community 32 - "DisplaySettingsSection.tsx"
Cohesion: 0.14
Nodes (12): DisplaySettingsSection(), DisplaySettingsSectionProps, Toggle(), TableActionPanel(), BUTTON_DEFINITIONS, ButtonDefinition, DEFAULT_ACTION_PANEL_ORDER, getButtonOrder() (+4 more)

### Community 33 - "compilerOptions"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, isolatedModules, lib, module, moduleDetection, moduleResolution, noEmit (+9 more)

### Community 34 - "supabase.ts"
Cohesion: 0.16
Nodes (10): NavItem, Sidebar(), SidebarProps, EntityDetail, Field, Entity, fieldMappings, supabase (+2 more)

### Community 35 - "ObjectAdd.tsx"
Cohesion: 0.28
Nodes (15): getAutoNumberDisplayFormatFromObjectLabel(), readIncludeInInlineEdit(), readIncludeInTableView(), withDataViewDefaults(), getDefaultAttributesForFieldType(), recordDisplayFieldApiForDataType(), createField(), createMandatoryFirstField() (+7 more)

### Community 36 - "zivaObjectCreateFromChat.ts"
Cohesion: 0.24
Nodes (16): toUserDefinedApiName(), getFieldTypeMasterEntry(), buildFixedPlatformSystemFieldRows(), PLATFORM_SYSTEM_API_SET, allocateApiNames(), buildConfigurationPayload(), buildCustomFieldRow(), CreateObjectFromZivaResult (+8 more)

### Community 37 - "helpers.ts"
Cohesion: 0.12
Nodes (6): Action_Export(), Action_ExportProps, Action_TableView(), Action_TableViewProps, TableFooterProps, TableTitlePanelProps

### Community 38 - "PageContext.jsx"
Cohesion: 0.28
Nodes (15): cleanBlockContentOrphans(), PageContext, PageProvider(), buildDefaultBlocks(), calculateInitials(), clearAllRedactedContent(), clearRedactedContent(), createNewBlock() (+7 more)

### Community 39 - "zivaLlmOrchestrate.js"
Cohesion: 0.28
Nodes (14): applyAssistantModeToOrchestrate(), getModeAwareFallback(), normalizePlanSteps(), buildZivaSessionPayload(), fallbackOrchestrate(), fetchZivaOrchestrate(), normalizeOrchestratePayload(), ALLOWED_ACTIONS (+6 more)

### Community 40 - "zivaFieldAttributes.js"
Cohesion: 0.32
Nodes (15): applyFieldAttributesToDraft(), ATTRIBUTE_PHRASES, findFieldIndex(), formatFieldAttrsForPreview(), labelKeyFromLine(), looksLikeFieldAttributeMessage(), mergeAttrMap(), norm() (+7 more)

### Community 41 - "TableConfig"
Cohesion: 0.19
Nodes (11): TableConfig, PresetSettingsSectionProps, TableSettingsModalProps, PlatformConfigScope, loadTableConfig(), loadTablePresets(), TableQueryState, DEFAULT_CONFIG (+3 more)

### Community 42 - "TabBlock.jsx"
Cohesion: 0.20
Nodes (13): fetchLucideIcons(), hasPageIcon(), ICON_COLORS, NotionIconPicker, renderIconSvg(), renderPageIcon(), SVG_ICONS, toPascalCase() (+5 more)

### Community 43 - "zivaServerConfig.mjs"
Cohesion: 0.18
Nodes (10): createZivaApiRouter(), safeSendJson(), __dirname, getZivaServerConfig(), intPort(), loadDotEnvZiva(), parseEnvFile(), ZIVA_MODULE_ROOT (+2 more)

### Community 44 - "RealtimeHub"
Cohesion: 0.15
Nodes (8): RealtimeHub, Task, Program, WeatherForecast, Briselle_Lightining.Server, Briselle_Lightining.Server.Hubs, DateOnly, Hub

### Community 45 - "presets.ts"
Cohesion: 0.16
Nodes (8): CANONICAL_DEFAULT_TAB_ITEM, CanonicalTabItem, mergeObjectTabBarIntoConfig(), mergePresetWithPreservedTabState(), TAB_BAR_OBJECT_LOADER_KEYS, TableConfigTabMerge, loadCustomPresetsFromStorage(), saveCustomPresetsToStorage()

### Community 46 - "index.ts"
Cohesion: 0.15
Nodes (12): ActivityLog, Dashboard, FieldDefinition, FieldType, Notification, ObjectDefinition, Permission, Record (+4 more)

### Community 48 - "tableUserViewStorage.ts"
Cohesion: 0.23
Nodes (8): computeTemplateId(), loadTableQueryState(), readSavedQueryStateFromPresetConfig(), sanitizeColumnWidthsPx(), sanitizeColumnWrapStates(), sanitizeTableQueryState(), saveTableQueryState(), userViewStorageKey()

### Community 49 - "fieldDataTypeModel.tsx"
Cohesion: 0.21
Nodes (11): FIELD_TYPE_CATEGORY_ORDER, FieldDefinitionRowColumnLayout, FieldDefinitionRowErrors, FieldDefinitionRowForm(), FieldDefinitionRowFormProps, FieldRowTypePicker, groupedFieldTypes(), InlineFieldSwitch() (+3 more)

### Community 50 - "authStore.ts"
Cohesion: 0.21
Nodes (9): Login(), api, authApi, objectsApi, recordsApi, usersApi, AuthState, useAuthStore (+1 more)

### Community 51 - "StatCard.tsx"
Cohesion: 0.18
Nodes (4): ObjectStats, Activity, StatCard(), StatCardProps

### Community 52 - "platformSystemFields.ts"
Cohesion: 0.27
Nodes (10): NOTION_NEST_PAGE_FIELD_API, INLINE_EDIT_EXCLUDED_EXTRA, isFixedPlatformSystemApi(), isRecordDisplayFieldApi(), isRecordNameFieldApi(), PLATFORM_SYSTEM_FIXED_APIS, platformFieldSortIndex(), RECORD_DISPLAY_FIELD_APIS (+2 more)

### Community 53 - "ZivaChat.jsx"
Cohesion: 0.20
Nodes (10): defaultConfig.js, index.js, SimpleZivaContactForm.jsx, ZivaChat.jsx, ZivaChat.css, ZivaContactForm.css, zivaKnowledge.js, ZivaPage.jsx (+2 more)

### Community 54 - "package.json"
Cohesion: 0.20
Nodes (9): name, private, scripts, build, dev, lint, preview, type (+1 more)

### Community 55 - "uiIconPickerCatalog.tsx"
Cohesion: 0.27
Nodes (8): CORE_TAB_AND_OBJECT_ICONS, EXTENDED_SAAS_ICONS, UI_ICON_CUSTOM_ENTRY, UI_ICON_LUCIDE_PICKER_ENTRIES, UI_ICON_MAP, UI_ICON_PICKER_OPTIONS, UiIconPickerEntry, UiIconPickerSelect()

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

### Community 62 - "BehaviorSettingsSection.tsx"
Cohesion: 0.33
Nodes (5): BehaviorSettingsSection(), BehaviorSettingsSectionProps, Toggle(), INLINE_EDIT_EXCLUDED_SYSTEM_SET, isExcludedFromInlineEditSystemPicker()

### Community 63 - "TableActionPanel.tsx"
Cohesion: 0.29
Nodes (5): TableActionPanel(), TableActionPanelProps, Action_Search(), ActionSearchProps, SearchActionConfig

### Community 65 - "notionNestPageDefaults.ts"
Cohesion: 0.67
Nodes (5): createDefaultNotionPage(), createEmptyNotionBlocks(), migrateBlockNoteToNotionZest(), parseNotionPageFromValues(), sanitizeNotionBlocks()

### Community 66 - "zivaGroqFields.js"
Cohesion: 0.53
Nodes (5): ALLOWED_TYPES, fetchFieldSpecsFromGroq(), fieldItemToSpecLine(), normalizeFieldSpecLine(), parseObjectFieldsPayload()

### Community 69 - "Ziva Chat Module"
Cohesion: 0.50
Nodes (5): Ziva Chat Module Static Assets README, Ziva Chat Module Environment Variables, Briselle Logo, Groq API Integration, Ziva Chat Module

### Community 70 - "fix_menus_dup.cjs"
Cohesion: 0.50
Nodes (3): c, fs, l

### Community 71 - "Action_Import.tsx"
Cohesion: 0.50
Nodes (3): Action_Import(), Action_ImportProps, ImportFormat

### Community 72 - "Action_TableLayoutSetup.tsx"
Cohesion: 0.67
Nodes (3): Action_TableLayoutSetup(), Action_TableLayoutSetupProps, Toggle()

### Community 73 - "DataTable.tsx"
Cohesion: 0.67
Nodes (3): DataTable(), DataTableProps, useEffect()

### Community 74 - "notionNestPagePath"
Cohesion: 0.83
Nodes (3): notionNestPagePath(), RecordDetail(), safeParseConfig()

### Community 76 - "Briseille Brand Identity (Z)"
Cohesion: 0.83
Nodes (4): Circular Logo with Stylized Z, Briseille Brand Identity (Z), Ziva Chat Module, Briseille Ziva Chat Module Logo

### Community 77 - "opencode.json"
Cohesion: 0.50
Nodes (3): plugin, $schema, .opencode/plugins/graphify.js

### Community 78 - "zivaStandaloneServer.mjs"
Cohesion: 0.67
Nodes (3): createZivaApi.mjs, zivaServerConfig.mjs, zivaStandaloneServer.mjs

## Knowledge Gaps
- **426 isolated node(s):** `net8.0`, `Microsoft.AspNetCore.SpaProxy`, `Microsoft.VisualStudio.Azure.Containers.Tools.Targets (1.21.0)`, `Swashbuckle.AspNetCore (6.6.2)`, `Microsoft.NET.Sdk.Web` (+421 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **37 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `cn` to `DisplaySettingsSection.tsx`, `objectLoaderRecordModals.tsx`, `supabase.ts`, `LayoutSettingsSection.tsx`, `helpers.ts`, `Action_Import.tsx`, `Action_TableLayoutSetup.tsx`, `ConfigurableListTemplate.tsx`, `DataTable.tsx`, `TableActionPanel.refactored.tsx`, `TableSettingsModal.tsx`, `TabSettingsSection.tsx`, `fieldDataTypeModel.tsx`, `StatCard.tsx`, `uiIconPickerCatalog.tsx`, `ObjectDetail.tsx`, `BehaviorSettingsSection.tsx`, `TableActionPanel.tsx`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **Why does `NotionPagePayload` connect `UndoHistoryManager` to `objectLoaderRecordModals.tsx`, `notionNestPageDefaults.ts`, `notionNestPageStorage.ts`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **Why does `toUserDefinedApiName()` connect `zivaObjectCreateFromChat.ts` to `fieldDataTypeModel.tsx`, `ZivaChat.jsx`, `ObjectAdd.tsx`, `ObjectDetail.tsx`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `ZivaChat()` (e.g. with `buildObjectMenuRelatedControls()` and `controlToAiChip()`) actually correct?**
  _`ZivaChat()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `net8.0`, `Microsoft.AspNetCore.SpaProxy`, `Microsoft.VisualStudio.Azure.Containers.Tools.Targets (1.21.0)` to the rest of the system?**
  _426 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `objectLoaderRecordModals.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05031645569620253 - nodes in this community are weakly interconnected._
- **Should `zivaKnowledge.js` be split into smaller, more focused modules?**
  _Cohesion score 0.09065679925994449 - nodes in this community are weakly interconnected._