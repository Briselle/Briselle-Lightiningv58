import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { sanitizeNotionBlocks } from '../notionPageDefaults';
import '@blocknote/core/fonts/inter.css';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import { FormattingToolbarController, SideMenuController, SuggestionMenuController } from '@blocknote/react';
import '@blocknote/mantine/style.css';
import '../notion-tabs-indent-fix.css';
import '../notion-clone-tabs-reference.css';
import type { NotionPagePayload } from '../types';
import { notionBlockSchema } from '../notionBlockSchema';
import { uploadNotionFile } from '../notionUpload';
import { filterNotionSlashMenuItems } from '../notionSlashMenu';
import { normalizeEmbedUrl } from '../utils/embedUrl';
import NotionInsertToolbar from './NotionInsertToolbar';
import NotionSlashMenu from './NotionSlashMenu';
import NotionFormattingToolbar from './NotionFormattingToolbar';
import NotionFileViewerModal from './NotionFileViewerModal';
import type { NotionBlockNoteEditor } from '../notionBlockSchema';
import { applyTabDeepLinkFromHash, clearTabUrlHashIfPresent, parseTabDeepLinkHash } from '../utils/notionTabDeepLink';
import {
    handleTabArrowKeyDown,
    handleTabBackspaceKeyDown,
    handleTabEnterKeyDown,
} from '../utils/notionTabsEditing';
import { resolveInnermostManagedTabsBlockId } from '../utils/notionTabsTree';
import { exportNotionDocumentForSave } from '../utils/notionTabsActivate';
import NotionTabOverlaysRoot from './NotionTabOverlaysRoot';
import NotionSideMenu from './NotionSideMenu';
import {
    applySideMenuBlockBackgroundColor,
    applySideMenuBlockTextColor,
    refreshSideMenuBlock,
} from '../utils/notionSideMenuRefresh';
import { bindNotionSideMenuFreeze } from '../utils/notionSideMenuFreeze';
import { patchNotionSideMenuReferenceToBlockIndent } from '../utils/notionSideMenuReferencePatch';
type Props = {
    page: NotionPagePayload;
    recordId?: string;
    fullWidth: boolean;
    onChange: (page: NotionPagePayload) => void;
};

type FilePreview = { url: string; name?: string };

