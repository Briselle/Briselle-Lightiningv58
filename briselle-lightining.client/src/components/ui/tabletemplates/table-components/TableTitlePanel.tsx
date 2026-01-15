import React from 'react';
import { Plus, Settings } from 'lucide-react';
import { cn } from '../../../../utils/helpers';

interface TableTitlePanelProps {
    title: string;
    enableTitle: boolean;
    enableNewButton: boolean;
    newButtonType: 'icon' | 'button';
    enableTitleBackground: boolean;
    titleBackgroundColor: string;
    titleTableSpacing: number;
    enableTablePanel: boolean;
    enableRecordCount: boolean;
    enableSortInfo: boolean;
    enableFilterInfo: boolean;
    enableLastUpdated: boolean;
    recordCount?: number;
    sortInfo?: string;
    filterInfo?: string;
    lastUpdated?: string;
    onNewClick: () => void;
    onSettingsClick: () => void;
}

const TableTitlePanel: React.FC<TableTitlePanelProps> = ({
    title,
    enableTitle,
    enableNewButton,
    newButtonType,
    enableTitleBackground,
    titleBackgroundColor,
    titleTableSpacing,
    enableTablePanel,
    enableRecordCount,
    enableSortInfo,
    enableFilterInfo,
    enableLastUpdated,
    recordCount = 0,
    sortInfo = '',
    filterInfo = '',
    lastUpdated = '',
    onNewClick,
    onSettingsClick,
}) => {
    if (!enableTitle) return null;

    return (
        <div>
            <div
                className="flex justify-between items-start p-4 rounded-lg"
                style={{
                    backgroundColor: enableTitleBackground ? titleBackgroundColor : 'transparent',
                    marginBottom: `${titleTableSpacing}px`
                }}
            >
                <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                        <h1 className="text-2xl font-bold text-gray-900 mb-0">{title}</h1>
                        <div className="flex items-center space-x-3">
                            {enableNewButton && (
                                <button className="btn btn-primary" onClick={onNewClick}>
                                    {newButtonType === 'icon' ? (
                                        <Plus size={16} />
                                    ) : (
                                        <>
                                            <Plus size={16} className="mr-2" />
                                            New {title.slice(0, -1)}
                                        </>
                                    )}
                                </button>
                            )}
                            {!enableTablePanel && (
                                <button
                                    className="btn btn-secondary table-panel-button"
                                    onClick={onSettingsClick}
                                    title="Table Settings"
                                >
                                    <Settings size={16} className="mr-2" />
                                    Settings
                                </button>
                            )}
                        </div>
                    </div>
                    
                    {/* Info Row */}
                    {(enableRecordCount || enableSortInfo || enableFilterInfo || enableLastUpdated) && (
                        <div className="space-y-1">
                            {/* Row 1: Records, Sort, Filter */}
                            {(enableRecordCount || enableSortInfo || enableFilterInfo) && (
                                <div className="flex items-center space-x-4 text-sm text-gray-600">
                                    {enableRecordCount && (
                                        <span>{recordCount} records</span>
                                    )}
                                    {enableSortInfo && sortInfo && (
                                        <span>Sorted by: {sortInfo}</span>
                                    )}
                                    {enableFilterInfo && filterInfo && (
                                        <span>Filtered: {filterInfo}</span>
                                    )}
                                </div>
                            )}
                            
                            {/* Row 2: Last Updated */}
                            {enableLastUpdated && lastUpdated && (
                                <div className="text-sm text-gray-600">
                                    <span>Last updated: {lastUpdated}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TableTitlePanel;