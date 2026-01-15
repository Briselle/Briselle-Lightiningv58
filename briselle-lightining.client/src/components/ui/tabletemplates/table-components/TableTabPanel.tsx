import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../../../utils/helpers';

export interface TabItem {
    id: string;
    label: string;
    presetId: string;
}

interface TableTabPanelProps {
    enableTabs: boolean;
    tabList: TabItem[];
    tabOrientation: 'horizontal' | 'vertical';
    tabHeight: 'small' | 'medium' | 'large';
    tabAlignment: 'left' | 'right' | 'center';
    tabLabelWidth: number;
    tabPanelBackground: string;
    baseUrl: string;
}

const TableTabPanel: React.FC<TableTabPanelProps> = ({
    enableTabs,
    tabList,
    tabOrientation,
    tabHeight,
    tabAlignment,
    tabLabelWidth,
    tabPanelBackground,
    baseUrl,
}) => {
    if (!enableTabs || tabList.length === 0) return null;

    const getTabHeightClass = (height: 'small' | 'medium' | 'large') => {
        switch (height) {
            case 'small': return 'h-5 text-xs';
            case 'medium': return 'h-8 text-sm';
            case 'large': return 'h-10 text-base';
            default: return 'h-8 text-sm';
        }
    };

    const getTabAlignmentClass = (alignment: 'left' | 'right' | 'center') => {
        switch (alignment) {
            case 'left': return 'justify-start';
            case 'right': return 'justify-end';
            case 'center': return 'justify-center';
            default: return 'justify-start';
        }
    };

    const getTabOrientationClass = (orientation: 'horizontal' | 'vertical') => {
        return orientation === 'horizontal' ? 'flex-row' : 'flex-col';
    };

    const getTabItemStyle = (tab: TabItem) => {
        const style: React.CSSProperties = {};
        if (tabOrientation === 'horizontal') {
            style.width = `${tabLabelWidth}px`;
        } else {
            style.width = `${tabLabelWidth}px`;
        }
        return style;
    };

    return (
        <div
            className={cn(
                "flex mb-4",
                getTabOrientationClass(tabOrientation),
                getTabAlignmentClass(tabAlignment),
                tabOrientation === 'horizontal' ? 'border-b border-gray-200' : 'border-r border-gray-200'
            )}
            style={{ backgroundColor: tabPanelBackground }}
        >
            {tabList.map((tab) => (
                <Link
                    key={tab.id}
                    to={`${baseUrl}?preset=${tab.presetId}`}
                    className={cn(
                        "flex items-center justify-center font-medium transition-all duration-200 ease-in-out",
                        tabOrientation === 'horizontal' ? 'tab-item-horizontal' : 'tab-item-vertical',
                        getTabHeightClass(tabHeight)
                    )}
                    style={getTabItemStyle(tab)}
                >
                    {tab.label}
                </Link>
            ))}
        </div>
    );
};

export default TableTabPanel;