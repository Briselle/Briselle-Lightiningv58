import React from 'react';
import { List, Sparkles, type LucideIcon } from 'lucide-react';
import { cn } from '../../../../utils/helpers';
import { UI_ICON_PICKER_OPTIONS, UiIconPickerSelect, type UiIconPickerEntry } from '../../../../utils/uiIconPickerCatalog';

/** Use this value in dropdown for emoji-only icons */
export const TAB_ICON_CUSTOM_KEY = 'custom';

const TAB_ICON_CUSTOM_OPTION: UiIconPickerEntry = {
    key: TAB_ICON_CUSTOM_KEY,
    label: 'Custom (emoji)',
    Icon: Sparkles,
};

/** Same 100 SaaS icons as object icons, plus custom emoji row (for tabs / presets). */
export const TAB_BAR_ICON_OPTIONS: UiIconPickerEntry[] = [...UI_ICON_PICKER_OPTIONS, TAB_ICON_CUSTOM_OPTION];

const ICON_MAP: Record<string, LucideIcon> = Object.fromEntries(
    TAB_BAR_ICON_OPTIONS.map((o) => [o.key, o.Icon]),
) as Record<string, LucideIcon>;

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
    const key = iconKey || 'list';
    const emoji = customIcon?.trim();

    if (key === TAB_ICON_CUSTOM_KEY && emoji) {
        return (
            <span
                className={cn('inline-flex items-center justify-center shrink-0 leading-none select-none', className)}
                style={{ fontSize: Math.max(size, 14) }}
                aria-hidden
            >
                {emoji}
            </span>
        );
    }

    if (key === TAB_ICON_CUSTOM_KEY) {
        const Icon = Sparkles;
        return <Icon size={size} className={cn('shrink-0 opacity-70', className)} aria-hidden />;
    }

    const Icon = ICON_MAP[key] || List;
    return <Icon size={size} className={cn('shrink-0', className)} aria-hidden />;
}

/** Searchable icon picker: shared 100 icons + custom emoji row (tabs / presets / table settings). */
export function TabIconPickerSelect(props: Omit<React.ComponentProps<typeof UiIconPickerSelect>, 'options'>) {
    return <UiIconPickerSelect {...props} options={TAB_BAR_ICON_OPTIONS} />;
}

/** Re-export for callers that want the shared picker without the custom row (e.g. object forms). */
export { UiIconPickerSelect } from '../../../../utils/uiIconPickerCatalog';
