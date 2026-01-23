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
import ChartPanel from "./table-components/ChartPanel";
import TableFooter from "./table-components/TableFooter";
import { useTableData } from "./hooks/useTableData";
import { SortCriteria } from "./action-components/Action_Sort";
import { FilterCriteria } from "./action-components/Action_Filter";
import { TablePreset } from "./action-components/Action_Preset";
import { loadTableConfig, loadTablePresets } from "./utils/loadTableConfig";
import { DEFAULT_PRESETS, getDefaultPreset, loadCustomPresetsFromStorage, saveCustomPresetsToStorage } from "./utils/presets";


export interface TableConfig {
    [x: string]: any;

    // Search Function Variables
    enableSearch?: boolean;
    searchButtonType?: 'icon' | 'button';
    searchButtonAlign?: 'left' | 'right';
    searchQuery?: string;


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
    const [activePresetId, setActivePresetId] = useState<string>('default');
    const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
    const [checkboxColumnWidth, setCheckboxColumnWidth] = useState<number | null>(null);
    const [draggedRowIndex, setDraggedRowIndex] = useState<number | null>(null);
    const [draggedColumnIndex, setDraggedColumnIndex] = useState<number | null>(null);
    const [isTableSettingsOpen, setIsTableSettingsOpen] = useState(false);
    const [chartPanelOpen, setChartPanelOpen] = useState(false);
    const [columnWrapStates, setColumnWrapStates] = useState<Record<string, 'wrap' | 'clip'>>({});
    const [shareViewParams, setShareViewParams] = useState<{ isShareView: boolean; restrictCopy: boolean; panelAllowed: boolean }>({ isShareView: false, restrictCopy: false, panelAllowed: false });

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const q = new URLSearchParams(window.location.search);
        const isShare = q.has('share');
        const restrict = q.get('restrictCopy') === '1';
        const panel = q.get('panelAllowed') === '1';
        setShareViewParams({ isShareView: !!isShare, restrictCopy: restrict, panelAllowed: panel });
    }, []);

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



    // Load presets from single source of truth - only on mount
    useEffect(() => {
        // Load system presets from presets.ts
        const systemPresets = DEFAULT_PRESETS;
        
        // Load custom presets from localStorage
        const customPresets = loadCustomPresetsFromStorage();
        
        // Combine system and custom presets
        const allPresets = [...systemPresets, ...customPresets];
        setPresets(allPresets);
        
        // Apply default preset on first load if config is empty or not initialized
        const hasConfig = Object.keys(config).length > 0;
        if (!hasConfig) {
            const defaultPreset = getDefaultPreset();
            setActivePresetId(defaultPreset.id);
            onConfigChange(defaultPreset.config);
        } else {
            // If config exists, attempt to keep current active preset (fallback to default)
            const def = getDefaultPreset();
            if (!activePresetId || activePresetId === 'default') {
                setActivePresetId(def.id);
            }
        }
    }, []); // Only run on mount - presets are updated via setPresets from onPresetsChange

    // Ctrl+F search activation is now handled by Action_Search component
    // No need for this handler here since search is managed by individual action components

    const handleOpenTableSettings = () => {
        setIsTableSettingsOpen(true);
    };

    const handleCloseTableSettings = () => {
        setIsTableSettingsOpen(false);
    };
    const handleFilterClick = () => {
        console.log("Filter button clicked!");
        // Implement filter logic
    };

    const [showExportConsent, setShowExportConsent] = React.useState(false);
    const [showEmailInput, setShowEmailInput] = React.useState(false);
    const [emailAddresses, setEmailAddresses] = React.useState('');
    const [pendingExportFormat, setPendingExportFormat] = React.useState<'csv' | 'excel' | 'json' | 'connector' | 'email' | null>(null);

    const handleExportClick = (format: 'csv' | 'excel' | 'json' | 'connector' | 'email') => {
        if (format === 'email') {
            setPendingExportFormat(format);
            setShowEmailInput(true);
        } else if (format === 'connector') {
            setPendingExportFormat(format);
            setShowConnectorExportConfirm(true);
        } else {
            setPendingExportFormat(format);
            setShowExportConsent(true);
        }
    };

    const handleExportConfirm = () => {
        setShowExportConsent(false);
        if (!pendingExportFormat) return;

        // Get the table data
        const tableData = sortedData;
        const headers = columnOrder
            .filter(col => visibleColumns.includes(col))
            .map(col => fieldMappings[col] || col);

        // Export based on format
        if (pendingExportFormat === 'csv') {
            exportToCSV(tableData, headers);
        } else if (pendingExportFormat === 'excel') {
            exportToExcel(tableData, headers);
        } else if (pendingExportFormat === 'json') {
            exportToJSON(tableData, headers);
        }

        setPendingExportFormat(null);
    };

    const handleExportCancel = () => {
        setShowExportConsent(false);
        setPendingExportFormat(null);
    };

    const exportToCSV = (data: any[], headers: string[]) => {
        const csvRows = [
            headers.join(','),
            ...data.map(row => {
                return columnOrder
                    .filter(col => visibleColumns.includes(col))
                    .map(col => {
                        const value = row[col];
                        // Escape commas and quotes in CSV
                        if (value === null || value === undefined) return '';
                        const stringValue = String(value).replace(/"/g, '""');
                        return `"${stringValue}"`;
                    })
                    .join(',');
            })
        ];

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${title || 'table'}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const exportToExcel = (data: any[], headers: string[]) => {
        // Create Excel XML format (Excel 2003+ compatible)
        const escapeXml = (str: string): string => {
            if (str === null || str === undefined) return '';
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&apos;');
        };

        let xml = '<?xml version="1.0"?>\n';
        xml += '<?mso-application progid="Excel.Sheet"?>\n';
        xml += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n';
        xml += ' xmlns:o="urn:schemas-microsoft-com:office:office"\n';
        xml += ' xmlns:x="urn:schemas-microsoft-com:office:excel"\n';
        xml += ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"\n';
        xml += ' xmlns:html="http://www.w3.org/TR/REC-html40">\n';
        xml += '<Worksheet ss:Name="Sheet1">\n';
        xml += '<Table>\n';

        // Headers row
        xml += '<Row>\n';
        headers.forEach(header => {
            xml += `<Cell><Data ss:Type="String">${escapeXml(header)}</Data></Cell>\n`;
        });
        xml += '</Row>\n';

        // Data rows
        data.forEach(row => {
            xml += '<Row>\n';
            columnOrder
                .filter(col => visibleColumns.includes(col))
                .forEach(col => {
                    const value = row[col];
                    if (value === null || value === undefined) {
                        xml += '<Cell><Data ss:Type="String"></Data></Cell>\n';
                    } else if (typeof value === 'number') {
                        xml += `<Cell><Data ss:Type="Number">${value}</Data></Cell>\n`;
                    } else {
                        xml += `<Cell><Data ss:Type="String">${escapeXml(String(value))}</Data></Cell>\n`;
                    }
                });
            xml += '</Row>\n';
        });

        xml += '</Table>\n';
        xml += '</Worksheet>\n';
        xml += '</Workbook>';

        // Add BOM for UTF-8
        const bom = '\ufeff';
        const blob = new Blob([bom + xml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${title || 'table'}_${new Date().toISOString().split('T')[0]}.xls`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const exportToJSON = (data: any[], headers: string[]) => {
        // Export as JSON array with mapped data
        const jsonData = data.map(row => {
            const mappedRow: any = {};
            columnOrder
                .filter(col => visibleColumns.includes(col))
                .forEach(col => {
                    mappedRow[fieldMappings[col] || col] = row[col];
                });
            return mappedRow;
        });

        const jsonContent = JSON.stringify(jsonData, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${title || 'table'}_${new Date().toISOString().split('T')[0]}.json`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const [showConnectorExportConfirm, setShowConnectorExportConfirm] = React.useState(false);
    const [showConnectorImportConfirm, setShowConnectorImportConfirm] = React.useState(false);

    const handleConnectorExportConfirm = () => {
        // TODO: Call backend API to export to connector
        // For now, just show confirmation
        alert('Data successfully sent to connector.');
        setShowConnectorExportConfirm(false);
        setPendingExportFormat(null);
    };

    const handleConnectorExportCancel = () => {
        setShowConnectorExportConfirm(false);
        setPendingExportFormat(null);
    };

    const handleEmailExportConfirm = () => {
        if (!emailAddresses.trim()) {
            alert('Please enter at least one email address');
            return;
        }

        const emails = emailAddresses.split(',').map(e => e.trim()).filter(e => e);
        if (emails.length === 0) {
            alert('Please enter valid email addresses');
            return;
        }

        // Get the table data
        const tableData = sortedData;
        const headers = columnOrder
            .filter(col => visibleColumns.includes(col))
            .map(col => fieldMappings[col] || col);

        // TODO: Call backend API to send email
        // For now, just show success message
        alert(`Data successfully sent to: ${emails.join(', ')}`);
        
        setShowEmailInput(false);
        setEmailAddresses('');
        setPendingExportFormat(null);
    };

    const handleEmailExportCancel = () => {
        setShowEmailInput(false);
        setEmailAddresses('');
        setPendingExportFormat(null);
    };

    const [showImportConsent, setShowImportConsent] = React.useState(false);
    const [showImportMapping, setShowImportMapping] = React.useState(false);
    const [importedData, setImportedData] = React.useState<any[]>([]);
    const [importFieldMapping, setImportFieldMapping] = React.useState<Record<string, string>>({});
    const [pendingImportFormat, setPendingImportFormat] = React.useState<'csv' | 'excel' | 'connector' | null>(null);

    const handleImportClick = (format: 'csv' | 'excel' | 'connector') => {
        if (format === 'connector') {
            setPendingImportFormat(format);
            setShowConnectorImportConfirm(true);
        } else {
            setPendingImportFormat(format);
            setShowImportConsent(true);
        }
    };

    const handleConnectorImport = () => {
        // TODO: Call backend API to import from connector
        // For now, just show confirmation
        alert('Data successfully imported from connector.');
        setShowConnectorImportConfirm(false);
        setPendingImportFormat(null);
    };

    const handleConnectorImportConfirm = () => {
        handleConnectorImport();
    };

    const handleConnectorImportCancel = () => {
        setShowConnectorImportConfirm(false);
        setPendingImportFormat(null);
    };

    const handleImportConfirm = () => {
        setShowImportConsent(false);
        if (!pendingImportFormat) return;

        // Create file input based on format
        const input = document.createElement('input');
        input.type = 'file';
        
        if (pendingImportFormat === 'csv') {
            input.accept = '.csv';
        } else if (pendingImportFormat === 'excel') {
            input.accept = '.xlsx,.xls';
        }
        
        input.onchange = (e: Event) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) {
                setPendingImportFormat(null);
                return;
            }

            const reader = new FileReader();
            if (pendingImportFormat === 'csv') {
                reader.onload = (event) => {
                    const text = event.target?.result as string;
                    parseCSV(text);
                };
                reader.readAsText(file, 'UTF-8');
            } else if (pendingImportFormat === 'excel') {
                // For Excel files, read as binary and parse XML
                reader.onload = (event) => {
                    const arrayBuffer = event.target?.result as ArrayBuffer;
                    parseExcel(arrayBuffer, file.name);
                };
                reader.readAsArrayBuffer(file);
            }
        };
        input.click();
    };

    const parseExcel = (arrayBuffer: ArrayBuffer, fileName: string) => {
        // For .xls files (Excel XML format), parse as text
        // For .xlsx files, we'd need a library, but for now we'll try to parse as XML
        const fileExtension = fileName.split('.').pop()?.toLowerCase();
        
        if (fileExtension === 'xls') {
            // Excel XML format - read as UTF-8 text
            const decoder = new TextDecoder('utf-8');
            const text = decoder.decode(arrayBuffer);
            parseExcelXML(text);
        } else {
            // For .xlsx, we need a library. For now, show an error or try CSV-like parsing
            alert('Excel (.xlsx) import requires a library. Please use .xls format or convert to CSV.');
            setPendingImportFormat(null);
        }
    };

    const parseExcelXML = (xmlText: string) => {
        try {
            // Remove BOM if present
            let cleanText = xmlText;
            if (xmlText.charCodeAt(0) === 0xFEFF) {
                cleanText = xmlText.slice(1);
            }

            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(cleanText, 'text/xml');
            
            // Check for parsing errors
            const parserError = xmlDoc.querySelector('parsererror');
            if (parserError) {
                throw new Error('Failed to parse Excel XML');
            }

            const rows = xmlDoc.querySelectorAll('Row');
            if (rows.length === 0) {
                alert('No data found in Excel file');
                setPendingImportFormat(null);
                return;
            }

            // Get headers from first row
            const headerRow = rows[0];
            const headerCells = headerRow.querySelectorAll('Cell > Data');
            const headers: string[] = [];
            headerCells.forEach(cell => {
                const text = cell.textContent || '';
                // Clean up any encoding issues
                headers.push(text.trim());
            });

            if (headers.length === 0) {
                alert('No headers found in Excel file');
                setPendingImportFormat(null);
                return;
            }

            // Parse data rows
            const rowsData: any[] = [];
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                const cells = row.querySelectorAll('Cell > Data');
                const rowData: any = {};
                cells.forEach((cell, idx) => {
                    if (headers[idx]) {
                        const text = cell.textContent || '';
                        rowData[headers[idx]] = text.trim();
                    }
                });
                // Only add row if it has at least one non-empty value
                if (Object.values(rowData).some(v => v !== '')) {
                    rowsData.push(rowData);
                }
            }

            setImportedData(rowsData);
            // Initialize field mapping
            const mapping: Record<string, string> = {};
            headers.forEach(header => {
                if (header) {
                    const matchingCol = Object.keys(fieldMappings).find(
                        col => fieldMappings[col].toLowerCase() === header.toLowerCase()
                    );
                    mapping[header] = matchingCol || '';
                }
            });
            setImportFieldMapping(mapping);
            setShowImportMapping(true);
            setPendingImportFormat(null);
        } catch (error) {
            console.error('Error parsing Excel XML:', error);
            alert('Failed to parse Excel file. Please ensure it is a valid Excel XML format (.xls) file. If you have a .xlsx file, please convert it to .xls or CSV format.');
            setPendingImportFormat(null);
        }
    };

    const handleImportCancel = () => {
        setShowImportConsent(false);
        setPendingImportFormat(null);
    };

    const parseCSV = (csvText: string) => {
        const lines = csvText.split('\n').filter(line => line.trim());
        if (lines.length === 0) return;

        // Improved CSV parsing that handles quoted fields with commas
        const parseCSVLine = (line: string): string[] => {
            const result: string[] = [];
            let current = '';
            let inQuotes = false;

            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                const nextChar = line[i + 1];

                if (char === '"') {
                    if (inQuotes && nextChar === '"') {
                        current += '"';
                        i++; // Skip next quote
                    } else {
                        inQuotes = !inQuotes;
                    }
                } else if (char === ',' && !inQuotes) {
                    result.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            result.push(current.trim());
            return result;
        };

        const headers = parseCSVLine(lines[0]);
        const rows: any[] = [];

        for (let i = 1; i < lines.length; i++) {
            const values = parseCSVLine(lines[i]);
            const row: any = {};
            headers.forEach((header, idx) => {
                row[header] = values[idx] || '';
            });
            rows.push(row);
        }

        setImportedData(rows);
        // Initialize field mapping - map CSV headers to table columns
        const mapping: Record<string, string> = {};
        headers.forEach(header => {
            // Try to find matching column
            const matchingCol = Object.keys(fieldMappings).find(
                col => fieldMappings[col].toLowerCase() === header.toLowerCase()
            );
            mapping[header] = matchingCol || '';
        });
        setImportFieldMapping(mapping);
        setShowImportMapping(true);
    };

    const handleImportMappingConfirm = () => {
        // Map imported data to table structure
        const mappedData = importedData.map(row => {
            const mappedRow: any = {};
            Object.entries(importFieldMapping).forEach(([csvHeader, tableColumn]) => {
                if (tableColumn && row[csvHeader] !== undefined) {
                    mappedRow[tableColumn] = row[csvHeader];
                }
            });
            return mappedRow;
        });

        // TODO: Integrate with data source - this would typically update the parent component's data
        console.log('Imported and mapped data:', mappedData);
        alert(`Successfully imported ${mappedData.length} rows. Data mapping complete.`);
        
        setShowImportMapping(false);
        setImportedData([]);
        setImportFieldMapping({});
    };

    const handleImportMappingCancel = () => {
        setShowImportMapping(false);
        setImportedData([]);
        setImportFieldMapping({});
    };

    const [showPrintConsent, setShowPrintConsent] = React.useState(false);

    const handlePrintClick = () => {
        setShowPrintConsent(true);
    };

    const handlePrintConfirm = () => {
        setShowPrintConsent(false);
        // Use setTimeout to ensure modal is closed before printing
        setTimeout(() => {
            const printContent = document.getElementById('printable-table-content');
            if (!printContent) {
                console.error('Print content not found');
                return;
            }

            // Create a new window for printing
            const printWindow = window.open('', '_blank');
            if (!printWindow) {
                alert('Please allow pop-ups to print');
                return;
            }

            // Get all styles from the current document
            const styles = Array.from(document.styleSheets)
                .map(sheet => {
                    try {
                        return Array.from(sheet.cssRules)
                            .map(rule => rule.cssText)
                            .join('\n');
                    } catch (e) {
                        return '';
                    }
                })
                .join('\n');

            // Clone the content
            const content = printContent.cloneNode(true) as HTMLElement;
            
            // Write to print window
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Print - ${title}</title>
                    <style>
                        ${styles}
                        @media print {
                            @page {
                                margin: 0.25in;
                                size: landscape;
                            }
                            body {
                                margin: 0;
                                padding: 0;
                            }
                            .no-print {
                                display: none !important;
                            }
                            * {
                                box-sizing: border-box;
                            }
                        }
                        body {
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                            padding: 10px;
                            margin: 0;
                        }
                        #printable-table-content {
                            width: 100%;
                            overflow: visible;
                        }
                        .overflow-x-auto {
                            overflow-x: visible !important;
                        }
                        table {
                            width: 100% !important;
                            max-width: 100% !important;
                            border-collapse: collapse;
                            table-layout: auto;
                        }
                        th, td {
                            border: 1px solid #e5e7eb;
                            padding: 6px 8px;
                            text-align: left;
                            white-space: nowrap;
                            font-size: 11px;
                        }
                        th {
                            background-color: #f9fafb;
                            font-weight: 600;
                        }
                        @media print {
                            table {
                                font-size: 9px;
                            }
                            th, td {
                                padding: 4px 6px;
                            }
                        }
                    </style>
                </head>
                <body>
                    ${content.innerHTML}
                </body>
                </html>
            `);
            
            printWindow.document.close();
            
            // Trigger print after content is loaded
            printWindow.onload = () => {
                printWindow.print();
                // Close the window after printing (optional)
                // printWindow.close();
            };
        }, 100);
    };

    const handlePrintCancel = () => {
        setShowPrintConsent(false);
    };

    const handleChangeOwnerClick = () => {
        console.log("Change Owner button clicked!");
        // Implement change owner logic
    };

    const handleChartClick = () => {
        setChartPanelOpen((prev) => !prev);
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

    // Removed setDefaultPresets - now using single source from utils/presets.ts
    // This function is kept for backward compatibility but should not be used
    const setDefaultPresets = () => {
        // Use presets from single source
        const systemPresets = DEFAULT_PRESETS;
        const customPresets = loadCustomPresetsFromStorage();
        const allPresets = [...systemPresets, ...customPresets];
        setPresets(allPresets);
        localStorage.setItem('tablePresets', JSON.stringify(allPresets));
    };
    
    // OLD CODE - REMOVED - Now using presets.ts as single source
    /* const setDefaultPresets_OLD = () => {
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
                presetId: "default"
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
                },
                isDefault: false,
                presetId: 'all-icons-right'
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
                },
                isDefault: false,
                presetId: 'all-buttons-right'
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
                },
                isDefault: false,
                presetId: 'left-aligned-modern'
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
                },
                isDefault: false,
                presetId: 'compact-minimal'
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
                },
                isDefault: false,
                presetId: 'data-analyst'
            }
        ];
        setPresets(defaultPresets);
        localStorage.setItem('tablePresets', JSON.stringify(defaultPresets));
    };
    */

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
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/b5e2ab4e-549f-4252-b311-808050e81c16',{
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({
                location:'ConfigurableListTemplate.tsx:applyPreset',
                message:'Applying preset to table config',
                data:{
                    presetId:preset.id,
                    presetName:preset.name,
                    presetConfigKeys:Object.keys(preset.config||{}),
                    currentConfigKeys:Object.keys(config||{}).length
                },
                timestamp:Date.now(),
                sessionId:'debug-session',
                runId:'run1',
                hypothesisId:'D'
            })
        }).catch(()=>{});
        // #endregion
        setActivePresetId(preset.id);
        onConfigChange(preset.config);
    };

    useEffect(() => {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/b5e2ab4e-549f-4252-b311-808050e81c16',{
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({
                location:'ConfigurableListTemplate.tsx:configEffect',
                message:'Config prop changed',
                data:{
                    configKeys:Object.keys(config||{}).length,
                    sample:{
                        searchButtonType: config.searchButtonType,
                        sortButtonType: config.sortButtonType,
                        filterButtonType: config.filterButtonType,
                        exportButtonType: config.exportButtonType,
                        importButtonType: config.importButtonType,
                        theme: config.theme,
                        tableView: config.tableView
                    }
                },
                timestamp:Date.now(),
                sessionId:'debug-session',
                runId:'run1',
                hypothesisId:'E'
            })
        }).catch(()=>{});
        // #endregion
    }, [config]);



  



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
            return Object.entries(groupedData).map(([groupValue, groupRows]) => {
                const sortSignature = sortCriteria.map(s => `${s.column}-${s.order}`).join('|');
                
                return (
                <React.Fragment key={`group-${groupValue}-${groupByColumn}-${sortSignature}`}>
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
                        // Find the actual index in sortedData for proper row tracking
                        // This ensures selection and styling work correctly
                        const actualIndex = sortedData.findIndex(r => {
                            // Try to match by ID first, then by reference
                            if (r.id && row.id && r.id === row.id) return true;
                            if (r.entity_id && row.entity_id && r.entity_id === row.entity_id) return true;
                            if (r === row) return true;
                            // Fallback: compare all keys
                            return JSON.stringify(r) === JSON.stringify(row);
                        });
                        const rowIndex = actualIndex >= 0 ? actualIndex : groupRowIdx;
                        // Use a stable unique key based on row.id or entity_id
                        // CRITICAL: Use entity_id or id, NOT idx, so React can track rows across sort changes
                        // Also include a sort signature to ensure React sees this as a new render when sorting changes
                        // Include group info in key to ensure uniqueness when grouping
                        const sortSignature = sortCriteria.map(s => `${s.column}-${s.order}`).join('|');
                        const rowKey = row.entity_id || row.id || `${groupValue}-${groupRowIdx}-${JSON.stringify(row).substring(0, 50)}`;
                        // Include group info in key to prevent duplicate rendering when grouping changes
                        const stableRowKey = `${rowKey}-group-${groupValue}-${groupByColumn}-${sortSignature}`;
                        
                        return (
                        <tr
                            key={stableRowKey}
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
                                        // Show border on checkbox column when freezeIndex = 1 (only checkbox frozen) AND feature is enabled
                                        checkboxFrozen && config.enablefreezePaneColumnIndex && (config.freezePaneColumnIndexNo || 1) === 1 && 'border-r-2 border-gray-300'
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
                                    const cellValue = row[col]?.toString() || '-';
                                    
                                    return (
                                    <td
                                        key={`${stableRowKey}-${col}`}
                                        className={cn(
                                            "px-4 py-2 text-sm text-gray-700",
                                            config.enableColumnDivider && colIndex < arr.length - 1 ? 'border-r border-gray-200' : '',
                                            !config.enableRowDivider ? '!border-b-0' : '',
                                            // Border only on last frozen data column
                                            shouldShowBorder && 'border-r-2 border-gray-300 freeze-border-sticky'
                                        )}
                                        style={{
                                            width: columnWidths[col] ? `${columnWidths[col]}px` : undefined,
                                            minWidth: columnWidths[col] ? `${columnWidths[col]}px` : undefined,
                                            maxWidth: columnWidths[col] ? `${columnWidths[col]}px` : undefined,
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
                                                    defaultValue={cellValue}
                                                    className="w-full border-none bg-transparent focus:bg-white focus:border focus:border-primary focus:outline-none px-1 py-0.5 rounded"
                                                />
                                            ) : (
                                                cellValue
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
                );
            });
        }

        return sortedData.map((row, idx) => {
            // Use a stable unique key based on row.id or entity_id
            // This ensures React properly re-renders when sort order changes
            // CRITICAL: Use entity_id or id, NOT idx, so React can track rows across sort changes
            // Also include a sort signature to ensure React sees this as a new render when sorting changes
            const sortSignature = sortCriteria.map(s => `${s.column}-${s.order}`).join('|');
            const rowKey = row.entity_id || row.id || `row-${idx}-${JSON.stringify(row).substring(0, 50)}`;
            // Include sort signature in key to force React to re-render when sort changes
            // Also include "ungrouped" to ensure key is different from grouped keys
            const stableRowKey = `${rowKey}-ungrouped-${sortSignature}`;
            
            return (
            <tr
                key={stableRowKey}
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
                                    const shouldShowBorder = config.enablefreezePaneColumnIndex && freezeIndex >= 2 && colIndex === freezeIndex - 2;
                                    const rowBg = config.enableStripedRows && idx % 2 === 1 ? 'rgb(249 250 251)' : 'white';
                                    const leftOffset = isFrozen ? getFreezeLeftOffset(colIndex) : 0;
                                    const cellValue = row[col]?.toString() || '-';
                                    
                                    return (
                                    <td
                                        key={`${stableRowKey}-${col}`}
                                        className={cn(
                                            "px-4 py-2 text-sm text-gray-700",
                                            config.enableColumnDivider && colIndex < arr.length - 1 ? 'border-r border-gray-200' : '',
                                            !config.enableRowDivider ? '!border-b-0' : '',
                                            // Border only on last frozen data column
                                            shouldShowBorder && 'border-r-2 border-gray-300 freeze-border-sticky'
                                        )}
                                        style={{
                                            width: columnWidths[col] ? `${columnWidths[col]}px` : undefined,
                                            minWidth: columnWidths[col] ? `${columnWidths[col]}px` : undefined,
                                            maxWidth: columnWidths[col] ? `${columnWidths[col]}px` : undefined,
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
                                                    defaultValue={cellValue}
                                                    className="w-full border-none bg-transparent focus:bg-white focus:border focus:border-primary focus:outline-none px-1 py-0.5 rounded"
                                                />
                                            ) : (
                                                cellValue
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
            );
        });
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
            {/* Print Consent Modal */}
            {showPrintConsent && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Print Confirmation</h2>
                        <p className="text-gray-700 mb-6">
                            This action will take the data outside of the Briselle Platform limits. 
                            Are you sure you want to proceed with printing?
                        </p>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={handlePrintCancel}
                                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handlePrintConfirm}
                                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                            >
                                Proceed
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Export Consent Modal */}
            {showExportConsent && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Export Confirmation</h2>
                        <p className="text-gray-700 mb-6">
                            This action will take the data outside of the Briselle Platform limits. 
                            Are you sure you want to proceed with exporting as {pendingExportFormat?.toUpperCase()}?
                        </p>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={handleExportCancel}
                                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleExportConfirm}
                                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                            >
                                Proceed
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Email Input Modal */}
            {showEmailInput && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Send to Email</h2>
                        <p className="text-gray-700 mb-4">
                            Enter email addresses (comma-separated):
                        </p>
                        <input
                            type="text"
                            value={emailAddresses}
                            onChange={(e) => setEmailAddresses(e.target.value)}
                            placeholder="email1@example.com, email2@example.com"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary mb-6"
                            autoFocus
                        />
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={handleEmailExportCancel}
                                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleEmailExportConfirm}
                                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                            >
                                Send
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Connector Export Confirmation Modal */}
            {showConnectorExportConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Export to Connector</h2>
                        <p className="text-gray-700 mb-6">
                            This action will send the data to the connector. Are you sure you want to proceed?
                        </p>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={handleConnectorExportCancel}
                                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConnectorExportConfirm}
                                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                            >
                                Proceed
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Connector Import Confirmation Modal */}
            {showConnectorImportConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Import from Connector</h2>
                        <p className="text-gray-700 mb-6">
                            This action will import data from the connector. This may overwrite some existing data. Are you sure you want to proceed?
                        </p>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={handleConnectorImportCancel}
                                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConnectorImportConfirm}
                                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                            >
                                Proceed
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Import Consent Modal */}
            {showImportConsent && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Import Confirmation</h2>
                        <p className="text-gray-700 mb-6">
                            This action will bring data inside the Briselle Platform limits. 
                            Please ensure you have proper consent for the required data. 
                            This may overwrite some existing data. Are you sure you want to proceed with importing from {pendingImportFormat?.toUpperCase()}?
                        </p>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={handleImportCancel}
                                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleImportConfirm}
                                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                            >
                                Proceed
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Import Field Mapping Modal */}
            {showImportMapping && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 max-w-4xl w-full mx-4 max-h-[85vh] overflow-y-auto">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Map Import Fields</h2>
                        <p className="text-sm text-gray-600 mb-4">
                            Map the columns from your imported file to the table columns.
                        </p>
                        <div className="space-y-3 mb-6">
                            {Object.keys(importFieldMapping).map((csvHeader) => (
                                <div key={csvHeader} className="flex items-center space-x-4">
                                    <div className="w-1/3 text-sm font-medium text-gray-700">
                                        {csvHeader}
                                    </div>
                                    <div className="flex-1">
                                        <select
                                            value={importFieldMapping[csvHeader] || ''}
                                            onChange={(e) => {
                                                setImportFieldMapping(prev => ({
                                                    ...prev,
                                                    [csvHeader]: e.target.value
                                                }));
                                            }}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                        >
                                            <option value="">-- Select Column --</option>
                                            {Object.keys(fieldMappings).map(col => (
                                                <option key={col} value={col}>
                                                    {fieldMappings[col]}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={handleImportMappingCancel}
                                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleImportMappingConfirm}
                                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                            >
                                Import Data
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Main content: table + optional chart panel */}
            <div className={cn(chartPanelOpen && "flex flex-row")}>
            <div
                id="printable-table-content"
                data-share-scope="title-to-footer"
                className={cn(chartPanelOpen && "flex-1 min-w-0")}
                style={shareViewParams.isShareView && shareViewParams.restrictCopy ? { userSelect: 'none', WebkitUserSelect: 'none' } : undefined}
                onCopy={shareViewParams.isShareView && shareViewParams.restrictCopy ? (e) => e.preventDefault() : undefined}
                onCut={shareViewParams.isShareView && shareViewParams.restrictCopy ? (e) => e.preventDefault() : undefined}
                onKeyDown={shareViewParams.isShareView && shareViewParams.restrictCopy ? (e) => {
                    if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'x' || e.key === 's' || e.key === 'a')) e.preventDefault();
                } : undefined}
                onContextMenu={shareViewParams.isShareView && shareViewParams.restrictCopy ? (e) => e.preventDefault() : undefined}
            >
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
                {/* Table Panel - frozen in share view when panel not allowed */}
                {config.enableTablePanel && (
                    <div style={shareViewParams.isShareView && !shareViewParams.panelAllowed ? { pointerEvents: 'none', opacity: 0.85 } : undefined}>
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
                        maxColumnIndex={Math.max(1, activeColumns.length || 1)} // Max = number of active columns from columnVisibility configuration (min 1)
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
                activePresetId={activePresetId}
                        onPresetClick={handlePresetClick}
                        onPresetApply={applyPreset}
                        // Table View (legacy)
                        tableViewButtonType={config.tableViewButtonType || 'icon'}
                        tableViewButtonAlign={config.tableViewButtonAlign || 'right'}
                        currentTableView={config.tableView || 'default'}
                        onTableViewChange={handleTableViewChange}
                        // Table Layout Setup (replaces Table View in panel)
                        enableTableLayoutSetup={config.enableTableLayoutSetup ?? true}
                        tableLayoutSetupButtonType={config.tableLayoutSetupButtonType || config.tableViewButtonType || 'icon'}
                        tableLayoutSetupButtonAlign={config.tableLayoutSetupButtonAlign || config.tableViewButtonAlign || 'right'}
                        // Settings
                        settingsButtonType={config.settingsButtonType || 'icon'}
                        settingsButtonAlign={config.settingsButtonAlign || 'right'}
                        onSettingsClick={handleSettingsClick}
                        // Common
                        fieldMappings={fieldMappings}
                        config={config}
                        onConfigChange={onConfigChange}
                    />
                    </div>
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
                                                    // Show border on checkbox column when freezeIndex = 1 (only checkbox frozen) AND feature is enabled
                                                    checkboxFrozen && config.enablefreezePaneColumnIndex && (config.freezePaneColumnIndexNo || 1) === 1 && 'border-r-2 border-gray-300'
                                                )}
                                                style={{
                                                    width: checkboxColumnWidth ? `${checkboxColumnWidth}px` : undefined,
                                                    minWidth: checkboxColumnWidth ? `${checkboxColumnWidth}px` : undefined,
                                                    maxWidth: checkboxColumnWidth ? `${checkboxColumnWidth}px` : undefined,
                                                    boxSizing: 'border-box',
                                                    ...(checkboxFrozen ? {
                                                        position: 'sticky',
                                                        left: '0px',
                                                        zIndex: 26,
                                                        backgroundColor: 'rgb(249 250 251)', // bg-gray-100
                                                        boxShadow: config.enablefreezePaneColumnIndex && (config.freezePaneColumnIndexNo || 1) === 1 ? '2px 0 4px rgba(0, 0, 0, 0.1)' : 'none'
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
                                        // Only show border if feature is enabled
                                        const shouldShowBorder = config.enablefreezePaneColumnIndex && freezeIndex >= 2 && colIndex === freezeIndex - 2;
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
                                            shouldShowBorder && 'border-r-2 border-gray-300 freeze-border-sticky'
                                                    )}
                                                    style={{ 
                                                        width: columnWidths[col] ? `${columnWidths[col]}px` : undefined,
                                                        minWidth: columnWidths[col] ? `${columnWidths[col]}px` : undefined,
                                                        maxWidth: columnWidths[col] ? `${columnWidths[col]}px` : undefined,
                                                        boxSizing: 'border-box',
                                                        ...(isFrozen ? {
                                                            position: 'sticky',
                                                            left: `${leftOffset}px`,
                                                            // Higher z-index for header to ensure it stays on top, especially when row header is also sticky
                                                            zIndex: config.enableFreezePaneRowHeader ? 31 : 25,
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

                            <tbody key={`tbody-${groupByColumn ? `grouped-${groupByColumn}` : 'ungrouped'}-${sortCriteria.map(s => `${s.column}-${s.order}`).join('-')}-${sortedData.length}-${sortedData[0]?.entity_id || sortedData[0]?.id || 'empty'}`}>
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

            </div>
            {chartPanelOpen && (
                <ChartPanel
                    recordCount={sortedData.length}
                    data={sortedData}
                    dataColumns={columnOrder.filter((c) => visibleColumns.includes(c))}
                    fieldMappings={fieldMappings}
                    onClose={() => setChartPanelOpen(false)}
                />
            )}
            </div>

            {/* Bulk Actions Bar - Outside printable content so it doesn't print */}
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
                onClose={handleCloseTableSettings}
                currentConfig={config}
                presets={presets}
                onPresetsChange={setPresets}
                activePresetId={activePresetId}
                onPresetSelect={setActivePresetId}
            />

            {/* CSS for sticky freeze border */}
            <style dangerouslySetInnerHTML={{ __html: `.freeze-border-sticky { position: relative; } .freeze-border-sticky::after { content: ""; position: absolute; right: -2px; top: 0; bottom: 0; width: 2px; background-color: #d1d5db; pointer-events: none; z-index: 100; }` }} />
        </div>
    );
}

