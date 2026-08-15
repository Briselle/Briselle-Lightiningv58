import type { Block, BlockNoteEditor } from '@blocknote/core';
import { getTabPanels } from './notionTabsTree';
import {
    applyTabVisibility,
    isPanelContentEmpty,
    readActiveTabIndex,

} from './notionTabsDom';
import {
    adoptStrayBlocksIntoActivePanel,
    enforceTabL2Containment,
    refreshPanelMembership,
} from './notionTabsReparent';
import { clearTabsMountSyncState, withTabSwitchInFlight } from './notionTabsSync';
import {
    panelBlockToRegistryEntry,
    readPanelRegistry,
    registryToPanelBlocks,
    writePanelRegistry,
} from './notionTabsRegistry';

export function newParagraphBlock(): Block {
    return {
        id: crypto.randomUUID(),
        type: 'paragraph',
        props: {
            textColor: 'default',
            backgroundColor: 'default',
            textAlignment: 'left',
        },
        content: [],
        children: [],
    } as Block;
}

/** New tab starts with one empty paragraph — user picks block type via slash menu. */
export function defaultTabContentBlocks(_tabLabel?: string): Block[] {
    return [newParagraphBlock()];
}

export type PanelCache = Record<string, Block[]>;

/**
 * Paragraph that only contains "/tabs" (slash menu trigger) — never persist or restore as tab content,
 * or it replaces real blocks after a tab switch.
 */
function isTabsSlashNoiseParagraph(block: Block): boolean {
    if (block.type !== 'paragraph') return false;
    const content = (block.content ?? []) as Array<{ type?: string; text?: string }>;
    if (content.length !== 1) return false;
    const first = content[0];
    if (first?.type && first.type !== 'text') return false;
    const t = String(first?.text ?? '').trim().toLowerCase();
    return t === '/tabs';
}

export function filterTabsPanelCacheSlashNoise(blocks: Block[]): Block[] {
    const hasTabsCard = blocks.some((b) => b.type === 'notionTabs');
    // Only drop "/tabs" trigger paragraphs when a real tabs block is also present.
    const out = hasTabsCard
        ? blocks.filter((b) => !isTabsSlashNoiseParagraph(b))
        : blocks;
    // #region agent log
    if (out.length !== blocks.length) {
        fetch('http://127.0.0.1:7785/ingest/ce2bb16d-d021-452b-a139-834b64666894', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Debug-Session-Id': 'fdfc50',
            },
            body: JSON.stringify({
                sessionId: 'fdfc50',
                runId: 'post-fix-v2',
                location: 'notionTabsActivate.ts:filterTabsPanelCacheSlashNoise',
                message: 'stripped /tabs slash noise from panel cache slice',
                data: {
                    beforeLen: blocks.length,
                    afterLen: out.length,
                    hasTabsCard,
                },
                timestamp: Date.now(),
                hypothesisId: 'H-slash-noise',
            }),
        }).catch(() => {});
    }
    // #endregion
    return out;
}

export function readPanelCache(tabs: Block): PanelCache {
    const raw = (tabs.props as { panelCache?: unknown }).panelCache;
    if (typeof raw !== 'string' || !raw.trim()) return {};
    try {
        const parsed = JSON.parse(raw) as PanelCache;
        if (!parsed || typeof parsed !== 'object') return {};
        const out: PanelCache = {};
        for (const [panelId, arr] of Object.entries(parsed)) {
            if (!Array.isArray(arr)) continue;
            out[panelId] = sanitizePanelCacheBlocks(arr as Block[]);
        }
        return out;
    } catch {
        return {};
    }
}

/** Only the panelCache field — never spread full props (would stomp panelRegistry updates). */
function writePanelCacheProps(cache: PanelCache): { panelCache: string } {
    return { panelCache: JSON.stringify(cache) };
}

function cloneBlocks(blocks: Block[] | undefined): Block[] {
    return structuredClone(blocks ?? []) as Block[];
}

function domTabPanels(tabs: Block): Block[] {
    return ((tabs.children ?? []) as Block[]).filter((c) => c.type === 'notionTabPanel');
}

