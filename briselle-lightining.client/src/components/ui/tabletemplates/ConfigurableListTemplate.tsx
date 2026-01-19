import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";

import {
    Plus, AlertTriangle, ExternalLink, Settings, Edit, Trash2,
    ChevronRight, GripVertical, X, Copy,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../../../utils/helpers';
import TableSettingsModal from "./TableSettingsModal";
import TableTitlePanel from "./table-components/TableTitlePanel";
import TableTabPanel, { TabItem } from "./table-components/TableTabPanel";
import TableActionPanel from "./table-components/TableActionPanel.refactored";
// Note: After testing, rename TableActionPanel.refactored.tsx to TableActionPanel.tsx
import DataTable from "./table-components/DataTable";
import TableFooter from "./table-components/TableFooter";
import { useTableData } from "./hooks/useTableData";
import { SortCriteria } from "./action-components/Action_Sort";
import { FilterCriteria } from "./action-components/Action_Filter";
import { TablePreset } from "./action-components/Action_Preset";
import { loadTableConfig, loadTablePresets } from "./utils/loadTableConfig";


export interface TableConfig {
    [x: string]: any;
    // Core Features
    enableSort?: boolean;
    enableHeader?: boolean;
    enableRowNumber?: boolean;
    enableRowSelection?: boolean;
    enableMassSelection?: boolean;
    enableRowHoverHighlight?: boolean;
    enableStripedRows?: boolean;
    enableRowDivider?: boolean;
    enableColumnDivider?: boolean;
    enableColumnResize?: boolean;
    enableRowReorder?: boolean;


    // Advanced Features
    enableSearch?: boolean;
    enableFilter?: boolean;
    enableExport?: boolean;
    enableImport?: boolean;
    enableRefresh?: boolean;
    enablePagination?: boolean;
    enableColumnVisibility?: boolean;
    enableColumnReorder?: boolean;
    enableInlineEdit?: string[];
    enableRowActions?: boolean;
    enableBulkActions?: boolean;
    enableGroup?: boolean;

    // New Button Features
    enablePrint: boolean;
    enableChangeOwner: boolean;
    enableChart: boolean;
    enableShare: boolean;

    // Display Options
    enableWrapText?: boolean;
    enableTooltips?: boolean;
    //enableRowReorder?: boolean;

    // Title and Info Options
    enableTitle?: boolean;
    enableNewButton?: boolean;
    enableTitleBackground?: boolean;
    titleBackgroundColor?: string;
    enableRecordCount?: boolean;
    enableSortInfo?: boolean;
    enableFilterInfo?: boolean;
    enableLastUpdated?: boolean;
    titleTableSpacing?: number;

    // Table Panel Options
    enableTablePanel?: boolean;
    tablePanelBackground?: boolean;
    tablePanelBackgroundColor?: string;
    enablePresetSelector?: boolean;

    // Table Background Options
    tableBackground?: boolean;
    tableBackgroundColor?: string;

    // Button Display Options with Alignment
    searchButtonType?: 'icon' | 'button';
    searchButtonAlign?: 'left' | 'right';
    sortButtonType?: 'icon' | 'button';
    sortButtonAlign?: 'left' | 'right';
    filterButtonType?: 'icon' | 'button';
    filterButtonAlign?: 'left' | 'right';
    columnVisibilityButtonType?: 'icon' | 'button';
    columnVisibilityButtonAlign?: 'left' | 'right';
    refreshButtonType?: 'icon' | 'button';
    refreshButtonAlign?: 'left' | 'right';
    exportButtonType?: 'icon' | 'button';
    exportButtonAlign?: 'left' | 'right';
    importButtonType?: 'icon' | 'button';
    importButtonAlign?: 'left' | 'right';

    printButtonType: 'icon' | 'button';
    printButtonAlign: 'left' | 'right';
    changeOwnerButtonType: 'icon' | 'button';
    changeOwnerButtonAlign: 'left' | 'right';
    chartButtonType: 'icon' | 'button';
    chartButtonAlign: 'left' | 'right';
    shareButtonType: 'icon' | 'button';
    shareButtonAlign: 'left' | 'right';

    editActionButtonType?: 'icon' | 'button';
    editActionButtonAlign?: 'left' | 'right';
    chartActionButtonType?: 'icon' | 'button';
    chartActionButtonAlign?: 'left' | 'right';
    printActionButtonType?: 'icon' | 'button';
    printActionButtonAlign?: 'left' | 'right';
    ownerActionButtonType?: 'icon' | 'button';
    ownerActionButtonAlign?: 'left' | 'right';
    tableViewButtonType?: 'icon' | 'button';
    tableViewButtonAlign?: 'left' | 'right';
    settingsButtonType?: 'icon' | 'button';
    settingsButtonAlign?: 'left' | 'right';
    presetButtonType?: 'icon' | 'button';
    presetButtonAlign?: 'left' | 'right';
    groupButtonType?: 'icon' | 'button';
    groupButtonAlign?: 'left' | 'right';

    // Freeze Pane
    enableFreezePane?: boolean;
    freezePaneType?: 'icon' | 'button';
    freezePaneAlign?: 'left' | 'right';

    // Freeze options
    enableFreezePaneRowHeader?: boolean;
    enablefreezePaneColumnIndex?: boolean;
    freezePaneColumnIndexNo: number; // 1-based index (1 = first column)
    


    // Pagination Settings
    pageSize?: number;
    pageSizeOptions?: number[];

    // Theme and Styling
    theme?: 'default' | 'professional' | 'modern' | 'minimal';
    tableView?: 'default' | 'compact' | 'comfortable' | 'spacious';

    // Action Settings
    rowActionsPosition?: 'left' | 'right';
    showRowActionsOnHover?: boolean;
    enabledRowActions?: string[];
    actionStyle?: 'icons' | 'menu';
    actionStyleFlow?: 'expand' | 'dropdown';
    bulkActionStyle?: 'icons' | 'buttons';

    // Additional Data Actions
    enableEditAction?: boolean;
    enableChartAction?: boolean;
    enablePrintAction?: boolean;
    enableOwnerAction?: boolean;


    // Table Footer
    enableFooter: boolean;
    enableTableTotals: boolean;

    // Additional Options
    enableWrapClipOption: boolean;
    tablePanelSpacing: number;
    newButtonType: 'icon' | 'button';
    tabPanelSpacing: number;
    tabPanelBackgroundColor: string;

    // Tab Configuration
    enableTabs: boolean;
    tabHeight: 'small' | 'medium' | 'large';
    tabAlignment: 'left' | 'right' | 'center';
    tabOrientation: 'horizontal' | 'vertical';
    tabLabelWidth: number;
    tabCustomSelection: boolean;
    tabSelectionColor: string;
    tabCustomHover: boolean;
    tabHoverColor: string;
    tabPanelBackground: string;
    tabList: TabItem[];

    // Column Management
    visibleColumns?: string[];
    columnOrder?: string[];
}

// Types are now imported from action components

interface Props {
    title: string;
    data: any[];
    fieldMappings: Record<string, string>;
    config: TableConfig;
    loading?: boolean;
    onConfigChange: (newConfig: TableConfig) => void;
    baseUrl?: string;
    onRefresh?: () => void;
}

export default function ConfigurableListTemplate({
    title,
    data,
    fieldMappings,
    config,
    loading,
    onConfigChange,
    baseUrl = '/data',
    onRefresh
}: Props) {
    // Initialize selectedRows as a proper Set to fix the .has() error
    
    // State management
    const [sortCriteria, setSortCriteria] = useState<SortCriteria[]>([]);
    const [filterCriteria, setFilterCriteria] = useState<FilterCriteria[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRows, setSelectedRows] = useState<number[]>([]);
    const [groupByColumn, setGroupByColumn] = useState<string | null>(null);
    const [presets, setPresets] = useState<TablePreset[]>([]);
    const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
    const [checkboxColumnWidth, setCheckboxColumnWidth] = useState<number | null>(null);
    const [draggedRowIndex, setDraggedRowIndex] = useState<number | null>(null);
    const [draggedColumnIndex, setDraggedColumnIndex] = useState<number | null>(null);
    const [isTableSettingsOpen, setIsTableSettingsOpen] = useState(false);
    const [columnWrapStates, setColumnWrapStates] = useState<Record<string, 'wrap' | 'clip'>>({});

    const allColumns = Object.keys(fieldMappings);
    const [activeColumns, setActiveColumns] = useState<string[]>(allColumns);
    const [visibleColumns, setVisibleColumns] = useState<string[]>(allColumns);
    const [columnOrder, setColumnOrder] = useState<string[]>(Object.keys(fieldMappings));
    
    const resizeRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const checkboxColumnRef = useRef<HTMLTableCellElement | null>(null);
    const headerCellRefs = useRef<Record<string, HTMLTableCellElement | null>>({});

    // Measure and initialize column widths from actual rendered table
    useEffect(() => {
        if (visibleColumns.length === 0) return;
        
        const measuredWidths: Record<string, number> = {};
        let allMeasured = true;
        
        // Measure checkbox column width
        if (checkboxColumnRef.current) {
            const checkboxWidth = checkboxColumnRef.current.offsetWidth;
            if (checkboxWidth !== checkboxColumnWidth) {
                setCheckboxColumnWidth(checkboxWidth);
            }
        }
        
        // Measure data column widths from header cells
        visibleColumns.forEach((col) => {
            const headerCell = headerCellRefs.current[col];
            if (headerCell) {
                const width = headerCell.offsetWidth;
                measuredWidths[col] = width;
            } else {
                allMeasured = false;
            }
        });
        
        // Only update if we have measurements and widths changed
        if (allMeasured && Object.keys(measuredWidths).length > 0) {
            setColumnWidths((prev) => {
                // Only update if widths are different
                const hasChanges = Object.keys(measuredWidths).some(
                    (col) => prev[col] !== measuredWidths[col]
                );
                return hasChanges ? { ...prev, ...measuredWidths } : prev;
            });
        }
    }, [visibleColumns, data.length]); // Re-measure when visible columns or data changes

    /* =======================
      UI & DATA HELPERS
      ======================= */

    // Use the reusable data processing hook
    const { filteredEntities, sortedData, groupedData } = useTableData(
        data,
        searchTerm,
        sortCriteria,
        filterCriteria,
        fieldMappings,
        groupByColumn
    );

    

    //// ---------- Presets ----------
    //const applyPreset = (preset: TablePreset) => {
    //    onConfigChange(preset.config);
    //    setShowPresetDropdown(false);
    //};

    // ---------- Refresh ----------
    const handleRefresh = () => {
        if (onRefresh) {
            onRefresh();
        }
    };

    // ---------- Button Content ----------
    //const getButtonContent = (
    //    icon: React.ReactNode,
    //    text: string,
    //    buttonType: 'icon' | 'button'
    //) => {
    //    if (buttonType === 'button') {
    //        return (
    //            <span className="flex items-center">
    //                {icon}
    //                <span className="ml-2">{text}</span>
    //            </span>
    //        );
    //    }
    //    return icon;
    //};

    // ---------- Styles ----------
    //const getTitleStyle = (): React.CSSProperties => {
    //    const style: React.CSSProperties = {};

    //    if (config.enableTitleBackground) {
    //        style.backgroundColor = config.titleBackgroundColor || '#ffffff';
    //        style.padding = '1rem';
    //        style.borderRadius = '0.5rem 0.5rem 0 0';
    //    }

    //    if (config.titleTableSpacing) {
    //        style.marginBottom = `${config.titleTableSpacing}px`;
    //    }

    //    return style;
    //};

    //const getTablePanelStyle = (): React.CSSProperties => {
    //    if (!config.tablePanelBackground) return {};
    //    return {
    //        backgroundColor: config.tablePanelBackgroundColor || '#ffffff',
    //        padding: '1rem',
    //        borderRadius: '0.5rem'
    //    };
    //};

    //const getTableStyle = (): React.CSSProperties => {
    //    if (!config.tableBackground) return {};
    //    return {
    //        backgroundColor: config.tableBackgroundColor || '#ffffff'
    //    };
    //};

    //const getThemeClasses = (): string => {
    //    const baseClasses = 'data-table';

    //    const themeClasses: Record<string, string> = {
    //        default: '',
    //        professional: 'theme-professional',
    //        modern: 'theme-modern',
    //        minimal: 'theme-minimal'
    //    };

    //    const densityClasses: Record<string, string> = {
    //        compact: 'compact',
    //        standard: '',
    //        comfortable: 'comfortable',
    //        spacious: 'spacious'
    //    };

    //    return `
    //    ${baseClasses}
    //    ${themeClasses[config.theme || 'default']}
    //    ${densityClasses[config.density || 'standard']}
    //    ${!config.enableRowHoverHighlight ? 'no-hover' : ''}
    //    ${config.enableStripedRows ? 'striped' : ''}
    //    ${config.enableStickyHeader ? 'sticky-header' : ''}
    //    ${config.enableFreezeFirstColumn ? 'freeze-first-column' : ''}
    //`;
    //};



    // Load presets from localStorage with default presets
    useEffect(() => {
        console.log('[CLT] config updated near localstorage preset:', {
        enableFreezePaneColumnIndex: config.enableFreezePaneColumnIndex,
        freezePaneColumnIndexNo: config.freezePaneColumnIndexNo,
    });

        const savedPresets = localStorage.getItem('tablePresets'); 
        if (savedPresets) {
            try {
                const parsedPresets = JSON.parse(savedPresets);
                setPresets(parsedPresets);
            } catch (error) {
                console.error('Error loading presets:', error);
                setDefaultPresets();
            }
        } else {
            setDefaultPresets();
        }
    }, []);

    // Ctrl+F search activation is now handled by Action_Search component
    // No need for this handler here since search is managed by individual action components

    const handleOpenTableSettings = () => {
        setIsTableSettingsOpen(true);
    };

    const handleCloseTableSettings = (False: any) => {
        setIsTableSettingsOpen(false);
    };
    const handleFilterClick = () => {
        console.log("Filter button clicked!");
        // Implement filter logic
    };

    const handleExportClick = () => {
        console.log("Export button clicked!");
        // Implement export logic
    };

    const handleImportClick = () => {
        console.log("Import button clicked!");
        // Implement import logic
    };

    const handlePrintClick = () => {
        console.log("Print button clicked!");
        window.print();
    };

    const handleChangeOwnerClick = () => {
        console.log("Change Owner button clicked!");
        // Implement change owner logic
    };

    const handleChartClick = () => {
        console.log("Chart button clicked!");
        // Implement chart logic
    };

    const handleShareClick = () => {
        console.log("Share button clicked!");
        // Implement share logic
    };

    const handleTableViewChange = (view: 'default' | 'compact' | 'comfortable' | 'spacious') => {
        console.log("Table view changed to:", view);
        onConfigChange({
            ...config,
            tableView: view
        });
    };

    const handleSettingsClick = () => {
        console.log("Settings button clicked!");
        setIsTableSettingsOpen(true);
    };

    const handlePresetClick = () => {
        console.log("Preset button clicked!");
        // Implement preset selection logic
    };

   

    const handleWrapClipToggle = useCallback((column: string) => {
        setColumnWrapStates(prev => ({
            ...prev,
            [column]: prev[column] === 'wrap' ? 'clip' : 'wrap'
        }));
    }, []);

    const setDefaultPresets = () => {
        const defaultPresets: TablePreset[] = [
            {
                id: 'default',
                name: 'Default',
                config: {
                    enableSort: true,
                    enableHeader: true,
                    enableRowHoverHighlight: true,
                    enableSearch: true,
                    enableTablePanel: true,
                    enableTitle: true,
                    enableNewButton: true,
                    enableTitleBackground: true,
                    titleBackgroundColor: '#ffffff',
                    tablePanelBackground: true,
                    tablePanelBackgroundColor: '#ffffff',
                    enablePresetSelector: true,
                    titleTableSpacing: 0,
                    theme: 'default',
                    tableView: 'default',
                    searchButtonType: 'icon',
                    searchButtonAlign: 'right',
                    settingsButtonAlign: 'right',
                    presetButtonAlign: 'right',
                    tableViewButtonAlign: 'right',
                    enableFreezePane: true,

                    //FreezePane
                    freezePaneType: 'icon',
                    freezePaneAlign: 'right',
                    enableFreezePaneRowHeader: false,
                    enablefreezePaneColumnIndex: false,

                    enablePrint: false,
                    enableChangeOwner: false,
                    enableChart: false,
                    enableShare: false,
                    printButtonType: "icon",
                    printButtonAlign: "left",
                    changeOwnerButtonType: "icon",
                    changeOwnerButtonAlign: "left",
                    chartButtonType: "icon",
                    chartButtonAlign: "left",
                    shareButtonType: "icon",
                    shareButtonAlign: "left",
                    enableFooter: false,
                    enableTableTotals: false,
                    enableWrapClipOption: false,
                    tablePanelSpacing: 0,
                    newButtonType: "icon",
                    tabPanelSpacing: 0,
                    tabPanelBackgroundColor: "",
                    enableTabs: false,
                    tabHeight: "small",
                    tabAlignment: "left",
                    tabOrientation: "horizontal",
                    tabLabelWidth: 0,
                    tabCustomSelection: false,
                    tabSelectionColor: "",
                    tabCustomHover: false,
                    tabHoverColor: "",
                    tabPanelBackground: "",
                    tabList: [],
                },
                isDefault: true,
                presetId: ""
            },
            {
                id: 'all-icons-right',
                name: 'All Icons Right',
                config: {
                    enableSort: true,
                    enableHeader: true,
                    enableRowHoverHighlight: true,
                    enableSearch: true,
                    enableFilter: true,
                    enableExport: true,
                    enableImport: true,
                    enableRefresh: true,
                    enableColumnVisibility: true,
                    enableRowActions: true,
                    enableTitle: true,
                    enableNewButton: true,
                    enableTitleBackground: true,
                    titleBackgroundColor: '#f8f9fa',
                    enableTablePanel: true,
                    tablePanelBackground: true,
                    tablePanelBackgroundColor: '#f8f9fa',
                    enablePresetSelector: true,
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
                    tableViewButtonType: 'icon',
                    tableViewButtonAlign: 'right',
                    settingsButtonType: 'icon',
                    settingsButtonAlign: 'right',
                    presetButtonType: 'icon',
                    presetButtonAlign: 'right',
                    theme: 'default',
                    tableView: 'default'
                }
            },
            {
                id: 'all-buttons-right',
                name: 'All Buttons Right',
                config: {
                    enableSort: true,
                    enableHeader: true,
                    enableRowHoverHighlight: true,
                    enableSearch: true,
                    enableFilter: true,
                    enableExport: true,
                    enableImport: true,
                    enableRefresh: true,
                    enableColumnVisibility: true,
                    enableRowActions: true,
                    enableTitle: true,
                    enableNewButton: true,
                    enableTitleBackground: true,
                    titleBackgroundColor: '#f1f5f9',
                    enableTablePanel: true,
                    tablePanelBackground: true,
                    tablePanelBackgroundColor: '#f1f5f9',
                    enablePresetSelector: true,
                    searchButtonType: 'button',
                    searchButtonAlign: 'right',
                    sortButtonType: 'button',
                    sortButtonAlign: 'right',
                    filterButtonType: 'button',
                    filterButtonAlign: 'right',
                    columnVisibilityButtonType: 'button',
                    columnVisibilityButtonAlign: 'right',
                    refreshButtonType: 'button',
                    refreshButtonAlign: 'right',
                    exportButtonType: 'button',
                    exportButtonAlign: 'right',
                    importButtonType: 'button',
                    importButtonAlign: 'right',
                    tableViewButtonType: 'button',
                    tableViewButtonAlign: 'right',
                    settingsButtonType: 'button',
                    settingsButtonAlign: 'right',
                    presetButtonType: 'button',
                    presetButtonAlign: 'right',
                    theme: 'professional',
                    tableView: 'comfortable'
                }
            },
            {
                id: 'left-aligned-modern',
                name: 'Left Aligned Modern',
                config: {
                    enableSort: true,
                    enableHeader: true,
                    enableRowHoverHighlight: true,
                    enableSearch: true,
                    enableFilter: true,
                    enableExport: true,
                    enableRefresh: true,
                    enableColumnVisibility: true,
                    enableRowActions: true,
                    enableTitle: true,
                    enableNewButton: true,
                    enableTitleBackground: true,
                    titleBackgroundColor: '#ecfdf5',
                    enableTablePanel: true,
                    tablePanelBackground: true,
                    tablePanelBackgroundColor: '#ecfdf5',
                    enablePresetSelector: true,
                    searchButtonType: 'button',
                    searchButtonAlign: 'left',
                    sortButtonType: 'button',
                    sortButtonAlign: 'left',
                    filterButtonType: 'button',
                    filterButtonAlign: 'left',
                    columnVisibilityButtonType: 'icon',
                    columnVisibilityButtonAlign: 'right',
                    refreshButtonType: 'icon',
                    refreshButtonAlign: 'right',
                    exportButtonType: 'button',
                    exportButtonAlign: 'left',
                    tableViewButtonType: 'icon',
                    tableViewButtonAlign: 'right',
                    settingsButtonType: 'icon',
                    settingsButtonAlign: 'right',
                    presetButtonType: 'button',
                    presetButtonAlign: 'left',
                    theme: 'modern',
                    tableView: 'comfortable'
                }
            },
            {
                id: 'compact-minimal',
                name: 'Compact Minimal',
                config: {
                    enableSort: true,
                    enableHeader: true,
                    enableRowHoverHighlight: true,
                    enableSearch: true,
                    enableTitle: true,
                    enableNewButton: true,
                    enableTitleBackground: false,
                    titleTableSpacing: 8,
                    enableTablePanel: true,
                    tablePanelBackground: true,
                    tablePanelBackgroundColor: '#ffffff',
                    enablePresetSelector: true,
                    searchButtonType: 'icon',
                    searchButtonAlign: 'right',
                    sortButtonType: 'icon',
                    sortButtonAlign: 'right',
                    tableViewButtonType: 'icon',
                    tableViewButtonAlign: 'right',
                    settingsButtonType: 'icon',
                    settingsButtonAlign: 'right',
                    presetButtonType: 'icon',
                    presetButtonAlign: 'right',
                    theme: 'minimal',
                    tableView: 'compact'
                }
            },
            {
                id: 'data-analyst',
                name: 'Data Analyst',
                config: {
                    enableSort: true,
                    enableHeader: true,
                    enableRowNumber: true,
                    enableRowSelection: true,
                    enableMassSelection: true,
                    enableRowHoverHighlight: true,
                    enableStripedRows: true,
                    enableRowDivider: true,
                    enableColumnResize: true,
                    enableSearch: true,
                    enableFilter: true,
                    enableExport: true,
                    enableColumnVisibility: true,
                    enableGroup: true,
                    enableRowActions: true,
                    enableTitle: true,
                    enableNewButton: true,
                    enableTitleBackground: true,
                    titleBackgroundColor: '#fef3c7',
                    enableRecordCount: true,
                    enableSortInfo: true,
                    enableFilterInfo: true,
                    enableTablePanel: true,
                    tablePanelBackground: true,
                    tablePanelBackgroundColor: '#fef3c7',
                    enablePresetSelector: true,
                    searchButtonType: 'button',
                    searchButtonAlign: 'left',
                    sortButtonType: 'button',
                    sortButtonAlign: 'left',
                    filterButtonType: 'button',
                    filterButtonAlign: 'left',
                    columnVisibilityButtonType: 'button',
                    columnVisibilityButtonAlign: 'right',
                    exportButtonType: 'button',
                    exportButtonAlign: 'right',
                    groupButtonType: 'button',
                    groupButtonAlign: 'left',
                    tableViewButtonType: 'icon',
                    tableViewButtonAlign: 'right',
                    settingsButtonType: 'icon',
                    settingsButtonAlign: 'right',
                    presetButtonType: 'button',
                    presetButtonAlign: 'left',
                    theme: 'professional',
                    tableView: 'spacious'
                }
            }
        ];
        setPresets(defaultPresets);
        localStorage.setItem('tablePresets', JSON.stringify(defaultPresets));
    };

    // Dropdown click-outside handlers are now managed by individual action components
    // Each action component (Action_Search, Action_Sort, etc.) handles its own dropdown state

    const handleSort = (column: string) => {
        if (!config.enableSort) return;
        const existingIndex = sortCriteria.findIndex(s => s.column === column);

        if (existingIndex >= 0) {
            const newCriteria = [...sortCriteria];
            if (newCriteria[existingIndex].order === 'asc') {
                newCriteria[existingIndex].order = 'desc';
            } else {
                newCriteria.splice(existingIndex, 1);
            }
            setSortCriteria(newCriteria);
        } else {
            setSortCriteria([...sortCriteria, { column, order: 'asc' }]);
        }
    };

    const addSortCriteria = (column: string, order: 'asc' | 'desc') => {
        const existingIndex = sortCriteria.findIndex(s => s.column === column);
        if (existingIndex >= 0) {
            const newCriteria = [...sortCriteria];
            newCriteria[existingIndex].order = order;
            setSortCriteria(newCriteria);
        } else {
            setSortCriteria([...sortCriteria, { column, order }]);
        }
    };

    const removeSortCriteria = (column: string) => {
        setSortCriteria(sortCriteria.filter(s => s.column !== column));
    };

    const clearSort = () => {
        setSortCriteria([]);
    };

    const addFilterCriteria = (column: string, operator: FilterCriteria['operator'], value: string, logic: 'AND' | 'OR' = 'AND') => {
        setFilterCriteria([...filterCriteria, { column, operator, value, logic }]);
    };

    const removeFilterCriteria = (index: number) => {
        setFilterCriteria(filterCriteria.filter((_, i) => i !== index));
    };

    const clearFilters = () => {
        setFilterCriteria([]);
    };

    const toggleRowSelection = (index: number) => {
        setSelectedRows((prev) =>
            prev.includes(index)
                ? prev.filter((i) => i !== index)
                : [...prev, index]
        );
    };

    const handleSelectAllRows = () => {
        if (selectedRows.length === data.length) {
            setSelectedRows([]);
        } else {
            setSelectedRows(data.map((_, i) => i));
        }
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>, col: string) => {
        if (!config.enableColumnResize) return;

        const startX = e.clientX;
        const startWidth = columnWidths[col] || (resizeRefs.current[col]?.offsetWidth ?? 150);

        const handleMouseMove = (e: MouseEvent) => {
            const newWidth = startWidth + (e.clientX - startX);
            setColumnWidths((prev) => ({ ...prev, [col]: newWidth }));
        };

        const handleMouseUp = () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        };

        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
    };

    // Row reordering functions
    const handleRowDragStart = (e: React.DragEvent, index: number) => {
        if (!config.enableRowReorder) return;
        setDraggedRowIndex(index);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleRowDragOver = (e: React.DragEvent, index: number) => {
        if (!config.enableRowReorder || draggedRowIndex === null) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleRowDrop = (e: React.DragEvent, dropIndex: number) => {
        if (!config.enableRowReorder || draggedRowIndex === null) return;
        e.preventDefault();

        // Here you would implement the actual row reordering logic
        // For now, we'll just reset the drag state
        setDraggedRowIndex(null);
    };

    // Column reordering functions
    const handleColumnDragStart = (e: React.DragEvent, index: number) => {
        if (!config.enableColumnReorder) return;
        setDraggedColumnIndex(index);
        e.dataTransfer.effectAllowed = 'move';
    };


    const handleColumnDragOver = (e: React.DragEvent, index: number) => {
        if (!config.enableColumnReorder || draggedColumnIndex === null) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleColumnDrop = (e: React.DragEvent, dropIndex: number) => {
        if (!config.enableColumnReorder || draggedColumnIndex === null) return;
        e.preventDefault();

        const [draggedColumn, setDraggedColumn] = useState<string | null>(null);

        const handleColumnDrop = (targetKey: string) => {
            if (!draggedColumn || draggedColumn === targetKey) return;

            setActiveColumns(prev => {
                const from = prev.indexOf(draggedColumn);
                const to = prev.indexOf(targetKey);
                if (from === -1 || to === -1) return prev;

                const next = [...prev];
                next.splice(from, 1);
                next.splice(to, 0, draggedColumn);
                return next;
            });

            setVisibleColumns(prev => {
                if (!prev.includes(draggedColumn)) return prev;
                const from = prev.indexOf(draggedColumn);
                const to = prev.indexOf(targetKey);
                if (from === -1 || to === -1) return prev;

                const next = [...prev];
                next.splice(from, 1);
                next.splice(to, 0, draggedColumn);
                return next;
            });

            setDraggedColumn(null);
        };

        setDraggedColumnIndex(null);
    };


    // Button rendering is now handled by TableActionPanel component
    // All action components are imported and used through TableActionPanel


    // Data processing is now handled by useTableData hook above


   

    const handleColumnVisibilityClick = () => {
        console.log("Column Visibility button clicked!")
        setShowColumnDropdown(prev => !prev);
    };


    // ===============================
    // Column Visibility helpers
    // ===============================

    // Eye toggle → show / hide ONLY (do not remove from active list)
    const toggleColumnVisibility = (key: string) => {
        setVisibleColumns(prev => {
            if (prev.includes(key)) {
                // minimum 1 visible column must remain
                if (prev.length === 1) return prev;
                return prev.filter(col => col !== key);
            }
            return [...prev, key];
        });
    };

    // Close (X) → remove from active list AND table
    const removeColumn = (key: string) => {
        setActiveColumns(prev => {
            if (prev.length === 1) return prev;
            return prev.filter(col => col !== key);
        });

        setVisibleColumns(prev => prev.filter(col => col !== key));
    };

    // Add column → add to active list AND visible
    const addColumn = (key: string) => {
        setActiveColumns(prev =>
            prev.includes(key) ? prev : [...prev, key]
        );
        setVisibleColumns(prev =>
            prev.includes(key) ? prev : [...prev, key]
        );
    };

    // Reset → keep first column by index
    const resetColumns = () => {
        if (!allColumns.length) return;
        setActiveColumns([allColumns[0]]);
        setVisibleColumns([allColumns[0]]);
    };

    // Move Active Column  → keep first column by index
    const moveActiveColumn = (key: string, direction: 'up' | 'down') => {
        setActiveColumns(prev => {
            const index = prev.indexOf(key);
            if (index === -1) return prev;

            const newIndex =
                direction === 'up' ? index - 1 : index + 1;

            if (newIndex < 0 || newIndex >= prev.length) return prev;

            const next = [...prev];
            [next[index], next[newIndex]] = [next[newIndex], next[index]];
            return next;
        });

        // Keep visibleColumns order in sync
        setVisibleColumns(prev => {
            const index = prev.indexOf(key);
            if (index === -1) return prev;

            const newIndex =
                direction === 'up' ? index - 1 : index + 1;

            if (newIndex < 0 || newIndex >= prev.length) return prev;

            const next = [...prev];
            [next[index], next[newIndex]] = [next[newIndex], next[index]];
            return next;
        });
    };

    // GetAllColumns and Prefered Columns
    const getAllColumns = () =>
        Object.keys(fieldMappings);

    const getPreferredColumns = () =>
        Object.entries(fieldMappings)
            .filter(([, value]) =>
                typeof value === 'object' && value.preferred
            )
            .map(([key]) => key);

    const loadAllColumns = () => {
        const all = getAllColumns();
        setActiveColumns(all);
        setVisibleColumns(all);
    };

    const loadPreferredColumns = () => {
        const preferred = getPreferredColumns();

        if (!preferred.length) {
            alert('No preferred columns found');
            return;
        }

        setActiveColumns(preferred);
        setVisibleColumns(preferred);
    };

    // Apply preset handler
    const applyPreset = (preset: TablePreset) => {
        onConfigChange(preset.config);
    };



  



    // All button rendering is now handled by TableActionPanel component
    // The component uses individual action components from action-components folder
    // OLD BUTTON RENDERING CODE REMOVED - All buttons are now in TableActionPanel.refactored.tsx
    // All button rendering is handled by TableActionPanel component which uses individual action components

    // Column reordering handler
    const handleColumnReorder = (draggedColumn: string, targetColumn: string) => {
        if (!config.enableColumnReorder) return;
        
        setColumnOrder(prev => {
            const from = prev.indexOf(draggedColumn);
            const to = prev.indexOf(targetColumn);
            if (from === -1 || to === -1) return prev;

            const next = [...prev];
            next.splice(from, 1);
            next.splice(to, 0, draggedColumn);
            return next;
        });

        setActiveColumns(prev => {
            const from = prev.indexOf(draggedColumn);
            const to = prev.indexOf(targetColumn);
            if (from === -1 || to === -1) return prev;

            const next = [...prev];
            next.splice(from, 1);
            next.splice(to, 0, draggedColumn);
            return next;
        });

        setVisibleColumns(prev => {
            if (!prev.includes(draggedColumn)) return prev;
            const from = prev.indexOf(draggedColumn);
            const to = prev.indexOf(targetColumn);
            if (from === -1 || to === -1) return prev;

            const next = [...prev];
            next.splice(from, 1);
            next.splice(to, 0, draggedColumn);
            return next;
        });
    };

    // Row reordering handler
    const handleRowReorder = (draggedIndex: number, targetIndex: number) => {
        if (!config.enableRowReorder || draggedIndex === null || targetIndex === null) return;
        // Row reordering logic would go here
        setDraggedRowIndex(null);
    };

    // Column resize handler
    const handleColumnResize = (column: string, width: number) => {
        setColumnWidths((prev) => ({ ...prev, [column]: width }));
    };

    // OLD BUTTON RENDERING CODE REMOVED - All buttons are now in TableActionPanel.refactored.tsx
    // The following section (previously lines 1102-2201) contained old inline button rendering code
    // This has been completely removed and replaced with TableActionPanel component
    // All button rendering is handled by TableActionPanel which uses individual action components
    
    // OLD BUTTON RENDERING CODE COMPLETELY REMOVED
    // All button rendering is now handled by TableActionPanel component
    // which uses individual action components from the action-components folder
    // No old inline button code remains in this file

    // Get checkbox state for header
    const getHeaderCheckboxState = () => {
        if (selectedRows.length === 0) return 'unchecked';
        if (selectedRows.length === data.length) return 'checked';
        return 'indeterminate';
    };

    const renderTableRows = () => {
        if (groupedData) {
            return Object.entries(groupedData).map(([groupValue, groupRows]) => (
                <React.Fragment key={groupValue}>
                    <tr className="bg-gray-100 font-medium">
                        <td
                            colSpan={
                                (config.enableRowSelection ? 1 : 0) +
                                (config.enableRowNumber ? 1 : 0) +
                                visibleColumns.length +
                                (config.enableRowActions ? 1 : 0)
                            }
                            className="px-4 py-3 text-sm text-gray-700"
                        >
                            <div className="flex items-center">
                                <ChevronRight size={16} className="mr-2" />
                                {fieldMappings[groupByColumn!]}: {groupValue} ({groupRows.length} records)
                                </div>
                        </td>
                    </tr>
                    {groupRows.map((row, groupRowIdx) => {
                        const actualIndex = sortedData.findIndex(r => (r.id && row.id && r.id === row.id) || r === row);
                        const rowIndex = actualIndex >= 0 ? actualIndex : groupRowIdx;
                        return (
                        <tr
                            key={`${groupValue}-${groupRowIdx}`}
                            className={cn(
                                config.enableRowHoverHighlight ? 'hover:bg-gray-100 transition-colors group' : 'group',
                                config.enableStripedRows && rowIndex % 2 === 1 && 'bg-gray-50',
                                config.enableRowDivider ? 'border-b border-gray-200' : 'border-b-0'
                            )}
                            draggable={config.enableRowReorder}
                            onDragStart={(e) => handleRowDragStart(e, rowIndex)}
                            onDragOver={(e) => handleRowDragOver(e, rowIndex)}
                            onDrop={(e) => handleRowDrop(e, rowIndex)}
                        >
                            {(config.enableRowSelection || config.enableRowNumber) && (() => {
                                const checkboxFrozen = isCheckboxColumnFrozen();
                                const rowBg = config.enableStripedRows && rowIndex % 2 === 1 ? 'rgb(249 250 251)' : 'white';
                                return (
                                <td 
                                    className={cn(
                                        "px-4 py-2 text-sm text-gray-700",
                                        config.enableColumnDivider ? 'border-r border-gray-200' : '',
                                        !config.enableRowDivider ? '!border-b-0' : '',
                                        // Show border on checkbox column when freezeIndex = 1 (only checkbox frozen)
                                        checkboxFrozen && (config.freezePaneColumnIndexNo || 1) === 1 && 'border-r-2 border-gray-300'
                                    )}
                                    style={{
                                        width: checkboxColumnWidth ? `${checkboxColumnWidth}px` : 'auto',
                                        boxSizing: 'border-box',
                                        ...(checkboxFrozen ? {
                                            position: 'sticky',
                                            left: '0px',
                                            zIndex: 21,
                                            backgroundColor: rowBg,
                                            boxShadow: (config.freezePaneColumnIndexNo || 1) === 1 ? '2px 0 4px rgba(0, 0, 0, 0.1)' : 'none'
                                        } : {})
                                    }}
                                >
                                    {config.enableRowReorder && (
                                        <div className="absolute left-1 top-1/2 transform -translate-y-1/2 cursor-move opacity-0 group-hover:opacity-100 transition-opacity">
                                            <GripVertical size={14} className="text-gray-400" />
                                        </div>
                                    )}
                                    <div className="flex items-center justify-center">
                                        {config.enableRowSelection && config.enableRowNumber ? (
                                            <div className="relative">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedRows.includes(rowIndex)}
                                                    onChange={() => toggleRowSelection(rowIndex)}
                                                />
                                                <span className="absolute inset-0 flex items-center justify-center text-xs text-gray-500 pointer-events-none">
                                                    {rowIndex + 1}
                                                </span>
                                            </div>
                                        ) : config.enableRowSelection ? (
                                            <input
                                                type="checkbox"
                                                checked={selectedRows.includes(rowIndex)}
                                                onChange={() => toggleRowSelection(rowIndex)}
                                            />
                                        ) : config.enableRowNumber ? (
                                            <span className="text-xs text-gray-500">{rowIndex + 1}</span>
                                        ) : null}
                                    </div>
                                </td>
                                );
                            })()}

                            {columnOrder
                                .filter(col => visibleColumns.includes(col))
                                .map((col, colIndex, arr) => {
                                    const isFrozen = isColumnFrozen(colIndex);
                                    const freezeIndex = (config.freezePaneColumnIndexNo || 1);
                                    const shouldShowBorder = freezeIndex >= 2 && colIndex === freezeIndex - 2;
                                    const rowBg = config.enableStripedRows && rowIndex % 2 === 1 ? 'rgb(249 250 251)' : 'white';
                                    const leftOffset = isFrozen ? getFreezeLeftOffset(colIndex) : 0;
                                    
                                    return (
                                    <td
                                        key={col}
                                        className={cn(
                                            "px-4 py-2 text-sm text-gray-700",
                                            config.enableColumnDivider && colIndex < arr.length - 1 ? 'border-r border-gray-200' : '',
                                            !config.enableRowDivider ? '!border-b-0' : '',
                                            // Border only on last frozen data column
                                            shouldShowBorder && 'border-r-2 border-gray-300'
                                        )}
                                        style={{
                                            width: columnWidths[col] ? `${columnWidths[col]}px` : 'auto',
                                            boxSizing: 'border-box',
                                            ...(isFrozen ? {
                                                position: 'sticky',
                                                left: `${leftOffset}px`,
                                                zIndex: 20,
                                                backgroundColor: rowBg,
                                                boxShadow: shouldShowBorder ? '2px 0 4px rgba(0, 0, 0, 0.1)' : 'none'
                                            } : {})
                                        }}
                                    >
                                        <span className={colIndex === 0 ? 'font-medium' : ''}>
                                            {config.enableInlineEdit?.includes(col) ? (
                                                <input
                                                    type="text"
                                                    defaultValue={row[col]?.toString() || ''}
                                                    className="w-full border-none bg-transparent focus:bg-white focus:border focus:border-primary focus:outline-none px-1 py-0.5 rounded"
                                                />
                                            ) : (
                                                row[col]?.toString() || '-'
                                            )}
                                        </span>
                                        {colIndex === 0 && (row['isCustom'] === true || row['isCustom'] === 1) && (
                                            <span className="ml-2 px-2 py-0.5 text-xs bg-accent text-white rounded-full">
                                                Custom
                                            </span>
                                        )}
                                    </td>
                                    );
                                })}

                            {config.enableRowActions && (
                                <td className={cn(
                                    "px-4 py-2 text-sm text-gray-700",
                                    !config.enableRowDivider ? '!border-b-0' : '',
                                    config.enableColumnDivider ? 'border-l border-gray-200' : ''
                                )}>
                                    <div className={cn(
                                        "flex space-x-2",
                                        config.showRowActionsOnHover ? 'opacity-0 group-hover:opacity-100 transition-opacity' : ''
                                    )}>
                                        <Link
                                            to={`${baseUrl}/${row.id}/config`}
                                            className="p-1 text-gray-500 hover:text-primary"
                                            title="Configure"
                                        >
                                            <Settings size={16} />
                                        </Link>
                                        <Link
                                            to={`${baseUrl}/${row.id}`}
                                            className="p-1 text-gray-500 hover:text-primary"
                                            title="View Record"
                                        >
                                            <ExternalLink size={16} />
                                        </Link>
                                        <Link
                                            to={`${baseUrl}/${row.id}/edit`}
                                            className="p-1 text-gray-500 hover:text-primary transition-colors"
                                            title="Edit Record"
                                        >
                                            <Edit size={16} />
                                        </Link>
                                        <button
                                            className="p-1 text-gray-500 hover:text-red-600 transition-colors"
                                            title="Delete Record"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            )}
                        </tr>
                    )})}
                </React.Fragment>
            ));
        }

        return sortedData.map((row, idx) => (
            <tr
                key={row.id || idx}
                className={cn(
                    config.enableRowHoverHighlight ? 'hover:bg-gray-100 transition-colors group' : 'group',
                    config.enableStripedRows && idx % 2 === 1 && 'bg-gray-50',
                    config.enableRowDivider ? 'border-b border-gray-200' : 'border-b-0'
                )}
                draggable={config.enableRowReorder}
                onDragStart={(e) => handleRowDragStart(e, idx)}
                onDragOver={(e) => handleRowDragOver(e, idx)}
                onDrop={(e) => handleRowDrop(e, idx)}
            >
                {(config.enableRowSelection || config.enableRowNumber) && (() => {
                    const checkboxFrozen = isCheckboxColumnFrozen();
                    const rowBg = config.enableStripedRows && idx % 2 === 1 ? 'rgb(249 250 251)' : 'white';
                    return (
                    <td 
                        className={cn(
                            "px-4 py-2 text-sm text-gray-700 relative",
                            config.enableColumnDivider ? 'border-r border-gray-200' : '',
                            !config.enableRowDivider ? '!border-b-0' : '',
                            // Show border on checkbox column when freezeIndex = 1 (only checkbox frozen)
                            checkboxFrozen && (config.freezePaneColumnIndexNo || 1) === 1 && 'border-r-2 border-gray-300'
                        )}
                        style={{
                            width: checkboxColumnWidth ? `${checkboxColumnWidth}px` : 'auto',
                            boxSizing: 'border-box',
                            ...(checkboxFrozen ? {
                                position: 'sticky',
                                left: '0px',
                                zIndex: 21,
                                backgroundColor: rowBg,
                                boxShadow: (config.freezePaneColumnIndexNo || 1) === 1 ? '2px 0 4px rgba(0, 0, 0, 0.1)' : 'none'
                            } : {})
                        }}
                    >
                        {config.enableRowReorder && (
                            <div className="absolute left-1 top-1/2 transform -translate-y-1/2 cursor-move opacity-0 group-hover:opacity-100 transition-opacity">
                                <GripVertical size={14} className="text-gray-400" />
                            </div>
                        )}
                        <div className="flex items-center justify-center">
                            {config.enableRowSelection && config.enableRowNumber ? (
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        checked={selectedRows.includes(idx)}
                                        onChange={() => toggleRowSelection(idx)}
                                    />
                                    <span className="absolute inset-0 flex items-center justify-center text-xs text-gray-500 pointer-events-none">
                                        {idx + 1}
                                    </span>
                                </div>
                            ) : config.enableRowSelection ? (
                                <input
                                    type="checkbox"
                                    checked={selectedRows.includes(idx)}
                                    onChange={() => toggleRowSelection(idx)}
                                />
                            ) : config.enableRowNumber ? (
                                <span className="text-xs text-gray-500">{idx + 1}</span>
                            ) : null}
                        </div>
                    </td>
                    );
                })()}

                            {columnOrder
                                .filter(col => visibleColumns.includes(col))
                                .map((col, colIndex, arr) => {
                                    const isFrozen = isColumnFrozen(colIndex);
                                    const freezeIndex = (config.freezePaneColumnIndexNo || 1);
                                    const shouldShowBorder = freezeIndex >= 2 && colIndex === freezeIndex - 2;
                                    const rowBg = config.enableStripedRows && rowIndex % 2 === 1 ? 'rgb(249 250 251)' : 'white';
                                    const leftOffset = isFrozen ? getFreezeLeftOffset(colIndex) : 0;
                                    
                                    return (
                                    <td
                                        key={col}
                                        className={cn(
                                            "px-4 py-2 text-sm text-gray-700",
                                            config.enableColumnDivider && colIndex < arr.length - 1 ? 'border-r border-gray-200' : '',
                                            !config.enableRowDivider ? '!border-b-0' : '',
                                            // Border only on last frozen data column
                                            shouldShowBorder && 'border-r-2 border-gray-300'
                                        )}
                                        style={{
                                            width: columnWidths[col] ? `${columnWidths[col]}px` : 'auto',
                                            boxSizing: 'border-box',
                                            ...(isFrozen ? {
                                                position: 'sticky',
                                                left: `${leftOffset}px`,
                                                zIndex: 20,
                                                backgroundColor: rowBg,
                                                boxShadow: shouldShowBorder ? '2px 0 4px rgba(0, 0, 0, 0.1)' : 'none'
                                            } : {})
                                        }}
                                    >
                                        <span className={colIndex === 0 ? 'font-medium' : ''}>
                                            {config.enableInlineEdit?.includes(col) ? (
                                                <input
                                                    type="text"
                                                    defaultValue={row[col]?.toString() || ''}
                                                    className="w-full border-none bg-transparent focus:bg-white focus:border focus:border-primary focus:outline-none px-1 py-0.5 rounded"
                                                />
                                            ) : (
                                                row[col]?.toString() || '-'
                                            )}
                                        </span>
                                        {colIndex === 0 && (row['isCustom'] === true || row['isCustom'] === 1) && (
                                            <span className="ml-2 px-2 py-0.5 text-xs bg-accent text-white rounded-full">
                                                Custom
                                            </span>
                                        )}
                                    </td>
                                    );
                                })}

                {config.enableRowActions && (
                    <td className={cn(
                        "px-4 py-2 text-sm text-gray-700",
                        !config.enableRowDivider ? '!border-b-0' : '',
                        config.enableColumnDivider ? 'border-l border-gray-200' : ''
                    )}>
                        <div className={cn(
                            "flex space-x-2",
                            config.showRowActionsOnHover ? 'opacity-0 group-hover:opacity-100 transition-opacity' : ''
                        )}>
                            <Link
                                to={`${baseUrl}/${row.id}/config`}
                                className="p-1 text-gray-500 hover:text-primary"
                                title="Configure"
                            >
                                <Settings size={16} />
                            </Link>
                            <Link
                                to={`${baseUrl}/${row.id}`}
                                className="p-1 text-gray-500 hover:text-primary"
                                title="View Record"
                            >
                                <ExternalLink size={16} />
                            </Link>
                            <Link
                                to={`${baseUrl}/${row.id}/edit`}
                                className="p-1 text-gray-500 hover:text-primary transition-colors"
                                title="Edit Record"
                            >
                                <Edit size={16} />
                            </Link>
                            <button
                                className="p-1 text-gray-500 hover:text-red-600 transition-colors"
                                title="Delete Record"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </td>
                )}
            </tr>
        ));
    };

    // ===== ORPHANED CODE BLOCK REMOVED (was lines 1110-2409) =====
    // This block contained old button rendering code referencing undefined variables
    // and a duplicate renderTableRows implementation
    // All button rendering is now handled by TableActionPanel component
    // renderTableRows is already complete above (ends at line 1103)
    // ORPHANED CODE BLOCK REMOVED: Lines 1110-2402 contained old button rendering code
    // and a duplicate renderTableRows implementation
    // All button rendering is now handled by TableActionPanel component
    // renderTableRows is already complete above (ends at line 1103)
    // ORPHANED CODE BLOCK REMOVED: All old button rendering code has been removed
    // All button rendering is now handled by TableActionPanel component

    function getTitleStyle(): React.CSSProperties {
        const style: React.CSSProperties = {};

        if (config.enableTitleBackground) {
            style.backgroundColor = config.titleBackgroundColor || '#ffffff';
            style.padding = '1rem';
            style.borderRadius = '0.5rem 0.5rem 0 0';
        }

        if (config.titleTableSpacing) {
            style.marginBottom = `${config.titleTableSpacing}px`;
        }

        return style;
    }


    function getTableStyle(): React.CSSProperties {
        if (!config.tableBackground) return {};
        return {
            backgroundColor: config.tableBackgroundColor || '#ffffff'
        };
    }


    function getTablePanelStyle(): React.CSSProperties {
        if (!config.tablePanelBackground) return {};
        return {
            backgroundColor: config.tablePanelBackgroundColor || '#ffffff',
            padding: '1rem',
            borderRadius: '0.5rem'
        };
    }

    // Calculate left offset for frozen columns
    // This needs to account for checkbox/row number column width exactly
    const getFreezeLeftOffset = useCallback((colIndex: number) => {
        let left = 0;
        
        // Selection column - measure actual width or use calculated width
        if (config.enableRowSelection) {
            // Try to get actual width from ref, otherwise use calculated width
            // px-4 = 16px padding on each side = 32px total
            // Content: checkbox (~20px) or checkbox+number (~24px)
            // Total: typically 48-56px, but we measure it
            const checkboxEl = checkboxColumnRef.current;
            const checkboxWidth = checkboxEl ? checkboxEl.offsetWidth : 48; // Fallback to 48px
            left += checkboxWidth;
        }
        
        // Row number column - same calculation (if separate from selection)
        if (config.enableRowNumber && !config.enableRowSelection) {
            // Row number column typically has same width as checkbox column
            left += 48; // Standard row number column width
        }
        
        // Data columns before the frozen one - must match actual rendered width exactly
        const orderedColumns = columnOrder.filter(col => visibleColumns.includes(col));
        for (let i = 0; i < colIndex; i++) {
            const colKey = orderedColumns[i];
            // Try to get width from state, then from ref, then default
            let baseWidth = columnWidths[colKey];
            if (!baseWidth && headerCellRefs.current[colKey]) {
                baseWidth = headerCellRefs.current[colKey]!.offsetWidth;
            }
            if (!baseWidth) {
                // Default fallback - try to measure from resizeRefs if available
                const resizeEl = resizeRefs.current[colKey] as HTMLTableCellElement | null;
                baseWidth = resizeEl?.offsetWidth || 150;
            }
            left += baseWidth;
        }
        
        return left;
    }, [config.enableRowSelection, config.enableRowNumber, columnOrder, visibleColumns, columnWidths, config.freezePaneColumnIndexNo]);

    // Check if a data column should be frozen based on current column order
    // freezePaneColumnIndexNo is 1-based where column 0 = checkbox:
    // - 1 = freeze column 0 (checkbox) only
    // - 2 = freeze columns 0 (checkbox) + 1 (first data column)
    // - 3 = freeze columns 0 (checkbox) + 1 + 2 (first two data columns)
    // - 4 = freeze columns 0 (checkbox) + 1 + 2 + 3 (first three data columns)
    // colIndex is 0-based for data columns (0 = first data column, which is overall column 1)
    // So if freezePaneColumnIndexNo = 2, freeze colIndex < 1 (i.e., colIndex 0 = first data column)
    // If freezePaneColumnIndexNo = 3, freeze colIndex < 2 (i.e., colIndex 0 and 1)
    // If freezePaneColumnIndexNo = 4, freeze colIndex < 3 (i.e., colIndex 0, 1, and 2)
    const isColumnFrozen = useCallback((colIndex: number) => {
        if (!config.enablefreezePaneColumnIndex) return false;
        const freezeIndex = (config.freezePaneColumnIndexNo || 1); // 1-based
        // Freeze all data columns up to and including (freezeIndex - 2)
        // If freezeIndex = 2, freeze colIndex < 1 (i.e., colIndex 0)
        // If freezeIndex = 3, freeze colIndex < 2 (i.e., colIndex 0, 1)
        // If freezeIndex = 4, freeze colIndex < 3 (i.e., colIndex 0, 1, 2)
        return colIndex < (freezeIndex - 1);
    }, [config.enablefreezePaneColumnIndex, config.freezePaneColumnIndexNo]);

    // Check if checkbox/row number column should be frozen
    // Checkbox is column 0, so it's frozen if freezePaneColumnIndexNo >= 1
    const isCheckboxColumnFrozen = useCallback(() => {
        if (!config.enablefreezePaneColumnIndex) return false;
        const freezeIndex = (config.freezePaneColumnIndexNo || 1);
        // If freezeIndex >= 1, freeze the checkbox column (column 0)
        return freezeIndex >= 1;
    }, [config.enablefreezePaneColumnIndex, config.freezePaneColumnIndexNo]);

    function getThemeClasses(): string {
        const baseClasses = 'data-table';

        const themeClasses: Record<string, string> = {
            default: '',
            professional: 'theme-professional',
            modern: 'theme-modern',
            minimal: 'theme-minimal'
        };

        const viewClasses: Record<string, string> = {
            default: '',
            compact: 'compact',
            comfortable: 'comfortable',
            spacious: 'spacious'
        };

        return `
        ${baseClasses}
        ${themeClasses[config.theme || 'default']}
        ${viewClasses[config.tableView || 'default']}
        ${!config.enableRowHoverHighlight ? 'no-hover' : ''}
        ${config.enableStripedRows ? 'striped' : ''}
        ${config.enableFreezePaneRowHeader ? 'freeze-header' : ''}
    `;
    }
    

    return (
        
        <div className="fade-in">
            {/* Title Section */}
            {config.enableTitle && (
                <div style={getTitleStyle()} className={config.enableTitleBackground ? 'mb-0' : 'mb-6'}>
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="page-title mb-0">{title}</h1>
                            {config.enableRecordCount && (
                                <p className="text-sm text-gray-600 mt-1">
                                    {sortedData.length} record{sortedData.length !== 1 ? 's' : ''}
                                    {config.enableSortInfo && sortCriteria.length > 0 && (
                                        <span className="ml-2">
                                            • Sorted by {sortCriteria.map(s => `${fieldMappings[s.column]} (${s.order === 'asc' ? 'A-Z' : 'Z-A'})`).join(', ')}
                                        </span>
                                    )}
                                    {config.enableFilterInfo && filterCriteria.length > 0 && (
                                        <span className="ml-2">• {filterCriteria.length} filter{filterCriteria.length !== 1 ? 's' : ''} applied</span>
                                    )}
                                </p>
                            )}
                            {config.enableLastUpdated && (
                                <p className="text-xs text-gray-500 mt-1">
                                    Last updated: {new Date().toLocaleString()}
                                </p>
                            )}
                        </div>
                        <div className="flex items-center space-x-2">
                            {config.enableNewButton && (
                                <button className="btn btn-primary">
                                    <Plus size={16} className="mr-2" /> New {title}
                                </button>
                            )}
                            {/* Settings and Preset when Table Panel is disabled */}
                            {!config.enableTablePanel && (
                                <>
                                    {config.enablePresetSelector && (
                                        <div className="relative" ref={dropdownRef}>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setShowPresetDropdown(!showPresetDropdown);
                                                }}
                                                className="flex items-center px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                                            >
                                                <Bookmark size={16} />
                                                <ChevronDown size={14} className="ml-1" />
                                            </button>

                                            {showPresetDropdown && (
                                                <div className="absolute top-full right-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                                                    <div className="py-1">
                                                        {presets.map((preset) => (
                                                            <button
                                                                key={preset.id}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    applyPreset(preset);
                                                                }}
                                                                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center"
                                                            >
                                                                {preset.name}
                                                                {preset.isDefault && <Star size={12} className="ml-2 text-yellow-500" />}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <button
                                        onClick={() => setIsTableSettingsOpen(true)}
                                        className="p-2 text-gray-500 hover:text-primary border border-gray-300 rounded-md hover:bg-gray-50"
                                    >
                                        <Settings size={16} />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="card" style={getTableStyle()}>
                {/* Table Panel - Now uses refactored TableActionPanel with individual action components */}
                {config.enableTablePanel && (
                    <TableActionPanel
                        enableTablePanel={config.enableTablePanel}
                        tablePanelBackground={config.tablePanelBackground || false}
                        tablePanelBackgroundColor={config.tablePanelBackgroundColor || '#ffffff'}
                        // Search
                        enableSearch={config.enableSearch || false}
                        searchButtonType={config.searchButtonType || 'icon'}
                        searchButtonAlign={config.searchButtonAlign || 'right'}
                        searchTerm={searchTerm}
                        onSearchChange={setSearchTerm}
                        // Sort
                        enableSort={config.enableSort || false}
                        sortButtonType={config.sortButtonType || 'icon'}
                        sortButtonAlign={config.sortButtonAlign || 'right'}
                        sortCriteria={sortCriteria}
                        onSortCriteriaChange={setSortCriteria}
                        // Filter
                        enableFilter={config.enableFilter || false}
                        filterButtonType={config.filterButtonType || 'icon'}
                        filterButtonAlign={config.filterButtonAlign || 'right'}
                        filterCriteria={filterCriteria}
                        onFilterCriteriaChange={setFilterCriteria}
                        // Group
                        enableGroup={config.enableGroup || false}
                        groupButtonType={config.groupButtonType || 'icon'}
                        groupButtonAlign={config.groupButtonAlign || 'right'}
                        groupByColumn={groupByColumn}
                        onGroupByColumnChange={setGroupByColumn}
                        // Column Visibility
                        enableColumnVisibility={config.enableColumnVisibility || false}
                        columnVisibilityButtonType={config.columnVisibilityButtonType || 'icon'}
                        columnVisibilityButtonAlign={config.columnVisibilityButtonAlign || 'right'}
                        allColumns={allColumns}
                        activeColumns={activeColumns}
                        visibleColumns={visibleColumns}
                        onActiveColumnsChange={setActiveColumns}
                        onVisibleColumnsChange={setVisibleColumns}
                        // Freeze Pane
                        enableFreezePane={config.enableFreezePane || false}
                        freezePaneType={config.freezePaneType || 'icon'}
                        freezePaneAlign={config.freezePaneAlign || 'right'}
                        enableFreezePaneRowHeader={config.enableFreezePaneRowHeader || false}
                        enablefreezePaneColumnIndex={config.enablefreezePaneColumnIndex || false}
                        freezePaneColumnIndexNo={config.freezePaneColumnIndexNo || 1}
                        maxColumnIndex={visibleColumns.length} // Max = number of visible data columns
                        // Refresh
                        enableRefresh={config.enableRefresh || false}
                        refreshButtonType={config.refreshButtonType || 'icon'}
                        refreshButtonAlign={config.refreshButtonAlign || 'right'}
                        onRefreshClick={handleRefresh}
                        // Export
                        enableExport={config.enableExport || false}
                        exportButtonType={config.exportButtonType || 'icon'}
                        exportButtonAlign={config.exportButtonAlign || 'right'}
                        onExportClick={handleExportClick}
                        // Import
                        enableImport={config.enableImport || false}
                        importButtonType={config.importButtonType || 'icon'}
                        importButtonAlign={config.importButtonAlign || 'right'}
                        onImportClick={handleImportClick}
                        // Print
                        enablePrint={config.enablePrint || false}
                        printButtonType={config.printButtonType || 'icon'}
                        printButtonAlign={config.printButtonAlign || 'right'}
                        onPrintClick={handlePrintClick}
                        // Change Owner
                        enableChangeOwner={config.enableChangeOwner || false}
                        changeOwnerButtonType={config.changeOwnerButtonType || 'icon'}
                        changeOwnerButtonAlign={config.changeOwnerButtonAlign || 'right'}
                        onChangeOwnerClick={handleChangeOwnerClick}
                        // Chart
                        enableChart={config.enableChart || false}
                        chartButtonType={config.chartButtonType || 'icon'}
                        chartButtonAlign={config.chartButtonAlign || 'right'}
                        onChartClick={handleChartClick}
                        // Share
                        enableShare={config.enableShare || false}
                        shareButtonType={config.shareButtonType || 'icon'}
                        shareButtonAlign={config.shareButtonAlign || 'right'}
                        onShareClick={handleShareClick}
                        // Preset
                        enablePresetSelector={config.enablePresetSelector || false}
                        presetButtonType={config.presetButtonType || 'icon'}
                        presetButtonAlign={config.presetButtonAlign || 'right'}
                        presets={presets}
                        onPresetClick={handlePresetClick}
                        onPresetApply={applyPreset}
                        // Table View
                        tableViewButtonType={config.tableViewButtonType || 'icon'}
                        tableViewButtonAlign={config.tableViewButtonAlign || 'right'}
                        currentTableView={config.tableView || 'default'}
                        onTableViewChange={handleTableViewChange}
                        // Settings
                        settingsButtonType={config.settingsButtonType || 'icon'}
                        settingsButtonAlign={config.settingsButtonAlign || 'right'}
                        onSettingsClick={handleSettingsClick}
                        // Common
                        fieldMappings={fieldMappings}
                        config={config}
                        onConfigChange={onConfigChange}
                    />
                )}

                {loading ? (
                    <div className="p-6 text-center text-gray-500">Loading...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className={getThemeClasses()}>
                            {config.enableHeader && (
                                <thead className={cn("bg-gray-100", config.enableFreezePaneRowHeader && "sticky top-0 z-30")}>
                                    <tr>
                                        {(config.enableRowSelection || config.enableRowNumber) && (() => {
                                            const checkboxFrozen = isCheckboxColumnFrozen();
                                            return (
                                            <th 
                                                ref={(el) => checkboxColumnRef.current = el}
                                                className={cn(
                                                    "px-4 py-2 text-sm text-gray-700",
                                                    config.enableColumnDivider ? 'border-r border-gray-200' : '',
                                                    // Show border on checkbox column when freezeIndex = 1 (only checkbox frozen)
                                                    checkboxFrozen && (config.freezePaneColumnIndexNo || 1) === 1 && 'border-r-2 border-gray-300'
                                                )}
                                                style={{
                                                    width: checkboxColumnWidth ? `${checkboxColumnWidth}px` : 'auto',
                                                    boxSizing: 'border-box',
                                                    ...(checkboxFrozen ? {
                                                        position: 'sticky',
                                                        left: '0px',
                                                        zIndex: 26,
                                                        backgroundColor: 'rgb(249 250 251)', // bg-gray-100
                                                        boxShadow: (config.freezePaneColumnIndexNo || 1) === 1 ? '2px 0 4px rgba(0, 0, 0, 0.1)' : 'none'
                                                    } : {})
                                                }}
                                            >
                                                {config.enableRowSelection && config.enableMassSelection ? (
                                                    <input
                                                        type="checkbox"
                                                        ref={(el) => {
                                                            if (el) {
                                                                const state = getHeaderCheckboxState();
                                                                el.checked = state === 'checked';
                                                                el.indeterminate = state === 'indeterminate';
                                                            }
                                                        }}
                                                        onChange={handleSelectAllRows}
                                                    />
                                                ) : config.enableRowNumber ? (
                                                    '#'
                                                ) : null}
                                            </th>
                                            );
                                        })()}

                                        {columnOrder
                                            .filter(col => visibleColumns.includes(col))
                                            .map((col, colIndex, arr) => {
                                                const isFrozen = isColumnFrozen(colIndex);
                                                const freezeIndex = (config.freezePaneColumnIndexNo || 1);
                                                // Border logic:
                                                // If freezeIndex = 1, freeze checkbox only, no border on data columns
                                                // If freezeIndex = 2, freeze checkbox + first data column, border on colIndex 0
                                                // If freezeIndex = 3, freeze checkbox + first two data columns, border on colIndex 1
                                                const shouldShowBorder = freezeIndex >= 2 && colIndex === freezeIndex - 2;
                                                const leftOffset = isFrozen ? getFreezeLeftOffset(colIndex) : 0;
                                                
                                                return (
                                                <th
                                                    key={col}
                                                    ref={(el) => {
                                                        resizeRefs.current[col] = el;
                                                        headerCellRefs.current[col] = el;
                                                    }}
                                                    className={cn(
                                                        "px-4 py-2 text-left cursor-pointer relative group",
                                                        config.enableColumnDivider && colIndex < arr.length - 1 ? 'border-r border-gray-200' : '',
                                                        // Show border only on the last frozen column
                                                        // Border only on last frozen data column:
                                            // If freezePaneColumnIndexNo = 2, freeze colIndex < 1, so border on colIndex 0 (last frozen = colIndex 0)
                                            // If freezePaneColumnIndexNo = 3, freeze colIndex < 2, so border on colIndex 1 (last frozen = colIndex 1)
                                            // If freezePaneColumnIndexNo = 1, no data columns frozen, so no border
                                            // Last frozen colIndex = freezePaneColumnIndexNo - 2 (only when freezePaneColumnIndexNo >= 2)
                                            shouldShowBorder && 'border-r-2 border-gray-300'
                                                    )}
                                                    style={{ 
                                                        width: columnWidths[col] ? `${columnWidths[col]}px` : 'auto',
                                                        boxSizing: 'border-box',
                                                        ...(isFrozen ? {
                                                            position: 'sticky',
                                                            left: `${leftOffset}px`,
                                                            zIndex: 25,
                                                            backgroundColor: 'rgb(249 250 251)', // bg-gray-100
                                                            boxShadow: shouldShowBorder ? '2px 0 4px rgba(0, 0, 0, 0.1)' : 'none'
                                                        } : {})
                                                    }}
                                                    onClick={() => handleSort(col)}
                                                    draggable={config.enableColumnReorder}
                                                    onDragStart={(e) => handleColumnDragStart(e, colIndex)}
                                                    onDragOver={(e) => handleColumnDragOver(e, colIndex)}
                                                    onDrop={(e) => handleColumnDrop(e, colIndex)}
                                                >
                                                    <div className="flex items-center">
                                                        {config.enableColumnReorder && (
                                                            <div className="cursor-move text-gray-400 hover:text-gray-600 mr-2">
                                                                <GripVertical size={14} />
                                                            </div>
                                                        )}
                                                        {fieldMappings[col]}
                                                        {config.enableSort && sortCriteria.find(s => s.column === col) && (
                                                            <span>{sortCriteria.find(s => s.column === col)?.order === 'asc' ? ' ↑' : ' ↓'}</span>
                                                        )}
                                                    </div>
                                                    {config.enableColumnResize && (
                                                        <div
                                                            className="absolute top-0 right-0 h-full w-1 cursor-col-resize"
                                                            onMouseDown={(e) => handleMouseDown(e, col)}
                                                        />
                                                    )}
                                                </th>
                                                );
                                            })}

                                        {config.enableRowActions && (
                                            <th className={`px-4 py-2 ${config.enableColumnDivider ? 'border-l border-gray-200' : ''}`}>
                                                Actions
                                            </th>
                                        )}
                                    </tr>
                                </thead>
                            )}

                            <tbody>
                                {renderTableRows()}
                            </tbody>
                            <TableFooter
                                enableFooter={config.enableFooter || false}
                                enableTableTotals={config.enableTableTotals || false}
                                enablePagination={config.enablePagination || false}
                                pageSize={config.pageSize || 25}
                                pageSizeOptions={config.pageSizeOptions || [10, 25, 50, 100]}
                                totalRecords={sortedData.length}
                                currentPage={1}
                                onPageSizeChange={(size) => onConfigChange({ ...config, pageSize: size })}
                            />
                        </table>

                        {sortedData.length === 0 && (
                            <div className="py-8 text-center">
                                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 mb-4">
                                    <AlertTriangle size={24} className="text-gray-400" />
                                </div>
                                <h3 className="text-lg font-medium text-gray-900 mb-1">No Record Found</h3>
                                <p className="text-gray-500">Try adjusting your search or create a new record.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Bulk Actions Bar */}
            {config.enableBulkActions && selectedRows.length > 0 && (
                <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50">
                    <div className="flex items-center space-x-4">
                        <span className="text-sm text-gray-600">
                            {selectedRows.length} item{selectedRows.length !== 1 ? 's' : ''} selected
                        </span>
                        <div className="flex items-center space-x-2">
                            {config.bulkActionStyle === 'buttons' ? (
                                <>
                                    <button className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50">
                                        Edit
                                    </button>
                                    <button className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50">
                                        Export
                                    </button>
                                    <button className="px-3 py-1 text-sm text-red-600 border border-red-300 rounded hover:bg-red-50">
                                        Delete
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button className="p-2 text-gray-500 hover:text-primary border border-gray-300 rounded hover:bg-gray-50" title="Edit">
                                        <Edit size={16} />
                                    </button>
                                    <button className="p-2 text-gray-500 hover:text-primary border border-gray-300 rounded hover:bg-gray-50" title="Copy">
                                        <Copy size={16} />
                                    </button>
                                    <button className="p-2 text-red-500 hover:text-red-700 border border-red-300 rounded hover:bg-red-50" title="Delete">
                                        <Trash2 size={16} />
                                    </button>
                                </>
                            )}
                        </div>
                        <button
                            onClick={() => setSelectedRows([])}
                            className="p-1 text-gray-400 hover:text-gray-600"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>
            )}

            <TableSettingsModal
                isOpen={isTableSettingsOpen}
                onSave={onConfigChange}
                onClose={() => handleCloseTableSettings(false)}
                currentConfig={config}          // ✅ CRITICAL FIX
                //{/*onConfigChange={onConfigChange}*/}
                fieldMappings={fieldMappings}
                presets={presets}
                onPresetsChange={setPresets}
                
               
            />
        </div>
 );
}

