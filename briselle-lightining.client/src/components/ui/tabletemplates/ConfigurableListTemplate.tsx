import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";

import {
    Search, Plus, AlertTriangle, ExternalLink, Settings, Edit, Trash2,
    ChevronDown, ChevronRight, ChevronUp, Eye, EyeOff, GripVertical, Download, Upload, RefreshCw,
    Columns, Rows, Filter, SortAsc, Table, LayoutGrid, List,
    Maximize, Minimize, Palette, Ruler, AlignJustify, AlignLeft, AlignRight,
    //AlignEnd, AlignStart,
    AlignVerticalJustifyCenter, AlignHorizontalJustifyCenter,
    AlignHorizontalJustifyEnd, AlignHorizontalJustifyStart, AlignVerticalJustifyEnd,
    AlignVerticalJustifyStart, AlignVerticalSpaceAround, AlignHorizontalSpaceAround,
    AlignHorizontalSpaceBetween, AlignVerticalSpaceBetween,
    ArrowDown, ArrowUp, PanelsTopLeft,

    BarChart3, Printer, ArrowUpDown, Group,
    UserCheck, Grid3X3, Bookmark, Star, X, Check, Copy, SortDesc,  MoreVertical, 
    Lock, 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../../../utils/helpers';
import TableSettingsModal from "./TableSettingsModal"; // Ensure this import is correct
import TableTitlePanel from "./table-components/TableTitlePanel";
import TableTabPanel, { TabItem } from "./table-components/TableTabPanel";
import TableActionPanel from "./table-components/TableActionPanel";
import DataTable from "./table-components/DataTable";
import { JSX } from "react/jsx-runtime";


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

interface TablePreset {
    id: string;
    name: string;
    config: TableConfig;
    isDefault?: boolean;
    presetId: string; // Reference to a saved preset
}

interface SortCriteria {
    column: string;
    order: 'asc' | 'desc';
}

interface FilterCriteria {
    column: string;
    operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'greaterThan' | 'lessThan' | 'notEquals';
    value: string;
    logic: 'AND' | 'OR';
}

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
    
    const [sortCriteria, setSortCriteria] = useState<SortCriteria[]>([]);
    const [filterCriteria, setFilterCriteria] = useState<FilterCriteria[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRows, setSelectedRows] = useState<number[]>([]);
    const [showSettings, setShowSettings] = useState(false);
    const [showPresetDropdown, setShowPresetDropdown] = useState(false);
    const [showTableViewDropdown, setShowTableViewDropdown] = useState(false);
    const [showSortDropdown, setShowSortDropdown] = useState(false);
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);
    const [showGroupDropdown, setShowGroupDropdown] = useState(false);

    const [showFreezePane, setShowFreezePane] = useState(false);
    const [showFreezePaneDropdown, setShowFreezePaneDropdown] = useState(false);
    const freezePaneColumnIndexNo = 1;
    const enablefreezePaneColumnIndex = true

    const ToggleSwitch = ({
        checked,
        onChange,
    }: {
        checked: boolean;
        onChange: (value: boolean) => void;
    }) => (
        <button
            onClick={() => onChange(!checked)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors
            ${checked ? 'bg-blue-600' : 'bg-gray-300'}`}
        >
            <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                ${checked ? 'translate-x-4' : 'translate-x-1'}`}
            />
        </button>
    );




    const [showSearchExpanded, setShowSearchExpanded] = useState(false);
    const [showColumnDropdown, setShowColumnDropdown] = useState(false);
   
    const [draggedRowIndex, setDraggedRowIndex] = useState<number | null>(null);
    const [draggedColumnIndex, setDraggedColumnIndex] = useState<number | null>(null);
    const [groupByColumn, setGroupByColumn] = useState<string | null>(null);
    const [presets, setPresets] = useState<TablePreset[]>([]);
    //const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
    const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});

    const allColumns = Object.keys(fieldMappings);

    const [activeColumns, setActiveColumns] = useState<string[]>(allColumns);
    const [visibleColumns, setVisibleColumns] = useState<string[]>(allColumns);


    const [columnOrder, setColumnOrder] = useState<string[]>(Object.keys(fieldMappings));
    const resizeRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [isTableSettingsOpen, setIsTableSettingsOpen] = useState(false);
    const [columnWrapStates, setColumnWrapStates] = useState<Record<string, 'wrap' | 'clip'>>({});

    /* =======================
      UI & DATA HELPERS
      ======================= */

    //----Filter-----
    const filteredData = useMemo(() => {
        return data.filter((row) => {
            const searchLower = searchTerm.toLowerCase();
            return Object.keys(fieldMappings).some((key) =>
                (row[key]?.toString().toLowerCase() ?? '').includes(searchLower)
            );
        });
    }, [data, searchTerm, fieldMappings]);

    

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

    // Handle Ctrl+F for search activation
    useEffect(() => {
        console.log('[CLT] Useeffect near Ctrl+F for search activation:', {
            enableFreezePaneColumnIndex: config.enableFreezePaneColumnIndex,
            freezePaneColumnIndexNo: config.freezePaneColumnIndexNo,
        });
        const handleKeyDown = (event: KeyboardEvent) => {
            if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
                event.preventDefault();
                if (config.enableSearch && config.searchButtonType === 'icon') {
                    setShowSearchExpanded(true);
                    setTimeout(() => {
                        searchInputRef.current?.focus();
                    }, 100);
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [config.enableSearch, config.searchButtonType]);

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

    // Close dropdown when clicking outside with delay to prevent conflicts
    useEffect(() => {
       
        let timeoutId: NodeJS.Timeout;

        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowPresetDropdown(false);
                setShowTableViewDropdown(false);
                setShowColumnDropdown(false);
                setShowSortDropdown(false);
                setShowFilterDropdown(false);
                setShowGroupDropdown(false);
                setShowFreezePaneDropdown(false);
            }
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowSearchExpanded(false);
            }
        }

        // Add delay to prevent immediate closing when opening dropdowns
        timeoutId = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
        }, 100);

        return () => {
            clearTimeout(timeoutId);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

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


    // Group buttons by alignment
    const leftAlignedButtons = [];
    const rightAlignedButtons = [];

    //getButtonContent
    const getButtonContent = (
        icon: React.ReactNode,
        text: string,
        buttonType: 'icon' | 'button'
    ) => {
        if (buttonType === 'button') {
            return (
                <span className="flex items-center">
                    {icon}
                    <span className="ml-2">{text}</span>
                </span>
            );
        }
        return icon;
    };


    // Apply filters
    const filteredEntities = [...data].filter((row) => {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = Object.keys(fieldMappings).some((key) =>
            (row[key]?.toString().toLowerCase() ?? '').includes(searchLower)
        );

        if (!matchesSearch) return false;

        if (filterCriteria.length === 0) return true;

        return filterCriteria.every((filter, index) => {
            const value = row[filter.column]?.toString().toLowerCase() ?? '';
            const filterValue = filter.value.toLowerCase();

            let matches = false;
            switch (filter.operator) {
                case 'equals':
                    matches = value === filterValue;
                    break;
                case 'contains':
                    matches = value.includes(filterValue);
                    break;
                case 'startsWith':
                    matches = value.startsWith(filterValue);
                    break;
                case 'endsWith':
                    matches = value.endsWith(filterValue);
                    break;
                case 'notEquals':
                    matches = value !== filterValue;
                    break;
                case 'greaterThan':
                    matches = parseFloat(value) > parseFloat(filterValue);
                    break;
                case 'lessThan':
                    matches = parseFloat(value) < parseFloat(filterValue);
                    break;
                default:
                    matches = value.includes(filterValue);
            }

            if (index === 0) return matches;

            const prevResult = true; // This would need more complex logic for proper AND/OR handling
            return filter.logic === 'AND' ? prevResult && matches : prevResult || matches;
        });
    });

    // Apply sorting
    const sortedData = [...filteredEntities].sort((a, b) => {
        for (const sort of sortCriteria) {
            const aVal = a[sort.column];
            const bVal = b[sort.column];

            let comparison = 0;
            if (typeof aVal === 'number' && typeof bVal === 'number') {
                comparison = aVal - bVal;
            } else {
                comparison = String(aVal).localeCompare(String(bVal));
            }

            if (comparison !== 0) {
                return sort.order === 'asc' ? comparison : -comparison;
            }
        }
        return 0;
    });

    // ---------- Grouping ----------
    const groupedData = useMemo(() => {
        if (!groupByColumn) return null;

        return sortedData.reduce((groups, row) => {
            const key = row[groupByColumn]?.toString() || 'Ungrouped';
            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(row);
            return groups;
        }, {} as Record<string, any[]>);
    }, [sortedData, groupByColumn]);


   

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

    


    // Search
    if (config.enableSearch) {
        const searchButton = {
            key: 'search',
            component: config.searchButtonType === 'button' ? (
                /* BUTTON TYPE (unchanged) */
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-64 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary h-10"
                    />
                    <Search
                        size={18}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                </div>
            ) : (
                /* ICON TYPE (FIXED) */
                <div
                    ref={searchRef}
                    className={`
                    relative flex items-center
                    border border-gray-300 rounded-md
                    h-10 bg-white
                    transition-all duration-300 ease-in-out
                    ${showSearchExpanded ? 'w-64' : 'w-10'}
                `}
                >
                    {/* ICON (always inside) */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowSearchExpanded(true);
                            setTimeout(() => searchInputRef.current?.focus(), 100);
                        }}
                        className="flex items-center justify-center w-10 h-full text-gray-500 hover:text-primary"
                        title="Search"
                    >
                        <Search size={16} />
                    </button>

                    {/* INPUT */}
                    <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onBlur={() => {
                            if (!searchTerm) setShowSearchExpanded(false);
                        }}
                        className={`
                        h-full bg-transparent
                        outline-none
                        transition-all duration-300 ease-in-out
                        ${showSearchExpanded ? 'w-full pr-3' : 'w-0 p-0'}
                    `}
                    />
                </div>
            )
        };

        if (config.searchButtonAlign === 'left') {
            leftAlignedButtons.push(searchButton);
        } else {
            rightAlignedButtons.push(searchButton);
        }
    }


    // Sort
    if (config.enableSort) {
        const sortButton = {
            key: 'sort',
            component: (
                <div className="relative">
                    <button
                        className="flex items-center justify-center px-3 py-2 text-gray-500 hover:text-primary border border-gray-300 rounded-md hover:bg-gray-50 h-10"
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowSortDropdown(!showSortDropdown);
                        }}
                    >
                        {getButtonContent(
                            <ArrowUpDown size={16} />,
                            'Sort',
                            config.sortButtonType || 'icon'
                        )}
                    </button>

                    {showSortDropdown && (
                        <div
                            className={`
                            absolute top-full mt-1 bg-white border border-gray-200
                            rounded-lg shadow-lg z-50 min-w-72
                            ${config.sortButtonAlign === 'left' ? 'left-0' : 'right-0'}
                        `}
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-3">
                                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                                    Sort
                                </div>

                                {/* ================= ACTIVE SORTS ================= */}
                                {sortCriteria.length > 0 && (
                                    <div className="mb-3">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="text-xs font-medium text-gray-700 mb-2">
                                                Active Sort
                                            </div>

                                            {sortCriteria.length > 0 && (
                                                <button
                                                    onClick={clearSort}
                                                    className="
                px-2 py-1 text-xs
                bg-white border border-gray-300
                text-gray-600 rounded
                hover:bg-gray-50 hover:border-gray-400
                transition-colors
            "
                                                    title="Clear all sorting"
                                                >
                                                    Clear all
                                                </button>
                                            )}
                                        </div>

                                        {sortCriteria.map((sort) => (
                                            <div
                                                key={sort.column}
                                                className="flex items-center justify-between mb-2 p-2 bg-blue-50 rounded"
                                            >
                                                <span className="text-sm text-blue-700">
                                                    {fieldMappings[sort.column]}
                                                </span>

                                                <div className="flex items-center space-x-1">
                                                    <button
                                                        onClick={() =>
                                                            addSortCriteria(sort.column, 'asc')
                                                        }
                                                        className={`p-1 rounded ${sort.order === 'asc'
                                                                ? 'bg-blue-200 text-blue-800'
                                                                : 'text-gray-500 hover:bg-blue-100'
                                                            }`}
                                                        title="Ascending"
                                                    >
                                                        <SortAsc size={14} />
                                                    </button>

                                                    <button
                                                        onClick={() =>
                                                            addSortCriteria(sort.column, 'desc')
                                                        }
                                                        className={`p-1 rounded ${sort.order === 'desc'
                                                                ? 'bg-blue-200 text-blue-800'
                                                                : 'text-gray-500 hover:bg-blue-100'
                                                            }`}
                                                        title="Descending"
                                                    >
                                                        <SortDesc size={14} />
                                                    </button>

                                                    <button
                                                        onClick={() =>
                                                            removeSortCriteria(sort.column)
                                                        }
                                                        className="p-1 text-blue-600 hover:text-blue-800"
                                                        title="Remove"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}


                                        <div className="border-t border-gray-200 my-3"></div>
                                    </div>
                                )}

                                {/* ================= ADD SORT ================= */}
                                <div className="text-xs font-medium text-gray-700 mb-2">
                                    Add sort
                                </div>

                                <div className="space-y-2">
                                    {/* Field dropdown */}
                                    <select
                                        id="sort-field"
                                        className="w-full p-2 border border-gray-300 rounded text-sm"
                                    >
                                        <option value="">Select field…</option>
                                        {Object.entries(fieldMappings).map(
                                            ([key, label]) => (
                                                <option key={key} value={key}>
                                                    {label}
                                                </option>
                                            )
                                        )}
                                    </select>

                                    {/* Order selector */}
                                    <select
                                        id="sort-order"
                                        className="w-full p-2 border border-gray-300 rounded text-sm"
                                        defaultValue="asc"
                                    >
                                        <option value="asc">A → Z</option>
                                        <option value="desc">Z → A</option>
                                    </select>

                                    {/* Add button */}
                                    <button
                                        onClick={() => {
                                            if (sortCriteria.length >= 3) return;

                                            const field = (
                                                document.getElementById('sort-field') as HTMLSelectElement
                                            )?.value;

                                            const order = (
                                                document.getElementById('sort-order') as HTMLSelectElement
                                            )?.value as 'asc' | 'desc';

                                            if (field) {
                                                addSortCriteria(field, order);
                                                (document.getElementById('sort-field') as HTMLSelectElement).value = '';
                                                (document.getElementById('sort-order') as HTMLSelectElement).value = 'asc';
                                            }
                                        }}
                                        disabled={sortCriteria.length >= 3}
                                        className={`
        w-full px-3 py-2 text-sm rounded transition-colors
        ${sortCriteria.length >= 3
                                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                                : 'bg-primary text-white hover:bg-primary/90'}
    `}
                                        title={
                                            sortCriteria.length >= 3
                                                ? 'Maximum of 3 sort fields allowed'
                                                : 'Add sort'
                                        }
                                    >
                                        Add sort
                                    </button>

                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )
        };

        if (config.sortButtonAlign === 'left') {
            leftAlignedButtons.push(sortButton);
        } else {
            rightAlignedButtons.push(sortButton);
        }
    }


    // Filter
    if (config.enableFilter) {
        const filterButton = {
            key: 'filter',
            component: (
                <div className="relative">
                    <button
                        className="flex items-center justify-center px-3 py-2 text-gray-500 hover:text-primary border border-gray-300 rounded-md hover:bg-gray-50 h-10"
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowFilterDropdown(!showFilterDropdown);
                        }}
                    >
                        {getButtonContent(
                            <Filter size={16} />,
                            'Filter',
                            config.filterButtonType || 'icon'
                        )}
                    </button>

                    {showFilterDropdown && (
                        <div
                            className={`
                            absolute top-full mt-1 bg-white border border-gray-200
                            rounded-lg shadow-lg z-50 min-w-80
                            ${config.filterButtonAlign === 'left' ? 'left-0' : 'right-0'}
                        `}
                            /* 🔑 CRITICAL FIX */
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-3">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                        Filter
                                    </div>

                                    {filterCriteria.length > 0 && (
                                        <button
                                            onClick={clearFilters}
                                            className="
                px-2 py-1 text-xs
                bg-white border border-gray-300
                text-gray-600 rounded
                hover:bg-gray-50 hover:border-gray-400
                transition-colors
            "
                                            title="Clear all filters"
                                        >
                                            Clear all
                                        </button>
                                    )}
                                </div>


                                {/* ================= ACTIVE FILTERS ================= */}
                                {filterCriteria.length > 0 && (
                                    <div className="mb-3">
                                        <div className="text-xs font-medium text-gray-700 mb-2">
                                            Active filters
                                        </div>

                                        {filterCriteria.map((filter, index) => (
                                            <div
                                                key={index}
                                                className="flex items-center justify-between mb-2 p-2 bg-blue-50 rounded"
                                            >
                                                <span className="text-sm text-blue-700">
                                                    {fieldMappings[filter.column]} {filter.operator} "{filter.value}"
                                                </span>

                                                <button
                                                    onClick={() => removeFilterCriteria(index)}
                                                    className="text-blue-500 hover:text-blue-700"
                                                    title="Remove filter"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ))}


                                        <div className="border-t border-gray-200 my-3"></div>
                                    </div>
                                )}

                                {/* ================= ADD FILTER ================= */}
                                <div className="text-xs font-medium text-gray-700 mb-2">
                                    Add filter
                                </div>

                                <div className="space-y-2">
                                    <select
                                        id="filter-field"
                                        className="w-full p-2 border border-gray-300 rounded text-sm"
                                    >
                                        <option value="">Select field…</option>
                                        {Object.entries(fieldMappings).map(([key, label]) => (
                                            <option key={key} value={key}>
                                                {label}
                                            </option>
                                        ))}
                                    </select>

                                    <select
                                        id="filter-operator"
                                        className="w-full p-2 border border-gray-300 rounded text-sm"
                                        defaultValue="contains"
                                    >
                                        <option value="contains">Contains</option>
                                        <option value="equals">Equals</option>
                                        <option value="startsWith">Starts with</option>
                                        <option value="endsWith">Ends with</option>
                                        <option value="notEquals">Not equals</option>
                                        <option value="greaterThan">Greater than</option>
                                        <option value="lessThan">Less than</option>
                                    </select>

                                    <input
                                        id="filter-value"
                                        type="text"
                                        placeholder="Filter value…"
                                        className="w-full p-2 border border-gray-300 rounded text-sm"
                                    />

                                    <button
                                        onClick={() => {
                                            const field = (
                                                document.getElementById('filter-field') as HTMLSelectElement
                                            )?.value;

                                            const operator = (
                                                document.getElementById('filter-operator') as HTMLSelectElement
                                            )?.value as FilterCriteria['operator'];

                                            const value = (
                                                document.getElementById('filter-value') as HTMLInputElement
                                            )?.value;

                                            if (field && value) {
                                                addFilterCriteria(field, operator, value);
                                                (document.getElementById('filter-field') as HTMLSelectElement).value = '';
                                                (document.getElementById('filter-value') as HTMLInputElement).value = '';
                                            }
                                        }}
                                        className="w-full px-3 py-2 bg-primary text-white rounded text-sm hover:bg-primary/90"
                                    >
                                        Add filter
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )
        };

        if (config.filterButtonAlign === 'left') {
            leftAlignedButtons.push(filterButton);
        } else {
            rightAlignedButtons.push(filterButton);
        }
    }


    // Group Button
    if (config.enableGroup) {
        const groupButton = {
            key: 'group',
            component: (
                <div className="relative">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowGroupDropdown(prev => !prev);
                        }}
                        className="flex items-center justify-center px-3 py-2
               text-gray-500 hover:text-primary
               border border-gray-300 rounded-md
               hover:bg-gray-50 h-10"
                    >
                        {getButtonContent(
                            <Group size={16} />,
                            'Group',
                            config.groupButtonType || 'icon'
                        )}
                    </button>

                    {showGroupDropdown && (
                        <div
                            className={`
                            absolute top-full mt-1 bg-white border border-gray-200
                            rounded-lg shadow-lg z-50 min-w-72
                            ${config.groupButtonAlign === 'left' ? 'left-0' : 'right-0'}
                        `}
                            /* 🔑 SAME FIX AS SORT & FILTER */
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-3">
                                {/* ===== Header ===== */}
                                <div className="flex items-center justify-between mb-3">
                                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                        Group
                                    </div>

                                    {groupByColumn && (
                                        <button
                                            onClick={() => setGroupByColumn(null)}
                                            className="
                                            px-2 py-1 text-xs
                                            bg-white border border-gray-300
                                            text-gray-600 rounded
                                            hover:bg-gray-50 hover:border-gray-400
                                        "
                                            title="Clear grouping"
                                        >
                                            Clear
                                        </button>
                                    )}
                                </div>

                                {/* ===== Active Group ===== */}
                                {groupByColumn && (
                                    <div className="mb-3">
                                        <div className="text-xs font-medium text-gray-700 mb-2">
                                            Active group
                                        </div>

                                        <div className="flex items-center justify-between p-2 bg-purple-50 rounded">
                                            <span className="text-sm text-purple-700">
                                                {fieldMappings[groupByColumn]}
                                            </span>

                                            <button
                                                onClick={() => setGroupByColumn(null)}
                                                className="text-purple-600 hover:text-purple-800"
                                                title="Remove grouping"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>

                                        <div className="border-t border-gray-200 my-3"></div>
                                    </div>
                                )}

                                {/* ===== Add Group ===== */}
                                <div className="text-xs font-medium text-gray-700 mb-2">
                                    Add group
                                </div>

                                <div className="space-y-2">
                                    <select
                                        id="group-field"
                                        className="w-full p-2 border border-gray-300 rounded text-sm"
                                        defaultValue=""
                                    >
                                        <option value="">Select field…</option>
                                        {Object.entries(fieldMappings).map(([key, label]) => (
                                            <option key={key} value={key}>
                                                {label}
                                            </option>
                                        ))}
                                    </select>

                                    <button
                                        disabled={!!groupByColumn}
                                        onClick={() => {
                                            if (groupByColumn) return;

                                            const field = (
                                                document.getElementById('group-field') as HTMLSelectElement
                                            )?.value;

                                            if (field) {
                                                setGroupByColumn(field);
                                                (document.getElementById('group-field') as HTMLSelectElement).value = '';
                                            }
                                        }}
                                        className={`
                                        w-full px-3 py-2 text-sm rounded
                                        ${groupByColumn
                                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                                : 'bg-primary text-white hover:bg-primary/90'}
                                    `}
                                    >
                                        Add group
                                    </button>

                                    {groupByColumn && (
                                        <div className="text-xs text-gray-500">
                                            Only one group can be applied at a time.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )
        };

        if (config.groupButtonAlign === 'left') {
            leftAlignedButtons.push(groupButton);
        } else {
            rightAlignedButtons.push(groupButton);
        }
    }



    // Column Visibility function (Sort / Filter / Group style)
    if (config.enableColumnVisibility) {
        const columnButton = {
            key: 'columns',
            component: (
                <div className="relative">
                    {/* Button */}
                    <button
                        className="flex items-center justify-center px-3 py-2
                               text-gray-500 hover:text-primary
                               border border-gray-300 rounded-md
                               hover:bg-gray-50 h-10"
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowColumnDropdown(prev => !prev);
                        }}
                    >
                        {getButtonContent(
                            <Eye size={16} />,
                            'Columns',
                            config.columnVisibilityButtonType || 'icon'
                        )}
                    </button>

                    {/* Dropdown */}
                    {showColumnDropdown && (
                        <div
                            className={`absolute top-full mt-1 bg-white
                                    border border-gray-200 rounded-lg
                                    shadow-lg z-50 min-w-72
                                    ${config.columnVisibilityButtonAlign === 'left'
                                    ? 'left-0'
                                    : 'right-0'}`}
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-3">

                                {/* Header */}
                                <div className="flex items-center justify-between mb-3">
                                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                        Columns
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                loadAllColumns();
                                            }}
                                            className="px-2 py-1 text-xs
                   bg-white border border-gray-300
                   text-gray-600 rounded
                   hover:bg-gray-50 hover:border-gray-400"
                                        >
                                            Load All
                                        </button>

                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                loadPreferredColumns();
                                            }}
                                            className="px-2 py-1 text-xs
                   bg-white border border-gray-300
                   text-gray-600 rounded
                   hover:bg-gray-50 hover:border-gray-400"
                                        >
                                            Preferred
                                        </button>

                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                resetColumns();
                                            }}
                                            className="px-2 py-1 text-xs
                   bg-white border border-gray-300
                   text-gray-600 rounded
                   hover:bg-gray-50 hover:border-gray-400"
                                        >
                                            Reset
                                        </button>
                                    </div>
                                </div>


                                {/* Active columns in view */}
                                <div className="mb-3">
                                    <div className="text-xs font-medium text-gray-700 mb-2">
                                        Active columns in view
                                    </div>

                                    <div className="max-h-40 overflow-y-auto space-y-1">
                                        {activeColumns.map((key, index)=> {
                                            const isOnlyOne = activeColumns.length === 1;
                                            const isVisible = visibleColumns.includes(key, index)
                                                &&
                                                visibleColumns.includes(key, index);

                                            

                                            return (
                                                <div
                                                    key={key}
                                                    className="flex items-center justify-between
                                                           p-2 bg-blue-50 rounded"
                                                >
                                                    <span className="text-sm text-blue-700">
                                                        {fieldMappings[key] ?? key}
                                                    </span>

                                                    <div className="flex items-center gap-2">
                                                        {/* Eye toggle */}
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                toggleColumnVisibility(key);
                                                            }}
                                                            disabled={isOnlyOne && isVisible}
                                                            className={`${isOnlyOne && isVisible
                                                                    ? 'text-gray-300 cursor-not-allowed'
                                                                    : 'text-blue-600 hover:text-blue-800'
                                                                }`}
                                                            title="Show / Hide column"
                                                        >
                                                            {isVisible
                                                                ? <Eye size={14} />
                                                                : <EyeOff size={14} />}
                                                        </button>

                                                        {/* Close */}
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                removeColumn(key);
                                                            }}
                                                            disabled={isOnlyOne}
                                                            className={`${isOnlyOne
                                                                    ? 'text-gray-300 cursor-not-allowed'
                                                                    : 'text-blue-600 hover:text-blue-800'
                                                                }`}
                                                            title="Remove column"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                moveActiveColumn(key, 'up');
                                                            }}
                                                            disabled={index === 0}
                                                            className="text-gray-500 hover:text-primary disabled:text-gray-300"
                                                            title="Move up"
                                                        >
                                                            <ChevronUp size={14} />
                                                        </button>

                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                moveActiveColumn(key, 'down');
                                                            }}
                                                            disabled={index === activeColumns.length - 1}
                                                            className="text-gray-500 hover:text-primary disabled:text-gray-300"
                                                            title="Move down"
                                                        >
                                                            <ChevronDown size={14} />
                                                        </button>

                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="border-t border-gray-200 my-3"></div>
                                </div>

                                {/* Add column */}
                                <div className="text-xs font-medium text-gray-700 mb-2">
                                    Add column
                                </div>

                                <select
                                    id="add-column-select"
                                    className="w-full p-2 border border-gray-300
                                           rounded text-sm mb-2"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <option value="">Select column…</option>
                                    {allColumns
                                        .filter(col => !activeColumns.includes(col))
                                        .map(col => (
                                            <option key={col} value={col}>
                                                {fieldMappings[col] ?? col}
                                            </option>
                                        ))}
                                </select>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const el = document.getElementById(
                                            'add-column-select'
                                        ) as HTMLSelectElement;

                                        if (el?.value) {
                                            addColumn(el.value);
                                            el.value = '';
                                        }
                                    }}
                                    className="w-full px-3 py-2 bg-primary
                                           text-white rounded text-sm
                                           hover:bg-primary/90"
                                >
                                    Add Column
                                </button>

                            </div>
                        </div>
                    )}
                </div>
            )
        };

        if (config.columnVisibilityButtonAlign === 'left') {
            leftAlignedButtons.push(columnButton);
        } else {
            rightAlignedButtons.push(columnButton);
        }
    }

    // ===============================
    //   FreezePane start
    // ===============================
    if (config.enableFreezePane) {
        const freezePaneButton = {
            key: 'freezePane',
            component: (
                <div className="relative">
                    {/* Button */}
                    <button
                        className="flex items-center justify-center px-3 py-2
                           text-gray-500 hover:text-primary
                           border border-gray-300 rounded-md
                           hover:bg-gray-50 h-10"
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowFreezePaneDropdown(prev => !prev);
                        }}
                    >
                        {getButtonContent(
                            <PanelsTopLeft size={16} />,
                            'Freeze',
                            config.freezePaneType || 'icon'
                        )}
                    </button>

                    {/* Dropdown */}
                    {showFreezePaneDropdown && (
                        <div
                            className={`absolute top-full mt-1 bg-white
                                border border-gray-200 rounded-lg
                                shadow-lg z-50 min-w-64
                                ${config.freezePaneAlign === 'left'
                                    ? 'left-0'
                                    : 'right-0'}`}
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-3 space-y-3">

                                {/* Header */}
                                <div className="flex items-center justify-between">
                                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                        Freeze Pane
                                    </div>

                                    {/* Clear All */}
                                    <button
                                        onClick={() => {
                                            console.log('[FreezePane] Clear All');
                                            onConfigChange({
                                                ...config,
                                                enableFreezePaneRowHeader: false,
                                                enablefreezePaneColumnIndex: false,
                                            });
                                        }}
                                        className="text-xs px-2 py-1
                                        border border-gray-300 rounded
                                        text-gray-600 hover:bg-gray-50"
                                    >
                                        Clear All
                                    </button>
                                </div>

                                <div className="border-t border-gray-200" />

                                {/* Freeze Header */}
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-700">
                                        Freeze Header
                                    </span>
                                    <ToggleSwitch
                                        checked={config.enableFreezePaneRowHeader}
                                        onChange={(value) => {
                                            console.log('[FreezePane] Header →', value);
                                            onConfigChange({
                                                ...config,
                                                enableFreezePaneRowHeader: value,
                                            });
                                        }}
                                    />
                                </div>

                                {/* Freeze First Column */}
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-700">
                                        Freeze First Column
                                    </span>
                                    <ToggleSwitch
                                        checked={config.enablefreezePaneColumnIndex}
                                        onChange={(value) => {
                                            console.log('[FreezePane] Column →', value);
                                            onConfigChange({
                                                ...config,
                                                enablefreezePaneColumnIndex: value,
                                            });
                                        }}
                                    />
                                </div>

                            </div>
                        </div>
                    )}
                </div>
            ),
        };

        // ✅  FreezePane start Alignment (same as Column Visibility)
        if (config.freezePaneAlign === 'left') {
            leftAlignedButtons.push(freezePaneButton);
        } else {
            rightAlignedButtons.push(freezePaneButton);
        }
    }


    // Refresh
    if (config.enableRefresh) {
        const refreshButton = {
            key: 'refresh',
            component: (
                <button
                    onClick={handleRefresh}
                    className="flex items-center justify-center px-3 py-2 text-gray-500 hover:text-primary border border-gray-300 rounded-md hover:bg-gray-50 h-10"
                >
                    {getButtonContent(<RefreshCw size={16} />, 'Refresh', config.refreshButtonType || 'icon')}
                </button>
            )
        };

        if (config.refreshButtonAlign === 'left') {
            leftAlignedButtons.push(refreshButton);
        } else {
            rightAlignedButtons.push(refreshButton);
        }
    }

    // Export
    if (config.enableExport) {
        const exportButton = {
            key: 'export',
            component: (
                <button className="flex items-center justify-center px-3 py-2 text-gray-500 hover:text-primary border border-gray-300 rounded-md hover:bg-gray-50 h-10">
                    {getButtonContent(<Download size={16} />, 'Export', config.exportButtonType || 'icon')}
                </button>
            )
        };

        if (config.exportButtonAlign === 'left') {
            leftAlignedButtons.push(exportButton);
        } else {
            rightAlignedButtons.push(exportButton);
        }
    }

    // Import
    if (config.enableImport) {
        const importButton = {
            key: 'import',
            component: (
                <button className="flex items-center justify-center px-3 py-2 text-gray-500 hover:text-primary border border-gray-300 rounded-md hover:bg-gray-50 h-10">
                    {getButtonContent(<Upload size={16} />, 'Import', config.importButtonType || 'icon')}
                </button>
            )
        };

        if (config.importButtonAlign === 'left') {
            leftAlignedButtons.push(importButton);
        } else {
            rightAlignedButtons.push(importButton);
        }
    }

    // Table View Button
    const tableViewButton = {
        key: 'tableView',
        component: (
            <div className="relative">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowTableViewDropdown(!showTableViewDropdown);
                    }}
                    className="flex items-center justify-center px-3 py-2 text-gray-500 hover:text-primary border border-gray-300 rounded-md hover:bg-gray-50 h-10"
                >
                    {getButtonContent(<Grid3X3 size={16} />, 'View', config.tableViewButtonType || 'icon')}
                </button>

                {showTableViewDropdown && (
                    <div className={`absolute top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-32 ${config.tableViewButtonAlign === 'left' ? 'left-0' : 'right-0'
                        }`}>
                        {['default', 'compact', 'comfortable', 'spacious'].map((view) => (
                            <button
                                key={view}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onConfigChange({ ...config, tableView: view as any });
                                    setShowTableViewDropdown(false);
                                }}
                                className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-50 capitalize ${config.tableView === view ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                                    }`}
                            >
                                {view}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        )
    };

    if (config.tableViewButtonAlign === 'left') {
        leftAlignedButtons.push(tableViewButton);
    } else {
        rightAlignedButtons.push(tableViewButton);
    }

    // Preset Selector (only when Table Panel is enabled)
    if (config.enableTablePanel && config.enablePresetSelector) {
        const presetButton = {
            key: 'preset',
            component: (
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowPresetDropdown(!showPresetDropdown);
                        }}
                        className="flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 h-10"
                    >
                        {getButtonContent(<Bookmark size={16} />, 'Presets', config.presetButtonType || 'icon')}
                        <ChevronDown size={14} className="ml-1" />
                    </button>

                    {showPresetDropdown && (
                        <div className={`absolute top-full mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50 ${config.presetButtonAlign === 'left' ? 'left-0' : 'right-0'
                            }`}>
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
            )
        };

        if (config.presetButtonAlign === 'left') {
            leftAlignedButtons.push(presetButton);
        } else {
            rightAlignedButtons.push(presetButton);
        }
    }

    // Settings Button
    const settingsButton = {
        key: 'settings',
        component: (
            <button
                type="button"
                onClick={() => setIsTableSettingsOpen(true)}
                className="flex items-center justify-center px-3 py-2
                       text-gray-500 hover:text-primary
                       border border-gray-300 rounded-md
                       hover:bg-gray-50 h-10"
            >
                {getButtonContent(
                    <Settings size={16} />,
                    'Settings',
                    config.settingsButtonType || 'icon'
                )}
            </button>
        )
    };

    if (config.settingsButtonAlign === 'left') {
        leftAlignedButtons.push(settingsButton);
    } else {
        rightAlignedButtons.push(settingsButton);
    }


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
                    {groupRows.map((row, idx) => (
                        <tr
                            key={`${groupValue}-${idx}`}
                            className={config.enableRowHoverHighlight ? 'hover:bg-gray-100 transition-colors group' : 'group'}
                        >
                            {(config.enableRowSelection || config.enableRowNumber) && (
                                <td className={`px-4 py-2 text-sm text-gray-700 relative ${config.enableColumnDivider ? 'border-r border-gray-200' : ''
                                    } ${!config.enableRowDivider ? '!border-b-0' : ''}`}>
                                    {config.enableRowReorder && (
                                        <div
                                            draggable
                                            onDragStart={() => setDraggedColumn(key)}
                                            onDragOver={(e) => e.preventDefault()}
                                            onDrop={() => handleColumnDrop(key)}
                                            className="absolute left-1 top-1/2 transform -translate-y-1/2 cursor-move opacity-0 group-hover:opacity-100 transition-opacity">
                                            <GripVertical size={14} className="text-gray-400 cursor-grab" />
                                        </div>
                                    )}
                                    <div className="flex items-center justify-center">
                                        {config.enableRowSelection && config.enableRowNumber ? (
                                            <div className="relative">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedRows.includes(idx)}
                                                    onChange={() => toggleRowSelection(idx)}
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                                />
                                                <span className="absolute inset-0 flex items-center justify-center text-xs text-gray-500 group-hover:opacity-0 transition-opacity">
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
                            )}

                            {Object.keys(fieldMappings)
                                .filter(col => visibleColumns.includes(col))
                                .map((col, colIndex, arr) => (
                                    <td
                                        key={col}
                                        className={`px-4 py-2 text-sm text-gray-700 ${config.enableColumnDivider && colIndex < arr.length - 1 ? 'border-r border-gray-200' : ''
                                            } ${!config.enableRowDivider ? '!border-b-0' : ''}`}
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
                                ))}

                            {config.enableRowActions && (
                                <td className={`px-4 py-2 text-sm text-gray-700 ${!config.enableRowDivider ? '!border-b-0' : ''
                                    } ${config.enableColumnDivider ? 'border-l border-gray-200' : ''}`}>
                                    <div className={`flex space-x-2 ${config.showRowActionsOnHover ? 'opacity-0 group-hover:opacity-100 transition-opacity' : ''
                                        }`}>
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
                    ))}
                </React.Fragment>
            ));
        }

        return sortedData.map((row, idx) => (
            <tr
                key={idx}
                className={config.enableRowHoverHighlight ? 'hover:bg-gray-100 transition-colors group' : 'group'}
            >
                {(config.enableRowSelection || config.enableRowNumber) && (
                    <td className={`px-4 py-2 text-sm text-gray-700 relative ${config.enableColumnDivider ? 'border-r border-gray-200' : ''
                        } ${!config.enableRowDivider ? '!border-b-0' : ''}`}>
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
                                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                                    />
                                    <span className="absolute inset-0 flex items-center justify-center text-xs text-gray-500 group-hover:opacity-0 transition-opacity">
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
                )}

                {Object.keys(fieldMappings)
                    .filter(col => visibleColumns.includes(col))
                    .map((col, colIndex, arr) => (
                        <td
                            key={col}
                            className={`px-4 py-2 text-sm text-gray-700 ${config.enableColumnDivider && colIndex < arr.length - 1 ? 'border-r border-gray-200' : ''
                                } ${!config.enableRowDivider ? '!border-b-0' : ''}`}
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
                    ))}

                {config.enableRowActions && (
                    <td className={`px-4 py-2 text-sm text-gray-700 ${!config.enableRowDivider ? '!border-b-0' : ''
                        } ${config.enableColumnDivider ? 'border-l border-gray-200' : ''}`}>
                        <div className={`flex space-x-2 ${config.showRowActionsOnHover ? 'opacity-0 group-hover:opacity-100 transition-opacity' : ''
                            }`}>
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


    function applyPreset(preset: TablePreset) {
        onConfigChange(preset.config);
        setShowPresetDropdown(false);
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
                                        onClick={() => setShowSettings(true)}
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
                {/* Table Panel */}
                {config.enableTablePanel && (
                    <div className="p-4 border-b border-gray-200" style={getTablePanelStyle()}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                {leftAlignedButtons.map((button) => (
                                    <div key={button.key}>{button.component}</div>
                                ))}
                            </div>

                            <div className="flex items-center space-x-2">
                                {rightAlignedButtons.map((button) => (
                                    <div key={button.key}>{button.component}</div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="p-6 text-center text-gray-500">Loading...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className={getThemeClasses()}>
                            {config.enableHeader && (
                                <thead className="bg-gray-100">
                                    <tr>
                                        {(config.enableRowSelection || config.enableRowNumber) && (
                                            <th className={`px-4 py-2 text-sm text-gray-700 ${config.enableColumnDivider ? 'border-r border-gray-200' : ''
                                                }`}>
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
                                        )}

                                        {Object.keys(fieldMappings)
                                            .filter(col => visibleColumns.includes(col))
                                            .map((col, colIndex, arr) => (
                                                <th
                                                    key={col}
                                                    className={`px-4 py-2 text-left cursor-pointer relative group ${config.enableColumnDivider && colIndex < arr.length - 1 ? 'border-r border-gray-200' : ''
                                                        }`}
                                                    style={{ width: columnWidths[col] ? `${columnWidths[col]}px` : 'auto' }}
                                                    ref={(el) => (resizeRefs.current[col] = el)}
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
                                            ))}

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
