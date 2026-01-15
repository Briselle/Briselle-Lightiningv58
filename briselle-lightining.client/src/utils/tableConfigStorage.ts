import { TableConfig, FieldViewConfig, TabConfig } from '../components/ui/tabletemplates/ConfigurableListTemplate';

// Default configuration reference for factory reset
const DEFAULT_CONFIG: TableConfig = {
  // Core Features
  enableSort: true,
  enableHeader: true,
  enableRowNumber: false,
  enableRowSelection: true,
  enableMassSelection: true,
  enableRowHoverHighlight: true,
  enableStripedRows: false,
  enableRowDivider: true,
  enableColumnDivider: false,
  enableColumnResize: true,
  enableRowReorder: true,
  enableStickyHeader: false,
  enableFreezeFirstColumn: false,

  // Advanced Features
  enableSearch: true,
  enableFilter: true,
  enableExport: true,
  enableImport: true,
  enableRefresh: true,
  enablePagination: true,
  enableColumnVisibility: true,
  enableColumnReorder: true,
  enableInlineEdit: [],
  enableRowActions: true,
  enableBulkActions: true,
  enableGroup: true,

  // Display Options
  enableWrapText: false,
  enableTooltips: true,
  enableStickyHeader: true,

  // Title and Info Options
  enableTitle: true,
  enableNewButton: true,
  enableTitleBackground: true,
  titleBackgroundColor: '#ffffff',
  enableRecordCount: true,
  enableSortInfo: true,
  enableFilterInfo: true,
  enableLastUpdated: true,
  titleTableSpacing: 0,

  // Table Panel Options
  enableTablePanel: true,
  tablePanelBackground: true,
  tablePanelBackgroundColor: '#ffffff',
  enablePresetSelector: true,

  // Table Background Options
  tableBackground: false,
  tableBackgroundColor: '#ffffff',

  // Button Display Options with Alignment
  searchButtonType: 'icon',
  searchButtonAlign: 'right',
  sortButtonType: 'icon',
  sortButtonAlign: 'right',
  filterButtonType: 'icon',
  filterButtonAlign: 'right',
  columnVisibilityButtonType: 'icon',
  columnVisibilityButtonAlign: 'right',
  refreshButtonType: 'icon',
  refreshButtonAlign: 'right',
  exportButtonType: 'icon',
  exportButtonAlign: 'right',
  importButtonType: 'icon',
  importButtonAlign: 'right',
  editActionButtonType: 'icon',
  editActionButtonAlign: 'right',
  chartActionButtonType: 'icon',
  chartActionButtonAlign: 'right',
  printActionButtonType: 'icon',
  printActionButtonAlign: 'right',
  ownerActionButtonType: 'icon',
  ownerActionButtonAlign: 'right',
  tableViewButtonType: 'icon',
  tableViewButtonAlign: 'right',
  settingsButtonType: 'icon',
  settingsButtonAlign: 'right',
  presetButtonType: 'icon',
  presetButtonAlign: 'right',
  groupButtonType: 'icon',
  groupButtonAlign: 'right',
  freezeColumnButtonType: 'icon',
  freezeColumnButtonAlign: 'right',
  freezeHeaderButtonType: 'icon',
  freezeHeaderButtonAlign: 'right',

  // Pagination Settings
  pageSize: 25,
  pageSizeOptions: [10, 25, 50, 100],

  // Theme and Styling
  theme: 'default',
  tableView: 'default',

  // Action Settings
  rowActionsPosition: 'right',
  showRowActionsOnHover: false,
  enabledRowActions: ['view', 'edit', 'copy', 'delete'],
  actionStyle: 'icons',
  actionStyleFlow: 'expand',
  bulkActionStyle: 'icons',

  // Additional Data Actions
  enableEditAction: true,
  enableChartAction: true,
  enablePrintAction: true,
  enableOwnerAction: true,

  // NEW: Field View (for #2406)
  fieldsView: [],
  currentSort: undefined,
  currentFilters: {},

  // NEW: Tabs Configuration (#2408)
  enableTabs: false,
  tabHeight: 'medium',
  tabAlignment: 'left',
  tabOrientation: 'horizontal',
  tabWidth: 150,
  activeTabs: [{ id: 'default', name: 'Default', presetId: 'default', isDefault: true }],

  // NEW: Modal Configuration (#2403)
  modalWidth: 45,
  modalTransparency: 100,
  overlayTransparency: 50,

  // NEW: Device Configuration (#2410)
  deviceType: 'laptop',
};

