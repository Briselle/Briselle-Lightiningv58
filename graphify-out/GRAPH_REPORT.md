# Graph Report - .  (2026-07-19)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1446 nodes · 3044 edges · 104 communities (71 shown, 33 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 34 edges (avg confidence: 0.69)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f3fceaa4`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Clipboard & Bulk Edit
- Notion Page Versioning
- Ziva Config & Contact Form
- Block Actions & Config
- Upload & Attachments UI
- Ziva Chat & AI Creation
- Records & Object Loading
- Workflow & Explore Context
- ASP.NET Launch Config
- App Routes & Pages
- Configurable List Template
- Code Highlighting & Utils
- Ziva API Controllers
- Tab Settings UI
- Notion Nest Field Policies
- Enterprise Workflows
- Table Actions & Stats
- Table Settings Modal
- fieldTypeMaster.ts
- devDependencies
- Block Renderer & Page UI
- Table Action Components
- Table Config Storage
- Package Dependencies
- dependencies
- Preset Config Service
- TypeScript App Config
- Ziva AI Suggestions
- Action Components (Owner, Chart, Export)
- Display & Action Panel
- Ziva Object Creation
- TypeScript Node Config
- Import & Preset UI
- Preset Configuration Merge
- Page Context & Blocks
- Object Add & Field Attributes
- API Name & Field Config
- Ziva API Server
- Ziva Orchestration
- Ziva Field Attributes
- ASP.NET Realtime Hub
- Sidebar & Icon Picker
- Icon Rendering & Tab Block
- Data Models
- User View Storage
- fieldDataTypeModel.tsx
- Login & Auth
- Notion Nest Field APIs
- Entity Management
- Ziva Default Config & Pages
- Package Scripts
- Settings Sections
- Field Attribute Validation
- Ziva AI Model Picker
- SignalR Service
- Solution Configuration
- Object Metrics & Dashboard
- Type Definitions
- Chart Panel
- Behavior Settings
- Table Action Panel
- Ziva Groq Field Specs
- Share Action
- Layout Settings
- Fix Menu Duplicates
- DataTable Component
- index.ts
- Ziva Server Modules
- Print Action
- Refresh Action
- Settings Action
- List Page Template 1
- List Page Template 2
- User Detail
- Users List
- TypeScript Config References
- Entry Point
- clsx Library
- html2canvas Library
- lucide-react
- React Library
- react-hook-form Library
- Supabase Client
- Zustand State
- @eslint/js
- React Types
- Table Templates Doc
- ZIVA Chat README
- Obsidian Project Doc
- Briselle Logo
- Ziva Sparkle White
- Logo Black CT
- Logo Black Square
- Logo White Square
- Delete Preset DB
- Save Preset DB
- Tab Bar Icon Options

## God Nodes (most connected - your core abstractions)
1. `cn()` - 72 edges
2. `ZivaChat()` - 65 edges
3. `ConfigurableListTemplate()` - 52 edges
4. `ObjectDetail()` - 30 edges
5. `RecordsList()` - 30 edges
6. `ObjectAdd()` - 23 edges
7. `processWorkflowUserMessage()` - 22 edges
8. `TableConfig` - 21 edges
9. `UndoHistoryManager` - 20 edges
10. `TableSettingsModal()` - 18 edges

## Surprising Connections (you probably didn't know these)
- `Action_Export()` --calls--> `cn()`  [EXTRACTED]
  briselle-lightining.client/src/components/ui/tabletemplates/action-components/Action_Export.tsx → briselle-lightining.client/src/utils/helpers.ts
- `Action_Import()` --calls--> `cn()`  [EXTRACTED]
  briselle-lightining.client/src/components/ui/tabletemplates/action-components/Action_Import.tsx → briselle-lightining.client/src/utils/helpers.ts
- `Action_Preset()` --calls--> `cn()`  [EXTRACTED]
  briselle-lightining.client/src/components/ui/tabletemplates/action-components/Action_Preset.tsx → briselle-lightining.client/src/utils/helpers.ts
- `Toggle()` --calls--> `cn()`  [EXTRACTED]
  briselle-lightining.client/src/components/ui/tabletemplates/action-components/Action_Share.tsx → briselle-lightining.client/src/utils/helpers.ts
