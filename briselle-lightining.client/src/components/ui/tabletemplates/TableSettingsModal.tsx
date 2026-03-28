import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { X, Save, Settings, RotateCcw, AlertTriangle, Monitor, Palette, Move, Eye, PanelBottom, LayoutPanelLeft, Dices, Database, BookmarkCheck, AppWindow, MonitorSpeaker } from 'lucide-react';
import { TableConfig } from './ConfigurableListTemplate';
import { TabItem, TABLE_TAB_URL_PARAM } from './table-components/TableTabPanel';
import DisplaySettingsSection from './modal-settings-sections/DisplaySettingsSection';
import LayoutSettingsSection from './modal-settings-sections/LayoutSettingsSection';
import BehaviorSettingsSection from './modal-settings-sections/BehaviorSettingsSection';
import DataSettingsSection from './modal-settings-sections/DataSettingsSection';
import ThemeSettingsSection from './modal-settings-sections/ThemeSettingsSection';
import PresetSettingsSection from './modal-settings-sections/PresetSettingsSection';
import TabSettingsSection from './modal-settings-sections/TabSettingsSection';
import DeviceSettingsSection from './modal-settings-sections/DeviceSettingsSection';

import { TablePreset } from './action-components/Action_Preset';
import { DEFAULT_PRESETS, getDefaultPreset } from './utils/presets';
import { mergeObjectTabBarIntoConfig } from './utils/mergePresetConfig';
import { injectCanonicalDefaultTab, CANONICAL_DEFAULT_TAB_ITEM } from './utils/canonicalObjectLoaderDefaults';
import {
    canonicalTabStyleForSave,
    normalizeTabMenuStyle,
    resolveTabShowUnderline,
    sanitizeTabListPresetIds,
} from './utils/tabBarNormalize';
import { stripSavedQueryStateFromConfig, type TableQueryState } from './utils/tableUserViewStorage';
import {
    removePresetFromDB,
    appendPresetToDB,
    saveTableSettingsToDB,
    persistActiveContextToDB,
    resetDefaultToCodeInDB,
    extractObjectTabBarFromConfig,
} from './utils/configService';

export interface TableSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentConfig: TableConfig;
    onSave: (config: TableConfig) => void;
    presets?: TablePreset[];
    onPresetsChange?: (presets: TablePreset[]) => void;
    activePresetId?: string;
    onPresetSelect?: (presetId: string) => void;
    /** Column keys to display labels (same as table headers); used for inline edit column list */
    fieldMappings?: Record<string, string>;
    /** Current runtime filter/sort/group/columns/search — embedded in new presets as `savedQueryState` */
    tableQueryState?: TableQueryState | null;
}