/** L1 hoists: BlockNote siblings of panel shells under the tabs card (same tab section). */
function collectL1HoistedBlocksForPanel(
    editor: BlockNoteEditor,
    tabs: Block,
    panelIndex: number,
): Block[] {
    const panels = getTabPanels(tabs);
    if (panelIndex < 0 || panelIndex >= panels.length) return [];

    const targetPanelId = panels[panelIndex].id;
    const out: Block[] = [];
    let currentPanelId: string | null = null;

    for (const child of (tabs.children ?? []) as Block[]) {
        if (child.type === 'notionTabPanel') {
            currentPanelId = child.id;
            continue;
        }
        if (currentPanelId === targetPanelId) {
            const live = editor.getBlock(child.id) ?? child;
            out.push(cloneBlocks([live])[0]);
        }
    }
    return out;
}

/** Panel children + any L1-hoisted blocks for this tab (used before tab switch cache write). */
export function snapshotPanelContentForCache(
    editor: BlockNoteEditor,
    tabsBlockId: string,
    panelId: string,
    panelIndex: number,
): Block[] {
    const tabs = editor.getBlock(tabsBlockId);
    if (!tabs || tabs.type !== 'notionTabs') return [];

    const live = editor.getBlock(panelId);
    const fromPanel =
        live?.type === 'notionTabPanel' ? cloneBlocks((live.children ?? []) as Block[]) : [];

    const hoisted = collectL1HoistedBlocksForPanel(editor, tabs, panelIndex);
    const fromDom = collectDomMountedBlocksForTab(editor, tabsBlockId, panelIndex);
    const seen = new Set<string>();
    const merged: Block[] = [];
    for (const b of [...fromPanel, ...hoisted, ...fromDom]) {
        if (seen.has(b.id)) continue;
        seen.add(b.id);
        merged.push(b);
    }
    return filterTabsPanelCacheSlashNoise(merged);
}

function countMeaningfulBlocks(blocks: Block[]): number {
    return blocks.filter((b) => blockHasMeaningfulContent(b)).length;
}

/** Sync panel.children from DOM when BlockNote has mounted blocks not yet in the tree. */
export function materializePanelContentFromDom(
    editor: BlockNoteEditor,
    tabsBlockId: string,
    panelIndex: number,
): void {
    const tabs = editor.getBlock(tabsBlockId);
    if (!tabs || tabs.type !== 'notionTabs') return;

    const panels = getTabPanels(tabs);
    const panel = panels[panelIndex];
    if (!panel) return;

    const snap = snapshotPanelContentForCache(editor, tabsBlockId, panel.id, panelIndex);
    if (snap.length === 0) return;

    const live = editor.getBlock(panel.id);
    if (!live || live.type !== 'notionTabPanel') return;

    const currentIds = new Set(((live.children ?? []) as Block[]).map((b) => b.id));
    const snapIds = snap.map((b) => b.id);
    const same =
        currentIds.size === snapIds.length && snapIds.every((id) => currentIds.has(id));
    if (same) return;

    try {
        editor.updateBlock(live, { children: snap });
    } catch {
        /* editor busy */
    }
}

/**
 * Update panelCache for one panel. Never overwrite a non-empty cache entry with [] —
 * an empty live snapshot usually means blocks are still hoisted or the editor is mid-update.
 */
function mergePanelCacheEntry(cache: PanelCache, panelId: string, content: Block[]): void {
    if (content.length === 0) return;

    const pseudo = { id: panelId, type: 'notionTabPanel' as const, children: content } as Block;
    const hasTabsCard = content.some((b) => b.type === 'notionTabs');
    const hasMeaning = content.some(blockHasMeaningfulContent);
    if (!hasTabsCard && isPanelContentEmpty(pseudo) && !hasMeaning) {
        // #region agent log
        fetch('http://127.0.0.1:7785/ingest/ce2bb16d-d021-452b-a139-834b64666894', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Debug-Session-Id': 'fdfc50',
            },
            body: JSON.stringify({
                sessionId: 'fdfc50',
                runId: 'post-fix-v2',
                location: 'notionTabsActivate.ts:mergePanelCacheEntry',
                message: 'skipped empty panel cache write',
                data: {
                    panelId,
                    contentLen: content.length,
                    types: content.map((b) => b.type),
                },
                timestamp: Date.now(),
                hypothesisId: 'H-empty-merge',
            }),
        }).catch(() => {});
        // #endregion
        return;
    }

    const prev = cache[panelId] ?? [];
    const prevMeaning = countMeaningfulBlocks(prev);
    const nextMeaning = countMeaningfulBlocks(content);
    if (prevMeaning > nextMeaning) return;
    if (prevMeaning === nextMeaning && content.length < prev.length) return;

    cache[panelId] = content;
}

