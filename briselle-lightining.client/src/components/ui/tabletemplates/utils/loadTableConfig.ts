import { TableConfig } from '../ConfigurableListTemplate';
import { tableConfigStorage } from '../../../../utils/tableConfigStorage';

/**
 * Load table configuration from JSON database (localStorage for now, can be migrated to actual DB)
 * 
 * @param tableReference - Unique identifier for the table (e.g., 'objects', 'users', 'entities')
 * @param configName - Name of the configuration to load (default: 'default')
 * @returns Promise<TableConfig>
 */
export const loadTableConfig = async (
    tableReference: string,
    configName: string = 'default'
): Promise<TableConfig> => {
    try {
        const config = await tableConfigStorage.loadConfiguration(tableReference, configName);
        return config;
    } catch (error) {
        console.error('Error loading table configuration:', error);
        // Return default config on error
        return tableConfigStorage.getDefaultConfig();
    }
};

/**
 * Save table configuration to JSON database
 * 
 * @param tableReference - Unique identifier for the table
 * @param configName - Name of the configuration
 * @param config - The TableConfig to save
 */
export const saveTableConfig = async (
    tableReference: string,
    configName: string,
    config: TableConfig
): Promise<void> => {
    try {
        await tableConfigStorage.saveConfiguration(tableReference, configName, config);
    } catch (error) {
        console.error('Error saving table configuration:', error);
        throw error;
    }
};

/**
 * Load presets for a table
 * 
 * @returns Array of TablePreset objects
 */
export const loadTablePresets = () => {
    try {
        return tableConfigStorage.loadPresets();
    } catch (error) {
        console.error('Error loading presets:', error);
        return [];
    }
};

/**
 * Save a preset
 * 
 * @param preset - The preset to save
 */
export const saveTablePreset = async (preset: any): Promise<void> => {
    try {
        await tableConfigStorage.savePreset(preset);
    } catch (error) {
        console.error('Error saving preset:', error);
        throw error;
    }
};
