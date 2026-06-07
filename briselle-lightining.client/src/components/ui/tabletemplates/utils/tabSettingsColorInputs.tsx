import { cn } from '../../../../utils/helpers';

/** Same classes as Table Settings → Display → Enable Title Background */
export const TAB_SETTINGS_COLOR_INPUT_CLASS =
    'w-8 h-8 rounded border border-gray-300 cursor-pointer shrink-0';

type ColorFieldProps = {
    value: string;
    onChange: (hex: string) => void;
    onClear: () => void;
    clearLabel?: string;
    isolatePointerEvents?: boolean;
    onFocus?: () => void;
    onBlur?: () => void;
};

/**
 * Color picker row matching Objects → Table Settings → Enable Title Background:
 * native color input + Clear button.
 */
export function TableSettingsColorFieldWithClear({
    value,
    onChange,
    onClear,
    clearLabel = 'Clear',
    isolatePointerEvents = false,
    onFocus,
    onBlur,
}: ColorFieldProps) {
    const hex = value.startsWith('#') ? value : '#ffffff';

    const stopIfNeeded = (e: { stopPropagation: () => void }) => {
        if (isolatePointerEvents) e.stopPropagation();
    };

    return (
        <div className="flex items-center gap-2">
            <input
                type="color"
                value={hex}
                title="Pick color"
                data-no-row-nav={isolatePointerEvents || undefined}
                className={TAB_SETTINGS_COLOR_INPUT_CLASS}
                onMouseDown={stopIfNeeded}
                onClick={stopIfNeeded}
                onFocus={onFocus}
                onBlur={onBlur}
                onChange={(e) => onChange(e.target.value)}
            />
            <button
                type="button"
                data-no-row-nav={isolatePointerEvents || undefined}
                onMouseDown={stopIfNeeded}
                onPointerDown={(e) => {
                    if (e.button !== 0) return;
                    stopIfNeeded(e);
                    onClear();
                }}
                className="text-xs px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
            >
                {clearLabel}
            </button>
        </div>
    );
}

type NotionColorFieldProps = ColorFieldProps & {
    defaultClear?: string;
};

/** Native color input for Notion tab settings (panel is portaled outside BlockNote). */
export function NotionTabSettingsColorField({
    value,
    onChange,
    onClear,
    defaultClear = '#2563eb',
}: NotionColorFieldProps) {
    const hex = value.startsWith('#') ? value : defaultClear;

    return (
        <div className="flex items-center gap-1.5 shrink-0" data-notion-tabs-color-field>
            <input
                type="color"
                value={hex}
                title="Accent color"
                aria-label="Accent color"
                data-no-row-nav
                className={TAB_SETTINGS_COLOR_INPUT_CLASS}
                onChange={(e) => onChange(e.target.value)}
                onInput={(e) => onChange(e.currentTarget.value)}
            />
            <button
                type="button"
                data-no-row-nav
                title="Reset color"
                aria-label="Reset color"
                onClick={(e) => {
                    e.stopPropagation();
                    onClear();
                }}
                className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
            >
                Clear
            </button>
        </div>
    );
}

/** @deprecated Use TableSettingsColorFieldWithClear — kept for TabSettingsSection Selection row */
export function TabSettingsColorInput({
    value,
    onChange,
    title = 'Active tab emphasis',
    className,
}: {
    value: string;
    onChange: (hex: string) => void;
    title?: string;
    className?: string;
}) {
    const hex = value.startsWith('#') ? value : '#2563eb';

    return (
        <input
            type="color"
            value={hex}
            title={title}
            className={cn(TAB_SETTINGS_COLOR_INPUT_CLASS, className)}
            onChange={(e) => onChange(e.target.value)}
        />
    );
}
