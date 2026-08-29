/**
 * Single source of truth for icon pickers (objects, tabs, presets, sidebar): 100 Lucide icons
 * plus one "Custom (emoji)" row. Keys are stable kebab-case for JSON / platform_config.
 */
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
    AlertCircle,
    AppWindow,
    Archive,
    AtSign,
    BarChart3,
    Bell,
    Bookmark,
    BookmarkCheck,
    BookOpen,
    Briefcase,
    Building2,
    Calendar,
    Camera,
    CircleDot,
    ClipboardList,
    Clock,
    Cloud,
    Code,
    Code2,
    Compass,
    CreditCard,
    Database,
    Dices,
    Download,
    Eye,
    Factory,
    FileSpreadsheet,
    FileText,
    Filter,
    Flag,
    Folder,
    FolderTree,
    Gauge,
    Globe,
    HardDrive,
    Headphones,
    Heart,
    HelpCircle,
    Home,
    Image,
    Inbox,
    Info,
    Kanban,
    Key,
    Layers,
    LayoutGrid,
    LayoutPanelLeft,
    LineChart,
    Link,
    List,
    Lock,
    Mail,
    MapPin,
    MessageSquare,
    Mic,
    MonitorSpeaker,
    Package,
    Palette,
    PanelBottom,
    Paperclip,
    Percent,
    Phone,
    PieChart,
    Plane,
    PlayCircle,
    RefreshCw,
    Rocket,
    Search,
    Send,
    Server,
    Settings2,
    Share2,
    Shield,
    ShieldCheck,
    ShoppingCart,
    SlidersHorizontal,
    Smartphone,
    Sparkles,
    Star,
    Store,
    Table,
    Tags,
    Target,
    Terminal,
    ThumbsUp,
    Trash2,
    TrendingDown,
    TrendingUp,
    Truck,
    Upload,
    UserPlus,
    Users,
    Video,
    Wifi,
    Wrench,
    Zap,
    DownloadCloud,
    UploadCloud,
    Music,
    ExternalLink,
    Lightbulb,
} from 'lucide-react';
import { cn } from './helpers';

export type UiIconPickerEntry = { key: string; label: string; Icon: LucideIcon };

/** Stored value when the user picks emoji instead of a Lucide key (shared by objects, tabs, presets). */
export const UI_ICON_CUSTOM_KEY = 'custom';

/** Tab / table settings defaults + object legacy keys + SaaS staples — exactly 100 Lucide-backed options. */
const CORE_TAB_AND_OBJECT_ICONS: UiIconPickerEntry[] = [
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
    { key: 'user-plus', label: 'Add user', Icon: UserPlus },
    { key: 'building', label: 'Building / org', Icon: Building2 },
    { key: 'briefcase', label: 'Business', Icon: Briefcase },
    { key: 'package', label: 'Package', Icon: Package },
    { key: 'clipboard', label: 'Clipboard', Icon: ClipboardList },
    { key: 'target', label: 'Target / goal', Icon: Target },
    { key: 'hierarchy', label: 'Hierarchy', Icon: FolderTree },
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
];

