import React, { Component, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
    ArrowLeft,
    Loader2,
    Save,
    Maximize2,
    Type,
    MessageSquare,
    History,
    PanelTopClose,
    Orbit,
    Star,
    ChevronDown,
    Trash2,
    Undo2,
    Redo2,
    X,
    AlertTriangle,
    Info,
} from 'lucide-react';
import '../notion-nest.css';
import NotionPage from '../NotionPage';
import { loadNotionRecordContext, saveNotionPage, loadPageVersions, loadPageVersionData, savePageVersion } from '../notionPageStorage';
import { NOTION_PAGE_STORAGE_KEY, type NotionPagePayload, type NotionRecordContext } from '../types';
const SAVE_DEBOUNCE_MS = 900;
class NotionEditorErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean; error: string }> {
    state = { hasError: false, error: '' };
    static getDerivedStateFromError(err: any) { return { hasError: true, error: err?.message || String(err) }; }
    componentDidCatch(err: any) { console.error("Notion editor error:", err); }
    render() {
        if (this.state.hasError) {
            return (
                <div className="notion-nest-loader flex-col gap-2">
                    <p className="text-lg font-semibold">Something went wrong loading the editor.</p>
                    <p className="text-sm text-red-500">Error: {this.state.error}</p>
                    <p className="text-sm">Please try refreshing the page.</p>
                    <button
                        type="button"
                        className="mt-2 px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                        onClick={() => this.setState({ hasError: false, error: '' })}
                    >
                        Retry
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

export const POPULAR_FONTS = [
    { id: 'sans-serif', name: 'Sans (Default)', css: 'sans-serif' },
    { id: 'serif', name: 'Serif (Georgia)', css: 'Georgia, serif' },
    { id: 'mono', name: 'Mono (Monospace)', css: 'monospace' },
    { id: 'Arial', name: 'Arial', css: 'Arial, sans-serif' },
    { id: 'Helvetica', name: 'Helvetica', css: 'Helvetica, sans-serif' },
    { id: 'Verdana', name: 'Verdana', css: 'Verdana, sans-serif' },
    { id: 'Trebuchet MS', name: 'Trebuchet MS', css: '"Trebuchet MS", sans-serif' },
    { id: 'Times New Roman', name: 'Times New Roman', css: '"Times New Roman", serif' },
    { id: 'Georgia', name: 'Georgia', css: 'Georgia, serif' },
    { id: 'Garamond', name: 'Garamond', css: 'Garamond, serif' },
    { id: 'Baskerville', name: 'Baskerville', css: 'Baskerville, serif' },
    { id: 'Palatino', name: 'Palatino', css: 'Palatino, serif' },
    { id: 'Courier New', name: 'Courier New', css: '"Courier New", monospace' },
    { id: 'Consolas', name: 'Consolas', css: 'Consolas, monospace' },
    { id: 'Monaco', name: 'Monaco', css: 'Monaco, monospace' },
    { id: 'Comic Sans MS', name: 'Comic Sans MS', css: '"Comic Sans MS", cursive' },
    { id: 'Impact', name: 'Impact', css: 'Impact, sans-serif' },
    { id: 'Futura', name: 'Futura', css: 'Futura, sans-serif' },
    { id: 'Gill Sans', name: 'Gill Sans', css: '"Gill Sans", sans-serif' },
    { id: 'Optima', name: 'Optima', css: 'Optima, sans-serif' },
    { id: 'Didot', name: 'Didot', css: 'Didot, serif' },
    { id: 'Calibri', name: 'Calibri', css: 'Calibri, sans-serif' },
    { id: 'Candara', name: 'Candara', css: 'Candara, sans-serif' },
    { id: 'Century Gothic', name: 'Century Gothic', css: '"Century Gothic", sans-serif' },
    { id: 'Geneva', name: 'Geneva', css: 'Geneva, sans-serif' },
    { id: 'Copperplate', name: 'Copperplate', css: 'Copperplate, serif' },
    { id: 'Inter', name: 'Inter', css: 'Inter, sans-serif' },
    { id: 'Roboto', name: 'Roboto', css: 'Roboto, sans-serif' },
    { id: 'Open Sans', name: 'Open Sans', css: '"Open Sans", sans-serif' },
    { id: 'Lato', name: 'Lato', css: 'Lato, sans-serif' },
    { id: 'Montserrat', name: 'Montserrat', css: 'Montserrat, sans-serif' },
    { id: 'Oswald', name: 'Oswald', css: 'Oswald, sans-serif' },
    { id: 'Raleway', name: 'Raleway', css: 'Raleway, sans-serif' },
    { id: 'Poppins', name: 'Poppins', css: 'Poppins, sans-serif' },
    { id: 'Playfair Display', name: 'Playfair Display', css: '"Playfair Display", serif' },
    { id: 'Merriweather', name: 'Merriweather', css: 'Merriweather, serif' },
    { id: 'Lora', name: 'Lora', css: 'Lora, serif' },
    { id: 'Noto Sans', name: 'Noto Sans', css: '"Noto Sans", sans-serif' },
    { id: 'Nunito', name: 'Nunito', css: 'Nunito, sans-serif' },
    { id: 'Ubuntu', name: 'Ubuntu', css: 'Ubuntu, sans-serif' },
    { id: 'PT Sans', name: 'PT Sans', css: '"PT Sans", sans-serif' },
    { id: 'PT Serif', name: 'PT Serif', css: '"PT Serif", serif' },
    { id: 'Quicksand', name: 'Quicksand', css: 'Quicksand, sans-serif' },
    { id: 'Arimo', name: 'Arimo', css: 'Arimo, sans-serif' },
    { id: 'Muli', name: 'Muli', css: 'Muli, sans-serif' },
    { id: 'Josefin Sans', name: 'Josefin Sans', css: '"Josefin Sans", sans-serif' },
    { id: 'Cabin', name: 'Cabin', css: 'Cabin, sans-serif' },
    { id: 'Lobster', name: 'Lobster', css: 'Lobster, cursive' },
    { id: 'Pacifico', name: 'Pacifico', css: 'Pacifico, cursive' },
    { id: 'Dancing Script', name: 'Dancing Script', css: '"Dancing Script", cursive' }
];

export function loadGoogleFont(fontFamilyName: string) {
    const googleFonts = [
        'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Oswald', 'Raleway',
        'Poppins', 'Playfair Display', 'Merriweather', 'Lora', 'Noto Sans', 'Nunito',
        'Ubuntu', 'PT Sans', 'PT Serif', 'Quicksand', 'Arimo', 'Muli', 'Josefin Sans',
        'Cabin', 'Lobster', 'Pacifico', 'Dancing Script'
    ];
    if (googleFonts.includes(fontFamilyName)) {
        const id = `gfont-${fontFamilyName.replace(/\s+/g, '-').toLowerCase()}`;
        if (!document.getElementById(id)) {
            const link = document.createElement('link');
            link.id = id;
            link.rel = 'stylesheet';
            link.href = `https://fonts.googleapis.com/css2?family=${fontFamilyName.replace(/\s+/g, '+')}:wght@400;500;700&display=swap`;
            document.head.appendChild(link);
        }
    }
}

export function clearBlockFonts(blocks: any[]): any[] {
    if (!blocks) return [];
    return blocks.map(b => {
        const nextBlock = { ...b };
        delete nextBlock.fontFamily;
        delete nextBlock.fontSize;
        if (nextBlock.children) {
            nextBlock.children = clearBlockFonts(nextBlock.children);
        }
        if (nextBlock.tabs) {
            nextBlock.tabs = nextBlock.tabs.map((t: any) => ({
                ...t,
                blocks: clearBlockFonts(t.blocks)
            }));
        }
        if (nextBlock.columns) {
            nextBlock.columns = nextBlock.columns.map((c: any) => ({
                ...c,
                blocks: clearBlockFonts(c.blocks)
            }));
        }
        return nextBlock;
    });
}

interface FontSettingsPanelProps {
    onForceApplyAll?: () => void;
    fontFamily: string;
    fontSize: number;
    fontFavorites: string[];
    onChangeFontFamily: (fontId: string) => void;
    onChangeFontSize: (fontSize: number) => void;
    onChangeFavorites: (favorites: string[]) => void;
    onReset?: () => void;
    showReset?: boolean;
}

export function FontSettingsPanel({
    fontFamily,
    fontSize,
    fontFavorites,
    onChangeFontFamily,
    onChangeFontSize,
    onChangeFavorites,
    onReset,
    showReset = true,
    onForceApplyAll,
}: FontSettingsPanelProps) {
    const [dropdownFont, setDropdownFont] = useState(fontFamily);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [favoriteWarning, setFavoriteWarning] = useState<string | null>(null);

    const fontDropdownRef = useRef<HTMLDivElement>(null);
    const dropdownBtnRef = useRef<HTMLButtonElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setDropdownFont(fontFamily);
    }, [fontFamily]);

    useEffect(() => {
        if (!dropdownOpen) return;
        const handler = (e: MouseEvent) => {
            if (fontDropdownRef.current && !fontDropdownRef.current.contains(e.target as Node)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [dropdownOpen]);

    const handleToggleFavorite = (fontId: string) => {
        if (fontFavorites.includes(fontId)) {
            const nextFavs = fontFavorites.filter(id => id !== fontId);
            onChangeFavorites(nextFavs);
        } else {
            if (fontFavorites.length >= 3) {
                setFavoriteWarning('Only 3 favorites allowed');
                setTimeout(() => setFavoriteWarning(null), 3000);
                return;
            }
            const nextFavs = [...fontFavorites, fontId];
            onChangeFavorites(nextFavs);
        }
    };

    const scrollSelectedItemIntoView = (fontId: string) => {
        setTimeout(() => {
            const element = document.getElementById(`nn-font-item-${fontId.replace(/\s+/g, '-')}`);
            if (element) {
                element.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
        }, 50);
    };

    const handleSearchInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        const filtered = POPULAR_FONTS.filter(f =>
            f.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
        if (filtered.length === 0) return;

        const currentIndex = filtered.findIndex(f => f.id === dropdownFont);
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % filtered.length;
            const targetFont = filtered[nextIndex];
            setDropdownFont(targetFont.id);
            onChangeFontFamily(targetFont.id);
            scrollSelectedItemIntoView(targetFont.id);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const prevIndex = currentIndex === -1 ? filtered.length - 1 : (currentIndex - 1 + filtered.length) % filtered.length;
            const targetFont = filtered[prevIndex];
            setDropdownFont(targetFont.id);
            onChangeFontFamily(targetFont.id);
            scrollSelectedItemIntoView(targetFont.id);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            setDropdownOpen(false);
            setSearchQuery('');
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setDropdownOpen(false);
            setSearchQuery('');
        }
    };

    const handleSelectBtnKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
        if (dropdownOpen) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            const currentIndex = POPULAR_FONTS.findIndex(f => f.id === dropdownFont);
            const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % POPULAR_FONTS.length;
            const targetFont = POPULAR_FONTS[nextIndex];
            setDropdownFont(targetFont.id);
            onChangeFontFamily(targetFont.id);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const currentIndex = POPULAR_FONTS.findIndex(f => f.id === dropdownFont);
            const prevIndex = currentIndex === -1 ? POPULAR_FONTS.length - 1 : (currentIndex - 1 + POPULAR_FONTS.length) % POPULAR_FONTS.length;
            const targetFont = POPULAR_FONTS[prevIndex];
            setDropdownFont(targetFont.id);
            onChangeFontFamily(targetFont.id);
        }
    };

    return (
        <div className="nn-font-dropdown-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div className="nncs-label" style={{ margin: 0 }}>Font Style</div>
                {showReset && onReset && (
                    <button
                        type="button"
                        onClick={onReset}
                        className="nn-font-reset-btn"
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#706e6b',
                            fontSize: '11px',
                            cursor: 'pointer',
                            padding: '2px 4px',
                            borderRadius: '3px',
                        }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f3f2f1'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        Reset
                    </button>
                )}
            </div>
            <div className="nn-font-row">
                {Array.from({ length: 3 }).map((_, i) => {
                    if (i < fontFavorites.length) {
                        const favId = fontFavorites[i];
                        const font = POPULAR_FONTS.find(f => f.id === favId) || { id: favId, name: favId, css: favId };
                        const isActive = fontFamily === favId;
                        return (
                            <button
                                key={`fav-${favId}`}
                                type="button"
                                className={`nn-font-card ${isActive ? 'active' : ''}`}
                                onClick={() => {
                                    onChangeFontFamily(favId);
                                    setDropdownFont(favId);
                                }}
                            >
                                <span className="nn-font-preview" style={{ fontFamily: font.css }}>Ag</span>
                                <span className="nn-font-name">{font.name}</span>
                                <button
                                    type="button"
                                    className="nn-card-fav-star"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleFavorite(favId);
                                    }}
                                    title="Remove from favorites"
                                >
                                    <Star className="w-3.5 h-3.5 fill-yellow-400 stroke-yellow-500" style={{ fill: '#ffb024', color: '#ffb024' }} />
                                </button>
                            </button>
                        );
                    } else {
                        return (
                            <div key={`empty-fav-${i}`} className="nn-font-card placeholder-slot">
                                <span className="placeholder-icon">+</span>
                                <span className="placeholder-label">Empty</span>
                            </div>
                        );
                    }
                })}
                {(() => {
                    const font = POPULAR_FONTS.find(f => f.id === dropdownFont) || { id: dropdownFont, name: dropdownFont, css: dropdownFont };
                    const isActive = fontFamily === dropdownFont;
                    const isFav = fontFavorites.includes(dropdownFont);
                    return (
                        <button
                            type="button"
                            className={`nn-font-card custom-selected-card ${isActive ? 'active' : ''}`}
                            onClick={() => onChangeFontFamily(dropdownFont)}
                        >
                            <span className="nn-font-custom-badge">Selected</span>
                            <span className="nn-font-preview" style={{ fontFamily: font.css }}>Ag</span>
                            <span className="nn-font-name">{font.name}</span>
                            <button
                                type="button"
                                className="nn-card-fav-star"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleFavorite(dropdownFont);
                                }}
                                title={isFav ? "Remove from favorites" : "Add to favorites"}
                            >
                                <Star
                                    className="w-3.5 h-3.5"
                                    style={{
                                        fill: isFav ? '#ffb024' : 'none',
                                        color: isFav ? '#ffb024' : '#706e6b'
                                    }}
                                />
                            </button>
                        </button>
                    );
                })()}
            </div>

            {favoriteWarning && (
                <div className="nn-font-warning">
                    {favoriteWarning}
                </div>
            )}

            <div className="nncs-divider" />

            <div className="nn-font-select-container" ref={fontDropdownRef}>
                <button
                    ref={dropdownBtnRef}
                    type="button"
                    className="nn-font-dropdown-select-btn"
                    onClick={() => setDropdownOpen(v => !v)}
                    onKeyDown={handleSelectBtnKeyDown}
                >
                    <span>{POPULAR_FONTS.find(f => f.id === dropdownFont)?.name || dropdownFont}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                </button>
                {dropdownOpen && (
                    <div className="nn-font-dropdown-select-panel">
                        <input
                            ref={searchInputRef}
                            type="text"
                            className="nn-font-search-input"
                            placeholder="Search fonts..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={handleSearchInputKeyDown}
                            autoFocus
                        />
                        <div className="nn-font-dropdown-list">
                            {POPULAR_FONTS.filter(f =>
                                f.name.toLowerCase().includes(searchQuery.toLowerCase())
                            ).map(font => {
                                const isFav = fontFavorites.includes(font.id);
                                return (
                                    <div
                                        id={`nn-font-item-${font.id.replace(/\s+/g, '-')}`}
                                        key={font.id}
                                        className={`nn-font-dropdown-item ${font.id === dropdownFont ? 'selected' : ''}`}
                                        onClick={() => {
                                            setDropdownFont(font.id);
                                            onChangeFontFamily(font.id);
                                            setDropdownOpen(false);
                                            setSearchQuery('');
                                            setTimeout(() => dropdownBtnRef.current?.focus(), 50);
                                        }}
                                    >
                                        <span style={{ fontFamily: font.css }}>{font.name}</span>
                                        <button
                                            type="button"
                                            className="nn-font-fav-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleToggleFavorite(font.id);
                                            }}
                                            title={isFav ? "Remove from favorites" : "Add to favorites"}
                                        >
                                            <Star
                                                className="w-3.5 h-3.5"
                                                style={{
                                                    fill: isFav ? '#ffb024' : 'none',
                                                    color: isFav ? '#ffb024' : '#706e6b'
                                                }}
                                            />
                                        </button>
                                    </div>
                                );
                            })}
                            {POPULAR_FONTS.filter(f =>
                                f.name.toLowerCase().includes(searchQuery.toLowerCase())
                            ).length === 0 && (
                                <div className="text-xs text-gray-500 p-2 text-center">No fonts found</div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="nncs-divider" />
            {onForceApplyAll && (
                <button
                    type="button"
                    className="w-full text-[11px] py-1.5 px-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded transition-colors font-medium flex items-center justify-center gap-1.5 mb-3.5 border border-amber-500/20"
                    onClick={onForceApplyAll}
                    title="Override all custom block fonts on the entire page"
                >
                    ⚡ Apply font to all blocks
                </button>
            )}
            <div className="nncs-label">Font Size</div>
            <div className="nn-size-slider-container">
                <input
                    type="range"
                    min="-2"
                    max="2"
                    step="1"
                    value={fontSize}
                    onChange={(e) => {
                        onChangeFontSize(Number(e.target.value));
                    }}
                    className="nn-size-slider"
                />
                <div className="nn-size-labels">
                    <span className={fontSize === -2 ? 'active' : ''}>-2</span>
                    <span className={fontSize === -1 ? 'active' : ''}>-1</span>
                    <span className={fontSize === 0 ? 'active' : ''}>0</span>
                    <span className={fontSize === 1 ? 'active' : ''}>+1</span>
                    <span className={fontSize === 2 ? 'active' : ''}>+2</span>
                </div>
            </div>
        </div>
    );
}

