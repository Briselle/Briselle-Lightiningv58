import React, { useState, useRef } from 'react';
import {
    Search, Filter, SortAsc, Eye, RefreshCw, Download, Upload, Settings, 
    BarChart3, Printer, UserCheck, Grid3X3, Lock, Columns, GripVertical,
    BookmarkCheck, BetweenHorizontalStart, Group, Share
} from 'lucide-react';
import { cn } from '../../../../utils/helpers';


interface TableActionPanelProps {
    enableTablePanel: boolean;
    tablePanelBackground: boolean;
    tablePanelBackgroundColor: string;
    enableSearch: boolean;
    searchButtonType: 'icon' | 'button';
    searchButtonAlign: 'left' | 'right';
    searchTerm: string;
    onSearchChange: (value: string) => void;
    enableFilter: boolean;
    filterButtonType: 'icon' | 'button';
    filterButtonAlign: 'left' | 'right';
    enableSort: boolean;
    sortButtonType: 'icon' | 'button';
    sortButtonAlign: 'left' | 'right';
    enableColumnVisibility: boolean;
    columnVisibilityButtonType: 'icon' | 'button';
    columnVisibilityButtonAlign: 'left' | 'right';
    enableRefresh: boolean;
    refreshButtonType: 'icon' | 'button';
    refreshButtonAlign: 'left' | 'right';
    enableExport: boolean;
    exportButtonType: 'icon' | 'button';
    exportButtonAlign: 'left' | 'right';
    enableImport: boolean;
    importButtonType: 'icon' | 'button';
    importButtonAlign: 'left' | 'right';
    enablePrint: boolean;
    printButtonType: 'icon' | 'button';
    printButtonAlign: 'left' | 'right';
    enableChangeOwner: boolean;
    changeOwnerButtonType: 'icon' | 'button';
    changeOwnerButtonAlign: 'left' | 'right';
    enableChart: boolean;
    chartButtonType: 'icon' | 'button';
    chartButtonAlign: 'left' | 'right';
    enableShare: boolean;
    shareButtonType: 'icon' | 'button';
    shareButtonAlign: 'left' | 'right';
    tableViewButtonType: 'icon' | 'button';
    tableViewButtonAlign: 'left' | 'right';
    enableGroup: boolean;
    groupButtonType: 'icon' | 'button';
    groupButtonAlign: 'left' | 'right';

    enableFreezePane: boolean;
    freezePaneType: 'icon' | 'button';
    freezePaneAlign: 'left' | 'right';

    enableFreezePaneRowHeader: boolean;
    enablefreezePaneColumnIndex: boolean;

    enablePresetSelector: boolean;
    presetButtonType: 'icon' | 'button';
    presetButtonAlign: 'left' | 'right';
    settingsButtonType: 'icon' | 'button';
    settingsButtonAlign: 'left' | 'right';
    fieldMappings?: Record<string, string>;
    visibleColumns?: string[];
    onVisibleColumnsChange?: (columns: string[]) => void;
    onFilterClick: () => void;
    onSortClick: () => void;
    onColumnVisibilityClick: () => void;
    onRefreshClick: () => void;
    onExportClick: () => void;
    onImportClick: () => void;
    onPresetClick: () => void;
    onSettingsClick: () => void;
    onPrintClick: () => void;
    onChangeOwnerClick: () => void;
    onChartClick: () => void;
    onShareClick: () => void;
    onTableViewClick: () => void;
    onGroupClick: () => void;
    onFreezePaneclick: () => void;
    onConfigChange: (partial: any) => void;
    tableConfig: any;
}

