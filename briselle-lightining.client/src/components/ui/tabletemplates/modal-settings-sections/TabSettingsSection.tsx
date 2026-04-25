import React, { useEffect, useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight, Pencil, Info, Eye } from 'lucide-react';
import { TabItem, TabBarPlacement, TabMenuStyle } from '../table-components/TableTabPanel';
import { cn } from '../../../../utils/helpers';
import { TAB_ICON_CUSTOM_KEY, TabBarIcon, TabIconPickerSelect } from '../utils/tabBarIcons';
import { normalizeTabShape } from '../utils/tabBarNormalize';
import { TablePreset } from '../action-components/Action_Preset';
import { isProtectedDefaultTab } from '../utils/canonicalObjectLoaderDefaults';

interface TabSettingsSectionProps {
    config: {
        enableTabs: boolean;
        tabHeight: 'small' | 'medium' | 'large';
        tabAlignment: 'left' | 'right' | 'center';
        tabLabelWidth: number;
        tabCustomSelection: boolean;
        tabSelectionColor: string;
        tabCustomHover: boolean;
        tabHoverColor: string;
        tabPanelBackground: string;
        tabUseCustomPanelBackground?: boolean;
        tabList: TabItem[];
        tabBarPlacement?: TabBarPlacement;
        tabPanelMarginTop?: number;
        tabPanelSpacing?: number;
        tabMenuStyle?: TabMenuStyle;
        tabStyle?: string;
        tabShowUnderline?: boolean;
        tabIconSize?: number;
        tabGap?: number;
    };
    /** Same preset master list as the table / Preset settings (system + custom). */
    presets: TablePreset[];
    onChange: (key: string, value: any) => void;
    /** Which table tab is active (saved to DB on Save) */
    activeTableTabId?: string | null;
    onActiveTableTabChange?: (tabId: string) => void;
    /** Modal “current bookmark” — drives new-tab name/icon prefill */
    contextPresetIdForNewTab?: string;
    modalHeaderFontSize?: number;
    modalContentFontSize?: number;
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            className={cn(
                'relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1',
                checked ? 'bg-blue-600' : 'bg-gray-200'
            )}
        >
            <span
                className={cn(
                    'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow mt-0.5 transition-transform',
                    checked ? 'translate-x-4' : 'translate-x-0.5'
                )}
            />
        </button>
    );
}

function FieldLabelWithInfo({
    htmlFor,
    children,
    hint,
}: {
    htmlFor?: string;
    children: React.ReactNode;
    hint: string;
}) {
    return (
        <div className="flex items-center gap-1.5 mb-1">
            <label htmlFor={htmlFor} className="text-sm font-medium text-gray-700">
                {children}
            </label>
            <span
                className="inline-flex text-gray-400 hover:text-gray-600 cursor-help shrink-0"
                title={hint}
                role="img"
                aria-label={hint}
            >
                <Info size={14} aria-hidden />
            </span>
        </div>
    );
}

function CollapsibleSection({
    title,
    open,
    onToggle,
    children,
    fontSize,
    headerTrailing,
}: {
    title: string;
    open: boolean;
    onToggle: () => void;
    children: React.ReactNode;
    fontSize?: number;
    /** Extra controls in the header row (e.g. Reset); clicks do not toggle the section. */
    headerTrailing?: React.ReactNode;
}) {
    const headerStyle = fontSize ? { fontSize: `${fontSize}px` } : undefined;
    const chevron = open ? (
        <ChevronDown size={18} className="text-gray-500" />
    ) : (
        <ChevronRight size={18} className="text-gray-500" />
    );

    if (headerTrailing) {
        return (
            <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
                <div
                    className="w-full flex items-center gap-2 px-4 py-3 hover:bg-gray-50 transition-colors"
                    style={headerStyle}
                >
                    <button type="button" onClick={onToggle} className="flex-1 min-w-0 text-left">
                        <span className="font-medium text-gray-800">{title}</span>
                    </button>
                    <div
                        className="flex items-center gap-1 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                        role="presentation"
                    >
                        {headerTrailing}
                    </div>
                    <button
                        type="button"
                        onClick={onToggle}
                        className="shrink-0 p-0.5 rounded text-gray-500 hover:bg-gray-100"
                        aria-expanded={open}
                        aria-label={open ? 'Collapse section' : 'Expand section'}
                    >
                        {chevron}
                    </button>
                </div>
                {open && <div className="px-4 pb-3 pt-1 border-t border-gray-100">{children}</div>}
            </div>
        );
    }

    return (
        <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
            <button
                type="button"
                onClick={onToggle}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                style={headerStyle}
            >
                <span className="font-medium text-gray-800">{title}</span>
                {chevron}
            </button>
            {open && <div className="px-4 pb-3 pt-1 border-t border-gray-100">{children}</div>}
        </div>
    );
}