- `Action_Share()` --calls--> `cn()`  [EXTRACTED]
  briselle-lightining.client/src/components/ui/tabletemplates/action-components/Action_Share.tsx → briselle-lightining.client/src/utils/helpers.ts

## Import Cycles
- 3-file cycle: `briselle-lightining.client/src/components/ui/tabletemplates/ConfigurableListTemplate.tsx -> briselle-lightining.client/src/components/ui/tabletemplates/utils/loadTableConfig.ts -> briselle-lightining.client/src/utils/tableConfigStorage.ts -> briselle-lightining.client/src/components/ui/tabletemplates/ConfigurableListTemplate.tsx`

## Hyperedges (group relationships)
- **Briselle Rules** — agents_rules_briselle_enterprise_architecture_doc, agents_rules_briselle_global_rules_doc [EXTRACTED 1.00]
- **Briselle Workflows** — agents_workflows_b_code_review_workflow, agents_workflows_b_create_api_workflow, agents_workflows_b_design_database_workflow, agents_workflows_b_documentation_workflow, agents_workflows_b_fix_bug_workflow, agents_workflows_b_implement_features_workflow, agents_workflows_b_improve_performance_workflow, agents_workflows_b_improve_ui_workflow, agents_workflows_b_plan_features_workflow, agents_workflows_b_refactor_module_workflow, agents_workflows_b_update_memory_workflow [EXTRACTED 1.00]
- **Client Entry Point** — briselle_lightining_client_index_html, src_main_tsx [INFERRED 0.70]
- **Default List Page Component Composition** — briselle-lightining_client_src_components_ui_tabletemplates_configurablelisttemplate, briselle-lightining_client_src_components_ui_tabletemplates_tabletitlepanel, briselle-lightining_client_src_components_ui_tabletemplates_tabletabpanel, briselle-lightining_client_src_components_ui_tabletemplates_tableactionpanel, briselle-lightining_client_src_components_ui_tabletemplates_datatable, briselle-lightining_client_src_components_ui_tabletemplates_tablefooter [EXTRACTED 1.00]
- **ZIVA Chat Module Core Components** — briselle-lightining_client_src_modules_ziva_chat_module_src_zivachat, briselle-lightining_client_src_modules_ziva_chat_module_src_zivaknowledge, briselle-lightining_client_src_modules_ziva_chat_module_src_defaultconfig, briselle-lightining_client_src_modules_ziva_chat_module_src_simplezivacontactform, briselle-lightining_client_src_modules_ziva_chat_module_src_zivapage, briselle-lightining_client_src_modules_ziva_chat_module_src_zivaserviceconfig [EXTRACTED 1.00]
- **ZIVA Chat Module Server Components** — briselle-lightining_client_src_modules_ziva_chat_module_server_createzivapi_mjs, briselle-lightining_client_src_modules_ziva_chat_module_server_zivastandaloneserver_mjs, briselle-lightining_client_src_modules_ziva_chat_module_server_zivaserverconfig_mjs [EXTRACTED 1.00]

## Communities (104 total, 33 thin omitted)

### Community 0 - "Clipboard & Bulk Edit"
Cohesion: 0.06
Nodes (58): buildCopyPlain(), buildCopyTable(), buildMergedJsonColumnUpdate(), BulkEditModal(), coerceInputValue(), coerceSysStatusScalar(), collectValidationErrors(), composePhoneValue() (+50 more)

### Community 1 - "Notion Page Versioning"
Cohesion: 0.07
Nodes (25): createDefaultNotionPage(), createEmptyNotionBlocks(), migrateBlockNoteToNotionZest(), parseNotionPageFromValues(), sanitizeNotionBlocks(), createNotionNestRecord(), loadNotionRecordContext(), loadPageVersionData() (+17 more)

### Community 2 - "Ziva Config & Contact Form"
Cohesion: 0.08
Nodes (45): defaultZivaConfig, mergeZivaConfig(), SimpleZivaContactForm(), resolveFieldSpecsForObject(), BRISHELLE_MODULES, buildContextualFieldSpecLines(), buildNotesAddChip(), buildTopicDerivedFieldSpecs() (+37 more)