const EXTENDED_SAAS_ICONS: UiIconPickerEntry[] = [
    { key: 'home', label: 'Home', Icon: Home },
    { key: 'inbox', label: 'Inbox', Icon: Inbox },
    { key: 'mail', label: 'Mail', Icon: Mail },
    { key: 'send', label: 'Send', Icon: Send },
    { key: 'message-square', label: 'Messages', Icon: MessageSquare },
    { key: 'bell', label: 'Notifications', Icon: Bell },
    { key: 'phone', label: 'Phone', Icon: Phone },
    { key: 'smartphone', label: 'Mobile app', Icon: Smartphone },
    { key: 'globe', label: 'Web / global', Icon: Globe },
    { key: 'lock', label: 'Security / lock', Icon: Lock },
    { key: 'shield', label: 'Shield', Icon: Shield },
    { key: 'shield-check', label: 'Compliance', Icon: ShieldCheck },
    { key: 'key', label: 'API key / access', Icon: Key },
    { key: 'link', label: 'Link', Icon: Link },
    { key: 'external-link', label: 'External link', Icon: ExternalLink },
    { key: 'share', label: 'Share', Icon: Share2 },
    { key: 'trending-up', label: 'Growth', Icon: TrendingUp },
    { key: 'trending-down', label: 'Decline', Icon: TrendingDown },
    { key: 'heart', label: 'Favorite', Icon: Heart },
    { key: 'thumbs-up', label: 'Approve', Icon: ThumbsUp },
    { key: 'flag', label: 'Flag / milestone', Icon: Flag },
    { key: 'map-pin', label: 'Location', Icon: MapPin },
    { key: 'compass', label: 'Explore', Icon: Compass },
    { key: 'truck', label: 'Shipping', Icon: Truck },
    { key: 'plane', label: 'Travel', Icon: Plane },
    { key: 'factory', label: 'Operations', Icon: Factory },
    { key: 'store', label: 'Storefront', Icon: Store },
    { key: 'wrench', label: 'Tools / admin', Icon: Wrench },
    { key: 'code', label: 'Code', Icon: Code },
    { key: 'code-2', label: 'Developer', Icon: Code2 },
    { key: 'terminal', label: 'Terminal', Icon: Terminal },
    { key: 'server', label: 'Infrastructure', Icon: Server },
    { key: 'hard-drive', label: 'Storage', Icon: HardDrive },
    { key: 'cloud', label: 'Cloud', Icon: Cloud },
    { key: 'cloud-upload', label: 'Cloud upload', Icon: UploadCloud },
    { key: 'cloud-download', label: 'Cloud download', Icon: DownloadCloud },
    { key: 'wifi', label: 'Connectivity', Icon: Wifi },
    { key: 'camera', label: 'Media / camera', Icon: Camera },
    { key: 'image', label: 'Image', Icon: Image },
    { key: 'video', label: 'Video', Icon: Video },
    { key: 'music', label: 'Audio', Icon: Music },
    { key: 'headphones', label: 'Support', Icon: Headphones },
    { key: 'mic', label: 'Voice', Icon: Mic },
    { key: 'percent', label: 'Discount / rate', Icon: Percent },
    { key: 'at-sign', label: 'Mention / email', Icon: AtSign },
    { key: 'paperclip', label: 'Attachment', Icon: Paperclip },
    { key: 'archive', label: 'Archive', Icon: Archive },
    { key: 'trash', label: 'Delete', Icon: Trash2 },
    { key: 'refresh', label: 'Refresh / sync', Icon: RefreshCw },
    { key: 'download', label: 'Download', Icon: Download },
    { key: 'upload', label: 'Upload', Icon: Upload },
    { key: 'play', label: 'Play / run', Icon: PlayCircle },
    { key: 'alert', label: 'Alert', Icon: AlertCircle },
    { key: 'info', label: 'Info', Icon: Info },
    { key: 'help', label: 'Help', Icon: HelpCircle },
    { key: 'rocket', label: 'Launch', Icon: Rocket },
    { key: 'lightbulb', label: 'Ideas', Icon: Lightbulb },
    { key: 'book-open', label: 'Docs / guide', Icon: BookOpen },
];

/** Exactly 100 Lucide-only entries (before the custom row). */
const UI_ICON_LUCIDE_PICKER_ENTRIES: UiIconPickerEntry[] = [...CORE_TAB_AND_OBJECT_ICONS, ...EXTENDED_SAAS_ICONS];

if (import.meta.env.DEV && UI_ICON_LUCIDE_PICKER_ENTRIES.length !== 100) {
    // eslint-disable-next-line no-console
    console.warn(`[uiIconPickerCatalog] expected 100 Lucide icons, got ${UI_ICON_LUCIDE_PICKER_ENTRIES.length}`);
}

const UI_ICON_CUSTOM_ENTRY: UiIconPickerEntry = {
    key: UI_ICON_CUSTOM_KEY,
    label: 'Custom (emoji)',
    Icon: Sparkles,
};

