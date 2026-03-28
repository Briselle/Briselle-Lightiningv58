import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { cn } from '../../../../utils/helpers';
import { TabBarIcon } from '../utils/tabBarIcons';
import { normalizeTabShape, resolveTabShowUnderline } from '../utils/tabBarNormalize';

export interface TabItem {
    id: string;
    label: string;
    presetId: string;
    iconKey?: string;
    customIcon?: string;
}

export type TabBarPlacement = 'between-title-and-panel' | 'left-of-table';
export type TabMenuStyle = 'icon' | 'both' | 'label';

/** Stored values may include legacy keys; normalized at render. */
export type TabVisualStyle =
    | 'standard'
    | 'pill'
    | 'button'
    | 'segmented'
    | 'trapezoid'
    | 'trapezoid-asymmetric'
    | 'minimal'
    | 'tags'
    | 'top-rounded'
    | 'underline'
    | 'rounded';

interface TableTabPanelProps {
    enableTabs: boolean;
    tabList: TabItem[];
    tabHeight: 'small' | 'medium' | 'large';
    tabAlignment: 'left' | 'right' | 'center';
    tabLabelWidth: number;
    tabPanelBackground: string;
    tabBarPlacement: TabBarPlacement;
    tabMenuStyle: TabMenuStyle;
    tabStyle: TabVisualStyle;
    /** When false, no bottom/right accent line (all shapes). */
    tabShowUnderline?: boolean;
    tabIconSize?: number;
    tabGap: number;
    tabCustomSelection: boolean;
    tabSelectionColor: string;
    tabCustomHover: boolean;
    tabHoverColor: string;
    /** (presetId, tabId) — tabId disambiguates multiple tabs using the same preset */
    onSelectPreset: (presetId: string, tabId: string) => void;
    baseUrl?: string;
}

function hexToRgba(hex: string, alpha: number): string {
    const h = hex.replace('#', '');
    if (h.length !== 6) return `rgba(37, 99, 235, ${alpha})`;
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    if (Number.isNaN(r)) return `rgba(37, 99, 235, ${alpha})`;
    return `rgba(${r},${g},${b},${alpha})`;
}

/** URL search param — must match ConfigurableListTemplate */
export const TABLE_TAB_URL_PARAM = 'tableTab';

function tabUnderlineShadow(
    show: boolean,
    orient: 'horizontal' | 'vertical',
    active: boolean,
    tabCustomSelection: boolean,
    tabSelectionColor: string | undefined
): React.CSSProperties {
    if (!show) return {};
    const c =
        active && tabCustomSelection && tabSelectionColor
            ? tabSelectionColor
            : active
              ? '#2563eb'
              : 'transparent';
    if (orient === 'horizontal') {
        return { boxShadow: `inset 0 -2px 0 0 ${c}` };
    }
    return { boxShadow: `inset -2px 0 0 0 ${c}` };
}