### Community 3 - "Block Actions & Config"
Cohesion: 0.07
Nodes (36): BLOCK_MAP, ACTION_DEFS, ActionConfigForm(), ActionConfigVariables(), AudioBlock, BookmarkBlock, ButtonBlock, CalloutBlock (+28 more)

### Community 4 - "Upload & Attachments UI"
Cohesion: 0.06
Nodes (31): UploadZone(), formatAuditDateTime(), resolveUserDisplayName(), AttachmentPopover, BG_COLORS, bgColors, BLOCK_TYPE_OPTIONS, BlockContextMenu() (+23 more)

### Community 5 - "Ziva Chat & AI Creation"
Cohesion: 0.10
Nodes (35): createObjectFromZivaChat(), LABEL_FILLER_WORDS, suggestObjectLabelFromTopic(), ZivaPlanChecklist(), mergeAiSuggestionSources(), mergePanelSources(), canApplyFieldAttributesInChat(), canRunComprehensiveCreate() (+27 more)

### Community 6 - "Records & Object Loading"
Cohesion: 0.10
Nodes (35): notionNestPagePath(), isNotionNestObjectType(), parsePlatformObjectType(), readConfigObjectType(), RecordDetail(), safeParseConfig(), allocateAutoNumberFromLedger(), buildRecordsInlineEditCandidateKeys() (+27 more)

### Community 7 - "Workflow & Explore Context"
Cohesion: 0.12
Nodes (34): buildExploreContextForSession(), applyActiveFilter(), displayNameFromRow(), fetchDobjObjectListForChat(), fetchObjectFieldsForChat(), formatObjectListChatMarkdown(), LIST_LIMITS, mapRows() (+26 more)

### Community 8 - "ASP.NET Launch Config"
Cohesion: 0.06
Nodes (38): commandName, environmentVariables, launchBrowser, launchUrl, publishAllPorts, useSSL, ASPNETCORE_ENVIRONMENT, ASPNETCORE_HOSTINGSTARTUPASSEMBLIES (+30 more)

### Community 9 - "App Routes & Pages"
Cohesion: 0.06
Nodes (22): Dashboard, EntityDetail, EntityList, Login, NotionNestPage, ObjectAdd, ObjectConfig, ObjectDetail (+14 more)

### Community 10 - "Configurable List Template"
Cohesion: 0.12
Nodes (31): cellRangeExteriorBoxShadow(), CellRangePoint, checkboxColumnRightBorderClass(), checkboxLeadSelectionShadow(), composeDataCellSelectionShadow(), ConfigurableListTemplate(), CustomRowBadgeOverflowMode, findCheckboxRowRangeForFlatRow() (+23 more)

### Community 11 - "Code Highlighting & Utils"
Cohesion: 0.10
Nodes (26): CODE_LANG_LIST(), CODE_LANGUAGE_CATEGORIES, CODE_LANGUAGES, CSS_PROPS, deobfuscateTextSecure(), _derivedKey, escapeHtml(), findBlockContainer() (+18 more)

### Community 12 - "Ziva API Controllers"
Cohesion: 0.08
Nodes (22): WeatherForecastController, string, ObjectFieldsRequest, ZivaController, string, Task, CancellationToken, ControllerBase (+14 more)

### Community 13 - "Tab Settings UI"
Cohesion: 0.12
Nodes (21): TabSettingsSection(), TabSettingsSectionProps, Toggle(), hexToRgba(), TabBarPlacement, TabItem, TableTabPanel(), TableTabPanelProps (+13 more)

### Community 14 - "Notion Nest Field Policies"
Cohesion: 0.14
Nodes (25): applyNotionNestFieldPolicy(), buildNotionNestPageFieldRow(), isNotionNestPageFieldApi(), isReservedNotionNestFieldApi(), NOTION_NEST_PAGE_FIELD_API_LOWER, reindexFieldOrders(), syncNotionNestFieldRows(), applyFieldPatchToConfig() (+17 more)