interface StoredTableConfig {
  tableReference: string;
  configName: string;
  config: TableConfig;
  isDefault: boolean;
  isCustom: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TableConfigPreset {
  id: string;
  name: string;
  config: Partial<TableConfig>;
  isDefault?: boolean;
  isCustom?: boolean;
}

/**
 * Table Configuration Storage Service
 * 
 * This service manages table configuration persistence.
 * Currently uses localStorage but is designed for future database migration.
 */
class TableConfigStorageService {
  private readonly storageKey = 'tableConfigurations';
  private readonly presetsKey = 'tablePresets';

  /**
   * Save table configuration
   */
  async saveConfiguration(
    tableReference: string, 
    configName: string, 
    config: TableConfig
  ): Promise<void> {
    try {
      const existingConfigs = this.getStoredConfigurations();
      const configId = `${tableReference}_${configName}`;
      
      const storedConfig: StoredTableConfig = {
        tableReference,
        configName,
        config,
        isDefault: configName === 'default',
        isCustom: this.isCustomConfiguration(config),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const updatedConfigs = [
        ...existingConfigs.filter(c => `${c.tableReference}_${c.configName}` !== configId),
        storedConfig
      ];
      
      localStorage.setItem(this.storageKey, JSON.stringify(updatedConfigs));
    } catch (error) {
      console.error('Failed to save configuration:', error);
      throw error;
    }
  }

  /**
   * Load table configuration
   */
  async loadConfiguration(
    tableReference: string, 
    configName: string = 'default'
  ): Promise<TableConfig> {
    try {
      const storedConfigs = this.getStoredConfigurations();
      const config = storedConfigs.find(
        c => c.tableReference === tableReference && c.configName === configName
      );
      
      if (config) {
        return config.config;
      }
      
      return { ...DEFAULT_CONFIG };
    } catch (error) {
      console.error('Failed to load configuration:', error);
      return { ...DEFAULT_CONFIG };
    }
  }

  /**
   * Save preset configuration
   */
  async savePreset(preset: TableConfigPreset): Promise<void> {
    try {
      const existingPresets = this.getStoredPresets();
      const updatedPresets = [...existingPresets.filter(p => p.id !== preset.id), preset];
      
      localStorage.setItem(this.presetsKey, JSON.stringify(updatedPresets));
    } catch (error) {
      console.error('Failed to save preset:', error);
      throw error;
    }
  }

  /**
   * Load all presets
   */
  loadPresets(): TableConfigPreset[] {
    try {
      const storedPresets = this.getStoredPresets();
      
      // Always include default preset
      const defaultPreset: TableConfigPreset = {
        id: 'default',
        name: 'Default',
        config: DEFAULT_CONFIG,
        isDefault: true,
        isCustom: false
      };
      
      return [defaultPreset, ...storedPresets.filter(p => !p.isDefault)];
    } catch (error) {
      console.error('Failed to load presets:', error);
      return [{ id: 'default', name: 'Default', config: DEFAULT_CONFIG, isDefault: true }];
    }
  }

  /**
   * Delete preset
   */
  async deletePreset(presetId: string): Promise<void> {
    try {
      if (presetId === 'default') {
        throw new Error('Cannot delete default preset');
      }

      const existingPresets = this.getStoredPresets();
      const updatedPresets = existingPresets.filter(p => p.id !== presetId);
      
      localStorage.setItem(this.presetsKey, JSON.stringify(updatedPresets));
    } catch (error) {
      console.error('Failed to delete preset:', error);
      throw error;
    }
  }

  /**
   * Factory reset - remove all custom configurations
   */
  async factoryReset(tableReference?: string): Promise<void> {
    try {
      if (tableReference) {
        const storedConfigs = this.getStoredConfigurations();
        const updatedConfigs = storedConfigs.filter(c => c.tableReference !== tableReference);
        localStorage.setItem(this.storageKey, JSON.stringify(updatedConfigs));
      } else {
        localStorage.removeItem(this.storageKey);
        localStorage.removeItem(this.presetsKey);
      }
    } catch (error) {
      console.error('Failed to perform factory reset:', error);
      throw error;
    }
  }

  /**
   * Check if configuration is custom (differs from default)
   */
  private isCustomConfiguration(config: TableConfig): boolean {
    return JSON.stringify(config) !== JSON.stringify(DEFAULT_CONFIG);
  }

  /**
   * Get stored configurations from localStorage
   */
  private getStoredConfigurations(): StoredTableConfig[] {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to parse stored configurations:', error);
      return [];
    }
  }