/** Write one panel's live children into cache (includes L1 hoists for that tab). */
export function writePanelLiveChildrenToCache(
    cache: PanelCache,
    editor: BlockNoteEditor,
    panelId: string,
    tabsBlockId?: string,
): void {
    const tabs = tabsBlockId ? editor.getBlock(tabsBlockId) : undefined;
    if (tabs?.type === 'notionTabs') {
        const panels = getTabPanels(tabs);
        const idx = panels.findIndex((p) => p.id === panelId);
        if (idx >= 0) {
            cache[panelId] = snapshotPanelContentForCache(editor, tabs.id, panelId, idx);
            return;
        }
    }
    const live = editor.getBlock(panelId);
    if (live?.type === 'notionTabPanel') {
        cache[panelId] = filterTabsPanelCacheSlashNoise(cloneBlocks((live.children ?? []) as Block[]));
    }
}

/**
 * Migration helper: capture panels that still have live children (multi-mount legacy).
 * Skips empty live panels so single-mount inactive shells do not wipe panelCache.
 */
export function snapshotAllMountedPanelContent(
    editor: BlockNoteEditor,
    tabs: Block,
    panels: Block[],
): PanelCache {
    const cache: PanelCache = { ...readPanelCache(tabs) };
    panels.forEach((panel, idx) => {
        const snap = snapshotPanelContentForCache(editor, tabs.id, panel.id, idx);
        if (snap.length > 0) cache[panel.id] = snap;
    });
    return cache;
}

/** @deprecated Use writePanelLiveChildrenToCache for tab switches. */
export function snapshotLivePanelsToCache(
    editor: BlockNoteEditor,
    tabs: Block,
    panels: Block[],
): PanelCache {
    const cache: PanelCache = { ...readPanelCache(tabs) };
    const activeIdx = readActiveTabIndex(editor, tabs.id);
    const active = panels[activeIdx];
    if (active) writePanelLiveChildrenToCache(cache, editor, active.id);
    return cache;
}

/**
 * Notion-style single mount: only the active tab's blocks live in the document.
 * Inactive tab content is stored in panelCache and restored on switch.
 */
export function mountOnlyActivePanelChildren(
    editor: BlockNoteEditor,
    tabsBlockId: string,
    activeIndex: number,
    cache: PanelCache,
): boolean {
    const tabs = editor.getBlock(tabsBlockId);
    if (!tabs || tabs.type !== 'notionTabs') return false;

    const panels = getTabPanels(tabs);
    if (!panels.length) return false;

    const safeActive = Math.min(Math.max(0, activeIndex), panels.length - 1);

    return withTabSwitchInFlight(() => {
        try {
            const tabsLive = editor.getBlock(tabsBlockId);
            if (!tabsLive || tabsLive.type !== 'notionTabs') return false;

            const nextChildren = panels.map((panel, i) => {
                const live = editor.getBlock(panel.id) ?? panel;
                return {
                    ...live,
                    type: 'notionTabPanel' as const,
                    props: { ...(live.props ?? panel.props) },
                    children:
                        i === safeActive
                            ? filterTabsPanelCacheSlashNoise(cloneBlocks(cache[panel.id] ?? []))
                            : [],
                } as Block;
            });

            editor.replaceBlocks(
                [tabsLive],
                [
                    {
                        ...tabsLive,
                        props: {
                            ...(tabsLive.props as Record<string, unknown>),
                            ...writePanelCacheProps(cache),
                            activeTab: safeActive,
                        },
                        children: nextChildren,
                    } as Block,
                ],
            );
            return true;
        } catch {
            return false;
        }
    });
}