export default function NotionNestPage() {
    const { objectId, recordId } = useParams<{ objectId: string; recordId: string }>();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [ctx, setCtx] = useState<NotionRecordContext | null>(null);
    const [title, setTitle] = useState('');
    const [page, setPage] = useState<NotionPagePayload | null>(null);
    const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const dirtyRef = useRef(false);
    const saveCountRef = useRef(0);
    const CHECKPOINT_INTERVAL = 50;
    // Comments visibility settings (persisted in page state/payload)
    const [showCommentSettings, setShowCommentSettings] = useState(false);
    const commentSettingsRef = useRef<HTMLDivElement>(null);
    const [showAuditSettings, setShowAuditSettings] = useState(false);
    const auditSettingsRef = useRef<HTMLDivElement>(null);
    const [showFreezeSettings, setShowFreezeSettings] = useState(false);
    const freezeSettingsRef = useRef<HTMLDivElement>(null);
    const [showDeleteSettings, setShowDeleteSettings] = useState(false);
    const deleteSettingsRef = useRef<HTMLDivElement>(null);
    const [showFontSettings, setShowFontSettings] = useState(false);
    const fontSettingsRef = useRef<HTMLDivElement>(null);
    const [showForceFontModal, setShowForceFontModal] = useState(false);
    const pageCtxRef = useRef<{ clearAllBlockFonts: () => void } | null>(null);

    // Undo/Redo state (triggered by PageContext history manager)
    const [, forceUpdate] = useState(0);
    const tickRef = useRef(0);
    const triggerHistoryUpdate = useCallback(() => {
        tickRef.current++;
        forceUpdate(n => n + 1);
    }, []);

    // Version History Modal state
    const [showVersionHistory, setShowVersionHistory] = useState(false);
    const [versionList, setVersionList] = useState<{ id: number; saveNumber: number; createdAt: string }[]>([]);
    const [loadingVersions, setLoadingVersions] = useState(false);
    const [restoringVersion, setRestoringVersion] = useState<number | null>(null);

    // Long-press undo state
    const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const LONG_PRESS_MS = 7000;

    const commentsAlwaysShow = page?.commentsAlwaysShow ?? false;
    const commentsAlwaysOff = page?.commentsAlwaysOff ?? false;
    const autoHideDelay = page?.commentsAutoHideDelay ?? 30;
    const commentsHoverMode = page?.commentsHoverMode ?? 'text';
    const showAuditMetadata = page?.showAuditMetadata ?? false;
    const showAuditCreatedOn = page?.showAuditCreatedOn ?? true;
    const showAuditCreatedBy = page?.showAuditCreatedBy ?? true;
    const showAuditModifiedOn = page?.showAuditModifiedOn ?? true;
    const showAuditModifiedBy = page?.showAuditModifiedBy ?? true;
    const showAuditWordCount = page?.showAuditWordCount ?? true;
    const freezeTitle = page?.freezeTitle ?? false;
    const restrictedDeletion = page?.restrictedDeletion ?? false;
    const fontFamily = page?.fontFamily ?? 'sans-serif';
    const fontFavorites = page?.fontFavorites ?? ['sans-serif', 'serif', 'mono'];
    const fontSize = page?.fontSize ?? 0;


    // Load google fonts when fontFamily or favorites list changes
    useEffect(() => {
        if (fontFamily) {
            loadGoogleFont(fontFamily);
        }
        fontFavorites.forEach(fav => {
            loadGoogleFont(fav);
        });
    }, [fontFamily, fontFavorites]);

    // Dynamic Font Loader: Scan active blocks for custom block-level fontFamily and load them
    useEffect(() => {
        if (!page?.blocks) return;
        const fontFamilies = new Set<string>();
        const collectFonts = (blocks: any[]) => {
            for (const b of blocks) {
                if (b.fontFamily) {
                    fontFamilies.add(b.fontFamily);
                }
                if (b.children) collectFonts(b.children);
                if (b.tabs) b.tabs.forEach((t: any) => collectFonts(t.blocks));
                if (b.columns) b.columns.forEach((c: any) => collectFonts(c.blocks));
            }
        };
        collectFonts(page.blocks);
        fontFamilies.forEach(f => {
            loadGoogleFont(f);
        });
    }, [page?.blocks]);

    const updatePageSettings = (patch: {
        commentsAlwaysShow?: boolean;
        commentsAlwaysOff?: boolean;
        commentsAutoHideDelay?: number;
        commentsHoverMode?: 'text' | 'region' | 'both';
        showAuditMetadata?: boolean;
        showAuditCreatedOn?: boolean;
        showAuditCreatedBy?: boolean;
        showAuditModifiedOn?: boolean;
        showAuditModifiedBy?: boolean;
        showAuditWordCount?: boolean;
        freezeTitle?: boolean;
        restrictedDeletion?: boolean;
        fontFamily?: string;
        fontFavorites?: string[];
        fontSize?: -2 | -1 | 0 | 1 | 2;
    }) => {
        if (!page) return;
        const fontChanged = patch.fontFamily !== undefined || patch.fontSize !== undefined;
        const nextBlocks = fontChanged
            ? clearBlockFonts(page.blocks)
            : page.blocks;
        if (fontChanged) {
            pageCtxRef.current?.clearAllBlockFonts();
        }
        const next = {
            ...page,
            blocks: nextBlocks,
            commentsAlwaysShow: patch.commentsAlwaysShow !== undefined ? patch.commentsAlwaysShow : commentsAlwaysShow,
            commentsAlwaysOff: patch.commentsAlwaysOff !== undefined ? patch.commentsAlwaysOff : commentsAlwaysOff,
            commentsAutoHideDelay: patch.commentsAutoHideDelay !== undefined ? patch.commentsAutoHideDelay : autoHideDelay,
            commentsHoverMode: patch.commentsHoverMode !== undefined ? patch.commentsHoverMode : commentsHoverMode,
            showAuditMetadata: patch.showAuditMetadata !== undefined ? patch.showAuditMetadata : showAuditMetadata,
            showAuditCreatedOn: patch.showAuditCreatedOn !== undefined ? patch.showAuditCreatedOn : showAuditCreatedOn,
            showAuditCreatedBy: patch.showAuditCreatedBy !== undefined ? patch.showAuditCreatedBy : showAuditCreatedBy,
            showAuditModifiedOn: patch.showAuditModifiedOn !== undefined ? patch.showAuditModifiedOn : showAuditModifiedOn,
            showAuditModifiedBy: patch.showAuditModifiedBy !== undefined ? patch.showAuditModifiedBy : showAuditModifiedBy,
            showAuditWordCount: patch.showAuditWordCount !== undefined ? patch.showAuditWordCount : showAuditWordCount,
            freezeTitle: patch.freezeTitle !== undefined ? patch.freezeTitle : freezeTitle,
            restrictedDeletion: patch.restrictedDeletion !== undefined ? patch.restrictedDeletion : restrictedDeletion,
            fontFamily: patch.fontFamily !== undefined ? patch.fontFamily : fontFamily,
            fontFavorites: patch.fontFavorites !== undefined ? patch.fontFavorites : fontFavorites,
            fontSize: patch.fontSize !== undefined ? patch.fontSize : fontSize
        };
        setPage(next);
        scheduleSave(title, next);
    };

    
    const forceApplyFontToAll = () => {
        if (!page) return;
        pageCtxRef.current?.clearAllBlockFonts();
        const nextBlocks = clearBlockFonts(page.blocks);
        const next = {
            ...page,
            blocks: nextBlocks,
            fontFamily,
            fontSize
        };
        setPage(next);
        scheduleSave(title, next);
    };

    const resetAllSettingsToDefault = () => {
        if (!page) return;
        const next: NotionPagePayload = {
            ...page,
            blocks: clearBlockFonts(page.blocks),
            fontFamily: 'sans-serif',
            fontFavorites: ['sans-serif', 'serif', 'mono'],
            fontSize: 0,
            fullWidth: false,
            commentsAlwaysShow: false,
            commentsAlwaysOff: false,
            commentsAutoHideDelay: 30,
            commentsHoverMode: 'text',
            showAuditMetadata: false,
            showAuditCreatedOn: true,
            showAuditCreatedBy: true,
            showAuditModifiedOn: true,
            showAuditModifiedBy: true,
            showAuditWordCount: true,
            freezeTitle: false,
            restrictedDeletion: false,
        };
        setPage(next);
        scheduleSave(title, next);
    };

    useEffect(() => {
        if (!showCommentSettings) return;
        const handler = (e: MouseEvent) => {
            if (commentSettingsRef.current && !commentSettingsRef.current.contains(e.target as Node)) {
                setShowCommentSettings(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showCommentSettings]);
    useEffect(() => {
        if (!showDeleteSettings) return;
        const handler = (e: MouseEvent) => {
            if (deleteSettingsRef.current && !deleteSettingsRef.current.contains(e.target as Node)) {
                setShowDeleteSettings(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showDeleteSettings]);
    useEffect(() => {
        if (!showAuditSettings) return;
        const handler = (e: MouseEvent) => {
            if (auditSettingsRef.current && !auditSettingsRef.current.contains(e.target as Node)) {
                setShowAuditSettings(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showAuditSettings]);
    useEffect(() => {
        if (!showFreezeSettings) return;
        const handler = (e: MouseEvent) => {
            if (freezeSettingsRef.current && !freezeSettingsRef.current.contains(e.target as Node)) {
                setShowFreezeSettings(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showFreezeSettings]);
    useEffect(() => {
        if (!showFontSettings) return;
        const handler = (e: MouseEvent) => {
            if (fontSettingsRef.current && !fontSettingsRef.current.contains(e.target as Node)) {
                setShowFontSettings(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showFontSettings]);

    // Keyboard shortcuts for undo/redo
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            const isMod = e.metaKey || e.ctrlKey;
            if (isMod && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                // Access PageContext undo via pageCtxRef — we'll call it via a custom event
                window.dispatchEvent(new CustomEvent('notion-nest-undo'));
                triggerHistoryUpdate();
            }
            if (isMod && e.key === 'z' && e.shiftKey) {
                e.preventDefault();
                window.dispatchEvent(new CustomEvent('notion-nest-redo'));
                triggerHistoryUpdate();
            }
            if (isMod && e.key === 'y') {
                e.preventDefault();
                window.dispatchEvent(new CustomEvent('notion-nest-redo'));
                triggerHistoryUpdate();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [triggerHistoryUpdate]);

    // Long-press undo handlers
    const handleUndoPointerDown = useCallback(() => {
        longPressTimerRef.current = setTimeout(() => {
            longPressTimerRef.current = null;
            setShowVersionHistory(true);
        }, LONG_PRESS_MS);
    }, []);

    const handleUndoPointerUp = useCallback(() => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
            window.dispatchEvent(new CustomEvent('notion-nest-undo'));
            triggerHistoryUpdate();
        }
    }, [triggerHistoryUpdate]);

    const handleUndoPointerLeave = useCallback(() => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    }, []);

    // Load version history when modal opens
    useEffect(() => {
        if (!showVersionHistory || !ctx) return;
        let cancelled = false;
        const load = async () => {
            setLoadingVersions(true);
            const { versions, error } = await loadPageVersions(ctx.ddataId);
            if (!cancelled) {
                setVersionList(versions);
                setLoadingVersions(false);
            }
        };
        void load();
        return () => { cancelled = true; };
    }, [showVersionHistory, ctx]);

    // Restore from a version checkpoint
    const handleRestoreVersion = useCallback(async (versionId: number, saveNumber: number) => {
        if (!ctx) return;
        setRestoringVersion(versionId);
        const { data, error } = await loadPageVersionData(versionId);
        if (error || !data) {
            setRestoringVersion(null);
            return;
        }
        // Restore via custom event -> PageContext
        window.dispatchEvent(new CustomEvent('notion-nest-restore-checkpoint', { detail: { snapshot: data } }));
        setRestoringVersion(null);
        setShowVersionHistory(false);
        triggerHistoryUpdate();
    }, [ctx, triggerHistoryUpdate]);

    useEffect(() => {
        let cancelled = false;
        const run = async () => {
            if (!objectId || !recordId) {
                if (!cancelled) {
                    setError('Missing page route.');
                    setLoading(false);
                }
                return;
            }
            if (!cancelled) {
                setLoading(true);
                setError(null);
            }
            try {
                const { data, error: loadErr } = await loadNotionRecordContext(objectId, recordId);
                if (cancelled) return;
                if (loadErr || !data) {
                    setError(loadErr ?? 'Unable to load page.');
                    setCtx(null);
                    setPage(null);
                    return;
                }
                setCtx(data);
                setTitle(data.title);
                setPage(data.page);
                setError(null);
                const rawName = String(data.rawValues.sys_record_name ?? '').trim();
                const isUntitled = !rawName || rawName.toLowerCase() === 'untitled';
                if (data.rawValues[NOTION_PAGE_STORAGE_KEY] == null || isUntitled) {
                    const nextPage = { ...data.page };
                    if (nextPage.blocks && nextPage.blocks.length > 0 && nextPage.blocks[0].content === 'Untitled') {
                        nextPage.blocks = [
                            { ...nextPage.blocks[0], content: data.title },
                            ...nextPage.blocks.slice(1)
                        ];
                        setPage(nextPage);
                    }
                    window.setTimeout(() => {
                        if (!cancelled) void saveNotionPage(data, { title: data.title, page: nextPage });
                    }, 0);
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : 'Unable to load page.');
                    setCtx(null);
                    setPage(null);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        void run();
        return () => {
            cancelled = true;
        };
    }, [objectId, recordId]);

    // URL Hash Block Navigation & Address Bar Clean-up
    useEffect(() => {
        if (loading) return;

        const handleHashChange = () => {
            const hash = window.location.hash ? window.location.hash.substring(1) : '';
            if (!hash) return;

            // Try to find the block element after render completes
            setTimeout(() => {
                const blockEl = document.querySelector(`[data-block-id="${hash}"]`);
                if (blockEl) {
                    blockEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    blockEl.classList.add('nn-block-highlight');
                    // Remove highlight class after animation finishes (e.g. 3s)
                    setTimeout(() => {
                        blockEl.classList.remove('nn-block-highlight');
                    }, 3000);
                    
                    // Clear the hash from address bar
                    window.history.replaceState(
                        null,
                        document.title,
                        window.location.pathname + window.location.search
                    );
                }
            }, 100);
        };

        handleHashChange();
        window.addEventListener('hashchange', handleHashChange);
        return () => {
            window.removeEventListener('hashchange', handleHashChange);
        };
    }, [loading]);

    const recordsListPath = useMemo(
        () => `/objects/${encodeURIComponent(String(objectId ?? ''))}/records`,
        [objectId],
    );
    const persist = useCallback(
        async (nextTitle: string, nextPage: NotionPagePayload) => {
            if (!ctx) return;
            setSaveState('saving');
            const { error: saveErr } = await saveNotionPage(ctx, {
                title: nextTitle,
                page: nextPage,
            });
            if (saveErr) {
                setSaveState('error');
                return;
            }
            setCtx((prev) =>
                prev
                    ? {
                        ...prev,
                        title: nextTitle,
                        page: nextPage,
                        rawValues: {
                            ...prev.rawValues,
                            sys_record_name: nextTitle,
                        },
                    }
                    : prev,
            );
            dirtyRef.current = false;
            setSaveState('saved');
            window.setTimeout(() => setSaveState('idle'), 2000);

            // Track save count for positional checkpoints
            saveCountRef.current++;
            if (saveCountRef.current > 0 && saveCountRef.current % CHECKPOINT_INTERVAL === 0) {
                void savePageVersion(ctx.ddataId, saveCountRef.current, nextPage);
            }
        },
        [ctx],
    );
    const scheduleSave = useCallback(
        (nextTitle: string, nextPage: NotionPagePayload) => {
            dirtyRef.current = true;
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
            saveTimerRef.current = setTimeout(() => {
                void persist(nextTitle, nextPage);
            }, SAVE_DEBOUNCE_MS);
        },
        [persist],
    );
    useEffect(
        () => () => {
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        },
        [],
    );
    const handlePageChange = (nextState: { title: string; icon: string; cover: string | null; coverPosition?: number; blocks: any[]; comments?: any[] }) => {
        if (!page) return;
        const nextPage: NotionPagePayload = {
            version: 1,
            icon: nextState.icon,
            coverUrl: nextState.cover || '',
            coverPosition: nextState.coverPosition !== undefined ? nextState.coverPosition : (page.coverPosition ?? 50),
            fullWidth: page.fullWidth,
            smallText: page.smallText,
            blocks: nextState.blocks,
            comments: nextState.comments || [],
            commentsAlwaysShow,
            commentsAlwaysOff,
            commentsAutoHideDelay: autoHideDelay,
            commentsHoverMode,
            showAuditMetadata,
            showAuditCreatedOn,
            showAuditCreatedBy,
            showAuditModifiedOn,
            showAuditModifiedBy,
            showAuditWordCount,
            freezeTitle,
            restrictedDeletion,
            fontFamily,
            fontFavorites,
            fontSize,
            updatedAt: new Date().toISOString(),
        };
        const titleChanged = nextState.title !== title;
        const pageChanged = JSON.stringify(nextState.blocks) !== JSON.stringify(page.blocks) ||
            nextState.icon !== page.icon ||
            (nextState.cover || '') !== page.coverUrl ||
            nextState.coverPosition !== page.coverPosition ||
            JSON.stringify(nextState.comments || []) !== JSON.stringify(page.comments || []);
        if (titleChanged || pageChanged) {
            setTitle(nextState.title);
            setPage(nextPage);
            scheduleSave(nextState.title, nextPage);
        }
    };
    const toggleFullWidth = () => {
        if (!page) return;
        const next = { ...page, fullWidth: !page.fullWidth };
        setPage(next);
        scheduleSave(title, next);
    };

    const handleManualSave = () => {
        if (!page) return;
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        void persist(title, page);
    };

    const initialAuditData = useMemo(() => ({
        createdAt: ctx?.createdAt,
        updatedAt: ctx?.updatedAt,
        createdById: ctx?.createdById,
        modifiedById: ctx?.modifiedById,
        showAuditMetadata,
        showAuditCreatedOn,
        showAuditCreatedBy,
        showAuditModifiedOn,
        showAuditModifiedBy,
        showAuditWordCount,
        freezeTitle,
    }), [
        ctx,
        showAuditMetadata,
        showAuditCreatedOn,
        showAuditCreatedBy,
        showAuditModifiedOn,
        showAuditModifiedBy,
        showAuditWordCount,
        freezeTitle
    ]);

    if (loading) {
        return (
            <div className="notion-nest-loader">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                Loading page…
            </div>
        );
    }
    if (error || !ctx || !page) {
        return (
            <div className="notion-nest-error">
                <p className="notion-nest-error-message">{error ?? 'Page unavailable.'}</p>
                <Link to={recordsListPath} className="notion-nest-breadcrumb">
                    <ArrowLeft className="w-4 h-4" />
                    Back to records
                </Link>
            </div>
        );
    }
    return (
        <div className="notion-nest-shell-light">
            <header className="notion-nest-header">
                <div className="notion-nest-breadcrumb">
                    <Link to={recordsListPath}>
                        <ArrowLeft className="w-4 h-4" />
                        {ctx.objectLabel}
                    </Link>
                    <span>/</span>
                    <span>{title || 'Untitled'}</span>
                </div>
                <div className="notion-nest-actions-group">
                    {saveState === 'saving' && (
                        <span className="notion-nest-save-status saving">
                            <Loader2 className="w-3 h-3 animate-spin inline mr-1" /> Saving…
                        </span>
                    )}
                    {saveState === 'saved' && (
                        <span className="notion-nest-save-status saved">Saved</span>
                    )}
                    {saveState === 'error' && (
                        <span className="notion-nest-save-status error">Save failed</span>
                    )}
                    {saveState === 'idle' && dirtyRef.current && (
                        <span className="notion-nest-save-status unsaved">Unsaved</span>
                    )}

                    <div className="notion-nest-toggles-cluster">
                        <button
                            type="button"
                            className={`notion-nest-toggle-btn ${page.fullWidth ? 'active' : ''}`}
                            onClick={toggleFullWidth}
                            title="Toggle full width"
                        >
                            <Maximize2 className="w-4 h-4" />
                        </button>
                        <div className="nn-comment-toggle-wrap" ref={fontSettingsRef}>
                            <button
                                type="button"
                                className={`notion-nest-toggle-btn ${fontFamily !== 'sans-serif' || fontSize !== 0 ? 'active' : ''}`}
                                onClick={() => setShowFontSettings(v => !v)}
                                title="Font and Size settings"
                            >
                                <Type className="w-4 h-4" />
                            </button>
                            {showFontSettings && (
                                <div className="nn-comment-settings-dropdown nn-font-dropdown">
                                    <FontSettingsPanel
                                        fontFamily={fontFamily}
                                        fontSize={fontSize}
                                        fontFavorites={fontFavorites}
                                        onChangeFontFamily={(f) => updatePageSettings({ fontFamily: f })}
                                        onChangeFontSize={(s) => updatePageSettings({ fontSize: s as any })}
                                        onChangeFavorites={(favs) => updatePageSettings({ fontFavorites: favs })}
                                        onReset={resetAllSettingsToDefault}
                                        showReset={true}
                                        onForceApplyAll={() => setShowForceFontModal(true)}
                                    />
                                </div>
                            )}
                        </div>
                        <div className="nn-comment-toggle-wrap" ref={commentSettingsRef}>
                            <button
                                type="button"
                                className={`notion-nest-toggle-btn ${commentsAlwaysShow || commentsAlwaysOff ? 'active' : ''}`}
                                onClick={() => setShowCommentSettings(v => !v)}
                                title={commentsAlwaysShow ? 'Comments: Always visible' : commentsAlwaysOff ? 'Comments: Always hidden unless clicked' : `Comments: Auto-hide after ${autoHideDelay}s`}
                            >
                                <MessageSquare className="w-4 h-4" />
                            </button>
                            {showCommentSettings && (
                                <div className="nn-comment-settings-dropdown">
                                    <div className="nncs-label">Auto Timer</div>
                                    <select
                                        className="nncs-select"
                                        value={commentsAlwaysShow ? 'always' : commentsAlwaysOff ? 'off' : String(autoHideDelay)}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (val === 'always') {
                                                updatePageSettings({ commentsAlwaysShow: true, commentsAlwaysOff: false });
                                            } else if (val === 'off') {
                                                updatePageSettings({ commentsAlwaysShow: false, commentsAlwaysOff: true });
                                            } else {
                                                updatePageSettings({ commentsAlwaysShow: false, commentsAlwaysOff: false, commentsAutoHideDelay: Number(val) });
                                            }
                                        }}
                                    >
                                        <option value="always">Always Show</option>
                                        <option value="off">Always Off</option>
                                        <option value="30">30 seconds (default)</option>
                                        <option value="60">60 seconds</option>
                                        <option value="90">90 seconds</option>
                                        <option value="120">120 seconds</option>
                                    </select>

                                    <div className="nncs-divider" />

                                    <div className="nncs-label">Hover Activation</div>
                                    <select
                                        className="nncs-select"
                                        value={commentsHoverMode}
                                        onChange={(e) => {
                                            updatePageSettings({ commentsHoverMode: e.target.value as 'text' | 'region' | 'both' });
                                        }}
                                    >
                                        <option value="text">Comment Text (default)</option>
                                        <option value="region">Comment Region</option>
                                        <option value="both">Both Text and Region</option>
                                    </select>
                                </div>
                            )}
                        </div>
                        <div className="nn-comment-toggle-wrap" ref={auditSettingsRef}>
                            <button
                                type="button"
                                className={`notion-nest-toggle-btn ${showAuditMetadata ? 'active' : ''}`}
                                onClick={() => setShowAuditSettings(v => !v)}
                                title="Page audit settings"
                            >
                                <History className="w-4 h-4" />
                            </button>
                            {showAuditSettings && (
                                <div className="nn-comment-settings-dropdown">
                                    <div className="nncs-label">Audit Settings</div>
                                    <div className="nncs-item-toggle">
                                        <span>Show Audit Metadata</span>
                                        <label className="nn-toggle-switch">
                                            <input
                                                type="checkbox"
                                                checked={showAuditMetadata}
                                                onChange={() => updatePageSettings({ showAuditMetadata: !showAuditMetadata })}
                                            />
                                            <span className="nn-toggle-slider" />
                                        </label>
                                    </div>
                                    {showAuditMetadata && (
                                        <>
                                            <div className="nncs-divider" />
                                            <div className="nncs-label">Fields to Display</div>
                                            <div className="nncs-item-toggle nncs-sub-item">
                                                <span>Created On</span>
                                                <label className="nn-toggle-switch">
                                                    <input
                                                        type="checkbox"
                                                        checked={showAuditCreatedOn}
                                                        onChange={() => updatePageSettings({ showAuditCreatedOn: !showAuditCreatedOn })}
                                                    />
                                                    <span className="nn-toggle-slider" />
                                                </label>
                                            </div>
                                            <div className="nncs-item-toggle nncs-sub-item">
                                                <span>Created By</span>
                                                <label className="nn-toggle-switch">
                                                    <input
                                                        type="checkbox"
                                                        checked={showAuditCreatedBy}
                                                        onChange={() => updatePageSettings({ showAuditCreatedBy: !showAuditCreatedBy })}
                                                    />
                                                    <span className="nn-toggle-slider" />
                                                </label>
                                            </div>
                                            <div className="nncs-item-toggle nncs-sub-item">
                                                <span>Last Modified On</span>
                                                <label className="nn-toggle-switch">
                                                    <input
                                                        type="checkbox"
                                                        checked={showAuditModifiedOn}
                                                        onChange={() => updatePageSettings({ showAuditModifiedOn: !showAuditModifiedOn })}
                                                    />
                                                    <span className="nn-toggle-slider" />
                                                </label>
                                            </div>
                                            <div className="nncs-item-toggle nncs-sub-item">
                                                <span>Last Modified By</span>
                                                <label className="nn-toggle-switch">
                                                    <input
                                                        type="checkbox"
                                                        checked={showAuditModifiedBy}
                                                        onChange={() => updatePageSettings({ showAuditModifiedBy: !showAuditModifiedBy })}
                                                    />
                                                    <span className="nn-toggle-slider" />
                                                </label>
                                            </div>
                                            <div className="nncs-item-toggle nncs-sub-item">
                                                <span>Word Count</span>
                                                <label className="nn-toggle-switch">
                                                    <input
                                                        type="checkbox"
                                                        checked={showAuditWordCount}
                                                        onChange={() => updatePageSettings({ showAuditWordCount: !showAuditWordCount })}
                                                    />
                                                    <span className="nn-toggle-slider" />
                                                </label>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="nn-comment-toggle-wrap" ref={freezeSettingsRef}>
                            <button
                                type="button"
                                className={`notion-nest-toggle-btn ${freezeTitle ? 'active' : ''}`}
                                onClick={() => setShowFreezeSettings(v => !v)}
                                title="Freeze Title settings"
                            >
                                <PanelTopClose className="w-4 h-4" />
                            </button>
                            {showFreezeSettings && (
                                <div className="nn-comment-settings-dropdown">
                                    <div className="nncs-label">Title Settings</div>
                                    <div className="nncs-item-toggle">
                                        <span>Freeze Title</span>
                                        <label className="nn-toggle-switch">
                                            <input
                                                type="checkbox"
                                                checked={freezeTitle}
                                                onChange={() => updatePageSettings({ freezeTitle: !freezeTitle })}
                                            />
                                            <span className="nn-toggle-slider" />
                                        </label>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="nn-comment-toggle-wrap" ref={deleteSettingsRef}>
                            <button
                                type="button"
                                className={`notion-nest-toggle-btn ${restrictedDeletion ? 'active' : ''}`}
                                onClick={() => setShowDeleteSettings(v => !v)}
                                title="Restricted deletion settings"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                            {showDeleteSettings && (
                                <div className="nn-comment-settings-dropdown">
                                    <div className="nncs-label">Deletion Settings</div>
                                    <div className="nncs-item-toggle">
                                        <span>Restricted Deletion</span>
                                        <label className="nn-toggle-switch">
                                            <input
                                                type="checkbox"
                                                checked={restrictedDeletion}
                                                onChange={() => updatePageSettings({ restrictedDeletion: !restrictedDeletion })}
                                            />
                                            <span className="nn-toggle-slider" />
                                        </label>
                                    </div>
                                </div>
                            )}
                        </div>
                        <button
                            type="button"
                            className="notion-nest-toggle-btn nn-reset-all-btn"
                            onClick={resetAllSettingsToDefault}
                            title="Reset all settings to default"
                        >
                            <Orbit className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="notion-nest-undo-cluster">
                        <button
                            type="button"
                            className="notion-nest-toggle-btn"
                            onPointerDown={handleUndoPointerDown}
                            onPointerUp={handleUndoPointerUp}
                            onPointerLeave={handleUndoPointerLeave}
                            title="Undo (Ctrl+Z) — Hold for version history"
                        >
                            <Undo2 className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            className="notion-nest-toggle-btn"
                            onClick={() => {
                                window.dispatchEvent(new CustomEvent('notion-nest-redo'));
                                triggerHistoryUpdate();
                            }}
                            title="Redo (Ctrl+Shift+Z)"
                        >
                            <Redo2 className="w-4 h-4" />
                        </button>
                    </div>
                    <button
                        type="button"
                        className="notion-nest-btn-save"
                        onClick={handleManualSave}
                    >
                        <Save className="w-3.5 h-3.5" />
                        Save
                    </button>
                </div>
            </header>
            <div 
                style={{ '--nn-font-family': POPULAR_FONTS.find(f => f.id === fontFamily)?.css || fontFamily } as React.CSSProperties}
                className={`notion-app-container ${page.fullWidth ? 'is-full-width' : ''} ${fontSize === 0 ? 'nn-size-zero' : fontSize > 0 ? 'nn-size-plus' + fontSize : 'nn-size-minus' + Math.abs(fontSize)}`}
            >
                {showForceFontModal && (
                    <div className="fixed inset-0 bg-black/60 z-[99999] flex items-center justify-center p-4 animate-fadeIn" onClick={() => setShowForceFontModal(false)}>
                        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 max-w-md w-full shadow-2xl relative text-left" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center gap-3 text-amber-500 mb-3">
                                <AlertTriangle className="w-6 h-6 flex-shrink-0" />
                                <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 m-0">Force Apply Font to Entire Page?</h3>
                            </div>
                            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed mb-3">
                                This will override and clear all individual block-level font customizations across your entire document and apply <strong className="text-zinc-800 dark:text-zinc-200">[{POPULAR_FONTS.find(f => f.id === fontFamily)?.name || fontFamily}]</strong> to every block.
                            </p>
                            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 rounded-lg text-[11px] text-blue-700 dark:text-blue-300 mb-5 leading-normal flex gap-2">
                                <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-500" />
                                <div>
                                    <strong>Need section-specific styling?</strong> You can style individual blocks anytime without changing the rest of the page! Just right-click any block and select <em>Font Setup</em> in the context menu.
                                </div>
                            </div>
                            <div className="flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    className="px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                                    onClick={() => setShowForceFontModal(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="px-3 py-1.5 text-xs font-medium bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                                    onClick={() => {
                                        setShowForceFontModal(false);
                                        forceApplyFontToAll();
                                    }}
                                >
                                    Apply to All Blocks
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                <NotionEditorErrorBoundary>
                    <NotionPage
                        key={recordId}
                        initialBlocks={page.blocks}
                        initialTitle={title}
                        initialIcon={page.icon}
                        initialCover={page.coverUrl}
                        initialCoverPosition={page.coverPosition ?? 50}
                        initialComments={page.comments}
                        imperativeRef={pageCtxRef}
                        initialAuditData={initialAuditData}
                        onChange={handlePageChange}
                        showSidebar={false}
                        commentsAlwaysShow={commentsAlwaysShow}
                        commentsAlwaysOff={commentsAlwaysOff}
                        commentsAutoHideDelay={autoHideDelay}
                        commentsHoverMode={commentsHoverMode}
                        restrictedDeletion={restrictedDeletion}
                    />
                </NotionEditorErrorBoundary>
            </div>

            {/* Version History Modal */}
            {showVersionHistory && (
                <div className="nn-version-modal-overlay" onMouseDown={(e) => e.stopPropagation()}>
                    <div className="nn-version-modal">
                        <div className="nn-version-modal-header">
                            <h2 className="nn-version-modal-title">Version History</h2>
                            <button
                                type="button"
                                className="nn-version-modal-close"
                                onClick={() => setShowVersionHistory(false)}
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="nn-version-modal-body">
                            {loadingVersions ? (
                                <div className="nn-version-empty">
                                    <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                                    Loading versions…
                                </div>
                            ) : versionList.length === 0 ? (
                                <div className="nn-version-empty">
                                    No saved versions yet. Versions are created every 50 saves.
                                </div>
                            ) : (
                                versionList.map((v) => (
                                    <div key={v.id} className="nn-version-row">
                                        <div className="nn-version-info">
                                            <span className="version-label">Save #{v.saveNumber}</span>
                                            <span className="version-time">
                                                {new Date(v.createdAt).toLocaleString()}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            className="version-restore"
                                            disabled={restoringVersion === v.id}
                                            onClick={() => handleRestoreVersion(v.id, v.saveNumber)}
                                        >
                                            {restoringVersion === v.id ? (
                                                <Loader2 className="w-3 h-3 animate-spin inline" />
                                            ) : (
                                                'Restore'
                                            )}
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}