### Community 15 - "Enterprise Workflows"
Cohesion: 0.12
Nodes (26): Briselle Enterprise Architecture, Briselle Global AI Instructions, Code Review Workflow, Create API Workflow, Design Database Workflow, Documentation Workflow, Fix Bug Workflow, Implement Features Workflow (+18 more)

### Community 16 - "Table Actions & Stats"
Cohesion: 0.11
Nodes (19): StatCard(), StatCardProps, Action_ColumnVisibility(), Action_ColumnVisibilityProps, ColumnWidthPxInput(), Action_Filter(), Action_FreezePane(), Action_FreezePaneProps (+11 more)

### Community 17 - "Table Settings Modal"
Cohesion: 0.14
Nodes (19): DataSettingsSection(), DataSettingsSectionProps, ThemeSettingsSectionProps, TableSettingsModal(), injectCanonicalDefaultTab(), buildMinimalObjectLoaderConfigFromCode(), extractObjectTabBarFromConfig(), pruneObjectLoaderToDefaultOnlyInDB() (+11 more)

### Community 18 - "fieldTypeMaster.ts"
Cohesion: 0.11
Nodes (20): buildSectionRows(), FIELD_ATTRIBUTE_UI_SECTIONS, FieldAttributesSectionedPanel(), FieldAttributesSectionedPanelProps, FieldAttributeUiSection, getObjectPrefix(), ATTRIBUTE_CATALOG, EFFECTIVE_KEYS_EVERY_TYPE (+12 more)

### Community 19 - "devDependencies"
Cohesion: 0.08
Nodes (25): autoprefixer, devDependencies, autoprefixer, eslint, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, postcss (+17 more)

### Community 20 - "Block Renderer & Page UI"
Cohesion: 0.11
Nodes (21): BlockRenderer, MediaBlockPicker(), CoverImage, PageHeader, Sidebar, Topbar, ContextMenu, InlineToolbar (+13 more)

### Community 21 - "Table Action Components"
Cohesion: 0.08
Nodes (24): Action_ChangeOwner.tsx, Action_Chart.tsx, Action_ColumnVisibility.tsx, Action_Export.tsx, Action_Filter.tsx, Action_FreezePane.tsx, Action_Group.tsx, Action_Import.tsx (+16 more)

### Community 22 - "Table Config Storage"
Cohesion: 0.14
Nodes (8): TableConfig, loadTableConfig(), loadTablePresets(), DEFAULT_CONFIG, StoredTableConfig, TableConfigPreset, tableConfigStorage, TableConfigStorageService

### Community 23 - "Package Dependencies"
Cohesion: 0.08
Nodes (23): dependencies, express, description, react, react-dom, react-router-dom, name, peerDependencies (+15 more)

### Community 24 - "dependencies"
Cohesion: 0.09
Nodes (23): axios, @blocknote/core, @blocknote/mantine, @blocknote/react, dependencies, axios, @blocknote/core, @blocknote/mantine (+15 more)

### Community 25 - "Preset Config Service"
Cohesion: 0.20
Nodes (21): PresetSettingsSection(), appendPresetToDB(), ConfigJsonPayload, deleteShareLinkFromDB(), deleteShareLinksForPresetFromDB(), ensureObjectLoaderPlatformConfigRow(), entryToPreset(), fetchPresetsFromDB() (+13 more)

### Community 26 - "TypeScript App Config"
Cohesion: 0.09
Nodes (22): compilerOptions, allowImportingTsExtensions, allowJs, isolatedModules, jsx, lib, module, moduleDetection (+14 more)

### Community 27 - "Ziva AI Suggestions"
Cohesion: 0.16
Nodes (20): buildAiSuggestionsForSession(), buildObjectListExampleAiSuggestions(), buildObjectMenuAiSuggestions(), buildObjectMenuRelatedControls(), buildRelatedControlsForSession(), buildSessionMessagePanels(), chipIsRelatedControl(), controlToAiChip() (+12 more)

### Community 28 - "Action Components (Owner, Chart, Export)"
Cohesion: 0.15
Nodes (11): Action_ChangeOwnerProps, Action_ChartProps, Action_Export(), Action_ExportProps, ExportFormat, Action_FilterProps, FilterCriteria, Action_Sort() (+3 more)