/** Fix legacy multi-mount docs: merge all panel children into cache, mount active only. */
export function consolidateSingleActiveMount(
    editor: BlockNoteEditor,
    tabsBlockId: string,
): boolean {
    const tabs = editor.getBlock(tabsBlockId);
    if (!tabs || tabs.type !== 'notionTabs') return false;

    const panels = getTabPanels(tabs);
    if (!panels.length) return false;

    const activeIdx = readActiveTabIndex(editor, tabsBlockId);
    const cache = snapshotAllMountedPanelContent(editor, tabs, panels);

    let needsFix = false;
    for (let i = 0; i < panels.length; i++) {
        if (i === activeIdx) continue;
        const live = editor.getBlock(panels[i].id);
        if (live?.type === 'notionTabPanel' && ((live.children ?? []) as Block[]).length > 0) {
            needsFix = true;
            break;
        }
    }

    if (!needsFix) return false;
    return mountOnlyActivePanelChildren(editor, tabsBlockId, activeIdx, cache);
}

/**
 * Switch active tab — Notion-style single mount.
 * Saves outgoing tab to panelCache, unmounts it, mounts the target tab from cache.
 */
export function activateNotionTab(
    editor: BlockNoteEditor,
    tabsBlockId: string,
    newIndex: number,
): boolean {
    const tabs = editor.getBlock(tabsBlockId);
    if (!tabs || tabs.type !== 'notionTabs') return false;

    const panels = getTabPanels(tabs);
    if (!panels.length) return false;

    const safeNew = Math.min(Math.max(0, newIndex), panels.length - 1);
    const safeOld = readActiveTabIndex(editor, tabsBlockId);
    if (safeNew === safeOld) return false;

    setTabsCardEditingMode(editor, tabsBlockId, false);
    adoptStrayBlocksIntoActivePanel(editor, tabsBlockId);
    enforceTabL2Containment(editor, tabsBlockId);
    materializePanelContentFromDom(editor, tabsBlockId, safeOld);

    const freshTabs = editor.getBlock(tabsBlockId) ?? tabs;
    const freshPanels = getTabPanels(freshTabs);
    const cache: PanelCache = { ...readPanelCache(freshTabs) };
    const outgoing = freshPanels[safeOld];
    const priorOutgoingLen = outgoing ? (cache[outgoing.id] ?? []).length : 0;
    if (outgoing) {
        const fromDom = collectDomMountedBlocksForTab(editor, tabsBlockId, safeOld);
        const content = snapshotPanelContentForCache(
            editor,
            tabsBlockId,
            outgoing.id,
            safeOld,
        );
        const hoistLen = collectL1HoistedBlocksForPanel(editor, freshTabs, safeOld).length;
        mergePanelCacheEntry(cache, outgoing.id, content);
        // #region agent log
        fetch('http://127.0.0.1:7785/ingest/ce2bb16d-d021-452b-a139-834b64666894', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Debug-Session-Id': 'fdfc50',
            },
            body: JSON.stringify({
                sessionId: 'fdfc50',
                runId: 'post-fix',
                location: 'notionTabsActivate.ts:activateNotionTab',
                message: 'tab switch cache merge',
                data: {
                    tabsBlockId,
                    safeOld,
                    safeNew,
                    snapLen: content.length,
                    snapTypes: content.map((b) => b.type),
                    hoistLen,
                    domLen: fromDom.length,
                    outerDupes: allBlockOutersById(tabsBlockId).length,
                    priorCacheLen: priorOutgoingLen,
                    afterCacheLen: (cache[outgoing.id] ?? []).length,
                    preservedEmptySnap: content.length === 0 && priorOutgoingLen > 0,
                },
                timestamp: Date.now(),
                hypothesisId: 'H5-registry-hoist',
            }),
        }).catch(() => {});
        // #endregion
    }

    const ok = mountOnlyActivePanelChildren(editor, tabsBlockId, safeNew, cache);
    if (!ok) return false;

    refreshPanelMembership(editor, tabsBlockId);
    applyTabVisibility(editor, tabsBlockId, safeNew);
    requestAnimationFrame(() => {
        applyTabVisibility(editor, tabsBlockId, safeNew);
    });

    return true;
}

/**
 * On hydrate: ensure every registry panel shell is mounted; only active tab has live children.
 */
