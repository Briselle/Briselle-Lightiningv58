import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    Search, Plus, AlertTriangle, ExternalLink, Settings, Edit, Trash2,
    Filter, Download, Upload, RefreshCw, Eye, BarChart3, Printer,
    UserCheck, Grid3X3, Bookmark, Star, ChevronDown, X, Check, Copy,
    ArrowUpDown, SortAsc, SortDesc, ChevronRight, MoreVertical, Group,
    Lock, GripVertical
} from 'lucide-react';
import TableSettingsModal from './TableSettingsModal';

export interface TableConfig {
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
    enableStickyHeader?: boolean;
    enableFreezeFirstColumn?: boolean;

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

    // Display Options
    enableWrapText?: boolean;
    enableTooltips?: boolean;
    enableStickyHeader?: boolean;
    enableRowReorder?: boolean;

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
    freezeColumnButtonType?: 'icon' | 'button';
    freezeColumnButtonAlign?: 'left' | 'right';
    freezeHeaderButtonType?: 'icon' | 'button';
    freezeHeaderButtonAlign?: 'left' | 'right';

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

    // Column Management
    visibleColumns?: string[];
    columnOrder?: string[];
}

interface TablePreset {
    id: string;
    name: string;
    config: TableConfig;
    isDefault?: boolean;
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
    const [sortCriteria, setSortCriteria] = useState<SortCriteria[]>([]);
    const [filterCriteria, setFilterCriteria] = useState<FilterCriteria[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRows, setSelectedRows] = useState<number[]>([]);
    const [showSettings, setShowSettings] = useState(false);
    const [showPresetDropdown, setShowPresetDropdown] = useState(false);
    const [showTableViewDropdown, setShowTableViewDropdown] = useState(false);
    const [showColumnDropdown, setShowColumnDropdown] = useState(false);
    const [showSortDropdown, setShowSortDropdown] = useState(false);
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);
    const [showGroupDropdown, setShowGroupDropdown] = useState(false);
    const [showSearchExpanded, setShowSearchExpanded] = useState(false);
    const [draggedRowIndex, setDraggedRowIndex] = useState<number | null>(null);
    const [draggedColumnIndex, setDraggedColumnIndex] = useState<number | null>(null);
    const [groupByColumn, setGroupByColumn] = useState<string | null>(null);
    const [presets, setPresets] = useState<TablePreset[]>([]);
    const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
    const [visibleColumns, setVisibleColumns] = useState<string[]>(Object.keys(fieldMappings));
    const [columnOrder, setColumnOrder] = useState<string[]>(Object.keys(fieldMappings));
    const resizeRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Load presets from localStorage with default presets
    useEffect(() => {
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
                    tableViewButtonAlign: 'right'
                },
                isDefault: true
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

        // Here you would implement the actual column reordering logic
        setDraggedColumnIndex(null);
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

    // Apply grouping
    const groupedData = groupByColumn
        ? sortedData.reduce((groups, row) => {
            const groupValue = row[groupByColumn]?.toString() || 'Ungrouped';
            if (!groups[groupValue]) {
                groups[groupValue] = [];
            }
            groups[groupValue].push(row);
            return groups;
        }, {} as Record<string, any[]>)
        : null;

    const applyPreset = (preset: TablePreset) => {
        onConfigChange(preset.config);
        setShowPresetDropdown(false);
    };

    const toggleColumnVisibility = (column: string) => {
        const newVisibleColumns = visibleColumns.includes(column)
            ? visibleColumns.filter(col => col !== column)
            : [...visibleColumns, column];
        setVisibleColumns(newVisibleColumns);
        onConfigChange({ ...config, visibleColumns: newVisibleColumns });
    };

    const handleRefresh = () => {
        if (onRefresh) {
            onRefresh();
        }
    };

    const getButtonContent = (icon: React.ReactNode, text: string, buttonType: 'icon' | 'button') => {
        if (buttonType === 'button') {
            return (
                <div className="flex items-center">
                    {icon}
                    <span className="ml-2">{text}</span>
                </div>
            );
        }
        return icon;
    };

    const getThemeClasses = () => {
        const baseClasses = 'data-table';
        const themeClasses = {
            default: '',
            professional: 'theme-professional',
            modern: 'theme-modern',
            minimal: 'theme-minimal'
        };

        const viewClasses = {
            default: '',
            compact: 'compact',
            comfortable: 'comfortable',
            spacious: 'spacious'
        };

        return `${baseClasses} ${themeClasses[config.theme || 'default']} ${viewClasses[config.tableView || 'default']} ${!config.enableRowHoverHighlight ? 'no-hover' : ''
            } ${config.enableStripedRows ? 'striped' : ''} ${config.enableStickyHeader ? 'sticky-header' : ''} ${config.enableFreezeFirstColumn ? 'freeze-first-column' : ''}`;
    };

    const getTitleStyle = () => {
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
    };

    const getTablePanelStyle = () => {
        if (!config.tablePanelBackground) return {};
        return {
            backgroundColor: config.tablePanelBackgroundColor || '#ffffff',
            padding: '1rem',
            borderRadius: '0.5rem'
        };
    };

    const getTableStyle = () => {
        if (!config.tableBackground) return {};
        return {
            backgroundColor: config.tableBackgroundColor || '#ffffff'
        };
    };

    // Group buttons by alignment
    const leftAlignedButtons = [];
    const rightAlignedButtons = [];

    // Search
    if (config.enableSearch) {
        const searchButton = {
            key: 'search',
            component: config.searchButtonType === 'button' ? (
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-64 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary h-10"
                    />
                    <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                </div>
            ) : (
                <div className="relative flex items-center" ref={searchRef}>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowSearchExpanded(!showSearchExpanded);
                        }}
                        className="flex items-center justify-center px-3 py-2 text-gray-500 hover:text-primary border border-gray-300 rounded-md hover:bg-gray-50 transition-all duration-200 h-10"
                        title="Search"
                    >
                        <Search size={16} />
                    </button>
                    <div className={`overflow-hidden transition-all duration-300 ease-in-out ${showSearchExpanded ? 'w-64 ml-2' : 'w-0'
                        }`}>
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-3 pr-4 py-2 border border-gray-300 rounded-md w-full focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary h-10"
                        />
                    </div>
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
                        {getButtonContent(<ArrowUpDown size={16} />, 'Sort', config.sortButtonType || 'icon')}
                    </button>

                    {showSortDropdown && (
                        <div className={`absolute top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-64 ${config.sortButtonAlign === 'left' ? 'left-0' : 'right-0'
                            }`}>
                            <div className="p-3">
                                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Sort</div>

                                {/* Active sorts */}
                                {sortCriteria.length > 0 && (
                                    <div className="mb-3">
                                        <div className="text-xs font-medium text-gray-700 mb-2">Active sorts:</div>
                                        {sortCriteria.map((sort, index) => (
                                            <div key={index} className="flex items-center justify-between mb-2 p-2 bg-blue-50 rounded">
                                                <span className="text-sm text-blue-700">
                                                    {fieldMappings[sort.column]} ({sort.order === 'asc' ? 'A → Z' : 'Z → A'})
                                                </span>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        removeSortCriteria(sort.column);
                                                    }}
                                                    className="text-blue-500 hover:text-blue-700"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ))}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                clearSort();
                                            }}
                                            className="w-full text-left px-2 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                                        >
                                            Clear all sorting
                                        </button>
                                        <div className="border-t border-gray-200 my-2"></div>
                                    </div>
                                )}

                                {/* Add new sort */}
                                <div className="text-xs font-medium text-gray-700 mb-2">Add sort:</div>
                                {Object.entries(fieldMappings).map(([key, label]) => (
                                    <div key={key} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                                        <span className="text-sm">{label}</span>
                                        <div className="flex space-x-1">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    addSortCriteria(key, 'asc');
                                                }}
                                                className={`p-1 rounded hover:bg-blue-100 ${sortCriteria.find(s => s.column === key && s.order === 'asc') ? 'bg-blue-100 text-blue-700' : 'text-gray-500'}`}
                                                title="Sort A-Z"
                                            >
                                                <SortAsc size={14} />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    addSortCriteria(key, 'desc');
                                                }}
                                                className={`p-1 rounded hover:bg-blue-100 ${sortCriteria.find(s => s.column === key && s.order === 'desc') ? 'bg-blue-100 text-blue-700' : 'text-gray-500'}`}
                                                title="Sort Z-A"
                                            >
                                                <SortDesc size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
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
                        {getButtonContent(<Filter size={16} />, 'Filter', config.filterButtonType || 'icon')}
                    </button>

                    {showFilterDropdown && (
                        <div className={`absolute top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-80 ${config.filterButtonAlign === 'left' ? 'left-0' : 'right-0'
                            }`}>
                            <div className="p-3">
                                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Filter</div>

                                {/* Active filters */}
                                {filterCriteria.length > 0 && (
                                    <div className="mb-3">
                                        <div className="text-xs font-medium text-gray-700 mb-2">Active filters:</div>
                                        {filterCriteria.map((filter, index) => (
                                            <div key={index} className="flex items-center justify-between mb-2 p-2 bg-green-50 rounded">
                                                <span className="text-sm text-green-700">
                                                    {fieldMappings[filter.column]} {filter.operator} "{filter.value}"
                                                </span>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        removeFilterCriteria(index);
                                                    }}
                                                    className="text-green-500 hover:text-green-700"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ))}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                clearFilters();
                                            }}
                                            className="w-full text-left px-2 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                                        >
                                            Clear all filters
                                        </button>
                                        <div className="border-t border-gray-200 my-2"></div>
                                    </div>
                                )}

                                {/* Add new filter */}
                                <div className="text-xs font-medium text-gray-700 mb-2">Add filter:</div>
                                <div className="space-y-2">
                                    <select
                                        id="filter-field"
                                        className="w-full p-2 border border-gray-300 rounded text-sm"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <option value="">Select field...</option>
                                        {Object.entries(fieldMappings).map(([key, label]) => (
                                            <option key={key} value={key}>{label}</option>
                                        ))}
                                    </select>
                                    <select
                                        id="filter-operator"
                                        className="w-full p-2 border border-gray-300 rounded text-sm"
                                        onClick={(e) => e.stopPropagation()}
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
                                        placeholder="Filter value..."
                                        className="w-full p-2 border border-gray-300 rounded text-sm"
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const field = (document.getElementById('filter-field') as HTMLSelectElement)?.value;
                                            const operator = (document.getElementById('filter-operator') as HTMLSelectElement)?.value as FilterCriteria['operator'];
                                            const value = (document.getElementById('filter-value') as HTMLInputElement)?.value;

                                            if (field && value) {
                                                addFilterCriteria(field, operator, value);
                                                (document.getElementById('filter-field') as HTMLSelectElement).value = '';
                                                (document.getElementById('filter-value') as HTMLInputElement).value = '';
                                            }
                                        }}
                                        className="w-full px-3 py-2 bg-primary text-white rounded text-sm hover:bg-primary/90"
                                    >
                                        Add Filter
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

    // Group
    if (config.enableGroup) {
        const groupButton = {
            key: 'group',
            component: (
                <div className="relative">
                    <button
                        className="flex items-center justify-center px-3 py-2 text-gray-500 hover:text-primary border border-gray-300 rounded-md hover:bg-gray-50 h-10"
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowGroupDropdown(!showGroupDropdown);
                        }}
                    >
                        {getButtonContent(<Group size={16} />, 'Group', config.groupButtonType || 'icon')}
                    </button>

                    {showGroupDropdown && (
                        <div className={`absolute top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-48 ${config.groupButtonAlign === 'left' ? 'left-0' : 'right-0'
                            }`}>
                            <div className="p-2">
                                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide px-2 py-1">Group by</div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setGroupByColumn(null);
                                        setShowGroupDropdown(false);
                                    }}
                                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 rounded flex items-center justify-between ${!groupByColumn ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                                        }`}
                                >
                                    No grouping
                                    {!groupByColumn && <Check size={14} className="text-blue-500" />}
                                </button>
                                {Object.entries(fieldMappings).map(([key, label]) => (
                                    <button
                                        key={key}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setGroupByColumn(key);
                                            setShowGroupDropdown(false);
                                        }}
                                        className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 rounded flex items-center justify-between ${groupByColumn === key ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                                            }`}
                                    >
                                        {label}
                                        {groupByColumn === key && <Check size={14} className="text-blue-500" />}
                                    </button>
                                ))}
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

    // Column Visibility
    if (config.enableColumnVisibility) {
        const columnButton = {
            key: 'columns',
            component: (
                <div className="relative">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowColumnDropdown(!showColumnDropdown);
                        }}
                        className="flex items-center justify-center px-3 py-2 text-gray-500 hover:text-primary border border-gray-300 rounded-md hover:bg-gray-50 h-10"
                    >
                        {getButtonContent(<Eye size={16} />, 'Columns', config.columnVisibilityButtonType || 'icon')}
                    </button>

                    {showColumnDropdown && (
                        <div className={`absolute top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-48 ${config.columnVisibilityButtonAlign === 'left' ? 'left-0' : 'right-0'
                            }`}>
                            <div className="p-2">
                                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide px-2 py-1 mb-1">Show/Hide Columns</div>
                                {Object.entries(fieldMappings).map(([key, label]) => (
                                    <label key={key} className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={visibleColumns.includes(key)}
                                            onChange={(e) => {
                                                e.stopPropagation();
                                                toggleColumnVisibility(key);
                                            }}
                                            className="mr-2"
                                        />
                                        <span className="text-sm">{label}</span>
                                    </label>
                                ))}
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

    // Freeze First Column
    const freezeColumnButton = {
        key: 'freezeColumn',
        component: (
            <button
                onClick={() => onConfigChange({ ...config, enableFreezeFirstColumn: !config.enableFreezeFirstColumn })}
                className={`flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 h-10 ${config.enableFreezeFirstColumn ? 'bg-blue-50 text-blue-700 border-blue-300' : 'text-gray-500 hover:text-primary'
                    }`}
                title="Freeze First Column"
            >
                {getButtonContent(<Lock size={16} />, 'Freeze Column', config.freezeColumnButtonType || 'icon')}
            </button>
        )
    };

    if (config.freezeColumnButtonAlign === 'left') {
        leftAlignedButtons.push(freezeColumnButton);
    } else {
        rightAlignedButtons.push(freezeColumnButton);
    }

    // Freeze Header
    const freezeHeaderButton = {
        key: 'freezeHeader',
        component: (
            <button
                onClick={() => onConfigChange({ ...config, enableStickyHeader: !config.enableStickyHeader })}
                className={`flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 h-10 ${config.enableStickyHeader ? 'bg-blue-50 text-blue-700 border-blue-300' : 'text-gray-500 hover:text-primary'
                    }`}
                title="Freeze Header"
            >
                {getButtonContent(<Lock size={16} />, 'Freeze Header', config.freezeHeaderButtonType || 'icon')}
            </button>
        )
    };

    if (config.freezeHeaderButtonAlign === 'left') {
        leftAlignedButtons.push(freezeHeaderButton);
    } else {
        rightAlignedButtons.push(freezeHeaderButton);
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
                onClick={() => setShowSettings(true)}
                className="flex items-center justify-center px-3 py-2 text-gray-500 hover:text-primary border border-gray-300 rounded-md hover:bg-gray-50 h-10"
            >
                {getButtonContent(<Settings size={16} />, 'Settings', config.settingsButtonType || 'icon')}
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

            {/* Settings Modal */}
            {showSettings && (
                <TableSettingsModal
                    config={config}
                    onConfigChange={onConfigChange}
                    onClose={() => setShowSettings(false)}
                    fieldMappings={fieldMappings}
                    presets={presets}
                    onPresetsChange={setPresets}
                />
            )}

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
        </div>
    );
}
