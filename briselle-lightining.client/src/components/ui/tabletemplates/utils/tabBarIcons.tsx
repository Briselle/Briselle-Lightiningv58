import React, { useMemo, useState } from 'react';
import {
    PanelBottom,
    LayoutPanelLeft,
    Dices,
    Database,
    Palette,
    BookmarkCheck,
    AppWindow,
    MonitorSpeaker,
    Bookmark,
    Star,
    Layers,
    Gauge,
    Zap,
    CircleDot,
    List,
    Table,
    LayoutGrid,
    FileSpreadsheet,
    Filter,
    Search,
    BarChart3,
    LineChart,
    PieChart,
    Users,
    Building2,
    Briefcase,
    ShoppingCart,
    CreditCard,
    Calendar,
    Clock,
    Folder,
    FileText,
    Settings2,
    SlidersHorizontal,
    Eye,
    Tags,
    Kanban,
    Sparkles,
    type LucideIcon,
} from 'lucide-react';
import { cn } from '../../../../utils/helpers';

/** Use this value in dropdown for emoji-only icons */
export const TAB_ICON_CUSTOM_KEY = 'custom';

/** Keys aligned with Table Settings modal + data / business / filters */
export const TAB_BAR_ICON_OPTIONS: { key: string; label: string; Icon: LucideIcon }[] = [
    { key: 'list', label: 'List / default view', Icon: List },
    { key: 'display', label: 'Display', Icon: PanelBottom },
    { key: 'layout', label: 'Layout', Icon: LayoutPanelLeft },
    { key: 'behavior', label: 'Behavior', Icon: Dices },
    { key: 'data', label: 'Data', Icon: Database },
    { key: 'theme', label: 'Theme', Icon: Palette },
    { key: 'preset', label: 'Preset', Icon: BookmarkCheck },
    { key: 'tabs', label: 'Tabs', Icon: AppWindow },
    { key: 'devices', label: 'Devices', Icon: MonitorSpeaker },
    { key: 'table', label: 'Table grid', Icon: Table },
    { key: 'grid', label: 'Grid', Icon: LayoutGrid },
    { key: 'spreadsheet', label: 'Spreadsheet', Icon: FileSpreadsheet },
    { key: 'filter', label: 'Filter', Icon: Filter },
    { key: 'search', label: 'Search', Icon: Search },
    { key: 'bar-chart', label: 'Bar chart', Icon: BarChart3 },
    { key: 'line-chart', label: 'Line chart', Icon: LineChart },
    { key: 'pie-chart', label: 'Pie chart', Icon: PieChart },
    { key: 'users', label: 'Users / team', Icon: Users },
    { key: 'building', label: 'Building / org', Icon: Building2 },
    { key: 'briefcase', label: 'Business', Icon: Briefcase },
    { key: 'cart', label: 'Commerce', Icon: ShoppingCart },
    { key: 'card', label: 'Billing', Icon: CreditCard },
    { key: 'calendar', label: 'Calendar', Icon: Calendar },
    { key: 'clock', label: 'Time', Icon: Clock },
    { key: 'folder', label: 'Folder', Icon: Folder },
    { key: 'file-text', label: 'Document', Icon: FileText },
    { key: 'settings', label: 'Settings', Icon: Settings2 },
    { key: 'sliders', label: 'Sliders / tuning', Icon: SlidersHorizontal },
    { key: 'eye', label: 'View', Icon: Eye },
    { key: 'tags', label: 'Tags', Icon: Tags },
    { key: 'kanban', label: 'Kanban / board', Icon: Kanban },
    { key: 'bookmark', label: 'Bookmark', Icon: Bookmark },
    { key: 'star', label: 'Star', Icon: Star },
    { key: 'layers', label: 'Layers', Icon: Layers },
    { key: 'gauge', label: 'Gauge / KPI', Icon: Gauge },
    { key: 'zap', label: 'Zap / fast', Icon: Zap },
    { key: 'circle', label: 'Dot', Icon: CircleDot },
    { key: TAB_ICON_CUSTOM_KEY, label: 'Custom (emoji)', Icon: Sparkles },
];

const ICON_MAP: Record<string, LucideIcon> = Object.fromEntries(
    TAB_BAR_ICON_OPTIONS.map((o) => [o.key, o.Icon])
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

/** Searchable icon picker: filter + native select */
export function TabIconPickerSelect({
    value,
    onChange,
    className,
    id,
    showSearch = true,
    dense = false,
}: {
    value: string;
    onChange: (key: string) => void;
    className?: string;
    id?: string;
    /** When false, only the dropdown is shown (e.g. Tab List — use Custom emoji for free-form icons). */
    showSearch?: boolean;
    /** Taller control for table / toolbar rows (h-9, text-sm). */
    dense?: boolean;
}) {
    const [q, setQ] = useState('');
    const filtered = useMemo(() => {
        const s = q.trim().toLowerCase();
        if (!s) return TAB_BAR_ICON_OPTIONS;
        return TAB_BAR_ICON_OPTIONS.filter(
            (o) => o.label.toLowerCase().includes(s) || o.key.toLowerCase().includes(s)
        );
    }, [q]);

    const selectOptions = useMemo(() => {
        const selected = TAB_BAR_ICON_OPTIONS.find((o) => o.key === value);
        if (selected && !filtered.some((o) => o.key === value)) {
            return [selected, ...filtered];
        }
        return filtered.length > 0 ? filtered : TAB_BAR_ICON_OPTIONS;
    }, [filtered, value]);

    return (
        <div className={cn(dense ? 'min-w-[8.5rem] max-w-[11rem]' : 'flex flex-col gap-1 min-w-0')}>
            {showSearch && (
                <input
                    type="search"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search icons…"
                    className="input text-xs py-1 w-full"
                    aria-label="Search icons"
                />
            )}
            <select
                id={id}
                className={cn(
                    'input w-full min-w-0',
                    dense ? 'h-9 text-sm py-0' : 'text-xs py-1',
                    className
                )}
                value={value}
                onChange={(e) => onChange(e.target.value)}
            >
                {selectOptions.map((o) => (
                    <option key={o.key} value={o.key}>
                        {o.label}
                    </option>
                ))}
            </select>
        </div>
    );
}
