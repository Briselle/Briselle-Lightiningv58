import React from 'react';
import { cn } from '../../../../utils/helpers';
import {
    getPickerIconNode,
    UI_ICON_CUSTOM_KEY,
    UI_ICON_PICKER_OPTIONS,
    UiIconPickerSelect,
    type UiIconPickerEntry,
} from '../../../../utils/uiIconPickerCatalog';

/** Alias for tab/preset JSON — same as `UI_ICON_CUSTOM_KEY`. */
export const TAB_ICON_CUSTOM_KEY = UI_ICON_CUSTOM_KEY;

/** Same list as object forms: 100 Lucide + Custom (emoji) from `uiIconPickerCatalog`. */
export const TAB_BAR_ICON_OPTIONS: UiIconPickerEntry[] = UI_ICON_PICKER_OPTIONS;

export function TabBarIcon({
    iconKey,
    customIcon,
    size = 16,
    className,
}: {
    iconKey?: string | null;
    customIcon?: string | null;
    size?: number;
    className?: string;
}) {
    const key = (iconKey && String(iconKey).trim()) || 'list';
    return getPickerIconNode(key, size, customIcon, cn('shrink-0', className));
}

/** Searchable icon picker: shared catalog (tabs / presets / table settings). */
export function TabIconPickerSelect(props: Omit<React.ComponentProps<typeof UiIconPickerSelect>, 'options'>) {
    return <UiIconPickerSelect {...props} options={TAB_BAR_ICON_OPTIONS} />;
}

export { UiIconPickerSelect } from '../../../../utils/uiIconPickerCatalog';
