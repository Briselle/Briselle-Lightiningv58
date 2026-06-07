import React, { Component, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
    ArrowLeft,
    Loader2,
    Save,
    Maximize2,
    Type,
} from 'lucide-react';
import '../notion-nest.css';
import NotionPage from '../NotionPage';
import { loadNotionRecordContext, saveNotionPage } from '../notionPageStorage';
import { NOTION_PAGE_STORAGE_KEY, type NotionPagePayload, type NotionRecordContext } from '../types';

const SAVE_DEBOUNCE_MS = 900;

class NotionEditorErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean }> {
    state = { hasError: false };
    static getDerivedStateFromError() { return { hasError: true }; }
    componentDidCatch(err: any) { console.error("Notion editor error:", err); }
    render() {
        if (this.state.hasError) {
            return (
                <div className="notion-nest-loader flex-col gap-2">
                    <p className="text-lg font-semibold">Something went wrong loading the editor.</p>
                    <p className="text-sm">Please try refreshing the page.</p>
                </div>
            );
        }
        return this.props.children;
    }
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
                if (data.rawValues[NOTION_PAGE_STORAGE_KEY] == null) {
                    window.setTimeout(() => {
                        if (!cancelled) void saveNotionPage(data, { title: data.title, page: data.page });
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

    const handlePageChange = (nextState: { title: string; icon: string; cover: string | null; blocks: any[] }) => {
        if (!page) return;

        const nextPage: NotionPagePayload = {
            version: 1,
            icon: nextState.icon,
            coverUrl: nextState.cover || '',
            fullWidth: page.fullWidth,
            smallText: page.smallText,
            blocks: nextState.blocks,
            updatedAt: new Date().toISOString(),
        };

        const titleChanged = nextState.title !== title;
        const pageChanged = JSON.stringify(nextState.blocks) !== JSON.stringify(page.blocks) ||
                            nextState.icon !== page.icon ||
                            (nextState.cover || '') !== page.coverUrl;

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

    const toggleSmallText = () => {
        if (!page) return;
        const next = { ...page, smallText: !page.smallText };
        setPage(next);
        scheduleSave(title, next);
    };

    const handleManualSave = () => {
        if (!page) return;
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        void persist(title, page);
    };

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
                        <button
                            type="button"
                            className={`notion-nest-toggle-btn ${page.smallText ? 'active' : ''}`}
                            onClick={toggleSmallText}
                            title="Toggle small text"
                        >
                            <Type className="w-4 h-4" />
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

            <div className={`notion-app-container ${page.fullWidth ? 'is-full-width' : ''} ${page.smallText ? 'is-small-text' : ''}`}>
                <NotionEditorErrorBoundary>
                    <NotionPage
                        key={recordId}
                        initialBlocks={page.blocks}
                        initialTitle={title}
                        initialIcon={page.icon}
                        initialCover={page.coverUrl}
                        onChange={handlePageChange}
                        showSidebar={false}
                    />
                </NotionEditorErrorBoundary>
            </div>
        </div>
    );
}
