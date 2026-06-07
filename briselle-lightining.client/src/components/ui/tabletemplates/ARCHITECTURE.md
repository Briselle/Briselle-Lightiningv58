# Table Templates Architecture

## Overview
This document describes the refactored Salesforce-style architecture for the configurable list table system.

## Directory Structure

```
tabletemplates/
├── action-components/          # Individual action components (reusable)
│   ├── Action_Search.tsx
│   ├── Action_Sort.tsx
│   ├── Action_Filter.tsx
│   ├── Action_Group.tsx
│   ├── Action_ColumnVisibility.tsx
│   ├── Action_FreezePane.tsx
│   ├── Action_Refresh.tsx
│   ├── Action_Export.tsx
│   ├── Action_Import.tsx
│   ├── Action_Print.tsx
│   ├── Action_ChangeOwner.tsx
│   ├── Action_Chart.tsx
│   ├── Action_Share.tsx
│   ├── Action_Preset.tsx
│   ├── Action_TableView.tsx
│   └── Action_Settings.tsx
├── hooks/                      # Reusable hooks
│   └── useTableData.ts         # Data processing (search, sort, filter, group)
├── settings-sections/          # Settings modal sections
│   ├── BehaviorSettingsSection.tsx
│   ├── DataSettingsSection.tsx
│   ├── DeviceSettingsSection.tsx
│   ├── DisplaySettingsSection.tsx
│   ├── LayoutSettingsSection.tsx
│   ├── PresetSettingsSection.tsx
│   ├── TabSettingsSection.tsx
│   └── ThemeSettingsSection.tsx
├── table-components/            # Core table components
│   ├── TableTitlePanel.tsx     # Title section
│   ├── TableTabPanel.tsx        # Tab navigation
│   ├── TableActionPanel.tsx     # Action buttons panel (uses action-components)
│   ├── DataTable.tsx           # Table rendering
│   └── TableFooter.tsx         # Footer with pagination/totals
├── utils/                      # Utilities
│   └── loadTableConfig.ts      # Configuration loading from JSON database
├── ConfigurableListTemplate.tsx # Main orchestrator/page composer
└── TableSettingsModal.tsx      # Settings modal

```

## Architecture Flow

### Default List Page
```
ConfigurableListTemplate.tsx (orchestrator)
├── TableTitlePanel.tsx
├── TableTabPanel.tsx
├── TableActionPanel.tsx
│   ├── Action_Search.tsx
│   ├── Action_Sort.tsx
│   ├── Action_Filter.tsx
│   ├── Action_Group.tsx
│   ├── Action_ColumnVisibility.tsx
│   ├── Action_FreezePane.tsx
│   ├── Action_Refresh.tsx
│   ├── Action_Export.tsx
│   ├── Action_Import.tsx
│   ├── Action_Print.tsx
│   ├── Action_ChangeOwner.tsx
│   ├── Action_Chart.tsx
│   ├── Action_Share.tsx
│   ├── Action_Preset.tsx
│   ├── Action_TableView.tsx
│   └── Action_Settings.tsx
├── DataTable.tsx
└── TableFooter.tsx
```

### Presets
```
TableSettingsModal.tsx
├── BehaviorSettingsSection.tsx
├── DataSettingsSection.tsx
├── DeviceSettingsSection.tsx
├── DisplaySettingsSection.tsx
├── LayoutSettingsSection.tsx
├── PresetSettingsSection.tsx
├── TabSettingsSection.tsx
└── ThemeSettingsSection.tsx
```

## Key Features

### 1. Reusable Action Components
All action buttons are now individual components that can be:
- Used anywhere in the application
- Easily tested in isolation
- Modified without affecting other actions
- Reused across different table templates

### 2. Data Processing Hook
`useTableData` hook handles:
- Search filtering
- Filter criteria application
- Multi-column sorting
- Data grouping

### 3. Configuration Loading
- Loads from JSON database (localStorage currently, ready for DB migration)
- Supports multiple configurations per table
- Preset management

### 4. Component Responsibilities

#### ConfigurableListTemplate.tsx
- Orchestrates all sub-components
- Manages state (sort, filter, search, etc.)
- Handles data flow between components
- Loads/saves configuration

#### TableActionPanel.tsx
- Renders action buttons based on configuration
- Organizes buttons by left/right alignment
- Uses individual action components

#### Action Components
- Self-contained UI and logic
- Handle their own dropdowns/modals
- Emit events to parent for state updates

#### DataTable.tsx
- Pure rendering component
- Receives processed data
- Handles table-specific interactions (resize, reorder, etc.)

## Integration Steps

1. **Update ConfigurableListTemplate.tsx** to:
   - Use `useTableData` hook for data processing
   - Pass props to refactored TableActionPanel
   - Use TableFooter component
   - Load configuration using `loadTableConfig`

2. **Replace TableActionPanel.tsx** with the refactored version that uses action components

3. **Update imports** in pages that use ConfigurableListTemplate

4. **Test all functionality** to ensure nothing is lost

## Configuration Loading

```typescript
import { loadTableConfig, saveTableConfig } from './utils/loadTableConfig';

// Load configuration
const config = await loadTableConfig('objects', 'default');

// Save configuration
await saveTableConfig('objects', 'default', newConfig);
```

## Benefits

1. **Maintainability**: Each action is isolated and easy to modify
2. **Reusability**: Action components can be used anywhere
3. **Testability**: Components can be tested independently
4. **Scalability**: Easy to add new actions
5. **Consistency**: All actions follow the same pattern
6. **Performance**: Only necessary components render
