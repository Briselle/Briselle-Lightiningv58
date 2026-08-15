import { defaultProps } from '@blocknote/core';
import { createReactBlockSpec } from '@blocknote/react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Block } from '@blocknote/core';

import NotionPageTabsBar from '../components/NotionPageTabsBar';
import type { NotionBlockNoteEditor } from '../notionBlockSchema';
import { getTabPanels, isManagedTabsBlock } from '../utils/notionTabsTree';
import { ensureStarterTabPanels } from '../utils/notionTabsInsert';
import { ensureTabsSingleMount, materializePanelContentFromDom, schedulePersistActivePanelCache } from '../utils/notionTabsActivate';
import {
    allBlockOutersById,
    applyTabVisibility,
    focusActiveTabPanelContent,
    isCursorInTabsBlock,
    isCursorInThisTabsCardExclusively,
    isPanelVisuallyEmpty,
    normalizeUnactivatedTabPanels,
    resolveTabPanelEmptyAttrs,
    observeTabsVisibility,
    readActiveTabIndex,
    resolveTabsBlockOuter,
    scheduleApplyTabVisibility,
    setTabsCardEditingMode,
    stampActiveTabBodyIndices,
    stampTabsBlockOuterClasses,
    shouldDeferTabsEditingChrome,
    stampTabsCardShell,
    syncTabsCardChrome,
    stampTabsCardFrame,
} from '../utils/notionTabsDom';
import { scheduleAdoptStrayBlocks } from '../utils/notionTabsReparent';
import {
    isEditingInsideNestedTabs,
    isEmptyHintFocusInFlight,
    isNestedTabsCard,
    isTabSwitchInFlight,
    isTabsBackspaceRecent,
    clearTabsMountSyncState,
    logTabsBackspaceDebug,
    markTabsBackspaceKey,
    scheduleTabsMountWork,
    scheduleTabsOnChangeWork,
    shouldRunHeavyTabsMount,
    tabsStructureFingerprint,
} from '../utils/notionTabsSync';
import {
    handleAccidentalTabPanelRemoval,
    isIntentionalTabDelete,
} from '../utils/notionTabsDeleteGuard';
import {
    handleTabBackspaceKeyDown,
    isTabBackspaceInFlight,
    nudgeTabClickCursorToEnd,
    recoverTabsCursorAfterBackspace,
} from '../utils/notionTabsEditing';
import { isAnyTabOverlayOpen, isAnyTabsSettingsOpen } from '../utils/notionTabsUiSession';

/** Per tabs block — survives BlockNote remounting custom block views. */
const tabsHydratedOnce = new Set<string>();
/** One-time legacy cleanup: pre-seeded empty paragraphs → true empty tabs. */
const tabsNormalizedOnce = new Set<string>();

if (import.meta.hot) {
    import.meta.hot.dispose(() => {
        tabsHydratedOnce.clear();
        tabsNormalizedOnce.clear();
        clearTabsMountSyncState();
    });
}

const TAB_BODY_DRAG_MIME = 'application/x-notion-tab-block-id';

/** Invisible anchor — tab labels live in the bar; content is the panel's nested children. */
function NotionTabPanelView({
    block,
    editor,
}: {
    block: Block;
    editor: NotionBlockNoteEditor;
}) {
    const rootRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        const outer = rootRef.current?.closest('.bn-block-outer') as HTMLElement | null;
        if (!outer) return;
        outer.classList.add('notion-tab-panel-outer');

        const live = editor.getBlock(block.id);
        const source = live?.type === 'notionTabPanel' ? live : block;
        outer.setAttribute('data-tab-empty', isPanelWithoutChildren(source) ? 'true' : 'false');

        const anchorContent = outer.querySelector(':scope > .bn-block > .bn-block-content');
        if (anchorContent instanceof HTMLElement) {
            anchorContent.classList.add('notion-tab-panel-content-anchor');
        }

        return () => {
            anchorContent?.classList.remove('notion-tab-panel-content-anchor');
        };
    }, [block, editor]);

    return <div ref={rootRef} className="notion-tab-panel-anchor" aria-hidden />;
}