export function ensureTabsSingleMount(editor: BlockNoteEditor, tabsBlockId: string): void {
    withTabSwitchInFlight(() => {
        ensureTabsSingleMountInner(editor, tabsBlockId);
    });
}

function ensureTabsSingleMountInner(editor: BlockNoteEditor, tabsBlockId: string): void {
    try {
        const tabs = editor.getBlock(tabsBlockId);
        if (!tabs || tabs.type !== 'notionTabs') return;

        const registry = readPanelRegistry(tabs);
        const domPanels = domTabPanels(tabs);

        if (registry.length === 0 && domPanels.length > 0) {
            const built = domPanels.map((p) => panelBlockToRegistryEntry(p));
            editor.updateBlock(tabs, { props: writePanelRegistry(tabs, built) });
        }

        const liveRegistry = readPanelRegistry(editor.getBlock(tabsBlockId) ?? tabs);
        const registryIds = new Set(liveRegistry.map((e) => e.id));
        const domIds = new Set(domPanels.map((p) => p.id));

        const activeIndex = Math.min(
            Math.max(0, readActiveTabIndex(editor, tabsBlockId)),
            Math.max(0, liveRegistry.length - 1),
        );

        const cache = snapshotAllMountedPanelContent(
            editor,
            editor.getBlock(tabsBlockId) ?? tabs,
            getTabPanels(editor.getBlock(tabsBlockId) ?? tabs),
        );

        const allMounted =
            liveRegistry.length === domPanels.length &&
            liveRegistry.every((e) => domIds.has(e.id));

        if (!allMounted) {
            const cachedChildrenFor = (panelId: string): Block[] =>
                filterTabsPanelCacheSlashNoise(cloneBlocks(cache[panelId] ?? []));

            const skeletons = registryToPanelBlocks(liveRegistry);
            const newChildren = skeletons.map((skel, i) => {
                const dom = domPanels.find((p) => p.id === skel.id);
                return {
                    ...(dom ?? skel),
                    type: 'notionTabPanel' as const,
                    props: { ...(dom?.props ?? skel.props) },
                    children: i === activeIndex ? cachedChildrenFor(skel.id) : [],
                } as Block;
            });

            const extraDomPanels = domPanels.filter((p) => !registryIds.has(p.id));
            for (const stray of extraDomPanels) {
                newChildren.push({
                    ...stray,
                    children: [],
                } as Block);
            }

            const live = editor.getBlock(tabsBlockId);
            if (!live || live.type !== 'notionTabs') return;
            editor.replaceBlocks(
                [live],
                [
                    {
                        ...live,
                        props: {
                            ...(live.props as Record<string, unknown>),
                            ...writePanelCacheProps(cache),
                            activeTab: activeIndex,
                        },
                        children: newChildren,
                    } as Block,
                ],
            );
        } else {
            consolidateSingleActiveMount(editor, tabsBlockId);
        }
    } catch {
        /* editor not ready */
    }
}