const TableTabPanel: React.FC<TableTabPanelProps> = ({
    enableTabs,
    tabList,
    tabHeight,
    tabAlignment,
    tabLabelWidth,
    tabPanelBackground,
    tabBarPlacement,
    tabMenuStyle,
    tabStyle,
    tabShowUnderline: tabShowUnderlineProp,
    tabIconSize: tabIconSizeProp,
    tabGap,
    tabCustomSelection,
    tabSelectionColor,
    tabCustomHover,
    tabHoverColor,
    onSelectPreset,
}) => {
    const [searchParams] = useSearchParams();
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const currentPreset = searchParams.get('preset');
    const tableTabId = searchParams.get(TABLE_TAB_URL_PARAM);

    const shape = useMemo(() => normalizeTabShape(tabStyle), [tabStyle]);
    const showUnderline = resolveTabShowUnderline(tabShowUnderlineProp, tabStyle);

    const defaultIconSize = tabHeight === 'small' ? 16 : tabHeight === 'large' ? 22 : 18;
    const iconSize = tabIconSizeProp ?? defaultIconSize;

    const menuFontPx = useMemo(() => {
        switch (tabHeight) {
            case 'small':
                return 12;
            case 'large':
                return 15;
            default:
                return 14;
        }
    }, [tabHeight]);

    const effectiveWidth = Math.min(Math.max(tabLabelWidth || 120, 72), 320);

    const horizontalStrip = tabBarPlacement === 'between-title-and-panel';
    const verticalRail = tabBarPlacement === 'left-of-table';

    const showIcon = tabMenuStyle === 'icon' || tabMenuStyle === 'both';
    const showLabel = tabMenuStyle === 'both' || tabMenuStyle === 'label';

    /** Vertical rail: align tab stack along main axis (top / middle / bottom). */
    const verticalStackJustify =
        tabAlignment === 'right' ? 'justify-end' : tabAlignment === 'center' ? 'justify-center' : 'justify-start';

    /** Inside each tab button (horizontal strip or vertical rail): align icon+label row */
    const innerRowJustify =
        tabAlignment === 'right' ? 'justify-end' : tabAlignment === 'center' ? 'justify-center' : 'justify-start';

    if (!enableTabs || tabList.length === 0) return null;

    const isTabActive = (tab: TabItem, index: number) => {
        if (tableTabId) {
            return tab.id === tableTabId;
        }
        if (currentPreset != null && currentPreset !== '') {
            const matches = tabList.filter((t) => t.presetId === currentPreset);
            if (matches.length === 1) {
                return matches[0].id === tab.id;
            }
            if (matches.length > 1) {
                return matches[0].id === tab.id;
            }
            return false;
        }
        return index === 0;
    };

    const alignClass =
        tabAlignment === 'right' ? 'justify-end' : tabAlignment === 'center' ? 'justify-center' : 'justify-start';

    const inactiveText = 'text-gray-600';

    const getActiveColors = (active: boolean) => {
        if (!active) return {};
        if (tabCustomSelection && tabSelectionColor) {
            return {
                color: tabSelectionColor,
                borderColor: tabSelectionColor,
                backgroundColor: hexToRgba(tabSelectionColor, 0.12),
            } as React.CSSProperties;
        }
        return {};
    };

    const getHoverStyle = (tabId: string, active: boolean): React.CSSProperties => {
        if (active || !tabCustomHover || !tabHoverColor) return {};
        if (hoveredId === tabId) {
            return { backgroundColor: hexToRgba(tabHoverColor, 0.35) };
        }
        return {};
    };

    const baseButtonLayout = (orientation: 'horizontal' | 'vertical') =>
        cn(
            'flex items-center font-medium transition-colors shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1',
            showIcon && showLabel ? 'gap-2' : 'gap-0 justify-center',
            orientation === 'vertical' && innerRowJustify
        );

    const styleClasses = (active: boolean, orientation: 'horizontal' | 'vertical'): string => {
        const hoverBg = !tabCustomHover ? 'hover:bg-gray-100' : '';
        const bb = baseButtonLayout(orientation);

        switch (shape) {
            case 'pill':
                return cn(
                    bb,
                    'rounded-full px-4',
                    orientation === 'horizontal' ? 'py-2' : 'py-2.5 px-3 w-full',
                    active
                        ? tabCustomSelection
                            ? 'shadow-sm'
                            : 'bg-blue-100 text-blue-800'
                        : cn('bg-gray-100/90', inactiveText, hoverBg)
                );
            case 'button':
                return cn(
                    bb,
                    'rounded-lg border border-gray-200 px-3',
                    orientation === 'horizontal' ? 'py-2' : 'py-2.5 w-full',
                    active
                        ? tabCustomSelection
                            ? 'shadow-sm border-current'
                            : 'bg-white text-blue-700 border-blue-300 shadow-sm'
                        : cn('bg-gray-50/80', inactiveText, hoverBg)
                );
            case 'segmented':
                return cn(
                    bb,
                    'rounded-md px-3',
                    orientation === 'horizontal' ? 'py-2' : 'py-2.5 w-full',
                    active
                        ? tabCustomSelection
                            ? 'shadow-sm'
                            : 'bg-white text-blue-700 shadow-sm'
                        : cn(inactiveText, hoverBg)
                );
            case 'trapezoid':
                return cn(
                    bb,
                    'px-4 relative',
                    orientation === 'horizontal' ? 'py-2.5' : 'py-3 w-full',
                    '[transform:skewX(-8deg)]',
                    active
                        ? tabCustomSelection
                            ? ''
                            : 'bg-blue-50 text-blue-700'
                        : cn('bg-transparent', inactiveText, hoverBg)
                );
            case 'trapezoid-asymmetric':
                return cn(
                    bb,
                    'px-4 py-2.5',
                    orientation === 'horizontal' ? '' : 'w-full',
                    active
                        ? tabCustomSelection
                            ? ''
                            : 'bg-blue-50/90 text-blue-800'
                        : cn('bg-gray-50/60', inactiveText, hoverBg)
                );
            case 'tags':
                return cn(
                    bb,
                    'rounded-full border border-dashed border-gray-300 px-3',
                    orientation === 'horizontal' ? 'py-1.5' : 'py-2 w-full',
                    active
                        ? tabCustomSelection
                            ? 'bg-white'
                            : 'bg-amber-50 text-amber-900 border-amber-300'
                        : cn('bg-gray-50', inactiveText, hoverBg)
                );
            case 'top-rounded':
                return cn(
                    bb,
                    'rounded-t-lg border border-gray-200 px-4',
                    orientation === 'horizontal' ? 'py-2.5 -mb-px' : 'py-2.5 w-full rounded-l-lg rounded-tr-none',
                    active
                        ? tabCustomSelection
                            ? 'bg-white z-[1]'
                            : 'bg-white text-blue-700 border-b-white z-[1]'
                        : cn('bg-gray-50/90 border-b-transparent', inactiveText, hoverBg)
                );
            case 'minimal':
                return cn(
                    bb,
                    'px-3 rounded-none',
                    orientation === 'horizontal' ? 'py-3' : 'py-2 w-full',
                    active
                        ? tabCustomSelection
                            ? ''
                            : 'text-blue-600'
                        : cn(inactiveText, hoverBg)
                );
            case 'standard':
            default:
                return cn(
                    bb,
                    orientation === 'horizontal' ? 'px-4 py-3' : 'px-3 py-2.5 w-full',
                    active
                        ? tabCustomSelection
                            ? 'bg-blue-50/50'
                            : 'text-blue-600 bg-blue-50/40'
                        : cn(inactiveText, 'hover:text-gray-900')
                );
        }
    };

    const trapezoidUnskew = shape === 'trapezoid';

    const asymmetricInnerStyle: React.CSSProperties =
        shape === 'trapezoid-asymmetric'
            ? { clipPath: 'polygon(12% 0, 88% 0, 100% 100%, 0% 100%)' }
            : {};

    const renderInner = (tab: TabItem) => (
        <span className={cn('inline-flex items-center gap-2 w-full min-w-0', trapezoidUnskew && '[transform:skewX(8deg)]')}>
            {showIcon && <TabBarIcon iconKey={tab.iconKey} customIcon={tab.customIcon} size={iconSize} />}
            {showLabel && <span className="truncate max-w-[12rem]">{tab.label}</span>}
            {tabMenuStyle === 'icon' && <span className="sr-only">{tab.label}</span>}
        </span>
    );

    const renderTabButton = (tab: TabItem, index: number) => {
        const active = isTabActive(tab, index);
        const orient = horizontalStrip ? 'horizontal' : 'vertical';

        const customActive = getActiveColors(active);
        const hoverStyle = getHoverStyle(tab.id, active);
        const underlineStyle = tabUnderlineShadow(
            showUnderline,
            orient,
            active,
            tabCustomSelection,
            tabSelectionColor
        );

        const minW =
            showLabel && !showIcon
                ? effectiveWidth
                : showIcon && !showLabel
                  ? Math.max(effectiveWidth * 0.35, 44)
                  : Math.max(effectiveWidth, 44);
        const style: React.CSSProperties = {
            fontSize: `${menuFontPx}px`,
            minWidth: horizontalStrip ? minW : undefined,
            ...underlineStyle,
            ...customActive,
            ...hoverStyle,
        };

        return (
            <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onSelectPreset(tab.presetId, tab.id)}
                onMouseEnter={() => setHoveredId(tab.id)}
                onMouseLeave={() => setHoveredId(null)}
                className={cn(
                    styleClasses(active, orient),
                    !tabCustomSelection && active && 'text-blue-600'
                )}
                style={style}
                title={tabMenuStyle === 'icon' ? tab.label : undefined}
            >
                {shape === 'trapezoid-asymmetric' ? (
                    <span className="flex items-center justify-center w-full min-h-0" style={asymmetricInnerStyle}>
                        {renderInner(tab)}
                    </span>
                ) : (
                    renderInner(tab)
                )}
            </button>
        );
    };

    const listRowClass = cn(
        horizontalStrip ? 'flex flex-row flex-wrap' : 'flex flex-col w-full',
        horizontalStrip ? alignClass : verticalStackJustify,
        horizontalStrip && 'w-full max-w-full min-w-0'
    );
    const listRowStyle: React.CSSProperties = { gap: tabGap };

    const innerList = (
        <div className={listRowClass} style={listRowStyle}>
            {tabList.map((tab, i) => renderTabButton(tab, i))}
        </div>
    );

    if (horizontalStrip) {
        if (shape === 'segmented') {
            return (
                <div
                    className="border-b border-gray-200 overflow-x-hidden overflow-y-hidden min-w-0 w-full max-w-full"
                    style={{ backgroundColor: tabPanelBackground || '#ffffff' }}
                    role="tablist"
                    aria-label="Table presets"
                >
                    <div className="p-1.5 mx-1 mt-1 mb-0 rounded-xl bg-gray-200/70 border border-gray-300/60 w-full max-w-full min-w-0 overflow-x-hidden box-border">
                        {innerList}
                    </div>
                </div>
            );
        }

        return (
            <div
                    className="border-b border-gray-200 overflow-x-hidden overflow-y-hidden min-w-0 w-full max-w-full"
                style={{ backgroundColor: tabPanelBackground || '#ffffff' }}
                role="tablist"
                aria-label="Table presets"
            >
                {innerList}
            </div>
        );
    }

    if (verticalRail) {
        const railWidth = showLabel ? 'min-w-[13rem] max-w-[16rem]' : showIcon ? 'w-[3.25rem]' : 'min-w-[8rem]';
        return (
            <div
                className={cn('border-r border-gray-200 flex-shrink-0 self-stretch flex flex-col', railWidth)}
                style={{ backgroundColor: tabPanelBackground || '#ffffff' }}
                role="tablist"
                aria-label="Table presets"
            >
                <div className={cn('flex flex-col py-1 flex-1 min-h-0', verticalStackJustify)} style={{ gap: tabGap }}>
                    {tabList.map((tab, i) => renderTabButton(tab, i))}
                </div>
            </div>
        );
    }

    return null;
};

export default TableTabPanel;