### Community 29 - "Display & Action Panel"
Cohesion: 0.14
Nodes (12): DisplaySettingsSection(), DisplaySettingsSectionProps, Toggle(), TableActionPanel(), BUTTON_DEFINITIONS, ButtonDefinition, DEFAULT_ACTION_PANEL_ORDER, getButtonOrder() (+4 more)

### Community 30 - "Ziva Object Creation"
Cohesion: 0.24
Nodes (15): extractObjectTopic(), norm(), parseComprehensiveCreateObjectRequest(), parseFieldCount(), extractExplicitColumnLabels(), extractObjectLabelFromCreateMessage(), norm(), normalizeColumnToSpecLine() (+7 more)

### Community 31 - "TypeScript Node Config"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, isolatedModules, lib, module, moduleDetection, moduleResolution, noEmit (+9 more)

### Community 32 - "Import & Preset UI"
Cohesion: 0.12
Nodes (7): Action_Import(), Action_ImportProps, ImportFormat, Action_Preset(), Action_PresetProps, TableFooterProps, TableTitlePanelProps

### Community 33 - "Preset Configuration Merge"
Cohesion: 0.15
Nodes (10): CANONICAL_DEFAULT_TAB_ITEM, CanonicalTabItem, mergeObjectTabBarIntoConfig(), mergePresetWithPreservedTabState(), TAB_BAR_OBJECT_LOADER_KEYS, TableConfigTabMerge, DEFAULT_PRESETS, getDefaultPreset() (+2 more)

### Community 34 - "Page Context & Blocks"
Cohesion: 0.28
Nodes (15): cleanBlockContentOrphans(), PageContext, PageProvider(), buildDefaultBlocks(), calculateInitials(), clearAllRedactedContent(), clearRedactedContent(), createNewBlock() (+7 more)

### Community 35 - "Object Add & Field Attributes"
Cohesion: 0.29
Nodes (14): getAutoNumberDisplayFormatFromObjectLabel(), readIncludeInInlineEdit(), readIncludeInTableView(), withDataViewDefaults(), getDefaultAttributesForFieldType(), recordDisplayFieldApiForDataType(), createField(), createMandatoryFirstField() (+6 more)

### Community 36 - "API Name & Field Config"
Cohesion: 0.28
Nodes (15): toUserDefinedApiName(), getFieldTypeMasterEntry(), buildFixedPlatformSystemFieldRows(), PLATFORM_SYSTEM_API_SET, allocateApiNames(), buildConfigurationPayload(), buildCustomFieldRow(), buildFirstRecordFieldRow() (+7 more)

### Community 37 - "Ziva API Server"
Cohesion: 0.17
Nodes (11): createZivaApiRouter(), safeSendJson(), __dirname, getZivaServerConfig(), intPort(), loadDotEnvZiva(), parseEnvFile(), ZIVA_MODULE_ROOT (+3 more)

### Community 38 - "Ziva Orchestration"
Cohesion: 0.28
Nodes (14): applyAssistantModeToOrchestrate(), getModeAwareFallback(), normalizePlanSteps(), buildZivaSessionPayload(), fallbackOrchestrate(), fetchZivaOrchestrate(), normalizeOrchestratePayload(), ALLOWED_ACTIONS (+6 more)

### Community 39 - "Ziva Field Attributes"
Cohesion: 0.32
Nodes (15): applyFieldAttributesToDraft(), ATTRIBUTE_PHRASES, findFieldIndex(), formatFieldAttrsForPreview(), labelKeyFromLine(), looksLikeFieldAttributeMessage(), mergeAttrMap(), norm() (+7 more)

### Community 40 - "ASP.NET Realtime Hub"
Cohesion: 0.15
Nodes (8): RealtimeHub, Task, Program, WeatherForecast, Briselle_Lightining.Server, Briselle_Lightining.Server.Hubs, DateOnly, Hub

### Community 41 - "Sidebar & Icon Picker"
Cohesion: 0.20
Nodes (12): NavItem, Sidebar(), SidebarProps, CORE_TAB_AND_OBJECT_ICONS, EXTENDED_SAAS_ICONS, getPickerIconNode(), normalizeUiIconKey(), UI_ICON_CUSTOM_ENTRY (+4 more)