const TableSettingsModal: React.FC<TableSettingsModalProps> = ({
    isOpen,
    onClose,
    currentConfig,
    onSave,
    presets = [],
    onPresetsChange,
    activePresetId,
    onPresetSelect,
    fieldMappings,
    tableQueryState = null,
}) => {
    const [activeTab, setActiveTab] = useState('display');
    const [modalConfig, setModalConfig] = useState<TableConfig>(currentConfig);
    const [selectedPreset, setSelectedPreset] = useState('default');
    const [customPresets, setCustomPresets] = useState<any[]>([]);
    const [modalWidth, setModalWidth] = useState(45); // Default to 45%
    const [modalOverlayTransparency, setModalOverlayTransparency] = useState(60); // Default to 60%
    const [modalHeight, setModalHeight] = useState(70); // Default to 70%
    const [modalVerticalAlign, setModalVerticalAlign] = useState<'top' | 'center' | 'bottom'>('center');
    const [modalHorizontalAlign, setModalHorizontalAlign] = useState<'left' | 'center' | 'right'>('center');
    const [modalTransparency, setModalTransparency] = useState(100); // Default to 100% (no transparency)
    const [modalTitleFontSize, setModalTitleFontSize] = useState(18);
    const [modalHeaderFontSize, setModalHeaderFontSize] = useState(16);
    const [modalContentFontSize, setModalContentFontSize] = useState(14);
    const [modalMenuFontSize, setModalMenuFontSize] = useState(14);
    const [modalPaddingTop, setModalPaddingTop] = useState(0);
    const [modalPaddingRight, setModalPaddingRight] = useState(0);
    const [modalPaddingBottom, setModalPaddingBottom] = useState(0);
    const [modalPaddingLeft, setModalPaddingLeft] = useState(0);
    const [overlayColor, setOverlayColor] = useState('#000000');
    const [modalBackgroundColor, setModalBackgroundColor] = useState('#ffffff');
    const [modalHeaderBackgroundColor, setModalHeaderBackgroundColor] = useState('#f9fafb');
    const [modalBodyBackgroundColor, setModalBodyBackgroundColor] = useState('#ffffff');
    const [modalBodyContentBackgroundColor, setModalBodyContentBackgroundColor] = useState('#ffffff');
    const [modalFooterBackgroundColor, setModalFooterBackgroundColor] = useState('#f9fafb');
    const [modalMenuBackgroundColor, setModalMenuBackgroundColor] = useState('#f9fafb');
    const [menuDirection, setMenuDirection] = useState<'horizontal' | 'vertical'>('horizontal');
    const [menuStyle, setMenuStyle] = useState<'icon' | 'button'>('icon');
    const [showModalSettings, setShowModalSettings] = useState(false);
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [, setSearchParams] = useSearchParams();
    /** Active tab id for table tabs (mirrors URL `tableTab`); saved to DB on Save */
    const [modalDraftActiveTabId, setModalDraftActiveTabId] = useState<string | null>(null);

    const modalRef = useRef<HTMLDivElement>(null);
    /** When true, modal is open — do not replace modalConfig from parent (would wipe dropdown edits like tabMenuStyle). */
    const modalSessionOpenRef = useRef(false);

    // Hydrate from parent + localStorage only when the settings modal transitions closed → open.
    useEffect(() => {
        if (!isOpen) {
            modalSessionOpenRef.current = false;
            return;
        }
        if (modalSessionOpenRef.current) {
            return;
        }
        modalSessionOpenRef.current = true;

        const placement =
            currentConfig.tabBarPlacement === 'left-of-table' ? 'left-of-table' : 'between-title-and-panel';
        const tabMenuLoaded = normalizeTabMenuStyle(currentConfig.tabMenuStyle);
        const tabShowU = resolveTabShowUnderline(currentConfig.tabShowUnderline, currentConfig.tabStyle);
        let configToSet: TableConfig = {
            ...currentConfig,
            tabBarPlacement: placement,
            tabMenuStyle: tabMenuLoaded,
            tabShowUnderline: tabShowU,
            tabStyle: canonicalTabStyleForSave(currentConfig.tabStyle) as TableConfig['tabStyle'],
        };
        const defPreset = presets.find((p) => p.isDefault) || presets[0];
        if (configToSet.enableTabs && (!configToSet.tabList || configToSet.tabList.length === 0)) {
            configToSet = {
                ...configToSet,
                tabList: [
                    {
                        ...CANONICAL_DEFAULT_TAB_ITEM,
                        label: defPreset?.name ?? CANONICAL_DEFAULT_TAB_ITEM.label,
                        presetId: defPreset?.id ?? 'default',
                    },
                ],
            };
        }
        if (configToSet.tabList?.length && presets.length > 0) {
            const s = sanitizeTabListPresetIds(configToSet.tabList, presets);
            if (s) {
                configToSet = { ...configToSet, tabList: s };
            }
        }
        setModalConfig(configToSet);

        const sp = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
        const tabFromUrl = sp?.get(TABLE_TAB_URL_PARAM) ?? null;
        const list = configToSet.tabList ?? [];
        const validUrlTab = tabFromUrl && list.some((t) => t.id === tabFromUrl);
        setModalDraftActiveTabId(validUrlTab ? tabFromUrl : list[0]?.id ?? null);

        const storedCustomPresets = localStorage.getItem('customTablePresets');
        if (storedCustomPresets) {
            try {
                setCustomPresets(JSON.parse(storedCustomPresets));
            } catch {
                setCustomPresets([]);
            }
        }

        const storedModalSettings = localStorage.getItem('modalSettings');
        if (storedModalSettings) {
            try {
                const settings = JSON.parse(storedModalSettings);
                setModalWidth(settings.width || 45);
                setModalHeight(settings.height || 70);
                setModalVerticalAlign(settings.modalVerticalAlign || 'center');
                setModalHorizontalAlign(settings.modalHorizontalAlign || 'center');
                setModalTransparency(settings.modalTransparency || 100);
                setModalTitleFontSize(settings.modalTitleFontSize || 18);
                setModalHeaderFontSize(settings.modalHeaderFontSize || 16);
                setModalContentFontSize(settings.modalContentFontSize || 14);
                setModalMenuFontSize(settings.modalMenuFontSize || 14);
                setModalPaddingTop(settings.modalPaddingTop || 0);
                setModalPaddingRight(settings.modalPaddingRight || 0);
                setModalPaddingBottom(settings.modalPaddingBottom || 0);
                setModalPaddingLeft(settings.modalPaddingLeft || 0);
                setOverlayColor(settings.overlayColor || '#000000');
                setModalBackgroundColor(settings.modalBackgroundColor || '#ffffff');
                setModalHeaderBackgroundColor(settings.modalHeaderBackgroundColor || '#f9fafb');
                setModalBodyBackgroundColor(settings.modalBodyBackgroundColor || '#ffffff');
                setModalBodyContentBackgroundColor(settings.modalBodyContentBackgroundColor || '#ffffff');
                setModalFooterBackgroundColor(settings.modalFooterBackgroundColor || '#f9fafb');
                setModalMenuBackgroundColor(settings.modalMenuBackgroundColor || '#f9fafb');
                setMenuDirection(settings.menuDirection || 'horizontal');
                setMenuStyle(settings.menuStyle || 'icon');
                setModalOverlayTransparency(settings.overlayTransparency || 60);
            } catch {
                /* ignore corrupt modalSettings */
            }
        }
    }, [isOpen, currentConfig, presets]);

    useEffect(() => {
        if (!modalDraftActiveTabId) return;
        const list = modalConfig.tabList ?? [];
        if (!list.some((t) => t.id === modalDraftActiveTabId)) {
            setModalDraftActiveTabId(list[0]?.id ?? null);
        }
    }, [modalConfig.tabList, modalDraftActiveTabId]);

    useEffect(() => {
        if (activePresetId) {
            setSelectedPreset(activePresetId);
        } else if (presets.length) {
            const def = presets.find(p => p.isDefault) || presets[0];
            setSelectedPreset(def.id);
        }
    }, [activePresetId, presets]);

    const handleChange = (key: keyof TableConfig, value: any) => {
        setModalConfig(prev => {
            const next = { ...prev, [key]: value };
            // When table panel is disabled, auto-enable title panel so Settings/Preset move to title bar
            if (key === 'enableTablePanel' && value === false) {
                next.enableTitle = true;
            }
            // When tabs are enabled and tab list is empty, add a default preset tab so UI always has one tab
            if (key === 'enableTabs' && value === true && (!next.tabList || next.tabList.length === 0)) {
                const def = presets.find((p) => p.isDefault) || presets[0];
                next.tabList = [
                    {
                        ...CANONICAL_DEFAULT_TAB_ITEM,
                        label: def?.name ?? CANONICAL_DEFAULT_TAB_ITEM.label,
                        presetId: def?.id ?? 'default',
                    },
                ];
            }
            return next;
        });
    };

    /** Writes built-in Default preset + tab bar from code to platform_config; applies merged config to UI + URL. */
    const pushCodeDefaultPresetToDatabaseAndUi = async (opts?: { announceSuccess?: boolean }) => {
        const codeDefault = getDefaultPreset();
        const { success, error } = await resetDefaultToCodeInDB(codeDefault);
        const base = stripSavedQueryStateFromConfig(codeDefault.config as Record<string, unknown>) as TableConfig;
        const tabBar = extractObjectTabBarFromConfig(codeDefault.config as Record<string, unknown>);
        const merged = mergeObjectTabBarIntoConfig(base, tabBar);
        if (!success) {
            alert(
                `Could not update the database (${error || 'unknown'}). The table switched to the code default locally only — try again when the connection is back.`
            );
        } else if (opts?.announceSuccess !== false) {
            alert('The Default preset and tab bar were updated from code in the database.');
        }
        setModalConfig(merged);
        setSelectedPreset('default');
        setModalDraftActiveTabId(CANONICAL_DEFAULT_TAB_ITEM.id);
        onSave(merged);
        if (onPresetSelect) onPresetSelect('default');
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            next.set('preset', 'default');
            next.set(TABLE_TAB_URL_PARAM, CANONICAL_DEFAULT_TAB_ITEM.id);
            return next;
        });
    };

    const handleSave = async () => {
        const placement =
            modalConfig.tabBarPlacement === 'left-of-table' ? 'left-of-table' : 'between-title-and-panel';
        const tabMenuStyleNormalized = normalizeTabMenuStyle(modalConfig.tabMenuStyle);
        const tabStyleCanonical = canonicalTabStyleForSave(modalConfig.tabStyle);
        const tabShowSaved =
            typeof modalConfig.tabShowUnderline === 'boolean'
                ? modalConfig.tabShowUnderline
                : resolveTabShowUnderline(undefined, modalConfig.tabStyle);
        const layoutConfig = stripSavedQueryStateFromConfig(modalConfig as Record<string, unknown>) as TableConfig;
        const savedConfigNormalized: TableConfig = {
            ...layoutConfig,
            tabBarPlacement: placement,
            tabMenuStyle: tabMenuStyleNormalized,
            tabStyle: tabStyleCanonical as TableConfig['tabStyle'],
            tabShowUnderline: tabShowSaved,
            tabList: injectCanonicalDefaultTab<TabItem>(layoutConfig.tabList),
        };

        const { success, error: dbError, didSkipDefaultPresetBody } = await saveTableSettingsToDB(
            selectedPreset,
            savedConfigNormalized as Record<string, unknown>,
            undefined,
            undefined,
            undefined,
            { activeTabIdOverride: modalDraftActiveTabId },
        );
        if (!success) {
            alert(
                `Table settings were not saved to the database.\n\n${dbError || 'Unknown error'}\n\nTab bar and preset body are stored in platform_config (ObjectLoader).`
            );
            return;
        }

        if (didSkipDefaultPresetBody) {
            alert(
                'The Default preset’s layout is protected and was not overwritten in the database. Tab bar settings were saved; the built-in Default tab row is always stored as defined by the platform. To keep your layout, save it as a new bookmark (preset).'
            );
        }

        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            const tid = modalDraftActiveTabId;
            if (tid && savedConfigNormalized.tabList?.some((t) => t.id === tid)) {
                next.set(TABLE_TAB_URL_PARAM, tid);
            } else {
                next.delete(TABLE_TAB_URL_PARAM);
            }
            return next;
        });

        onSave(savedConfigNormalized);
        if (onPresetSelect) {
            onPresetSelect(selectedPreset);
        }

        // Save modal settings (menuStyle = modal nav icon/button — NOT table tab menu)
        const modalSettings = {
            width: modalWidth,
            height: modalHeight,
            modalVerticalAlign: modalVerticalAlign,
            modalHorizontalAlign: modalHorizontalAlign,
            modalTransparency: modalTransparency,
            modalTitleFontSize: modalTitleFontSize,
            modalHeaderFontSize: modalHeaderFontSize,
            modalContentFontSize: modalContentFontSize,
            modalMenuFontSize: modalMenuFontSize,
            modalPaddingTop: modalPaddingTop,
            modalPaddingRight: modalPaddingRight,
            modalPaddingBottom: modalPaddingBottom,
            modalPaddingLeft: modalPaddingLeft,
            overlayColor: overlayColor,
            modalBackgroundColor: modalBackgroundColor,
            modalHeaderBackgroundColor: modalHeaderBackgroundColor,
            modalBodyBackgroundColor: modalBodyBackgroundColor,
            modalBodyContentBackgroundColor: modalBodyContentBackgroundColor,
            modalFooterBackgroundColor: modalFooterBackgroundColor,
            modalMenuBackgroundColor: modalMenuBackgroundColor,
            menuDirection: menuDirection,
            menuStyle: menuStyle,
            overlayTransparency: modalOverlayTransparency,
        };
        localStorage.setItem('modalSettings', JSON.stringify(modalSettings));

        onClose();
    };

    // Separate system presets (from DEFAULT_PRESETS) from custom presets to avoid storing system presets in localStorage
    const systemPresetIds = new Set(DEFAULT_PRESETS.map(p => p.id));
    const systemPresets = presets.filter(p => systemPresetIds.has(p.id));
    const allCustomPresets = [
        ...presets.filter(p => !systemPresetIds.has(p.id)),
        ...customPresets
    ].filter((p, idx, arr) => arr.findIndex(x => x.id === p.id) === idx);

    const handlePresetChange = (presetId: string) => {
        setSelectedPreset(presetId);
        if (onPresetSelect) {
            onPresetSelect(presetId);
        }

        const tabs = modalConfig.tabList ?? [];
        const tabForPreset = tabs.find((t) => t.presetId === presetId);
        const tabId = tabForPreset?.id ?? tabs[0]?.id ?? null;
        persistActiveContextToDB(presetId, tabId).then(({ error }) => {
            if (error) console.warn('[TableSettings] DB active preset/tab update failed:', error);
        });

        const preset = [...systemPresets, ...allCustomPresets].find(p => p.id === presetId);
        if (preset) {
            const basePresetConfig = stripSavedQueryStateFromConfig(
                (preset.config || {}) as Record<string, unknown>
            );
            const nextConfig = {
                ...basePresetConfig,
                enableTabs: modalConfig.enableTabs,
                tabList: modalConfig.tabList,
                tabHeight: modalConfig.tabHeight,
                tabAlignment: modalConfig.tabAlignment,
                tabOrientation: modalConfig.tabOrientation,
                tabLabelWidth: modalConfig.tabLabelWidth,
                tabBarPlacement: modalConfig.tabBarPlacement,
                tabMenuStyle: modalConfig.tabMenuStyle,
                tabPanelSpacing: modalConfig.tabPanelSpacing,
                tabPanelMarginTop: modalConfig.tabPanelMarginTop,
                tabCustomSelection: modalConfig.tabCustomSelection,
                tabSelectionColor: modalConfig.tabSelectionColor,
                tabCustomHover: modalConfig.tabCustomHover,
                tabHoverColor: modalConfig.tabHoverColor,
                tabPanelBackground: modalConfig.tabPanelBackground,
                tabUseCustomPanelBackground: modalConfig.tabUseCustomPanelBackground,
                tabStyle: modalConfig.tabStyle,
                tabShowUnderline: modalConfig.tabShowUnderline,
                tabIconSize: modalConfig.tabIconSize,
                tabGap: modalConfig.tabGap,
            };

            setModalConfig(nextConfig);
            onSave(nextConfig);
            if (onPresetSelect) {
                onPresetSelect(presetId);
            }
        }
    };

    const handleSavePreset = async () => {
        const presetName = prompt('Enter preset name:');
        const trimmed = presetName?.trim();
        if (!trimmed) return;

        const newPresetId = `custom-${Date.now()}`;
        const newPreset: TablePreset = {
            id: newPresetId,
            presetId: newPresetId,
            name: trimmed,
            config: {
                ...modalConfig,
                ...(tableQueryState ? { savedQueryState: tableQueryState } : {}),
            },
        };

        const { success, error: dbError } = await appendPresetToDB(newPreset);
        if (!success) {
            console.error('[TableSettings] DB append failed:', dbError);
            alert(
                `Preset was not saved to the database.\n\n${dbError || 'Unknown error'}\n\nEnsure platform_config has a seeded row for ObjectLoader (config_type=3).`
            );
            return;
        }

        const updatedCustomPresets = [...customPresets, newPreset];
        setCustomPresets(updatedCustomPresets);
        if (onPresetsChange) {
            onPresetsChange([...presets, newPreset]);
        }
    };

    const handleDeletePreset = (presetId: string) => {
        if (window.confirm('Are you sure you want to delete this preset?')) {
            const updatedPresets = customPresets.filter(p => p.id !== presetId);
            setCustomPresets(updatedPresets);

            // Remove from DB document
            removePresetFromDB(presetId).then(({ error }) => {
                if (error) console.warn('[TableSettings] DB delete failed:', error);
            });

            if (selectedPreset === presetId) {
                setSelectedPreset('default');
            }
        }
    };

    const handleFactoryReset = () => {
        setShowResetConfirm(true);
    };

    const confirmFactoryReset = async () => {
        setShowResetConfirm(false);
        await pushCodeDefaultPresetToDatabaseAndUi({ announceSuccess: true });
    };

    const tabItems = [
        { id: 'display', label: 'Display', icon: <PanelBottom size={16} /> },
        { id: 'layout', label: 'Layout', icon: <LayoutPanelLeft size={16} /> },
        { id: 'behavior', label: 'Behavior', icon: <Dices size={16} /> },
        { id: 'data', label: 'Data', icon: <Database size={16} /> },
        { id: 'theme', label: 'Theme', icon: <Palette size={16} /> },
        { id: 'preset', label: 'Preset', icon: <BookmarkCheck size={16} /> },
        { id: 'tabs', label: 'Tabs', icon: <AppWindow size={16} /> },
        { id: 'devices', label: 'Devices', icon: <MonitorSpeaker size={16} /> }
    ];

    if (!isOpen) return null;

    const getModalAlignmentClasses = () => {
        let alignItems = 'items-center';
        let justifyContent = 'justify-center';

        switch (modalVerticalAlign) {
            case 'top': alignItems = 'items-start'; break;
            case 'bottom': alignItems = 'items-end'; break;
            default: alignItems = 'items-center'; break;
        }

        switch (modalHorizontalAlign) {
            case 'left': justifyContent = 'justify-start'; break;
            case 'right': justifyContent = 'justify-end'; break;
            default: justifyContent = 'justify-center'; break;
        }

        return `${alignItems} ${justifyContent}`;
    };

    const getModalPositionStyle = () => {
        const baseStyle = {
            width: `${modalWidth}%`,
            height: `${modalHeight}%`,
            backgroundColor: modalBackgroundColor,
            opacity: modalTransparency / 100,
            fontSize: `${modalContentFontSize}px`,
            margin: `${modalPaddingTop}px ${modalPaddingRight}px ${modalPaddingBottom}px ${modalPaddingLeft}px`,
        };

        // Apply alignment based on vertical and horizontal settings
        let alignItems = 'center';
        let justifyContent = 'center';

        switch (modalVerticalAlign) {
            case 'top': alignItems = 'flex-start'; break;
            case 'bottom': alignItems = 'flex-end'; break;
            default: alignItems = 'center'; break;
        }

        switch (modalHorizontalAlign) {
            case 'left': justifyContent = 'flex-start'; break;
            case 'right': justifyContent = 'flex-end'; break;
            default: justifyContent = 'center'; break;
        }

        return { ...baseStyle, alignItems, justifyContent };
    };

    return (
        <>
            <div className={`fixed inset-0 z-50 flex ${getModalAlignmentClasses()}`}
                style={{ backgroundColor: `${overlayColor}${Math.round(modalOverlayTransparency * 2.55).toString(16).padStart(2, '0')}` }}>
                <div
                    ref={modalRef}
                    className="bg-white rounded-lg shadow-2xl overflow-hidden flex flex-col border border-gray-200"
                    style={{
                        width: `${modalWidth}%`,
                        height: `${modalHeight}%`,
                        maxHeight: '90vh',
                        backgroundColor: modalBackgroundColor,
                        opacity: modalTransparency / 100,
                        margin: `${modalPaddingTop}px ${modalPaddingRight}px ${modalPaddingBottom}px ${modalPaddingLeft}px`,
                    }}
                >
                    {/* Header - z-10 so it stays above scrollable content (toggles/sections must not overlay Settings icon) */}
                    <div
                        className="flex flex-shrink-0 items-center justify-between p-4 border-b border-gray-200 relative z-10"
                        style={{
                            backgroundColor: modalHeaderBackgroundColor,
                        }}
                    >
                        <div className="flex items-center space-x-2">
                            <h2 className="font-semibold text-gray-900" style={{ fontSize: `${modalTitleFontSize}px` }}>Table Settings</h2>
                        </div>
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={() => setShowModalSettings(!showModalSettings)}
                                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                                title="Modal Settings"
                            >
                                <Settings size={16} />
                            </button>
                            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 p-1">
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Modal Settings Panel */}
                    {showModalSettings && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50" aria-modal="true">
                            <div className="bg-white rounded-lg shadow-xl mx-4 flex flex-col"
                                style={{
                                    width: `${modalWidth * 0.8}%`,
                                    height: `${modalHeight * 0.8}%`,
                                    maxWidth: '800px',
                                    maxHeight: '600px'
                                }}>
                                {/* Fixed Header */}
                                <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white rounded-t-lg flex-shrink-0">
                                    <h3 className="font-semibold text-gray-900" style={{ fontSize: `${modalTitleFontSize}px` }}>Modal Configuration</h3>
                                    <button
                                        onClick={() => setShowModalSettings(false)}
                                        className="text-gray-500 hover:text-gray-700"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                {/* Scrollable Content */}
                                <div className="flex-1 overflow-y-auto p-4">
                                    <div className="space-y-4" style={{ fontSize: `${modalContentFontSize}px` }}>
                                        {/* Size Controls */}
                                        <div className="bg-gray-50 p-3 rounded-lg">
                                            <h4 className="font-semibold text-gray-800 mb-3" style={{ fontSize: `${modalHeaderFontSize}px` }}>Modal Size</h4>
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Width ({modalWidth}%)</label>
                                                    <input type="range" min="40" max="90" value={modalWidth}
                                                        onChange={(e) => setModalWidth(Number(e.target.value))}
                                                        className="w-full" />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Height ({modalHeight}%)</label>
                                                    <input type="range" min="50" max="90" value={modalHeight}
                                                        onChange={(e) => setModalHeight(Number(e.target.value))}
                                                        className="w-full" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Menu Settings */}
                                        <div className="bg-gray-50 p-3 rounded-lg">
                                            <h4 className="font-semibold text-gray-800 mb-3" style={{ fontSize: `${modalHeaderFontSize}px` }}>Menu Settings</h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Direction</label>
                                                    <select value={menuDirection} onChange={(e) => setMenuDirection(e.target.value as any)}
                                                        className="w-full border rounded px-2 py-1">
                                                        <option value="horizontal">Horizontal</option>
                                                        <option value="vertical">Vertical</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Style</label>
                                                    <select value={menuStyle} onChange={(e) => setMenuStyle(e.target.value as any)}
                                                        className="w-full border rounded px-2 py-1">
                                                        <option value="icon">Icon</option>
                                                        <option value="button">Button</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Position Controls */}
                                        <div className="bg-gray-50 p-3 rounded-lg">
                                            <h4 className="font-semibold text-gray-800 mb-3" style={{ fontSize: `${modalHeaderFontSize}px` }}>Modal Position</h4>
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Vertical Position</label>
                                                    <select value={modalVerticalAlign} onChange={(e) => setModalVerticalAlign(e.target.value as any)}
                                                        className="w-full border rounded px-2 py-1">
                                                        <option value="top">Top</option>
                                                        <option value="center">Center</option>
                                                        <option value="bottom">Bottom</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Horizontal Position</label>
                                                    <select value={modalHorizontalAlign} onChange={(e) => setModalHorizontalAlign(e.target.value as any)}
                                                        className="w-full border rounded px-2 py-1">
                                                        <option value="left">Left</option>
                                                        <option value="center">Center</option>
                                                        <option value="right">Right</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Padding Controls */}
                                        <div className="bg-gray-50 p-3 rounded-lg">
                                            <h4 className="font-semibold text-gray-800 mb-3" style={{ fontSize: `${modalHeaderFontSize}px` }}>Modal Padding</h4>
                                            <div className="grid grid-cols-4 gap-3">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Top ({modalPaddingTop}px)</label>
                                                    <input type="range" min="0" max="100" value={modalPaddingTop}
                                                        onChange={(e) => setModalPaddingTop(Number(e.target.value))}
                                                        className="w-full" />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Right ({modalPaddingRight}px)</label>
                                                    <input type="range" min="0" max="100" value={modalPaddingRight}
                                                        onChange={(e) => setModalPaddingRight(Number(e.target.value))}
                                                        className="w-full" />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Bottom ({modalPaddingBottom}px)</label>
                                                    <input type="range" min="0" max="100" value={modalPaddingBottom}
                                                        onChange={(e) => setModalPaddingBottom(Number(e.target.value))}
                                                        className="w-full" />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Left ({modalPaddingLeft}px)</label>
                                                    <input type="range" min="0" max="100" value={modalPaddingLeft}
                                                        onChange={(e) => setModalPaddingLeft(Number(e.target.value))}
                                                        className="w-full" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Font Sizes */}
                                        <div className="bg-gray-50 p-3 rounded-lg">
                                            <h4 className="font-semibold text-gray-800 mb-3" style={{ fontSize: `${modalHeaderFontSize}px` }}>Font Sizes</h4>
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Title ({modalTitleFontSize}px)</label>
                                                    <input type="range" min="16" max="24" value={modalTitleFontSize}
                                                        onChange={(e) => setModalTitleFontSize(Number(e.target.value))}
                                                        className="w-full" />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Headers ({modalHeaderFontSize}px)</label>
                                                    <input type="range" min="14" max="20" value={modalHeaderFontSize}
                                                        onChange={(e) => setModalHeaderFontSize(Number(e.target.value))}
                                                        className="w-full" />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Menu ({modalMenuFontSize}px)</label>
                                                    <input type="range" min="12" max="18" value={modalMenuFontSize}
                                                        onChange={(e) => setModalMenuFontSize(Number(e.target.value))}
                                                        className="w-full" />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Content ({modalContentFontSize}px)</label>
                                                    <input type="range" min="12" max="18" value={modalContentFontSize}
                                                        onChange={(e) => setModalContentFontSize(Number(e.target.value))}
                                                        className="w-full" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Modal Color Configuration */}
                                        <div className="bg-gray-50 p-3 rounded-lg">
                                            <div className="flex items-center justify-between mb-3">
                                                <h4 className="font-semibold text-gray-800" style={{ fontSize: `${modalHeaderFontSize}px` }}>Modal Color Configuration</h4>
                                                <button
                                                    onClick={() => {
                                                        setModalHeaderBackgroundColor('#f9fafb');
                                                        setModalMenuBackgroundColor('#f9fafb');
                                                        setModalBodyBackgroundColor('#ffffff');
                                                        setModalBodyContentBackgroundColor('#ffffff');
                                                        setModalFooterBackgroundColor('#f9fafb');
                                                        setOverlayColor('#000000');
                                                        setModalOverlayTransparency(60);
                                                        setModalTransparency(100);
                                                    }}
                                                    className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                                                >
                                                    Reset All Colors
                                                </button>
                                            </div>

                                            {/* Color Labels Row */}
                                            <div className="grid grid-cols-5 gap-2 mb-2">
                                                <div className="text-center text-sm font-medium text-gray-700">Header</div>
                                                <div className="text-center text-sm font-medium text-gray-700">Menu</div>
                                                <div className="text-center text-sm font-medium text-gray-700">Body</div>
                                                <div className="text-center text-sm font-medium text-gray-700">Content</div>
                                                <div className="text-center text-sm font-medium text-gray-700">Footer</div>
                                            </div>

                                            {/* Color Selectors Row */}
                                            <div className="grid grid-cols-5 gap-2 mb-4">
                                                <div className="flex justify-center">
                                                    <input type="color" value={modalHeaderBackgroundColor}
                                                        onChange={(e) => setModalHeaderBackgroundColor(e.target.value)}
                                                        className="w-12 h-8 border rounded cursor-pointer" />
                                                </div>
                                                <div className="flex justify-center">
                                                    <input type="color" value={modalMenuBackgroundColor}
                                                        onChange={(e) => setModalMenuBackgroundColor(e.target.value)}
                                                        className="w-12 h-8 border rounded cursor-pointer" />
                                                </div>
                                                
                                                <div className="flex justify-center">
                                                    <input type="color" value={modalBodyContentBackgroundColor}
                                                        onChange={(e) => setModalBodyContentBackgroundColor(e.target.value)}
                                                        className="w-12 h-8 border rounded cursor-pointer" />
                                                </div>
                                                <div className="flex justify-center">
                                                    <input type="color" value={modalBodyBackgroundColor}
                                                        onChange={(e) => setModalBodyBackgroundColor(e.target.value)}
                                                        className="w-12 h-8 border rounded cursor-pointer" />
                                                </div>
                                                <div className="flex justify-center">
                                                    <input type="color" value={modalFooterBackgroundColor}
                                                        onChange={(e) => setModalFooterBackgroundColor(e.target.value)}
                                                        className="w-12 h-8 border rounded cursor-pointer" />
                                                </div>
                                            </div>

                                            {/* Overlay Settings */}
                                            <div className="border-t pt-3">
                                                <h5 className="font-medium text-gray-700 mb-2" style={{ fontSize: `${modalHeaderFontSize}px` }}>Overlay & Transparency</h5>
                                                <div className="space-y-3">
                                                    <div className="flex items-center space-x-3">
                                                        <div className="flex items-center space-x-2">
                                                            <label className="text-sm text-gray-600">Overlay Color:</label>
                                                            <input type="color" value={overlayColor}
                                                                onChange={(e) => setOverlayColor(e.target.value)}
                                                                className="w-10 h-6 border rounded cursor-pointer" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <label className="text-sm text-gray-600">Overlay Transparency: {modalOverlayTransparency}%</label>
                                                            <input type="range" min="0" max="100" value={modalOverlayTransparency}
                                                                onChange={(e) => setModalOverlayTransparency(Number(e.target.value))}
                                                                className="w-full" />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="text-sm text-gray-600">Pop-up Transparency: {modalTransparency}%</label>
                                                        <input type="range" min="0" max="100" value={modalTransparency}
                                                            onChange={(e) => setModalTransparency(Number(e.target.value))}
                                                            className="w-full" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex justify-end space-x-2 mt-4">
                                        <button
                                            onClick={() => setShowModalSettings(false)}
                                            className="btn btn-secondary text-sm"
                                        >
                                            Close
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Navigation */}
                    {menuDirection === 'horizontal' ? (
                        <div
                            className="border-b border-gray-200 overflow-x-hidden overflow-y-hidden min-w-0"
                            style={{ backgroundColor: modalMenuBackgroundColor, minHeight: menuStyle === 'button' ? '72px' : '56px' }}
                        >
                            <div className="flex flex-wrap">
                                {tabItems.map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex items-center space-x-2 px-4 font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id
                                                ? 'border-blue-500 text-blue-600 bg-blue-50'
                                                : 'border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300'
                                            }`}
                                        style={{
                                            fontSize: `${modalMenuFontSize}px`,
                                            minHeight: menuStyle === 'button' ? '72px' : '56px',
                                            paddingTop: menuStyle === 'button' ? '20px' : '16px',
                                            paddingBottom: menuStyle === 'button' ? '20px' : '16px'
                                        }}
                                    >
                                        {menuStyle === 'icon' ? tab.icon : (
                                            <>
                                                {tab.icon}
                                                <span>{tab.label}</span>
                                            </>
                                        )}
                                        {menuStyle === 'icon' && <span className="sr-only">{tab.label}</span>}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : null}

                    <div className="flex flex-grow overflow-hidden">
                        {/* Vertical Sidebar Navigation */}
                        {menuDirection === 'vertical' && (
                            <div className={`border-r border-gray-200 flex-shrink-0 ${menuStyle === 'icon' ? 'w-16' : 'w-48'}`}
                                style={{ backgroundColor: modalMenuBackgroundColor }}>
                                <div className="flex flex-col">
                                    {tabItems.map((tab) => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={`${menuStyle === 'icon' ? 'px-2 py-3 justify-center' : 'px-4 py-3 text-left'} hover:bg-gray-100 transition-colors flex items-center ${menuStyle === 'button' ? 'space-x-2' : ''} ${activeTab === tab.id
                                                    ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600 font-medium'
                                                    : 'text-gray-700'
                                                }`}
                                            style={{ fontSize: `${modalMenuFontSize}px` }}
                                            title={menuStyle === 'icon' ? tab.label : undefined}
                                        >
                                            {menuStyle === 'icon' ? (
                                                tab.icon
                                            ) : (
                                                <>
                                                    {tab.icon}
                                                    <span>{tab.label}</span>
                                                </>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Content Area */}
                        <div
                            className="flex-grow overflow-y-auto custom-scrollbar"
                            style={{
                                backgroundColor: modalBodyBackgroundColor
                            }}
                        >
                            <div className="p-6" style={{ backgroundColor: modalBodyContentBackgroundColor }}>
                                <div style={{ fontSize: `${modalContentFontSize}px` }}>
                                    {activeTab === 'display' && (
                                        <DisplaySettingsSection
                                            config={modalConfig}
                                            onChange={handleChange}
                                            modalHeaderFontSize={modalHeaderFontSize}
                                            modalContentFontSize={modalContentFontSize}
                                            onNavigateToTab={setActiveTab}
                                        />
                                    )}

                                    {activeTab === 'layout' && (
                                        <LayoutSettingsSection
                                            config={modalConfig}
                                            onChange={handleChange}
                                            modalHeaderFontSize={modalHeaderFontSize}
                                            modalContentFontSize={modalContentFontSize}
                                        />
                                    )}

                                    {activeTab === 'behavior' && (
                                        <BehaviorSettingsSection
                                            config={modalConfig}
                                            onChange={handleChange}
                                            modalHeaderFontSize={modalHeaderFontSize}
                                            modalContentFontSize={modalContentFontSize}
                                            fieldMappings={fieldMappings}
                                        />
                                    )}

                                    {activeTab === 'data' && (
                                        <DataSettingsSection
                                            config={modalConfig}
                                            onChange={handleChange}
                                            modalHeaderFontSize={modalHeaderFontSize}
                                            modalContentFontSize={modalContentFontSize}
                                        />
                                    )}

                                    {activeTab === 'theme' && (
                                        <ThemeSettingsSection
                                            config={modalConfig}
                                            onChange={handleChange}
                                        />
                                    )}

                                    {activeTab === 'preset' && (
                                        <PresetSettingsSection
                                            modalHeaderFontSize={modalHeaderFontSize}
                                            modalContentFontSize={modalContentFontSize}
                                            selectedPreset={selectedPreset}
                                            systemPresets={systemPresets}
                                            customPresets={allCustomPresets}
                                            onPresetChange={handlePresetChange}
                                            onSavePreset={handleSavePreset}
                                            onDeletePreset={handleDeletePreset}
                                            onFactoryReset={handleFactoryReset}
                                            onPresetsChange={onPresetsChange}
                                            onConfigChange={(config) => {
                                                setModalConfig(config);
                                                onSave(config);
                                            if (onPresetSelect) {
                                                onPresetSelect(selectedPreset);
                                            }
                                            }}
                                            currentConfig={modalConfig}
                                            currentTableQueryState={tableQueryState}
                                        onPresetSelect={onPresetSelect}
                                        />
                                    )}

                                    {activeTab === 'tabs' && (
                                        <TabSettingsSection
                                            modalHeaderFontSize={modalHeaderFontSize}
                                            modalContentFontSize={modalContentFontSize}
                                            config={modalConfig}
                                            presets={presets}
                                            onChange={handleChange}
                                            activeTableTabId={modalDraftActiveTabId}
                                            onActiveTableTabChange={setModalDraftActiveTabId}
                                            contextPresetIdForNewTab={selectedPreset}
                                        />
                                    )}

                                    {activeTab === 'devices' && (
                                        <DeviceSettingsSection
                                            modalHeaderFontSize={modalHeaderFontSize}
                                            modalContentFontSize={modalContentFontSize}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div
                        className="flex justify-between items-center p-4 border-t border-gray-200"
                        style={{
                            backgroundColor: modalFooterBackgroundColor,
                            fontSize: `${modalContentFontSize}px`
                        }}
                    >
                        <button
                            onClick={handleFactoryReset}
                            className="btn btn-secondary text-red-600 hover:bg-red-50 border-red-300 hover:border-red-400"
                        >
                            <RotateCcw size={16} className="mr-2" />
                            Reset to System Default
                        </button>
                        <div className="flex space-x-2">
                            <button onClick={onClose} className="btn btn-secondary">
                                Cancel
                            </button>
                            <button onClick={handleSave} className="btn btn-primary">
                                <Save size={16} className="mr-2" /> Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Reset Confirmation Modal */}
            {showResetConfirm && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black bg-opacity-60">
                    <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
                        <div className="flex items-center space-x-3 mb-4">
                            <AlertTriangle size={24} className="text-red-500" />
                            <h3 className="text-lg font-semibold text-gray-900">Reset to System Default</h3>
                        </div>
                        <p className="text-gray-600 mb-6">
                            Overwrite the <strong>Default</strong> bookmark and protected tab bar in the database with the built-in values from application code. Other bookmarks and custom presets are not removed. This cannot be undone.
                        </p>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setShowResetConfirm(false)}
                                className="btn btn-secondary"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => void confirmFactoryReset()}
                                className="btn btn-danger"
                            >
                                Reset to System Default
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default TableSettingsModal;