export default function NotionBlockEditor({ page, recordId, fullWidth, onChange }: Props) {
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;
    const pageRef = useRef(page);
    pageRef.current = page;
    const [filePreview, setFilePreview] = useState<FilePreview | null>(null);

    const initialBlocks = useMemo(() => sanitizeNotionBlocks(page.blocks), [page.blocks]);

    const editor = useCreateBlockNote(
        {
            schema: notionBlockSchema,
            initialContent: initialBlocks.length > 0 ? initialBlocks : undefined,
            uploadFile: uploadNotionFile,
            resolveFileUrl: async (url) => normalizeEmbedUrl(url),
            // Keeps block detection when pointer is over the left gutter / drag handle.
            sideMenuDetection: 'editor',
        },
        [recordId ?? '', initialBlocks.length === 0 ? 'empty' : 'has-blocks'],
    );

    const emitChange = useCallback(() => {
        const blocks = exportNotionDocumentForSave(editor);
        onChangeRef.current({
            ...pageRef.current,
            blocks,
            updatedAt: new Date().toISOString(),
        });
    }, [editor]);

    useEffect(() => {
        const unsub = editor.onChange(() => emitChange());
        return () => unsub();
    }, [editor, emitChange]);

    useEffect(() => {
        const shell = document.querySelector('.notion-nest-shell');
        if (!(shell instanceof HTMLElement)) return;

        const onKeyDown = (e: KeyboardEvent) => {
            const target = e.target;
            if (!(target instanceof Node)) return;
            if (!shell.contains(target)) return;
            if (target instanceof HTMLElement && target.closest('.notion-tabs-bar__rename-inline')) {
                return;
            }

            const notionEditor = editor as NotionBlockNoteEditor;
            const tabsBlockId = resolveInnermostManagedTabsBlockId(notionEditor);
            if (!tabsBlockId) return;

            if (e.key === 'Enter') {
                handleTabEnterKeyDown(notionEditor, tabsBlockId, e);
                return;
            }
            if (e.key === 'Backspace') {
                handleTabBackspaceKeyDown(notionEditor, tabsBlockId, e);
                return;
            }
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                handleTabArrowKeyDown(notionEditor, tabsBlockId, e);
            }
        };

        shell.addEventListener('keydown', onKeyDown, true);
        return () => shell.removeEventListener('keydown', onKeyDown, true);
    }, [editor]);

    useEffect(() => {
        let cancelled = false;
        let attempts = 0;

        const tryApplyDeepLink = () => {
            if (cancelled) return;
            if (!parseTabDeepLinkHash(window.location.hash)) return;
            if (applyTabDeepLinkFromHash(editor)) {
                clearTabUrlHashIfPresent();
                return;
            }
            if (attempts++ < 30) {
                requestAnimationFrame(tryApplyDeepLink);
            }
        };

        tryApplyDeepLink();

        const onHashChange = () => {
            attempts = 0;
            tryApplyDeepLink();
        };
        window.addEventListener('hashchange', onHashChange);

        return () => {
            cancelled = true;
            window.removeEventListener('hashchange', onHashChange);
        };
    }, [editor]);

    useEffect(() => {
        const root = document.querySelector('.notion-nest-shell .bn-editor');
        if (!root) return;

        const onClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const row = target.closest('[data-content-type="file"], [data-content-type="video"]');
            if (!row) return;

            const link = row.querySelector('a[href]') as HTMLAnchorElement | null;
            const nameEl = row.querySelector('[class*="file-name"], .bn-file-name-with-icon');
            const href = link?.href || (row as HTMLElement).dataset.url;
            if (!href) return;

            e.preventDefault();
            const name = nameEl?.textContent?.trim() || undefined;
            if (/\.(pdf|txt|png|jpe?g|gif|webp)(\?|$)/i.test(href) || href.startsWith('data:')) {
                setFilePreview({ url: href, name });
            } else {
                window.open(href, '_blank', 'noopener,noreferrer');
            }
        };

        root.addEventListener('click', onClick);
        return () => root.removeEventListener('click', onClick);
    }, [editor]);

    // #region agent log — side menu / tab chrome hover (debug fdfc50)
    useEffect(() => {
        const editorWithSideMenu = editor as {
            sideMenu?: {
                onUpdate: (cb: (state: { show?: boolean; block?: { id?: string } }) => void) => () => void;
            };
        };
        const debugLog = (
            location: string,
            message: string,
            data: Record<string, unknown>,
            hypothesisId: string,
        ) => {
            fetch('http://127.0.0.1:7785/ingest/ce2bb16d-d021-452b-a139-834b64666894', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'fdfc50' },
                body: JSON.stringify({
                    sessionId: 'fdfc50',
                    runId: 'post-fix-regression',
                    hypothesisId,
                    location,
                    message,
                    data,
                    timestamp: Date.now(),
                }),
            }).catch(() => {});
        };

        let lastShow: boolean | undefined;
        const unsubSideMenu = editorWithSideMenu.sideMenu?.onUpdate((state) => {
            if (lastShow === true && state.show === false) {
                debugLog('NotionBlockEditor.tsx:sideMenu', 'side menu hide', { blockId: state.block?.id ?? null }, 'A');
            }
            if (state.show && !lastShow) {
                debugLog('NotionBlockEditor.tsx:sideMenu', 'side menu show', { blockId: state.block?.id ?? null }, 'A');
            }
            lastShow = state.show;
        });

        const shell = document.querySelector('.notion-nest-shell');
        if (!shell) {
            return () => unsubSideMenu?.();
        }

        let moveThrottle = 0;
        const onPointerMove = (e: PointerEvent) => {
            const now = Date.now();
            if (now - moveThrottle < 120) return;
            const target = e.target as HTMLElement;
            const onSideMenu = Boolean(target.closest('.bn-side-menu'));
            const blockOuter = target.closest('.bn-block-outer') as HTMLElement | null;
            if (!onSideMenu && !blockOuter) return;
            moveThrottle = now;
            const inActiveTabPanel = Boolean(target.closest('.notion-tab-panel-outer.is-active-tab-panel'));
            const nestedTabsInPanel = Boolean(
                blockOuter?.closest('.notion-tab-panel-outer')?.querySelector('[data-content-type="notionTabs"]'),
            );
            debugLog(
                'NotionBlockEditor.tsx:pointermove',
                'pointer on block or side menu',
                {
                    onSideMenu,
                    blockId: blockOuter?.getAttribute('data-id') ?? null,
                    inActiveTabPanel,
                    isTabsOuter: blockOuter?.classList.contains('notion-tabs-outer') ?? false,
                    nestedTabsInPanel,
                },
                onSideMenu ? 'B' : 'C',
            );
        };

        const onPointerOut = (e: PointerEvent) => {
            const from = e.target as HTMLElement;
            if (!from.closest('.bn-block-outer') && !from.closest('.bn-side-menu')) return;
            const related = e.relatedTarget as HTMLElement | null;
            debugLog(
                'NotionBlockEditor.tsx:pointerout',
                'pointer left block or menu',
                {
                    fromSideMenu: Boolean(from.closest('.bn-side-menu')),
                    toSideMenu: Boolean(related?.closest('.bn-side-menu')),
                    toBlockOuter: Boolean(related?.closest('.bn-block-outer')),
                    toTabBodyGroup: Boolean(
                        related?.closest('.notion-tabs-outer > .bn-block > .bn-block-group'),
                    ),
                    toNothing: related === null,
                },
                'C',
            );
        };

        const logNestedTabBorders = () => {
            const nested = shell.querySelectorAll(
                '.notion-tab-panel-outer .notion-tabs-outer',
            ) as NodeListOf<HTMLElement>;
            nested.forEach((el, index) => {
                const border = getComputedStyle(el).borderTopWidth;
                debugLog(
                    'NotionBlockEditor.tsx:nestedBorder',
                    'nested tabs card border',
                    { index, borderTopWidth: border, tabsId: el.getAttribute('data-id') },
                    'E',
                );
            });
        };
        logNestedTabBorders();

        const editorSideMenu = editor as {
            sideMenu?: { freezeMenu: () => void; unfreezeMenu: () => void };
        };

        const onSideMenuPointerOver = (e: PointerEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest('.bn-side-menu')) return;
            editorSideMenu.sideMenu?.freezeMenu();
        };

        const dragMenuPortalSelector =
            '.mantine-Menu-dropdown, .bn-drag-handle-menu, .bn-color-picker-dropdown, .bn-menu-dropdown';

        const isDragMenuPortalOpen = () =>
            Boolean(document.querySelector(dragMenuPortalSelector));

        const onSideMenuPointerOut = (e: PointerEvent) => {
            const from = e.target as HTMLElement;
            if (!from.closest('.bn-side-menu')) return;
            const related = e.relatedTarget as HTMLElement | null;
            if (related?.closest('.bn-side-menu') || related?.closest(dragMenuPortalSelector)) {
                return;
            }
            requestAnimationFrame(() => {
                if (isDragMenuPortalOpen() || document.querySelector('.bn-side-menu:hover')) {
                    return;
                }
                editorSideMenu.sideMenu?.unfreezeMenu();
            });
        };

        const onDocClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target.closest('.bn-color-picker-dropdown, .bn-menu-dropdown .bn-menu-item')) {
                debugLog(
                    'NotionBlockEditor.tsx:colorMenu',
                    'color menu interaction',
                    { tag: target.tagName, className: target.className?.slice?.(0, 80) ?? '' },
                    'F',
                );
            }
        };

        shell.addEventListener('pointermove', onPointerMove, true);
        shell.addEventListener('pointerout', onPointerOut, true);
        shell.addEventListener('pointerover', onSideMenuPointerOver, true);
        shell.addEventListener('pointerout', onSideMenuPointerOut, true);
        shell.addEventListener('click', onDocClick, true);
        return () => {
            unsubSideMenu?.();
            shell.removeEventListener('pointermove', onPointerMove, true);
            shell.removeEventListener('pointerout', onPointerOut, true);
            shell.removeEventListener('pointerover', onSideMenuPointerOver, true);
            shell.removeEventListener('pointerout', onSideMenuPointerOut, true);
            shell.removeEventListener('click', onDocClick, true);
        };
    }, [editor]);
    // #endregion

    return (
        <div className={fullWidth ? 'notion-editor-full' : 'notion-editor-standard'}>
            <NotionInsertToolbar editor={editor} />
            <BlockNoteView
                editor={editor}
                theme="light"
                slashMenu={false}
                formattingToolbar={false}
                sideMenu={false}
                linkToolbar
                filePanel
                tableHandles
                emojiPicker
            >
                <SideMenuController sideMenu={NotionSideMenu} />
                <FormattingToolbarController formattingToolbar={NotionFormattingToolbar} />
                <SuggestionMenuController
                    triggerCharacter="/"
                    getItems={(query) => filterNotionSlashMenuItems(editor, query)}
                    suggestionMenuComponent={NotionSlashMenu}
                />
            </BlockNoteView>
            {filePreview ? (
                <NotionFileViewerModal
                    url={filePreview.url}
                    name={filePreview.name}
                    onClose={() => setFilePreview(null)}
                />
            ) : null}
            <NotionTabOverlaysRoot editor={editor as NotionBlockNoteEditor} />
        </div>
    );
}