/** Full picker list: 100 Lucide icons + Custom (emoji). Default for `UiIconPickerSelect` and tabs/presets. */
export const UI_ICON_PICKER_OPTIONS: UiIconPickerEntry[] = [...UI_ICON_LUCIDE_PICKER_ENTRIES, UI_ICON_CUSTOM_ENTRY];

export const UI_ICON_MAP: Record<string, LucideIcon> = Object.fromEntries(
    UI_ICON_PICKER_OPTIONS.map((o) => [o.key, o.Icon]),
) as Record<string, LucideIcon>;

export const DEFAULT_UI_ICON_KEY = 'table';

export function normalizeUiIconKey(raw: unknown, fallback: string = DEFAULT_UI_ICON_KEY): string {
    const v = String(raw ?? '').trim().toLowerCase();
    if (v === UI_ICON_CUSTOM_KEY) return UI_ICON_CUSTOM_KEY;
    if (v && UI_ICON_MAP[v]) return v;
    return fallback;
}

/** Renders Lucide, Sparkles placeholder for custom-without-emoji, or emoji when `customEmoji` is set. */
export function getPickerIconNode(
    iconKey: unknown,
    size = 20,
    customEmoji?: unknown,
    className?: string,
): ReactNode {
    const k = normalizeUiIconKey(iconKey);
    const emoji = String(customEmoji ?? '').trim();
    if (k === UI_ICON_CUSTOM_KEY && emoji) {
        if (/^(data:image\/|https?:\/\/)/i.test(emoji)) {
            return (
                <img
                    src={emoji}
                    alt=""
                    className={cn('shrink-0 rounded object-cover', className)}
                    style={{ width: size, height: size }}
                    aria-hidden
                />
            );
        }
        return (
            <span
                className={cn('inline-flex items-center justify-center leading-none select-none', className)}
                style={{ fontSize: Math.max(size, 14) }}
                aria-hidden
            >
                {emoji}
            </span>
        );
    }
    if (k === UI_ICON_CUSTOM_KEY) {
        return <Sparkles size={size} className={cn('shrink-0 opacity-70', className)} aria-hidden />;
    }
    const Icon = UI_ICON_MAP[k] ?? Table;
    return <Icon size={size} className={cn('shrink-0', className)} aria-hidden />;
}

/** Searchable icon picker: filter + native select (shared by objects, tabs, presets). */
export function UiIconPickerSelect({
    value,
    onChange,
    className,
    wrapperClassName,
    id,
    showSearch = true,
    dense = false,
    disabled = false,
    options = UI_ICON_PICKER_OPTIONS,
}: {
    value: string;
    onChange: (key: string) => void;
    className?: string;
    /** Merges with layout wrapper (e.g. `w-full max-w-none` on object forms). */
    wrapperClassName?: string;
    id?: string;
    showSearch?: boolean;
    dense?: boolean;
    disabled?: boolean;
    /** Defaults to the global list (100 Lucide + Custom emoji row). */
    options?: UiIconPickerEntry[];
}) {
    const [q, setQ] = useState('');
    const filtered = useMemo(() => {
        const s = q.trim().toLowerCase();
        if (!s) return options;
        return options.filter((o) => o.label.toLowerCase().includes(s) || o.key.toLowerCase().includes(s));
    }, [q, options]);

    const selectOptions = useMemo(() => {
        const selected = options.find((o) => o.key === value);
        if (selected && !filtered.some((o) => o.key === value)) {
            return [selected, ...filtered];
        }
        return filtered.length > 0 ? filtered : options;
    }, [filtered, value, options]);

    return (
        <div
            className={cn(
                dense ? 'min-w-[8.5rem] max-w-[11rem]' : 'flex flex-col gap-1 min-w-0',
                wrapperClassName
            )}
        >
            {showSearch && (
                <input
                    type="search"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search icons…"
                    className="input text-xs py-1 w-full"
                    aria-label="Search icons"
                    disabled={disabled}
                />
            )}
            <select
                id={id}
                className={cn('input w-full min-w-0', dense ? 'h-9 text-sm py-0' : 'text-sm py-1.5', className)}
                value={value}
                disabled={disabled}
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