### Community 42 - "Icon Rendering & Tab Block"
Cohesion: 0.22
Nodes (12): fetchLucideIcons(), hasPageIcon(), ICON_COLORS, renderIconSvg(), renderPageIcon(), SVG_ICONS, toPascalCase(), HEIGHT_MAP (+4 more)

### Community 43 - "Data Models"
Cohesion: 0.15
Nodes (12): ActivityLog, Dashboard, FieldDefinition, FieldType, Notification, ObjectDefinition, Permission, Record (+4 more)

### Community 44 - "User View Storage"
Cohesion: 0.23
Nodes (8): computeTemplateId(), loadTableQueryState(), readSavedQueryStateFromPresetConfig(), sanitizeColumnWidthsPx(), sanitizeColumnWrapStates(), sanitizeTableQueryState(), saveTableQueryState(), userViewStorageKey()

### Community 45 - "fieldDataTypeModel.tsx"
Cohesion: 0.21
Nodes (11): FIELD_TYPE_CATEGORY_ORDER, FieldDefinitionRowColumnLayout, FieldDefinitionRowErrors, FieldDefinitionRowForm(), FieldDefinitionRowFormProps, FieldRowTypePicker, groupedFieldTypes(), InlineFieldSwitch() (+3 more)

### Community 46 - "Login & Auth"
Cohesion: 0.21
Nodes (9): Login(), api, authApi, objectsApi, recordsApi, usersApi, AuthState, useAuthStore (+1 more)

### Community 47 - "Notion Nest Field APIs"
Cohesion: 0.27
Nodes (10): NOTION_NEST_PAGE_FIELD_API, INLINE_EDIT_EXCLUDED_EXTRA, isFixedPlatformSystemApi(), isRecordDisplayFieldApi(), isRecordNameFieldApi(), PLATFORM_SYSTEM_FIXED_APIS, platformFieldSortIndex(), RECORD_DISPLAY_FIELD_APIS (+2 more)

### Community 48 - "Entity Management"
Cohesion: 0.22
Nodes (5): EntityDetail, Field, Entity, fieldMappings, supabase

### Community 49 - "Ziva Default Config & Pages"
Cohesion: 0.20
Nodes (10): defaultConfig.js, index.js, SimpleZivaContactForm.jsx, ZivaChat.jsx, ZivaChat.css, ZivaContactForm.css, zivaKnowledge.js, ZivaPage.jsx (+2 more)

### Community 50 - "Package Scripts"
Cohesion: 0.20
Nodes (9): name, private, scripts, build, dev, lint, preview, type (+1 more)

### Community 51 - "Settings Sections"
Cohesion: 0.22
Nodes (9): BehaviorSettingsSection.tsx, DataSettingsSection.tsx, DeviceSettingsSection.tsx, DisplaySettingsSection.tsx, LayoutSettingsSection.tsx, PresetSettingsSection.tsx, TabSettingsSection.tsx, ThemeSettingsSection.tsx (+1 more)

### Community 52 - "Field Attribute Validation"
Cohesion: 0.39
Nodes (8): validateFieldAttributes(), isPlatformSystemApi(), applyFieldAttributeUpdatesOnObject(), ApplyFieldAttributeUpdatesResult, FieldAttributeUpdateItem, findFieldIndex(), norm(), safeParseConfig()

### Community 53 - "Ziva AI Model Picker"
Cohesion: 0.36
Nodes (6): ACTIVE_MODELS, computePopoverStyle(), filterModels(), getGroups(), ZivaModelPicker(), ZIVA_CHAT_MODELS

### Community 55 - "Solution Configuration"
Cohesion: 0.29
Nodes (7): Briselle-Lightining.Server, briselle-lightining.client, net8.0, Microsoft.AspNetCore.SpaProxy, Microsoft.VisualStudio.Azure.Containers.Tools.Targets (1.21.0), Swashbuckle.AspNetCore (6.6.2), Microsoft.NET.Sdk.Web