const TableActionPanel: React.FC<TableActionPanelProps> = ({
    enableTablePanel,
    tablePanelBackground,
    tablePanelBackgroundColor,
    enableSearch,
    searchButtonType,
    searchButtonAlign,
    searchTerm,
    onSearchChange,
    enableFilter,
    filterButtonType,
    filterButtonAlign,
    enableSort,
    sortButtonType,
    sortButtonAlign,
    enableColumnVisibility,
    columnVisibilityButtonType,
    columnVisibilityButtonAlign,
    enableRefresh,
    refreshButtonType,
    refreshButtonAlign,
    enableExport,
    exportButtonType,
    exportButtonAlign,
    enableImport,
    importButtonType,
    importButtonAlign,
    enablePrint,
    printButtonType,
    printButtonAlign,
    enableChangeOwner,
    changeOwnerButtonType,
    changeOwnerButtonAlign,
    enableChart,
    chartButtonType,
    chartButtonAlign,
    enableShare,
    shareButtonType,
    shareButtonAlign,
    tableViewButtonType,
    tableViewButtonAlign,
    enableGroup,
    groupButtonType,
    groupButtonAlign,
    enableFreezePane,
    freezePaneType,
    freezePaneAlign,
    enableFreezePaneRowHeader,
    enablefreezePaneColumnIndex,
    onConfigChange,
    enablePresetSelector,
    presetButtonType,
    presetButtonAlign,
    settingsButtonType,
    settingsButtonAlign,
    fieldMappings = {},
    visibleColumns = [],
    onVisibleColumnsChange,
    onFilterClick,
    onSortClick,
    onColumnVisibilityClick,
    onRefreshClick,
    onExportClick,
    onImportClick,
    onPresetClick,
    onSettingsClick,
    onPrintClick,
    onChangeOwnerClick,
    onChartClick,
    onShareClick,
    onTableViewClick,
    onGroupClick,
    tableConfig,
 
}) => {
    const [searchExpanded, setSearchExpanded] = useState(false);
    const [showPresetDropdown, setShowPresetDropdown] = useState(false);
    const [showColumnDropdown, setShowColumnDropdown] = useState(false);
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);
    const [showSortDropdown, setShowSortDropdown] = useState(false);
    // Local state (if not already declared)
    const [showFreezePane, setShowFreezePane] = useState(false);

    // Freeze Pane Handler – follows Sort / Filter / Group pattern
    const onenableFreezePaneClick = () => {
        setShowFreezePane(prev => !prev);
    };

   
    const searchInputRef = useRef<HTMLInputElement>(null);

    if (!enableTablePanel) return null;

    const handleSearchToggle = () => {
        if (searchButtonType === 'icon') {
            setSearchExpanded(prev => !prev);
            if (!searchExpanded) {
                setTimeout(() => searchInputRef.current?.focus(), 0);
            }
        }
    };

    const handlePresetClick = () => {
        setShowPresetDropdown(!showPresetDropdown);
        onPresetClick();
    };

    const handleColumnVisibilityClick = () => {
        setShowColumnDropdown(!showColumnDropdown);
    };

    const handleFilterClick = () => {
        setShowFilterDropdown(!showFilterDropdown);
        onFilterClick();
    };

    const handleSortClick = () => {
        setShowSortDropdown(!showSortDropdown);
        onSortClick();
    };

    const toggleColumnVisibility = (column: string) => {
        if (onVisibleColumnsChange) {
            const newVisibleColumns = visibleColumns.includes(column)
                ? visibleColumns.filter(col => col !== column)
                : [...visibleColumns, column];
            onVisibleColumnsChange(newVisibleColumns);
        }
    };

    const getButtonClass = (type: 'icon' | 'button') =>
        cn(
            'salesforce-button h-9 flex items-center justify-center transition-all duration-200',
            type === 'icon' 
                ? 'w-9 p-2 border border-gray-300 rounded-md hover:bg-gray-50 hover:border-gray-400' 
                : 'px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 hover:border-gray-400'
        );

    const getButtonContent = (type: 'icon' | 'button', icon: React.ReactNode, label: string) => (
        <>
            {icon}
            {type === 'button' && <span className="ml-2 text-sm">{label}</span>}
        </>
    );

    const renderButton = (
        buttonConfig: { type: 'icon' | 'button'; align: 'left' | 'right' },
        icon: React.ReactNode,
        label: string,
        onClick: () => void,
        key: string,
        isVisible: boolean = true
    ) => {
        if (!isVisible) return null;

        const buttonContent = getButtonContent(buttonConfig.type, icon, label);
        const buttonClass = getButtonClass(buttonConfig.type);

        return (
            <button key={key} onClick={onClick} className={buttonClass} title={label}>
                {buttonContent}
            </button>
        );
    };

    // Build left and right button arrays
    const leftButtons: React.ReactNode[] = [];
    const rightButtons: React.ReactNode[] = [];

    // Search input (special handling)
    const renderSearchInput = () => {
        if (enableSearch) {
            if (searchButtonType === 'icon') {
                return (
                    <div className={cn("relative flex items-center border border-gray-300 rounded-md bg-white h-9", {
                        'w-64': searchExpanded,
                        'w-9': !searchExpanded,
                        'transition-all duration-300 ease-in-out': true,
                        'border-blue-500': searchExpanded
                    })}>
                        {!searchExpanded ? (
                            <button
                                onClick={handleSearchToggle}
                                className="p-2 hover:bg-gray-50 flex-shrink-0 rounded-md h-full w-full flex items-center justify-center"
                                title="Search"
                            >
                                <Search size={16} />
                            </button>
                        ) : (
                            <>
                                <Search size={16} className="ml-3 text-gray-400 flex-shrink-0" />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    placeholder="Search..."
                                    value={searchTerm}
                                    onChange={(e) => onSearchChange(e.target.value)}
                                    className="flex-grow px-2 py-2 border-0 focus:outline-none focus:ring-0 rounded-md h-full"
                                    onBlur={() => {
                                        if (searchTerm === '') setSearchExpanded(false);
                                    }}
                                />
                            </>
                        )}
                    </div>
                );
            } else {
                return (
                    <div className="relative flex-grow max-w-64">
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => onSearchChange(e.target.value)}
                            className="pl-10 h-9 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    </div>
                );
            }
        }
        return null;
    };

    // Add search to appropriate side
    const searchElement = renderSearchInput();
    if (searchElement && searchButtonAlign === 'left') {
        leftButtons.push(searchElement);
    } else if (searchElement) {
        rightButtons.push(searchElement);
    }

    // Filter button
    if (enableFilter) {
        const button = (
            <div key="filter" className="relative">
                {renderButton(
                    { type: filterButtonType, align: filterButtonAlign },
                    <Filter size={16} />,
                    'Filter',
                    handleFilterClick,
                    'filter',
                    true
                )}
                {showFilterDropdown && (
                    <div className="absolute top-full left-0 mt-1 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4">
                        <div className="text-sm font-medium text-gray-900 mb-3">Filter Records</div>
                        <div className="space-y-3">
                            <div className="flex items-center space-x-2">
                                <select className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm">
                                    <option>Select field...</option>
                                    {Object.entries(fieldMappings).map(([key, label]) => (
                                        <option key={key} value={key}>{label}</option>
                                    ))}
                                </select>
                                <select className="border border-gray-300 rounded px-2 py-1 text-sm">
                                    <option value="is">is</option>
                                    <option value="contains">contains</option>
                                    <option value="exact">exact</option>
                                </select>
                                <input type="text" placeholder="Value" className="border border-gray-300 rounded px-2 py-1 text-sm" />
                            </div>
                            <div className="flex justify-between">
                                <button className="text-blue-600 text-sm hover:text-blue-800">+ Add condition</button>
                                <button 
                                    onClick={() => setShowFilterDropdown(false)}
                                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                                >
                                    Apply
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
        if (filterButtonAlign === 'left') {
            leftButtons.push(button);
        } else {
            rightButtons.push(button);
        }
    }

    // Sort button
    if (enableSort) {
        const button = (
            <div key="sort" className="relative">
                {renderButton(
                    { type: sortButtonType, align: sortButtonAlign },
                    <SortAsc size={16} />,
                    'Sort',
                    handleSortClick,
                    'sort',
                    true
                )}
                {showSortDropdown && (
                    <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4">
                        <div className="text-sm font-medium text-gray-900 mb-3">Sort Records</div>
                        <div className="space-y-3">
                            <div className="flex items-center space-x-2">
                                <select className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm">
                                    <option>Select field...</option>
                                    {Object.entries(fieldMappings).map(([key, label]) => (
                                        <option key={key} value={key}>{label}</option>
                                    ))}
                                </select>
                                <select className="border border-gray-300 rounded px-2 py-1 text-sm">
                                    <option value="asc">A → Z</option>
                                    <option value="desc">Z → A</option>
                                </select>
                            </div>
                            <div className="flex justify-between">
                                <button className="text-blue-600 text-sm hover:text-blue-800">+ Add sort</button>
                                <button 
                                    onClick={() => setShowSortDropdown(false)}
                                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                                >
                                    Apply
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
        if (sortButtonAlign === 'left') {
            leftButtons.push(button);
        } else {
            rightButtons.push(button);
        }
    }

    // Column Visibility (Hide Fields) button
    if (enableColumnVisibility) {
        const button = (
            <div key="columnVisibility" className="relative">
                {renderButton(
                    { type: columnVisibilityButtonType, align: columnVisibilityButtonAlign },
                    <Eye size={16} />,
                    'Hide Fields',
                    handleColumnVisibilityClick,
                    'columnVisibility',
                    true
                )}
                {showColumnDropdown && (
                    <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-3">
                        <div className="text-sm font-medium text-gray-900 mb-3">Hide Fields</div>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {Object.entries(fieldMappings).map(([key, label]) => (
                                <label key={key} className="flex items-center space-x-2 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={visibleColumns.includes(key)}
                                        onChange={() => toggleColumnVisibility(key)}
                                        className="rounded border-gray-300"
                                    />
                                    <Eye size={14} className={visibleColumns.includes(key) ? 'text-blue-600' : 'text-gray-400'} />
                                    <span>{label}</span>
                                </label>
                            ))}
                        </div>
                        <button 
                            onClick={() => setShowColumnDropdown(false)}
                            className="mt-3 w-full px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                        >
                            Done
                        </button>
                    </div>
                )}
            </div>
        );
        if (columnVisibilityButtonAlign === 'left') {
            leftButtons.push(button);
        } else {
            rightButtons.push(button);
        }
    }

    // Refresh button
    if (enableRefresh) {
        const button = renderButton(
            { type: refreshButtonType, align: refreshButtonAlign },
            <RefreshCw size={16} />,
            'Refresh',
            onRefreshClick,
            'refresh',
            true
        );
        if (refreshButtonAlign === 'left') {
            leftButtons.push(button);
        } else {
            rightButtons.push(button);
        }
    }

    // Export button
    if (enableExport) {
        const button = renderButton(
            { type: exportButtonType, align: exportButtonAlign },
            <Download size={16} />,
            'Export',
            onExportClick,
            'export',
            true
        );
        if (exportButtonAlign === 'left') {
            leftButtons.push(button);
        } else {
            rightButtons.push(button);
        }
    }

    // Import button
    if (enableImport) {
        const button = renderButton(
            { type: importButtonType, align: importButtonAlign },
            <Upload size={16} />,
            'Import',
            onImportClick,
            'import',
            true
        );
        if (importButtonAlign === 'left') {
            leftButtons.push(button);
        } else {
            rightButtons.push(button);
        }
    }

    // Print button
    if (enablePrint) {
        const button = renderButton(
            { type: printButtonType, align: printButtonAlign },
            <Printer size={16} />,
            'Print',
            onPrintClick,
            'print',
            true
        );
        if (printButtonAlign === 'left') {
            leftButtons.push(button);
        } else {
            rightButtons.push(button);
        }
    }

    // Change Owner button
    if (enableChangeOwner) {
        const button = renderButton(
            { type: changeOwnerButtonType, align: changeOwnerButtonAlign },
            <UserCheck size={16} />,
            'Change Owner',
            onChangeOwnerClick,
            'changeOwner',
            true
        );
        if (changeOwnerButtonAlign === 'left') {
            leftButtons.push(button);
        } else {
            rightButtons.push(button);
        }
    }

    // Chart button
    if (enableChart) {
        const button = renderButton(
            { type: chartButtonType, align: chartButtonAlign },
            <BarChart3 size={16} />,
            'Chart',
            onChartClick,
            'chart',
            true
        );
        if (chartButtonAlign === 'left') {
            leftButtons.push(button);
        } else {
            rightButtons.push(button);
        }
    }

    // Share button
    if (enableShare) {
        const button = renderButton(
            { type: shareButtonType, align: shareButtonAlign },
            <Share size={16} />,
            'Share',
            onShareClick,
            'share',
            true
        );
        if (shareButtonAlign === 'left') {
            leftButtons.push(button);
        } else {
            rightButtons.push(button);
        }
    }

    // Table View button
    const tableViewButton = renderButton(
        { type: tableViewButtonType, align: tableViewButtonAlign },
        <BetweenHorizontalStart size={16} />,
        'View',
        onTableViewClick,
        'tableView',
        true
    );
    if (tableViewButtonAlign === 'left') {
        leftButtons.push(tableViewButton);
    } else {
        rightButtons.push(tableViewButton);
    }

    // Group button
    if (enableGroup) {
        const button = renderButton(
            { type: groupButtonType, align: groupButtonAlign },
            <Group size={16} />,
            'Group',
            onGroupClick,
            'group',
            true
        );
        if (groupButtonAlign === 'left') {
            leftButtons.push(button);
        } else {
            rightButtons.push(button);
        }
    }



    // Preset button
    if (enablePresetSelector) {
        const button = (
            <div key="preset" className="relative">
                {renderButton(
                    { type: presetButtonType, align: presetButtonAlign },
                    <BookmarkCheck size={16} />,
                    'Preset',
                    handlePresetClick,
                    'preset',
                    true
                )}
                {showPresetDropdown && (
                    <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-2">
                        <div className="text-sm font-medium text-gray-900 mb-2 px-2">Select Preset</div>
                        <div className="space-y-1">
                            <button className="w-full text-left px-2 py-1 text-sm hover:bg-gray-100 rounded">Default</button>
                            <button className="w-full text-left px-2 py-1 text-sm hover:bg-gray-100 rounded">Salesforce Classic</button>
                            <button className="w-full text-left px-2 py-1 text-sm hover:bg-gray-100 rounded">Minimal</button>
                            <button className="w-full text-left px-2 py-1 text-sm hover:bg-gray-100 rounded">Professional</button>
                        </div>
                    </div>
                )}
            </div>
        );
        if (presetButtonAlign === 'left') {
            leftButtons.push(button);
        } else {
            rightButtons.push(button);
        }
    }

    // Settings button (always enabled)
    const settingsButton = renderButton(
        { type: settingsButtonType, align: settingsButtonAlign },
        <Settings size={16} />,
        'Settings',
        onSettingsClick,
        'settings',
        true
    );
    if (settingsButtonAlign === 'left') {
        leftButtons.push(settingsButton);
    } else {
        rightButtons.push(settingsButton);
    }

    return (
        <div
            className="px-4 py-2 border-b border-gray-200 flex items-center justify-between bg-white"
            style={{ 
                backgroundColor: tablePanelBackground ? tablePanelBackgroundColor : '#ffffff',
                minHeight: '48px'
            }}
        >
            <div className="flex items-center space-x-2">
                {leftButtons}
            </div>
            
            <div className="flex items-center space-x-2">
                {rightButtons}
            </div>
        </div>
    );
};

export default TableActionPanel;