import React from 'react';
import { Table } from 'lucide-react';
import {
    DEFAULT_UI_ICON_KEY,
    UI_ICON_MAP,
    UI_ICON_PICKER_OPTIONS,
    normalizeUiIconKey,
} from './uiIconPickerCatalog';

/** Persisted object icon key (kebab-case); same vocabulary as tab / preset icon keys. */
export type ObjectIconKey = string;

export const OBJECT_ICON_OPTIONS: Array<{ key: string; label: string }> = UI_ICON_PICKER_OPTIONS.map(({ key, label }) => ({
    key,
    label,
}));

export function normalizeObjectIconKey(raw: unknown): ObjectIconKey {
    return normalizeUiIconKey(raw, DEFAULT_UI_ICON_KEY);
}

export function getObjectIconNode(iconKey: unknown, size = 20): React.ReactNode {
    const k = normalizeObjectIconKey(iconKey);
    const Icon = UI_ICON_MAP[k] ?? Table;
    return <Icon size={size} />;
}