### Community 57 - "Type Definitions"
Cohesion: 0.29
Nodes (8): TablePreset, Props, PresetSettingsSectionProps, ObjectLoaderCrudOptions, TableSettingsModalProps, FetchPresetsResult, PlatformConfigScope, TableQueryState

### Community 58 - "Chart Panel"
Cohesion: 0.46
Nodes (7): barHeights(), ChartPanel(), ChartPanelProps, hBarWidths(), pivotRows(), toActiveLike(), toBoolLike()

### Community 59 - "Behavior Settings"
Cohesion: 0.33
Nodes (5): BehaviorSettingsSection(), BehaviorSettingsSectionProps, Toggle(), INLINE_EDIT_EXCLUDED_SYSTEM_SET, isExcludedFromInlineEditSystemPicker()

### Community 60 - "Table Action Panel"
Cohesion: 0.29
Nodes (5): TableActionPanel(), TableActionPanelProps, Action_Search(), ActionSearchProps, SearchActionConfig

### Community 61 - "Ziva Groq Field Specs"
Cohesion: 0.53
Nodes (5): ALLOWED_TYPES, fetchFieldSpecsFromGroq(), fieldItemToSpecLine(), normalizeFieldSpecLine(), parseObjectFieldsPayload()

### Community 62 - "Share Action"
Cohesion: 0.40
Nodes (4): Action_Share(), Action_ShareProps, ShareOption, Toggle()

### Community 64 - "Fix Menu Duplicates"
Cohesion: 0.50
Nodes (3): c, fs, l

### Community 65 - "DataTable Component"
Cohesion: 0.67
Nodes (3): DataTable(), DataTableProps, useEffect()

### Community 67 - "Ziva Server Modules"
Cohesion: 0.67
Nodes (3): createZivaApi.mjs, zivaServerConfig.mjs, zivaStandaloneServer.mjs

## Knowledge Gaps
- **384 isolated node(s):** `net8.0`, `Microsoft.AspNetCore.SpaProxy`, `Microsoft.VisualStudio.Azure.Containers.Tools.Targets (1.21.0)`, `Swashbuckle.AspNetCore (6.6.2)`, `Microsoft.NET.Sdk.Web` (+379 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **33 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `Table Actions & Stats` to `Import & Preset UI`, `Clipboard & Bulk Edit`, `DataTable Component`, `Sidebar & Icon Picker`, `Configurable List Template`, `Tab Settings UI`, `Table Action Panel`, `fieldDataTypeModel.tsx`, `Notion Nest Field Policies`, `Table Settings Modal`, `Behavior Settings`, `Action Components (Owner, Chart, Export)`, `Display & Action Panel`, `Share Action`, `Layout Settings`?**
  _High betweenness centrality (0.070) - this node is a cross-community bridge._
- **Why does `supabase` connect `Entity Management` to `Clipboard & Bulk Edit`, `Notion Page Versioning`, `Page Context & Blocks`, `Object Add & Field Attributes`, `API Name & Field Config`, `Records & Object Loading`, `Workflow & Explore Context`, `Sidebar & Icon Picker`, `Configurable List Template`, `Notion Nest Field Policies`, `Field Attribute Validation`, `Preset Config Service`?**
  _High betweenness centrality (0.068) - this node is a cross-community bridge._
- **Why does `useAuthStore` connect `Login & Auth` to `Configurable List Template`, `Block Actions & Config`, `Block Renderer & Page UI`, `Upload & Attachments UI`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `ZivaChat()` (e.g. with `buildObjectMenuRelatedControls()` and `controlToAiChip()`) actually correct?**
  _`ZivaChat()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `net8.0`, `Microsoft.AspNetCore.SpaProxy`, `Microsoft.VisualStudio.Azure.Containers.Tools.Targets (1.21.0)` to the rest of the system?**
  _384 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Clipboard & Bulk Edit` be split into smaller, more focused modules?**
  _Cohesion score 0.05714285714285714 - nodes in this community are weakly interconnected._
- **Should `Notion Page Versioning` be split into smaller, more focused modules?**
  _Cohesion score 0.06568832983927324 - nodes in this community are weakly interconnected._