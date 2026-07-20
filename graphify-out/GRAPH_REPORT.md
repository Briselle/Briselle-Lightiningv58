# Graph Report - .  (2026-07-20)

## Corpus Check
- 61 files · ~231,759 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1543 nodes · 3062 edges · 128 communities (91 shown, 37 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 49 edges (avg confidence: 0.73)
- Token cost: 1,847 input · 0 output

## Community Hubs (Navigation)
- Bulk Edit & Validation
- Ziva Object Creation
- Ziva Chat UI
- Block Components & Actions
- Notion Page Management
- Rich Text Editing
- Server Configuration
- Ziva Data Fetching
- App Pages & Routing
- Table Template Core
- Graphify Documentation
- Database Schema & Records
- ASP.NET Controllers
- Action Component Types
- Notion Nest Rendering
- Table Settings UI
- Briselle Agent Workflows
- Tab Settings UI
- Build Dependencies
- Notion Block Types
- Table Action Components
- Preset Management
- Field Attributes UI
- NPM Dependencies
- Ziva Message Parsing
- Third-Party Libraries
- Column & Filter Actions
- Undo History
- Object Config Management
- TypeScript Config
- Ziva AI Suggestions
- Notion CRUD Operations
- Display Settings & Actions
- TS Config (client)
- Navigation & Auth
- Field Defaults & Display
- API Name & Field Creation
- Export & Table Footer
- Block Operations
- Ziva Orchestration
- Field Attribute Processing
- Table Config & Presets
- Icon Picker
- Ziva Server API
- .NET Server Components
- Canonical Tab Management
- Data Models
- Community 47
- Table Query State
- Field Definition Form
- Auth & API Layer
- Dashboard Stats
- Platform Field Constants
- Ziva Chat Files
- Package Config
- UI Icon System
- Settings Section Files
- Field Attribute Validation
- Ziva Model Picker
- Community 59
- Project Dependencies
- Chart Panel
- Behavior Settings
- Table Search Action
- Community 64
- Notion Page Utils
- Groq Field Specs
- Community 67
- Community 68
- Ziva Assets & Config
- CSS Utilities
- Import Action
- Table Layout Setup
- Data Table
- Record Detail Routing
- Community 75
- Branding Assets
- OpenCode Plugin
- Ziva Server Files
- Community 79
- Community 80
- Community 81
- Community 82
- Community 83
- Community 84
- Community 85
- Community 86
- Community 87
- Community 88
- Community 89
- Community 90
- Community 91
- Community 92
- Community 93
- Community 94
- Misc Code
- Misc Code
- Misc Code
- Misc Code
- Misc Code
- Misc Code
- Misc Code
- Misc Code
- Misc Code
- Misc Code
- Misc Code
- Misc Code
- Misc Code
- Misc Code
- Misc Code

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

### Community 0 - "Bulk Edit & Validation"
Cohesion: 0.05
Nodes (64): buildCopyPlain(), buildCopyTable(), buildMergedJsonColumnUpdate(), BulkEditModal(), coerceInputValue(), coerceSysStatusScalar(), collectValidationErrors(), composePhoneValue() (+56 more)

### Community 1 - "Ziva Object Creation"
Cohesion: 0.09
Nodes (42): createObjectFromZivaChat(), defaultZivaConfig, mergeZivaConfig(), resolveFieldSpecsForObject(), BRISHELLE_MODULES, buildContextualFieldSpecLines(), buildTopicDerivedFieldSpecs(), CONTEXT_TOKEN_EXPANSIONS (+34 more)

### Community 2 - "Ziva Chat UI"
Cohesion: 0.10
Nodes (33): ZivaPlanChecklist(), SimpleZivaContactForm(), mergeAiSuggestionSources(), mergePanelSources(), buildAssistantModePromptBlock(), canApplyFieldAttributesInChat(), canRunComprehensiveCreate(), canRunCreateObject() (+25 more)

### Community 3 - "Block Components & Actions"
Cohesion: 0.05
Nodes (30): ACTION_DEFS, ActionConfigForm(), ActionConfigVariables(), AudioBlock, BookmarkBlock, ButtonBlock, CalloutBlock, CodeBlock (+22 more)

### Community 4 - "Notion Page Management"
Cohesion: 0.06
Nodes (29): listNotionPages(), deobfuscateText(), getBlockById(), obfuscateText(), formatAuditDateTime(), resolveUserDisplayName(), AttachmentPopover, BG_COLORS (+21 more)

### Community 5 - "Rich Text Editing"
Cohesion: 0.09
Nodes (32): focusBlock(), useEditable(), CODE_LANGUAGE_CATEGORIES, CODE_LANGUAGES, CSS_PROPS, deobfuscateTextSecure(), _derivedKey, escapeHtml() (+24 more)

### Community 6 - "Server Configuration"
Cohesion: 0.06
Nodes (38): commandName, environmentVariables, launchBrowser, launchUrl, publishAllPorts, useSSL, ASPNETCORE_ENVIRONMENT, ASPNETCORE_HOSTINGSTARTUPASSEMBLIES (+30 more)

### Community 7 - "Ziva Data Fetching"
Cohesion: 0.13
Nodes (32): buildExploreContextForSession(), applyActiveFilter(), displayNameFromRow(), fetchDobjObjectListForChat(), fetchObjectFieldsForChat(), formatObjectListChatMarkdown(), LIST_LIMITS, mapRows() (+24 more)

### Community 8 - "App Pages & Routing"
Cohesion: 0.06
Nodes (22): Dashboard, EntityDetail, EntityList, Login, NotionNestPage, ObjectAdd, ObjectConfig, ObjectDetail (+14 more)

### Community 9 - "Table Template Core"
Cohesion: 0.11
Nodes (33): cellRangeExteriorBoxShadow(), CellRangePoint, checkboxColumnRightBorderClass(), checkboxLeadSelectionShadow(), composeDataCellSelectionShadow(), ConfigurableListTemplate(), CustomRowBadgeOverflowMode, findCheckboxRowRangeForFlatRow() (+25 more)

### Community 10 - "Graphify Documentation"
Cohesion: 0.08
Nodes (31): AGENTS.md - Project Graphify Instructions, AST Extraction, BFS Traversal, Community Detection, Confidence Score Rubric, Cross-Repo Merge, Dual Extraction Model, Extraction Caching (+23 more)

### Community 11 - "Database Schema & Records"
Cohesion: 0.14
Nodes (30): applyNotionNestFieldPolicy(), allocateAutoNumberFromLedger(), buildRecordsInlineEditCandidateKeys(), buildRecordsTemplateConfig(), composePhoneValue(), DbObjectRow, DbObjectSchemaField, DdataRow (+22 more)

### Community 12 - "ASP.NET Controllers"
Cohesion: 0.08
Nodes (22): WeatherForecastController, string, ObjectFieldsRequest, ZivaController, string, Task, CancellationToken, ControllerBase (+14 more)

### Community 13 - "Action Component Types"
Cohesion: 0.09
Nodes (14): Action_ChangeOwnerProps, Action_ChartProps, ExportFormat, Action_FilterProps, FilterCriteria, Action_PresetProps, TablePreset, Action_PrintProps (+6 more)

### Community 14 - "Notion Nest Rendering"
Cohesion: 0.11
Nodes (23): MediaBlockPicker(), BlockRenderer, AiRephrasePopover(), convertHtmlToBlocks(), NotionNestPage(), NotionPageInner(), UndoPopover(), unescapeHtml() (+15 more)

### Community 15 - "Table Settings UI"
Cohesion: 0.13
Nodes (20): DataSettingsSection(), DataSettingsSectionProps, ThemeSettingsSectionProps, TableSettingsModal(), injectCanonicalDefaultTab(), buildMinimalObjectLoaderConfigFromCode(), extractObjectTabBarFromConfig(), pruneObjectLoaderToDefaultOnlyInDB() (+12 more)

### Community 16 - "Briselle Agent Workflows"
Cohesion: 0.12
Nodes (26): Briselle Enterprise Architecture, Briselle Global AI Instructions, Code Review Workflow, Create API Workflow, Design Database Workflow, Documentation Workflow, Fix Bug Workflow, Implement Features Workflow (+18 more)

### Community 17 - "Tab Settings UI"
Cohesion: 0.13
Nodes (20): TabSettingsSection(), TabSettingsSectionProps, Toggle(), hexToRgba(), TabBarPlacement, TabItem, TableTabPanel(), TableTabPanelProps (+12 more)

### Community 18 - "Build Dependencies"
Cohesion: 0.08
Nodes (25): autoprefixer, devDependencies, autoprefixer, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, postcss (+17 more)

### Community 19 - "Notion Block Types"
Cohesion: 0.15
Nodes (23): AudioBlock, BookmarkBlock, ButtonBlock, CalloutBlock, CodeBlock, ColumnsBlock, DividerBlock, EquationBlock (+15 more)

### Community 20 - "Table Action Components"
Cohesion: 0.08
Nodes (24): Action_ChangeOwner.tsx, Action_Chart.tsx, Action_ColumnVisibility.tsx, Action_Export.tsx, Action_Filter.tsx, Action_FreezePane.tsx, Action_Group.tsx, Action_Import.tsx (+16 more)

### Community 21 - "Preset Management"
Cohesion: 0.20
Nodes (22): PresetSettingsSection(), appendPresetToDB(), ConfigJsonPayload, deleteShareLinkFromDB(), deleteShareLinksForPresetFromDB(), ensureObjectLoaderPlatformConfigRow(), entryToPreset(), fetchPresetsFromDB() (+14 more)

### Community 22 - "Field Attributes UI"
Cohesion: 0.12
Nodes (20): buildSectionRows(), FIELD_ATTRIBUTE_UI_SECTIONS, FieldAttributesSectionedPanel(), FieldAttributesSectionedPanelProps, FieldAttributeUiSection, getObjectPrefix(), ATTRIBUTE_CATALOG, EFFECTIVE_KEYS_EVERY_TYPE (+12 more)

### Community 23 - "NPM Dependencies"
Cohesion: 0.08
Nodes (23): dependencies, express, description, react, react-dom, react-router-dom, name, peerDependencies (+15 more)

### Community 24 - "Ziva Message Parsing"
Cohesion: 0.17
Nodes (21): extractObjectTopic(), norm(), parseComprehensiveCreateObjectRequest(), parseFieldCount(), extractExplicitColumnLabels(), extractObjectLabelFromCreateMessage(), norm(), normalizeColumnToSpecLine() (+13 more)

### Community 25 - "Third-Party Libraries"
Cohesion: 0.09
Nodes (23): axios, @blocknote/core, @blocknote/mantine, @blocknote/react, dependencies, axios, @blocknote/core, @blocknote/mantine (+15 more)

### Community 26 - "Column & Filter Actions"
Cohesion: 0.12
Nodes (18): Action_ColumnVisibility(), Action_ColumnVisibilityProps, ColumnWidthPxInput(), Action_Filter(), Action_FreezePane(), Action_FreezePaneProps, ToggleSwitch(), Action_Group() (+10 more)

### Community 27 - "Undo History"
Cohesion: 0.10
Nodes (4): NotionPagePayload, PositionalCheckpoint, UndoHistoryManager, VersionEntry

### Community 28 - "Object Config Management"
Cohesion: 0.16
Nodes (21): applyFieldPatchToConfig(), DbObjectRow, formatDateLabel(), NewFieldFormState, normalizeConfigurationFields(), normalizeFieldRow(), normalizeObjectType(), OBJECT_MANAGER_MENU (+13 more)

### Community 29 - "TypeScript Config"
Cohesion: 0.09
Nodes (22): compilerOptions, allowImportingTsExtensions, allowJs, isolatedModules, jsx, lib, module, moduleDetection (+14 more)

### Community 30 - "Ziva AI Suggestions"
Cohesion: 0.16
Nodes (20): buildAiSuggestionsForSession(), buildObjectListExampleAiSuggestions(), buildObjectMenuAiSuggestions(), buildObjectMenuRelatedControls(), buildRelatedControlsForSession(), buildSessionMessagePanels(), chipIsRelatedControl(), controlToAiChip() (+12 more)

### Community 31 - "Notion CRUD Operations"
Cohesion: 0.23
Nodes (13): createNotionNestRecord(), loadNotionRecordContext(), loadPageVersionData(), loadPageVersions(), mergeObjectConfigIcon(), safeParseConfig(), saveNotionPage(), savePageVersion() (+5 more)

### Community 32 - "Display Settings & Actions"
Cohesion: 0.14
Nodes (12): DisplaySettingsSection(), DisplaySettingsSectionProps, Toggle(), TableActionPanel(), BUTTON_DEFINITIONS, ButtonDefinition, DEFAULT_ACTION_PANEL_ORDER, getButtonOrder() (+4 more)

### Community 33 - "TS Config (client)"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, isolatedModules, lib, module, moduleDetection, moduleResolution, noEmit (+9 more)

### Community 34 - "Navigation & Auth"
Cohesion: 0.16
Nodes (10): NavItem, Sidebar(), SidebarProps, EntityDetail, Field, Entity, fieldMappings, supabase (+2 more)

### Community 35 - "Field Defaults & Display"
Cohesion: 0.28
Nodes (15): getAutoNumberDisplayFormatFromObjectLabel(), readIncludeInInlineEdit(), readIncludeInTableView(), withDataViewDefaults(), getDefaultAttributesForFieldType(), recordDisplayFieldApiForDataType(), createField(), createMandatoryFirstField() (+7 more)

### Community 36 - "API Name & Field Creation"
Cohesion: 0.24
Nodes (16): toUserDefinedApiName(), getFieldTypeMasterEntry(), buildFixedPlatformSystemFieldRows(), PLATFORM_SYSTEM_API_SET, allocateApiNames(), buildConfigurationPayload(), buildCustomFieldRow(), CreateObjectFromZivaResult (+8 more)

### Community 37 - "Export & Table Footer"
Cohesion: 0.12
Nodes (6): Action_Export(), Action_ExportProps, Action_TableView(), Action_TableViewProps, TableFooterProps, TableTitlePanelProps

### Community 38 - "Block Operations"
Cohesion: 0.28
Nodes (15): cleanBlockContentOrphans(), PageContext, PageProvider(), buildDefaultBlocks(), calculateInitials(), clearAllRedactedContent(), clearRedactedContent(), createNewBlock() (+7 more)

### Community 39 - "Ziva Orchestration"
Cohesion: 0.28
Nodes (14): applyAssistantModeToOrchestrate(), getModeAwareFallback(), normalizePlanSteps(), buildZivaSessionPayload(), fallbackOrchestrate(), fetchZivaOrchestrate(), normalizeOrchestratePayload(), ALLOWED_ACTIONS (+6 more)

### Community 40 - "Field Attribute Processing"
Cohesion: 0.32
Nodes (15): applyFieldAttributesToDraft(), ATTRIBUTE_PHRASES, findFieldIndex(), formatFieldAttrsForPreview(), labelKeyFromLine(), looksLikeFieldAttributeMessage(), mergeAttrMap(), norm() (+7 more)

### Community 41 - "Table Config & Presets"
Cohesion: 0.19
Nodes (11): TableConfig, PresetSettingsSectionProps, TableSettingsModalProps, PlatformConfigScope, loadTableConfig(), loadTablePresets(), TableQueryState, DEFAULT_CONFIG (+3 more)

### Community 42 - "Icon Picker"
Cohesion: 0.20
Nodes (13): fetchLucideIcons(), hasPageIcon(), ICON_COLORS, NotionIconPicker, renderIconSvg(), renderPageIcon(), SVG_ICONS, toPascalCase() (+5 more)

### Community 43 - "Ziva Server API"
Cohesion: 0.18
Nodes (10): createZivaApiRouter(), safeSendJson(), __dirname, getZivaServerConfig(), intPort(), loadDotEnvZiva(), parseEnvFile(), ZIVA_MODULE_ROOT (+2 more)

### Community 44 - ".NET Server Components"
Cohesion: 0.15
Nodes (8): RealtimeHub, Task, Program, WeatherForecast, Briselle_Lightining.Server, Briselle_Lightining.Server.Hubs, DateOnly, Hub

### Community 45 - "Canonical Tab Management"
Cohesion: 0.16
Nodes (8): CANONICAL_DEFAULT_TAB_ITEM, CanonicalTabItem, mergeObjectTabBarIntoConfig(), mergePresetWithPreservedTabState(), TAB_BAR_OBJECT_LOADER_KEYS, TableConfigTabMerge, loadCustomPresetsFromStorage(), saveCustomPresetsToStorage()

### Community 46 - "Data Models"
Cohesion: 0.15
Nodes (12): ActivityLog, Dashboard, FieldDefinition, FieldType, Notification, ObjectDefinition, Permission, Record (+4 more)

### Community 48 - "Table Query State"
Cohesion: 0.23
Nodes (8): computeTemplateId(), loadTableQueryState(), readSavedQueryStateFromPresetConfig(), sanitizeColumnWidthsPx(), sanitizeColumnWrapStates(), sanitizeTableQueryState(), saveTableQueryState(), userViewStorageKey()

### Community 49 - "Field Definition Form"
Cohesion: 0.21
Nodes (11): FIELD_TYPE_CATEGORY_ORDER, FieldDefinitionRowColumnLayout, FieldDefinitionRowErrors, FieldDefinitionRowForm(), FieldDefinitionRowFormProps, FieldRowTypePicker, groupedFieldTypes(), InlineFieldSwitch() (+3 more)

### Community 50 - "Auth & API Layer"
Cohesion: 0.21
Nodes (9): Login(), api, authApi, objectsApi, recordsApi, usersApi, AuthState, useAuthStore (+1 more)

### Community 51 - "Dashboard Stats"
Cohesion: 0.18
Nodes (4): ObjectStats, Activity, StatCard(), StatCardProps

### Community 52 - "Platform Field Constants"
Cohesion: 0.27
Nodes (10): NOTION_NEST_PAGE_FIELD_API, INLINE_EDIT_EXCLUDED_EXTRA, isFixedPlatformSystemApi(), isRecordDisplayFieldApi(), isRecordNameFieldApi(), PLATFORM_SYSTEM_FIXED_APIS, platformFieldSortIndex(), RECORD_DISPLAY_FIELD_APIS (+2 more)

### Community 53 - "Ziva Chat Files"
Cohesion: 0.20
Nodes (10): defaultConfig.js, index.js, SimpleZivaContactForm.jsx, ZivaChat.jsx, ZivaChat.css, ZivaContactForm.css, zivaKnowledge.js, ZivaPage.jsx (+2 more)

### Community 54 - "Package Config"
Cohesion: 0.20
Nodes (9): name, private, scripts, build, dev, lint, preview, type (+1 more)

### Community 55 - "UI Icon System"
Cohesion: 0.27
Nodes (8): CORE_TAB_AND_OBJECT_ICONS, EXTENDED_SAAS_ICONS, UI_ICON_CUSTOM_ENTRY, UI_ICON_LUCIDE_PICKER_ENTRIES, UI_ICON_MAP, UI_ICON_PICKER_OPTIONS, UiIconPickerEntry, UiIconPickerSelect()

### Community 56 - "Settings Section Files"
Cohesion: 0.22
Nodes (9): BehaviorSettingsSection.tsx, DataSettingsSection.tsx, DeviceSettingsSection.tsx, DisplaySettingsSection.tsx, LayoutSettingsSection.tsx, PresetSettingsSection.tsx, TabSettingsSection.tsx, ThemeSettingsSection.tsx (+1 more)

### Community 57 - "Field Attribute Validation"
Cohesion: 0.39
Nodes (8): validateFieldAttributes(), isPlatformSystemApi(), applyFieldAttributeUpdatesOnObject(), ApplyFieldAttributeUpdatesResult, FieldAttributeUpdateItem, findFieldIndex(), norm(), safeParseConfig()

### Community 58 - "Ziva Model Picker"
Cohesion: 0.36
Nodes (6): ACTIVE_MODELS, computePopoverStyle(), filterModels(), getGroups(), ZivaModelPicker(), ZIVA_CHAT_MODELS

### Community 60 - "Project Dependencies"
Cohesion: 0.29
Nodes (7): Briselle-Lightining.Server, briselle-lightining.client, net8.0, Microsoft.AspNetCore.SpaProxy, Microsoft.VisualStudio.Azure.Containers.Tools.Targets (1.21.0), Swashbuckle.AspNetCore (6.6.2), Microsoft.NET.Sdk.Web

### Community 61 - "Chart Panel"
Cohesion: 0.46
Nodes (7): barHeights(), ChartPanel(), ChartPanelProps, hBarWidths(), pivotRows(), toActiveLike(), toBoolLike()

### Community 62 - "Behavior Settings"
Cohesion: 0.33
Nodes (5): BehaviorSettingsSection(), BehaviorSettingsSectionProps, Toggle(), INLINE_EDIT_EXCLUDED_SYSTEM_SET, isExcludedFromInlineEditSystemPicker()

### Community 63 - "Table Search Action"
Cohesion: 0.29
Nodes (5): TableActionPanel(), TableActionPanelProps, Action_Search(), ActionSearchProps, SearchActionConfig

### Community 65 - "Notion Page Utils"
Cohesion: 0.67
Nodes (5): createDefaultNotionPage(), createEmptyNotionBlocks(), migrateBlockNoteToNotionZest(), parseNotionPageFromValues(), sanitizeNotionBlocks()

### Community 66 - "Groq Field Specs"
Cohesion: 0.53
Nodes (5): ALLOWED_TYPES, fetchFieldSpecsFromGroq(), fieldItemToSpecLine(), normalizeFieldSpecLine(), parseObjectFieldsPayload()

### Community 69 - "Ziva Assets & Config"
Cohesion: 0.50
Nodes (5): Ziva Chat Module Static Assets README, Ziva Chat Module Environment Variables, Briselle Logo, Groq API Integration, Ziva Chat Module

### Community 70 - "CSS Utilities"
Cohesion: 0.50
Nodes (3): c, fs, l

### Community 71 - "Import Action"
Cohesion: 0.50
Nodes (3): Action_Import(), Action_ImportProps, ImportFormat

### Community 72 - "Table Layout Setup"
Cohesion: 0.67
Nodes (3): Action_TableLayoutSetup(), Action_TableLayoutSetupProps, Toggle()

### Community 73 - "Data Table"
Cohesion: 0.67
Nodes (3): DataTable(), DataTableProps, useEffect()

### Community 74 - "Record Detail Routing"
Cohesion: 0.83
Nodes (3): notionNestPagePath(), RecordDetail(), safeParseConfig()

### Community 76 - "Branding Assets"
Cohesion: 0.83
Nodes (4): Circular Logo with Stylized Z, Briseille Brand Identity (Z), Ziva Chat Module, Briseille Ziva Chat Module Logo

### Community 77 - "OpenCode Plugin"
Cohesion: 0.50
Nodes (3): plugin, $schema, .opencode/plugins/graphify.js

### Community 78 - "Ziva Server Files"
Cohesion: 0.67
Nodes (3): createZivaApi.mjs, zivaServerConfig.mjs, zivaStandaloneServer.mjs

## Knowledge Gaps
- **426 isolated node(s):** `net8.0`, `Microsoft.AspNetCore.SpaProxy`, `Microsoft.VisualStudio.Azure.Containers.Tools.Targets (1.21.0)`, `Swashbuckle.AspNetCore (6.6.2)`, `Microsoft.NET.Sdk.Web` (+421 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **37 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `Column & Filter Actions` to `Display Settings & Actions`, `Bulk Edit & Validation`, `Navigation & Auth`, `Community 67`, `Export & Table Footer`, `Import Action`, `Table Layout Setup`, `Table Template Core`, `Data Table`, `Action Component Types`, `Table Settings UI`, `Tab Settings UI`, `Field Definition Form`, `Dashboard Stats`, `UI Icon System`, `Object Config Management`, `Behavior Settings`, `Table Search Action`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **Why does `NotionPagePayload` connect `Undo History` to `Bulk Edit & Validation`, `Notion Page Utils`, `Notion CRUD Operations`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **Why does `toUserDefinedApiName()` connect `API Name & Field Creation` to `Field Definition Form`, `Ziva Chat UI`, `Field Defaults & Display`, `Object Config Management`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `ZivaChat()` (e.g. with `buildObjectMenuRelatedControls()` and `controlToAiChip()`) actually correct?**
  _`ZivaChat()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `net8.0`, `Microsoft.AspNetCore.SpaProxy`, `Microsoft.VisualStudio.Azure.Containers.Tools.Targets (1.21.0)` to the rest of the system?**
  _426 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Bulk Edit & Validation` be split into smaller, more focused modules?**
  _Cohesion score 0.05031645569620253 - nodes in this community are weakly interconnected._
- **Should `Ziva Object Creation` be split into smaller, more focused modules?**
  _Cohesion score 0.09065679925994449 - nodes in this community are weakly interconnected._