/** Delete a tab — keeps remaining panel shells; content in panelCache. */
export function deleteNotionTabPanelAtIndex(
    editor: BlockNoteEditor,
    tabsBlockId: string,
    panelIndex: number,
    showConfirm = true,
): boolean {
    const tabs = editor.getBlock(tabsBlockId);
    if (!tabs || tabs.type !== 'notionTabs') return false;

    const panels = getTabPanels(tabs);
    if (panels.length <= 1) return false;

    const safeIndex = Math.min(Math.max(0, panelIndex), panels.length - 1);
    if (showConfirm) return false;

    return withTabSwitchInFlight(() => {
        const refreshed = editor.getBlock(tabsBlockId);
        if (!refreshed || refreshed.type !== 'notionTabs') return false;

        const refreshedPanels = getTabPanels(refreshed);
        const removed = refreshedPanels[safeIndex];
        if (!removed) return false;

        const remainingPanels = refreshedPanels.filter((_, i) => i !== safeIndex);
        if (!remainingPanels.length) return false;

        const cache = snapshotAllMountedPanelContent(editor, refreshed, refreshedPanels);
        delete cache[removed.id];
        const activePanel = refreshedPanels[readActiveTabIndex(editor, tabsBlockId)];
        if (activePanel && activePanel.id !== removed.id) {
            writePanelLiveChildrenToCache(cache, editor, activePanel.id, tabsBlockId);
        }

        const oldActive = readActiveTabIndex(editor, tabsBlockId);
        let newActive = oldActive;
        if (safeIndex < oldActive) newActive = oldActive - 1;
        else if (safeIndex === oldActive) {
            newActive = Math.min(safeIndex, remainingPanels.length - 1);
        }

        const remainingRegistry = remainingPanels.map((p) => panelBlockToRegistryEntry(p));
        const nextChildren = remainingPanels.map((panel, i) => {
            const live = editor.getBlock(panel.id) ?? panel;
            return {
                ...live,
                type: 'notionTabPanel' as const,
                props: { ...(live.props ?? panel.props) },
                children:
                    i === newActive
                        ? filterTabsPanelCacheSlashNoise(cloneBlocks(cache[panel.id] ?? []))
                        : [],
            } as Block;
        });

        const newTabs: Block = {
            ...refreshed,
            props: {
                ...(refreshed.props as Record<string, unknown>),
                ...writePanelRegistry(refreshed, remainingRegistry),
                ...writePanelCacheProps(cache),
                activeTab: newActive,
            },
            children: nextChildren,
        } as Block;

        editor.replaceBlocks([refreshed], [newTabs]);
        applyTabVisibility(editor, tabsBlockId, newActive);
        clearTabsMountSyncState(tabsBlockId);
        return true;
    });
}

/** @deprecated kept for legacy imports */
export const removeNotionTabPanel = deleteNotionTabPanelAtIndex;

export function flushActivePanelCache(editor: BlockNoteEditor, tabsBlockId: string): void {
    const tabs = editor.getBlock(tabsBlockId);
    if (!tabs || tabs.type !== 'notionTabs') return;
    const panels = getTabPanels(tabs);
    const activeIdx = readActiveTabIndex(editor, tabsBlockId);
    const active = panels[activeIdx];
    if (!active) return;
    const cache: PanelCache = { ...readPanelCache(tabs) };
    const priorLen = (cache[active.id] ?? []).length;
    const fromDom = collectDomMountedBlocksForTab(editor, tabsBlockId, activeIdx);
    const content = snapshotPanelContentForCache(editor, tabsBlockId, active.id, activeIdx);
    mergePanelCacheEntry(cache, active.id, content);
    // #region agent log
    fetch('http://127.0.0.1:7785/ingest/ce2bb16d-d021-452b-a139-834b64666894', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'fdfc50' },
        body: JSON.stringify({
            sessionId: 'fdfc50',
            runId: 'post-fix',
            location: 'notionTabsActivate.ts:flushActivePanelCache',
            message: 'persist active panel cache',
            data: {
                tabsBlockId,
                activeIdx,
                snapLen: content.length,
                domLen: fromDom.length,
                priorCacheLen: priorLen,
                afterCacheLen: (cache[active.id] ?? []).length,
                skippedShrink: content.length < priorLen,
            },
            timestamp: Date.now(),
            hypothesisId: 'H2-flush-wipe',
        }),
    }).catch(() => {});
    // #endregion
    editor.updateBlock(tabs, { props: writePanelCacheProps(cache) });
}

const cacheFlushTimerByTabs = new Map<string, ReturnType<typeof setTimeout>>();

export function schedulePersistActivePanelCache(
    editor: BlockNoteEditor,
    tabsBlockId: string,
): void {
    cancelScheduledPanelCacheFlush(tabsBlockId);
    cacheFlushTimerByTabs.set(
        tabsBlockId,
        setTimeout(() => {
            cacheFlushTimerByTabs.delete(tabsBlockId);
            flushActivePanelCache(editor, tabsBlockId);
        }, 200),
    );
}

export function ensurePanelChildrenNested(editor: BlockNoteEditor, tabsBlockId: string): void {
    enforceTabL2Containment(editor, tabsBlockId);
}

export function isLegacyTabBody(_panel: Block, _entry: Block[] | undefined): boolean {
    return false;
}

export function upgradeTabCacheEntry(_panel: Block, entry: Block[] | undefined): Block[] {
    return (entry ?? []) as Block[];
}