const TabSettingsSection: React.FC<TabSettingsSectionProps> = ({
    config,
    presets,
    onChange,
    activeTableTabId = null,
    onActiveTableTabChange,
    contextPresetIdForNewTab,
    modalHeaderFontSize = 16,
}) => {
    const [newTabLabel, setNewTabLabel] = useState('');
    const [newTabPreset, setNewTabPreset] = useState('');
    const [newTabLabelUserEdited, setNewTabLabelUserEdited] = useState(false);
    const [accordionLayoutOpen, setAccordionLayoutOpen] = useState(true);
    const [accordionStyleOpen, setAccordionStyleOpen] = useState(true);
    const [accordionBehaviorsOpen, setAccordionBehaviorsOpen] = useState(true);
    const [accordionTabListOpen, setAccordionTabListOpen] = useState(true);
    const [editingTabId, setEditingTabId] = useState<string | null>(null);
    const [editingLabel, setEditingLabel] = useState('');
    const [newTabIconKey, setNewTabIconKey] = useState('list');
    const [newTabCustomIcon, setNewTabCustomIcon] = useState('');

    useEffect(() => {
        if (presets.length === 0) return;
        if (contextPresetIdForNewTab && presets.some((p) => p.id === contextPresetIdForNewTab)) {
            setNewTabPreset(contextPresetIdForNewTab);
            return;
        }
        const def = presets.find((p) => p.isDefault) || presets[0];
        setNewTabPreset((prev) => (prev ? prev : def?.id ?? ''));
    }, [presets, contextPresetIdForNewTab]);

    useEffect(() => {
        setNewTabLabelUserEdited(false);
    }, [newTabPreset]);

    useEffect(() => {
        if (newTabLabelUserEdited) return;
        const pr = presets.find((p) => p.id === newTabPreset);
        if (!pr) return;
        setNewTabLabel(pr.name);
        const ik = pr.iconKey || 'list';
        setNewTabIconKey(ik);
        if (ik === TAB_ICON_CUSTOM_KEY && pr.customIcon) {
            setNewTabCustomIcon(pr.customIcon);
        } else {
            setNewTabCustomIcon('');
        }
    }, [newTabPreset, presets, newTabLabelUserEdited]);

    const updateTabPreset = (tabId: string, presetId: string) => {
        const tab = (config.tabList || []).find((t) => t.id === tabId);
        if (tab && isProtectedDefaultTab(tab)) {
            alert('The Default tab always uses the Default bookmark and cannot be relinked.');
            return;
        }
        const list = (config.tabList || []).map((t) => (t.id === tabId ? { ...t, presetId } : t));
        onChange('tabList', list);
    };

    const handleAddTab = () => {
        if (newTabLabel && newTabPreset) {
            const newTab: TabItem = {
                id: `tab-${Date.now()}`,
                label: newTabLabel,
                presetId: newTabPreset,
                iconKey: newTabIconKey,
                ...(newTabIconKey === TAB_ICON_CUSTOM_KEY && newTabCustomIcon.trim()
                    ? { customIcon: newTabCustomIcon.trim() }
                    : {}),
            };
            onChange('tabList', [...(config.tabList || []), newTab]);
            setNewTabLabel('');
            setNewTabPreset('');
            setNewTabCustomIcon('');
            setNewTabLabelUserEdited(false);
        }
    };

    const updateTabIcons = (tabId: string, iconKey: string, customIcon: string) => {
        const target = (config.tabList || []).find((t) => t.id === tabId);
        if (target && isProtectedDefaultTab(target)) return;
        const list = (config.tabList || []).map((t) =>
            t.id === tabId
                ? {
                      ...t,
                      iconKey,
                      customIcon:
                          iconKey === TAB_ICON_CUSTOM_KEY && customIcon.trim()
                              ? customIcon.trim()
                              : undefined,
                  }
                : t
        );
        onChange('tabList', list);
    };

    const tabBarPlacementValue =
        config.tabBarPlacement === 'left-of-table' ? 'left-of-table' : 'between-title-and-panel';

    const handleDeleteTab = (id: string) => {
        const list = config.tabList || [];
        const tab = list.find((t) => t.id === id);
        if (tab && isProtectedDefaultTab(tab)) {
            alert('The Default tab cannot be removed.');
            return;
        }
        if (list.length <= 1) return;
        if (window.confirm('Are you sure you want to remove this tab?')) {
            onChange('tabList', list.filter((t) => t.id !== id));
        }
    };

    const startRename = (tab: TabItem) => {
        if (isProtectedDefaultTab(tab)) {
            alert('The Default tab label is protected and is always restored from the platform default on save.');
            return;
        }
        setEditingTabId(tab.id);
        setEditingLabel(tab.label);
    };

    const saveRename = () => {
        if (editingTabId == null || !editingLabel.trim()) {
            setEditingTabId(null);
            return;
        }
        const current = (config.tabList || []).find((t) => t.id === editingTabId);
        if (current && isProtectedDefaultTab(current)) {
            setEditingTabId(null);
            return;
        }
        const list = (config.tabList || []).map((t) =>
            t.id === editingTabId ? { ...t, label: editingLabel.trim() } : t
        );
        onChange('tabList', list);
        setEditingTabId(null);
        setEditingLabel('');
    };

    const tableRowClass = 'grid grid-cols-[minmax(160px,1fr)_auto] gap-x-3 py-1.5 items-center';
    const shapeValue = normalizeTabShape(config.tabStyle ?? 'standard');

    const resetTabColors = () => {
        onChange('tabUseCustomPanelBackground', true);
        onChange('tabPanelBackground', '#ffffff');
        onChange('tabCustomSelection', false);
        onChange('tabSelectionColor', '#2563eb');
        onChange('tabCustomHover', false);
        onChange('tabHoverColor', '#e5e7eb');
    };

    /** ON = painted strip (default white); OFF = transparent strip (no fill). */
    const useCustomPanelBg = config.tabUseCustomPanelBackground !== false;
    const selectionColorValue = config.tabSelectionColor?.trim() || '#2563eb';
    const hoverColorValue = config.tabHoverColor?.trim() || '#e5e7eb';
    const marginTop = config.tabPanelMarginTop ?? 0;
    const marginBelow = config.tabPanelSpacing ?? 0;
    const labelWidthSlider = Math.min(
        320,
        Math.max(72, typeof config.tabLabelWidth === 'number' && config.tabLabelWidth > 0 ? config.tabLabelWidth : 120)
    );
    /** 0 = auto; 1..17 → icon size 12..28 px */
    const iconRangeVal =
        !config.tabIconSize || config.tabIconSize < 12 ? 0 : Math.min(17, config.tabIconSize - 11);

    return (
        <div className="space-y-4">
            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2 pb-2 border-b border-gray-200">Tabs</h3>
            </div>

            <div className={tableRowClass}>
                <span className="text-sm font-medium text-gray-700">Enable Tabs</span>
                <Toggle checked={!!config.enableTabs} onChange={(v) => onChange('enableTabs', v)} />
            </div>

            {config.enableTabs && (
                <div className="space-y-3">
                    {/* #1 Tab Style */}
                    <CollapsibleSection
                        title="Tab Style"
                        open={accordionStyleOpen}
                        onToggle={() => setAccordionStyleOpen(!accordionStyleOpen)}
                        fontSize={modalHeaderFontSize}
                    >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <FieldLabelWithInfo
                                    htmlFor="tab-label-type"
                                    hint="Controls how each tab shows its icon and text on the list page."
                                >
                                    Tab Label Type
                                </FieldLabelWithInfo>
                                <select
                                    id="tab-label-type"
                                    className="input text-sm w-full"
                                    value={config.tabMenuStyle ?? 'icon'}
                                    onChange={(e) => onChange('tabMenuStyle', e.target.value)}
                                >
                                    <option value="icon">Icon Only</option>
                                    <option value="both">Icon + Label</option>
                                    <option value="label">Label Only</option>
                                </select>
                            </div>
                            <div>
                                <FieldLabelWithInfo
                                    htmlFor="tab-shape"
                                    hint="Accent line uses “Underline active tab” below; works with every shape."
                                >
                                    Tab Shape
                                </FieldLabelWithInfo>
                                <select
                                    id="tab-shape"
                                    className="input text-sm w-full"
                                    value={shapeValue}
                                    onChange={(e) => onChange('tabStyle', e.target.value)}
                                >
                                    <option value="standard">Standard</option>
                                    <option value="pill">Pill</option>
                                    <option value="button">Button</option>
                                    <option value="segmented">Segmented</option>
                                    <option value="trapezoid">Trapezoid (symmetric)</option>
                                    <option value="trapezoid-asymmetric">Trapezoid (asymmetric)</option>
                                    <option value="minimal">Minimal</option>
                                    <option value="tags">Tags</option>
                                    <option value="top-rounded">Top rounded (classic)</option>
                                </select>
                            </div>
                            <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-100">
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="text-sm font-medium text-gray-700">Underline active tab</span>
                                    <span
                                        className="inline-flex text-gray-400 hover:text-gray-600 cursor-help shrink-0"
                                        title="Bold line on the active tab (bottom when horizontal, right when vertical). Works with every tab shape."
                                        role="img"
                                        aria-label="Bold line on the active tab (bottom when horizontal, right when vertical). Works with every tab shape."
                                    >
                                        <Info size={14} aria-hidden />
                                    </span>
                                </div>
                                <Toggle
                                    checked={config.tabShowUnderline !== false}
                                    onChange={(v) => onChange('tabShowUnderline', v)}
                                />
                            </div>
                        </div>
                    </CollapsibleSection>

                    {/* #2 Tab Layout */}
                    <CollapsibleSection
                        title="Tab Layout"
                        open={accordionLayoutOpen}
                        onToggle={() => setAccordionLayoutOpen(!accordionLayoutOpen)}
                        fontSize={modalHeaderFontSize}
                    >
                        <div className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <FieldLabelWithInfo
                                        htmlFor="tab-bar-orientation"
                                        hint="Horizontal: tab bar in a row under the title. Vertical: tab rail along the left of the table content (next to the grid)."
                                    >
                                        Orientation
                                    </FieldLabelWithInfo>
                                    <select
                                        id="tab-bar-orientation"
                                        className="input text-sm w-full"
                                        value={tabBarPlacementValue}
                                        onChange={(e) => onChange('tabBarPlacement', e.target.value)}
                                    >
                                        <option value="between-title-and-panel">Horizontal</option>
                                        <option value="left-of-table">Vertical</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Height</label>
                                <select 
                                        className="input text-sm w-full"
                                    value={config.tabHeight} 
                                    onChange={(e) => onChange('tabHeight', e.target.value)}
                                >
                                    <option value="small">Small (20px)</option>
                                    <option value="medium">Medium (26px)</option>
                                    <option value="large">Large (30px)</option>
                                </select>
                            </div>
                            <div>
                                    <FieldLabelWithInfo
                                        htmlFor="tab-alignment"
                                        hint="Horizontal bar: align tabs in the row. Vertical rail: stack tabs toward top, center, or bottom; also aligns content inside each tab."
                                    >
                                        Alignment
                                    </FieldLabelWithInfo>
                                <select 
                                        id="tab-alignment"
                                        className="input text-sm w-full"
                                    value={config.tabAlignment} 
                                    onChange={(e) => onChange('tabAlignment', e.target.value)}
                                >
                                    <option value="left">Left</option>
                                    <option value="center">Center</option>
                                    <option value="right">Right</option>
                                </select>
                            </div>
                            </div>
                            <div>
                                <FieldLabelWithInfo
                                    htmlFor="tab-label-width-slider"
                                    hint="Width for each tab control (useful when labels are long)."
                                >
                                    Width ({labelWidthSlider}px)
                                </FieldLabelWithInfo>
                                <input
                                    id="tab-label-width-slider"
                                    type="range"
                                    min={72}
                                    max={320}
                                    value={labelWidthSlider}
                                    onChange={(e) => onChange('tabLabelWidth', Number(e.target.value))}
                                    className="w-full max-w-md"
                                />
                            </div>
                            <div>
                                <FieldLabelWithInfo hint="Extra space above the tab bar when orientation is horizontal.">
                                    Top ({marginTop}px)
                                </FieldLabelWithInfo>
                                <input 
                                    type="range"
                                    min={0}
                                    max={80}
                                    value={marginTop}
                                    onChange={(e) => onChange('tabPanelMarginTop', Number(e.target.value))}
                                    className="w-full max-w-md"
                                />
                            </div>
                            <div>
                                <FieldLabelWithInfo hint="Space below the tab bar before the table panel (horizontal orientation).">
                                    Bottom ({marginBelow}px)
                                </FieldLabelWithInfo>
                                <input
                                    type="range"
                                    min={0}
                                    max={80}
                                    value={marginBelow}
                                    onChange={(e) => onChange('tabPanelSpacing', Number(e.target.value))}
                                    className="w-full max-w-md"
                                />
                        </div>
                            <div>
                                <FieldLabelWithInfo
                                    htmlFor="tab-icon-size-slider"
                                    hint="Slide to Auto (0) for size from tab height, or choose 12–28 px."
                                >
                                    Icon ({iconRangeVal === 0 ? 'auto' : `${iconRangeVal + 11}px`})
                                </FieldLabelWithInfo>
                                <input
                                    id="tab-icon-size-slider"
                                    type="range"
                                    min={0}
                                    max={17}
                                    value={iconRangeVal}
                                    onChange={(e) => {
                                        const v = Number(e.target.value);
                                        onChange('tabIconSize', v === 0 ? 0 : v + 11);
                                    }}
                                    className="w-full max-w-md"
                                />
                    </div>
                            <div>
                                <FieldLabelWithInfo hint="Horizontal gap between adjacent tabs (horizontal bar) or vertical gap in the rail.">
                                    Gap ({config.tabGap ?? 8}px)
                                </FieldLabelWithInfo>
                                <input 
                                    type="range"
                                    min={0}
                                    max={24}
                                    value={config.tabGap ?? 8}
                                    onChange={(e) => onChange('tabGap', Number(e.target.value))}
                                    className="w-full max-w-md"
                                />
                            </div>
                        </div>
                    </CollapsibleSection>

                    {/* #3 Tab Behavior */}
                    <CollapsibleSection
                        title="Tab Behavior"
                        open={accordionBehaviorsOpen}
                        onToggle={() => setAccordionBehaviorsOpen(!accordionBehaviorsOpen)}
                        fontSize={modalHeaderFontSize}
                        headerTrailing={
                            <>
                                <button
                                    type="button"
                                    onClick={resetTabColors}
                                    className="text-sm px-3 py-1.5 rounded-md border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 font-medium"
                                >
                                    Reset
                                </button>
                                <span
                                    className="inline-flex text-gray-400 hover:text-gray-600 cursor-help"
                                    title="Reset tab color settings: tab background on (white), selection and hover emphasis off (default blue/gray accents)."
                                    role="img"
                                    aria-label="Reset tab color settings: tab background on with white, selection and hover toggles off."
                                >
                                    <Info size={16} aria-hidden />
                                </span>
                            </>
                        }
                    >
                        <div className="space-y-3">
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-lg border border-gray-200 bg-gray-50/60 px-3 py-2.5">
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-sm font-medium text-gray-800 shrink-0">Tab Background</span>
                                    {useCustomPanelBg && (
                                        <input 
                                            type="color" 
                                            value={config.tabPanelBackground || '#ffffff'}
                                            onChange={(e) => {
                                                onChange('tabPanelBackground', e.target.value);
                                                onChange('tabUseCustomPanelBackground', true);
                                            }}
                                            className="w-8 h-8 rounded border border-gray-300 cursor-pointer shrink-0"
                                            title="Background fill (when on)"
                                        />
                                    )}
                                    <Toggle
                                        checked={useCustomPanelBg}
                                        onChange={(v) => {
                                            onChange('tabUseCustomPanelBackground', v);
                                            if (v && !config.tabPanelBackground) {
                                                onChange('tabPanelBackground', '#ffffff');
                                            }
                                        }}
                                    />
                                </div>
                                <span className="hidden sm:block w-px h-7 bg-gray-200 shrink-0" aria-hidden />
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-sm font-medium text-gray-800 shrink-0">Selection</span>
                                    {config.tabCustomSelection && (
                                        <input 
                                            type="color" 
                                            value={selectionColorValue}
                                            onChange={(e) => onChange('tabSelectionColor', e.target.value)}
                                            className="w-8 h-8 rounded border border-gray-300 cursor-pointer shrink-0"
                                            title="Active tab emphasis"
                                        />
                                    )}
                                    <Toggle
                                        checked={!!config.tabCustomSelection}
                                        onChange={(v) => {
                                            onChange('tabCustomSelection', v);
                                            if (v && !config.tabSelectionColor) {
                                                onChange('tabSelectionColor', '#2563eb');
                                            }
                                        }}
                                    />
                                </div>
                                <span className="hidden sm:block w-px h-7 bg-gray-200 shrink-0" aria-hidden />
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-sm font-medium text-gray-800 shrink-0">Hover</span>
                                    {config.tabCustomHover && (
                                    <input 
                                        type="color" 
                                            value={hoverColorValue}
                                            onChange={(e) => onChange('tabHoverColor', e.target.value)}
                                            className="w-8 h-8 rounded border border-gray-300 cursor-pointer shrink-0"
                                            title="Hover highlight"
                                        />
                                    )}
                                    <Toggle
                                        checked={!!config.tabCustomHover}
                                        onChange={(v) => {
                                            onChange('tabCustomHover', v);
                                            if (v && !config.tabHoverColor) {
                                                onChange('tabHoverColor', '#e5e7eb');
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                            <p className="text-xs text-gray-500">
                                Tab Background off = transparent strip (no fill). On = use the picker (default white).
                            </p>
                        </div>
                    </CollapsibleSection>

                    {/* #4 Tab List */}
                    <CollapsibleSection
                        title="Tab List"
                        open={accordionTabListOpen}
                        onToggle={() => setAccordionTabListOpen(!accordionTabListOpen)}
                        fontSize={modalHeaderFontSize}
                    >
                        <div className="space-y-3">
                            <div className="flex flex-nowrap items-center gap-2 w-full min-w-0 rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-2">
                            <input 
                                type="text" 
                                    placeholder="Tab name"
                                    aria-label="New tab name"
                                value={newTabLabel} 
                                    onChange={(e) => {
                                        setNewTabLabelUserEdited(true);
                                        setNewTabLabel(e.target.value);
                                    }}
                                    className="input text-sm h-9 min-w-[6.5rem] shrink-[2] flex-1 basis-0 max-w-[12rem]"
                            />
                            <select 
                                    className="input text-sm h-9 min-w-[7rem] shrink flex-1 basis-0 max-w-[11rem]"
                                    aria-label="Linked bookmark for new tab"
                                value={newTabPreset} 
                                onChange={(e) => setNewTabPreset(e.target.value)}
                                    disabled={presets.length === 0}
                                >
                                    <option value="">
                                        {presets.length === 0 ? 'No presets' : 'Bookmark'}
                                    </option>
                                    {presets.map((preset) => (
                                        <option key={preset.id} value={preset.id}>
                                            {preset.name}
                                            {preset.isDefault ? ' ★' : ''}
                                        </option>
                                    ))}
                                </select>
                                <div className="flex items-center gap-1 shrink-0 min-w-0">
                                    <span className="text-xs text-gray-500 hidden md:inline whitespace-nowrap">Icon</span>
                                    <TabIconPickerSelect
                                        showSearch={false}
                                        dense
                                        value={newTabIconKey}
                                        onChange={(k) => {
                                            setNewTabIconKey(k);
                                            if (k !== TAB_ICON_CUSTOM_KEY) setNewTabCustomIcon('');
                                        }}
                                    />
                                </div>
                                {newTabIconKey === TAB_ICON_CUSTOM_KEY && (
                                    <input
                                        type="text"
                                        className="input text-sm h-9 w-16 text-center shrink-0"
                                        placeholder="📋"
                                        aria-label="Custom emoji"
                                        value={newTabCustomIcon}
                                        onChange={(e) => setNewTabCustomIcon(e.target.value)}
                                        maxLength={8}
                                    />
                                )}
                            <button 
                                    type="button"
                                onClick={handleAddTab} 
                                    disabled={!newTabLabel.trim() || !newTabPreset || presets.length === 0}
                                    className="btn btn-primary text-sm h-9 px-3 inline-flex items-center justify-center gap-1 shrink-0 ml-auto"
                            >
                                    <Plus size={16} strokeWidth={2} /> Add tab
                            </button>
                        </div>
                        
                            {(config.tabList || []).length > 0 ? (
                                <div className="border border-gray-200 rounded-lg overflow-x-auto shadow-sm">
                                    <table className="w-full text-sm min-w-[800px] border-collapse table-fixed">
                                        <thead>
                                            <tr className="bg-gray-100 border-b border-gray-200">
                                                <th className="px-2 py-2.5 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide w-[8%]">
                                                    Active
                                                </th>
                                                <th className="px-2 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide w-[16%]">
                                                    Tab name
                                                </th>
                                                <th className="px-2 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide w-[20%]">
                                                    Bookmark
                                                </th>
                                                <th className="px-2 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide w-[36%]">
                                                    Icon · library · emoji
                                                </th>
                                                <th className="px-2 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide w-[20%]">
                                                    Actions
                                                </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                            {(config.tabList || []).map((tab, index) => {
                                                const linkedName =
                                                    presets.find((p) => p.id === tab.presetId)?.name ?? tab.presetId;
                                                const protectedTab = isProtectedDefaultTab(tab);
                                                return (
                                                    <tr
                                                        key={tab.id}
                                                        className={cn(
                                                            'border-b border-gray-100 last:border-0',
                                                            index % 2 === 0 ? 'bg-white' : 'bg-gray-50/90'
                                                        )}
                                                    >
                                                        <td className="px-2 py-2 align-middle text-center">
                                                            <input
                                                                type="radio"
                                                                name="table-settings-active-tab"
                                                                className="h-4 w-4 text-blue-600"
                                                                checked={activeTableTabId === tab.id}
                                                                onChange={() => onActiveTableTabChange?.(tab.id)}
                                                                disabled={!onActiveTableTabChange}
                                                                title="Active tab when the page loads"
                                                                aria-label={`Set ${tab.label} as active tab`}
                                                            />
                                                        </td>
                                                        <td className="px-2 py-2 align-middle">
                                                            {protectedTab && (
                                                                <span className="text-[10px] uppercase text-amber-700 font-medium mr-1">
                                                                    Protected
                                                                </span>
                                                            )}
                                                            {editingTabId === tab.id ? (
                                                                <input
                                                                    type="text"
                                                                    value={editingLabel}
                                                                    onChange={(e) => setEditingLabel(e.target.value)}
                                                                    onBlur={saveRename}
                                                                    onKeyDown={(e) => e.key === 'Enter' && saveRename()}
                                                                    className="input text-sm h-9 w-full"
                                                                    autoFocus
                                                                />
                                                            ) : (
                                                                <span className="font-medium text-gray-900 truncate block">
                                                                    {tab.label}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-2 py-2 align-middle">
                                                            {presets.length === 0 ? (
                                                                <span className="text-gray-500 text-xs">{tab.presetId}</span>
                                                            ) : (
                                                                <select
                                                                    className="input text-sm h-9 w-full"
                                                                    disabled={protectedTab}
                                                                    value={
                                                                        presets.some((p) => p.id === tab.presetId)
                                                                            ? tab.presetId
                                                                            : (presets.find((p) => p.isDefault) || presets[0])
                                                                                  .id
                                                                    }
                                                                    onChange={(e) => updateTabPreset(tab.id, e.target.value)}
                                                                >
                                                                    {presets.map((p) => (
                                                                        <option key={p.id} value={p.id}>
                                                                            {p.name}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            )}
                                                        </td>
                                                        <td className="px-2 py-2 align-middle">
                                                            <div className="flex items-center gap-2 flex-nowrap min-w-0">
                                                                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded border border-gray-200 bg-white">
                                                                    <TabBarIcon
                                                                        iconKey={tab.iconKey || 'list'}
                                                                        customIcon={tab.customIcon}
                                                                        size={20}
                                                                    />
                                                                </span>
                                                                <div className={protectedTab ? 'pointer-events-none opacity-60' : ''}>
                                                                    <TabIconPickerSelect
                                                                        showSearch={false}
                                                                        dense
                                                                        value={tab.iconKey || 'list'}
                                                                        onChange={(key) =>
                                                                            updateTabIcons(tab.id, key, tab.customIcon || '')
                                                                        }
                                                                    />
                                                                </div>
                                                                {(tab.iconKey || 'list') === TAB_ICON_CUSTOM_KEY && (
                                                                    <input
                                                                        type="text"
                                                                        className="input text-sm h-9 w-14 text-center shrink-0 px-1"
                                                                        placeholder="📋"
                                                                        value={tab.customIcon || ''}
                                                                        readOnly={protectedTab}
                                                                        onChange={(e) =>
                                                                            updateTabIcons(
                                                                                tab.id,
                                                                                TAB_ICON_CUSTOM_KEY,
                                                                                e.target.value
                                                                            )
                                                                        }
                                                                        maxLength={8}
                                                                    />
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-2 py-2 align-middle">
                                                            <div className="flex items-center justify-end gap-0.5">
                                                                <button
                                                                    type="button"
                                                                    className="p-2 rounded-md text-gray-500 hover:bg-gray-200 hover:text-gray-800"
                                                                    title={`View: linked bookmark “${linkedName}”`}
                                                                    aria-label={`View linked bookmark ${linkedName}`}
                                                                >
                                                                    <Eye size={16} />
                                                                </button>
                                                                {editingTabId === tab.id ? (
                                                                    <button
                                                                        type="button"
                                                                        onClick={saveRename}
                                                                        className="px-2 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50 rounded-md"
                                                                    >
                                                                        Save
                                                                    </button>
                                                                ) : (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => startRename(tab)}
                                                                        disabled={protectedTab}
                                                                        className="p-2 rounded-md text-gray-500 hover:bg-gray-200 hover:text-blue-600 disabled:opacity-40 disabled:cursor-not-allowed"
                                                                        title="Edit tab name"
                                                                        aria-label="Edit tab name"
                                                                    >
                                                                        <Pencil size={16} />
                                                                    </button>
                                                                )}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDeleteTab(tab.id)}
                                                                    disabled={protectedTab || (config.tabList || []).length <= 1}
                                                                    className="p-2 rounded-md text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
                                                                    title="Delete tab"
                                                                    aria-label="Delete tab"
                                                                >
                                                                    <Trash2 size={16} />
                                                    </button>
                                                            </div>
                                                </td>
                                            </tr>
                                                );
                                            })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-4 text-gray-500 text-sm border border-gray-200 rounded-lg bg-gray-50">
                                    No tabs. A default tab will be added when you enable Tabs and save.
                            </div>
                        )}
                    </div>
                    </CollapsibleSection>
                </div>
            )}
        </div>
    );
};

export default TabSettingsSection;