  /**
   * Get stored presets from localStorage
   */
  private getStoredPresets(): TableConfigPreset[] {
    try {
      const stored = localStorage.getItem(this.presetsKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to parse stored presets:', error);
      return [];
    }
  }

  /**
   * Get default configuration reference
   */
  getDefaultConfig(): TableConfig {
    return { ...DEFAULT_CONFIG };
  }

  /**
   * Export configuration as JSON
   */
  exportConfiguration(config: TableConfig): string {
    return JSON.stringify(config, null, 2);
  }

  /**
   * Import configuration from JSON
   */
  importConfiguration(jsonString: string): TableConfig {
    try {
      const config = JSON.parse(jsonString);
      return config;
    } catch (error) {
      throw new Error('Invalid configuration JSON');
    }
  }
}

// Singleton instance
export const tableConfigStorage = new TableConfigStorageService();

/**
 * Database Storage Schema for Future Implementation (#2409)
 * 
 * This section documents the planned database schema for storing table configurations.
 * All current localStorage functionality will be migrated to this database structure.
 * 
 * TABLE: table_configurations
 * - id: VARCHAR(255) PRIMARY KEY
 * - table_reference: VARCHAR(255) NOT NULL (identifies which table this config belongs to)
 * - user_id: VARCHAR(255) (user who owns this configuration)
 * - config_name: VARCHAR(255) NOT NULL (name of the configuration, e.g., 'default', 'custom_1')
 * - config_data: JSON NOT NULL (the complete TableConfig object as JSON)
 * - is_default: BOOLEAN DEFAULT FALSE (whether this is a default system configuration)
 * - is_custom: BOOLEAN DEFAULT TRUE (whether this is user-customized)
 * - created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
 * - updated_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
 * - INDEX idx_table_user (table_reference, user_id)
 * - INDEX idx_table_config (table_reference, config_name)
 * 
 * TABLE: table_presets
 * - id: VARCHAR(255) PRIMARY KEY
 * - preset_name: VARCHAR(255) NOT NULL
 * - preset_config: JSON NOT NULL (the complete TableConfig object as JSON)
 * - is_default: BOOLEAN DEFAULT FALSE
 * - is_system: BOOLEAN DEFAULT FALSE (system-provided presets)
 * - created_by: VARCHAR(255) (user who created this preset)
 * - created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
 * - updated_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
 * 
 * TABLE: table_config_history (for version tracking)
 * - id: VARCHAR(255) PRIMARY KEY
 * - config_id: VARCHAR(255) NOT NULL (references table_configurations.id)
 * - config_data: JSON NOT NULL (historical config data)
 * - change_description: TEXT
 * - created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
 * - FOREIGN KEY (config_id) REFERENCES table_configurations(id) ON DELETE CASCADE
 */