function NotionTabsRootView({
    block,
    editor,
}: {
    block: { id: string; props: Record<string, unknown> };
    editor: NotionBlockNoteEditor;
}) {
    const rootRef = useRef<HTMLDivElement>(null);
    const full = editor.getBlock(block.id) ?? block;
    const panelCount = getTabPanels(full).length;
    const active = Math.min(
        Math.max(0, Number(full.props.activeTab) || 0),
        Math.max(0, panelCount - 1),
    );

    const lastSnapshotRef = useRef<Block | null>(null);

    useEffect(() => {
        let cancelled = false;
        const run = () => {
            if (cancelled) return;
            const live = editor.getBlock(block.id);
            const registryLen =
                live && live.type === 'notionTabs' ? getTabPanels(live).length : 0;
            const docPanelLen =
                live && live.type === 'notionTabs'
                    ? ((live.children ?? []) as Block[]).filter((c) => c.type === 'notionTabPanel')
                          .length
                    : 0;
            const needsMount = docPanelLen < registryLen || !tabsHydratedOnce.has(block.id);
            if (needsMount) {
                tabsHydratedOnce.add(block.id);
                ensureTabsSingleMount(editor, block.id);
            }
            applyTabVisibility(editor, block.id);
            scheduleAdoptStrayBlocks(editor, block.id);
        };
        requestAnimationFrame(run);
        return () => {
            cancelled = true;
        };
    }, [editor, block.id]);

    useEffect(() => {
        let raf = 0;
        const unsub = editor.onChange(() => {
            if (isAnyTabsSettingsOpen() || isAnyTabOverlayOpen()) return;
            const current = editor.getBlock(block.id);
            if (!current || current.type !== 'notionTabs') return;
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(() => {
                scheduleAdoptStrayBlocks(editor, block.id);
                applyTabVisibility(editor, block.id);
            });
        });
        return () => {
            cancelAnimationFrame(raf);
            unsub();
        };
    }, [editor, block.id]);

    useLayoutEffect(() => {
        applyTabVisibility(editor, block.id, active);
    }, [editor, block.id, active]);

    useEffect(() => {
        const outer = rootRef.current?.closest('.bn-block-outer') as HTMLElement | null;
        if (!outer) return;
        outer.classList.add('notion-tabs-outer');
        return observeTabsVisibility(editor, block.id, outer);
    }, [editor, block.id]);

    useEffect(() => {
        const unsub = editor.onChange(() => {
            if (isAnyTabsSettingsOpen() || isAnyTabOverlayOpen()) return;
            if (isEditingInsideNestedTabs(editor, block.id)) return;

            const current = editor.getBlock(block.id);
            if (!current || current.type !== 'notionTabs') return;

            const previous = lastSnapshotRef.current;
            const tabsOuter = resolveTabsBlockOuter(tabsBlockId, rootRef.current);
            const editing =
                tabsOuter?.getAttribute('data-tab-editing') === 'true' ||
                isCursorInThisTabsCardExclusively(editorRef.current, tabsBlockId) ||
                isTabBackspaceInFlight(tabsBlockId);
            if (previous?.type === 'notionTabs' && !isIntentionalTabDelete() && !editing) {
                handleAccidentalTabPanelRemoval(editorRef.current, tabsBlockId, previous, current);
            }
            const after = editorRef.current.getBlock(tabsBlockId);
            if (after?.type === 'notionTabs') {
                lastSnapshotRef.current = structuredClone(after) as Block;
            }
        });
        return () => unsub();
    }, [tabsBlockId]);

    useEffect(() => {
        const outer = rootRef.current?.closest('.bn-block-outer') as HTMLElement | null;
        if (!outer) return;

        const onPointerDown = (e: PointerEvent) => {
            if (e.button !== 0) return;
            const target = e.target;
            if (!(target instanceof HTMLElement)) return;
            if (target.closest('[data-notion-tabs-bar]')) return;
            if (!outer.contains(target)) return;
            const inTabBody = target.closest('.bn-block-group');
            if (!inTabBody) return;

            // BlockNote uses one editor-level contenteditable — do not treat that as "already editing".
            const inExistingTabText = target.closest(
                '.notion-tab-panel-outer:not([data-tab-empty="true"]) .bn-inline-content',
            );
            if (inExistingTabText) return;

            e.preventDefault();
            focusActiveTabPanelContent(editor, block.id);
        };

        outer.addEventListener('pointerdown', onPointerDown);
        return () => outer.removeEventListener('pointerdown', onPointerDown);
    }, [editor, block.id, active]);

    return (
        <div
            ref={rootRef}
            className="notion-tabs-root"
            data-notion-tabs-block-id={block.id}
            tabIndex={-1}
        >
            <NotionPageTabsBar tabsBlock={full as Block} editor={editor} />
        </div>
    );
}

export const NotionTabPanelBlock = createReactBlockSpec(
    {
        type: 'notionTabPanel',
        propSchema: {
            label: { default: 'Tab' },
            tabIcon: { default: '' },
            tabIconCustom: { default: '' },
            ...defaultProps,
        },
        content: 'none',
    },
    {
        render: (props) => (
            <NotionTabPanelView
                block={props.block as Block}
                editor={props.editor as NotionBlockNoteEditor}
            />
        ),
    },
);

export const NotionTabsBlock = createReactBlockSpec(
    {
        type: 'notionTabs',
        propSchema: {
            activeTab: { default: 0 },
            tabStyle: { default: 'standard' },
            tabShowUnderline: { default: false },
            tabGap: { default: 6 },
            tabHeight: { default: 'medium', values: ['small', 'medium', 'large'] as const },
            tabCustomSelection: { default: false },
            tabSelectionColor: { default: '#2563eb' },
            tabAlignment: { default: 'left', values: ['left', 'center', 'right'] as const },
            panelCache: { default: '{}' },
            panelRegistry: { default: '[]' },
            ...defaultProps,
        },
        content: 'none',
    },
    {
        render: (props) => (
            <NotionTabsRootView block={props.block} editor={props.editor as NotionBlockNoteEditor} />
        ),
    },
);
