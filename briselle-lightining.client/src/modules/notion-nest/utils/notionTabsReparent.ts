import type { Block, BlockNoteEditor } from '@blocknote/core';
import {
    applyTabVisibility,
    isPanelVisuallyEmpty,
    pruneGhostParagraphsWhenTabHasBody,
    readActiveTabIndex,
    seedTabPanelIfEmpty,
    shouldDeferTabsEditingChrome,
} from './notionTabsDom';
import { isEmptyHintFocusInFlight, isTabSwitchInFlight, withTabSwitchInFlight } from './notionTabsSync';
import { getTabPanels } from './notionTabsTree';

let reparentInFlight = false;
let adoptScheduled = false;

export { isTabSwitchInFlight, withTabSwitchInFlight };

/** Per-tabs-block snapshot of every block id that already lived inside any panel. */
const panelMemberIdsByTabs = new Map<string, Set<string>>();
/** block id → owning panel id (preserved across tab switches for L1 hoisted blocks). */
const blockPanelOwnerByTabs = new Map<string, Map<string, string>>();

function cloneBlocks(blocks: Block[]): Block[] {
    return structuredClone(blocks) as Block[];
}

function panelBlocks(tabs: Block): Block[] {
    return ((tabs.children ?? []) as Block[]).filter((c) => c.type === 'notionTabPanel');
}

function collectDescendantIds(block: Block, out: Set<string>): void {
    out.add(block.id);
    for (const child of (block.children ?? []) as Block[]) collectDescendantIds(child, out);
}

function panelMemberIds(tabs: Block): Set<string> {
    const ids = new Set<string>();
    for (const panel of panelBlocks(tabs)) collectDescendantIds(panel, ids);
    return ids;
}

function blockIsInsideAnyPanel(editor: BlockNoteEditor, tabsBlockId: string, blockId: string): boolean {
    const tabs = editor.getBlock(tabsBlockId);
    if (!tabs || tabs.type !== 'notionTabs') return false;
    for (const panel of panelBlocks(tabs)) {
        const walk = (b: Block): boolean => {
            if (b.id === blockId) return true;
            for (const child of (b.children ?? []) as Block[]) {
                if (walk(child)) return true;
            }
            return false;
        };
        const live = editor.getBlock(panel.id) ?? panel;
        if (walk(live)) return true;
    }
    return false;
}

function runReparent<T>(fn: () => T): T {
    reparentInFlight = true;
    try {
        return fn();
    } finally {
        reparentInFlight = false;
    }
}

/** Blocks below the tabs card that are new (not previously panel members). */
function collectFreshStraySiblings(
    editor: BlockNoteEditor,
    tabsBlockId: string,
): Block[] {
    const tabs = editor.getBlock(tabsBlockId);
    if (!tabs || tabs.type !== 'notionTabs') return [];

    const parent = editor.getParentBlock(tabs);
    if (!parent?.children?.length) return [];

    const siblings = parent.children as Block[];
    const tabsIdx = siblings.findIndex((b) => b.id === tabsBlockId);
    if (tabsIdx < 0) return [];

    const previousMembers = panelMemberIdsByTabs.get(tabsBlockId) ?? new Set<string>();

    const stray: Block[] = [];
    for (let i = tabsIdx + 1; i < siblings.length; i++) {
        const s = siblings[i];
        if (s.type === 'notionTabs' || s.type === 'notionTabPanel') break;

        if (blockIsInsideAnyPanel(editor, tabsBlockId, s.id)) continue;

        if (previousMembers.has(s.id)) {
            // Intentional drag-out: was in a panel, now a page sibling — keep visible on page.
            continue;
        }

        stray.push(s);
    }
    return stray;
}

/** Outermost tabs on the page (parent is not another tab panel). */
function findPageLevelTabsBlockId(
    editor: BlockNoteEditor,
    tabsBlockId: string,
): string {
    let id = tabsBlockId;
    let tabs = editor.getBlock(id);
    while (tabs?.type === 'notionTabs') {
        const parent = editor.getParentBlock(tabs);
        if (!parent || parent.type !== 'notionTabPanel') return id;
        const outer = editor.getParentBlock(parent);
        if (!outer || outer.type !== 'notionTabs') return id;
        id = outer.id;
        tabs = outer;
    }
    return tabsBlockId;
}

/** Page siblings below tabs — includes blocks hoisted out of the panel during Backspace/Enter. */
function collectReclaimableStraysBelowTabs(
    editor: BlockNoteEditor,
    tabsBlockId: string,
): Block[] {
    const tabs = editor.getBlock(tabsBlockId);
    if (!tabs || tabs.type !== 'notionTabs') return [];

    const parent = editor.getParentBlock(tabs);
    if (!parent?.children?.length) return [];

    const siblings = parent.children as Block[];
    const tabsIdx = siblings.findIndex((b) => b.id === tabsBlockId);
    if (tabsIdx < 0) return [];

    const stray: Block[] = [];
    for (let i = tabsIdx + 1; i < siblings.length; i++) {
        const s = siblings[i];
        if (s.type === 'notionTabs' || s.type === 'notionTabPanel') break;
        if (blockIsInsideAnyPanel(editor, tabsBlockId, s.id)) continue;
        stray.push(s);
    }
    return stray;
}

/** Hoisted rows that used to live in a panel — not brand-new Enter blocks below the card. */
function collectFormerMemberStraysWhileEditing(
    editor: BlockNoteEditor,
    tabsBlockId: string,
): Block[] {
    const memberSnapshot = panelMemberIdsByTabs.get(tabsBlockId);
    if (!memberSnapshot?.size) return [];

    const isFormerHoist = (blockId: string): boolean =>
        memberSnapshot.has(blockId) && !blockIsInsideAnyPanel(editor, tabsBlockId, blockId);

    const seen = new Set<string>();
    const out: Block[] = [];
    const push = (blocks: Block[]) => {
        for (const b of blocks) {
            if (!isFormerHoist(b.id) || seen.has(b.id)) continue;
            seen.add(b.id);
            out.push(b);
        }
    };

    push(collectReclaimableStraysBelowTabs(editor, tabsBlockId));

    const pageTabsId = findPageLevelTabsBlockId(editor, tabsBlockId);
    if (pageTabsId !== tabsBlockId) {
        push(collectReclaimableStraysBelowTabs(editor, pageTabsId));
    }

    return out;
}

/** True when Backspace/merge left known panel rows as page siblings. */
export function hasHoistedFormerPanelRows(
    editor: BlockNoteEditor,
    tabsBlockId: string,
): boolean {
    return collectFormerMemberStraysWhileEditing(editor, tabsBlockId).length > 0;
}

function mergeStraysIntoActivePanel(
    editor: BlockNoteEditor,
    tabsBlockId: string,
    stray: Block[],
): boolean {
    if (!stray.length) return false;

    const tabs = editor.getBlock(tabsBlockId);
    if (!tabs || tabs.type !== 'notionTabs') return false;

    const panels = panelBlocks(tabs);
    const activeIdx = readActiveTabIndex(editor, tabsBlockId);
    const activePanel = panels[activeIdx];
    if (!activePanel) return false;

    const livePanel = editor.getBlock(activePanel.id);
    if (!livePanel || livePanel.type !== 'notionTabPanel') return false;

    return runReparent(() => {
        try {
            seedTabPanelIfEmpty(editor, activePanel.id);
            const liveChildren = (livePanel.children ?? []) as Block[];
            const panelIds = new Set(liveChildren.map((c) => c.id));
            const toMerge = stray.filter((s) => !panelIds.has(s.id));
            if (!toMerge.length) return false;

            if (typeof editor.moveBlocks === 'function') {
                editor.moveBlocks(toMerge, livePanel, 'end');
            } else {
                const mergedChildren = [...cloneBlocks(liveChildren), ...cloneBlocks(toMerge)];
                editor.updateBlock(livePanel, { children: mergedChildren });
                editor.removeBlocks(toMerge);
            }
            refreshPanelMembership(editor, tabsBlockId);
            pruneGhostParagraphsWhenTabHasBody(editor, tabsBlockId);
            if (!shouldDeferTabsEditingChrome(editor, tabsBlockId)) {
                applyTabVisibility(editor, tabsBlockId, activeIdx);
            }
            return true;
        } catch {
            return false;
        }
    });
}

/**
 * While typing in a tab: pull hoisted rows back into the active panel (Backspace/Enter side-effects).
 */
export function reclaimTabContentWhileEditing(
    editor: BlockNoteEditor,
    tabsBlockId: string,
): boolean {
    if (reparentInFlight || isTabSwitchInFlight() || isEmptyHintFocusInFlight()) return false;

    const stray = collectFormerMemberStraysWhileEditing(editor, tabsBlockId);
    if (!stray.length) return false;

    const tabs = editor.getBlock(tabsBlockId);
    if (!tabs || tabs.type !== 'notionTabs') return false;
    const activeIdx = readActiveTabIndex(editor, tabsBlockId);
    const activePanel = panelBlocks(tabs)[activeIdx];
    const livePanel = activePanel ? editor.getBlock(activePanel.id) : undefined;
    const panelIds = new Set(
        ((livePanel?.children ?? []) as Block[]).map((c) => c.id),
    );
    const toReclaim = stray.filter((s) => !panelIds.has(s.id));
    if (!toReclaim.length) return false;

    return mergeStraysIntoActivePanel(editor, tabsBlockId, toReclaim);
}

export function isReparentInFlight(): boolean {
    return reparentInFlight;
}

/** Move a block into a tab panel's children (end of list). */
export function moveBlockIntoPanel(
    editor: BlockNoteEditor,
    blockId: string,
    panelId: string,
    tabsBlockId: string,
): boolean {
    const src = editor.getBlock(blockId);
    const tgt = editor.getBlock(panelId);
    if (!src || !tgt || tgt.type !== 'notionTabPanel') return false;
    if (src.id === panelId) return false;

    return runReparent(() => {
        try {
            seedTabPanelIfEmpty(editor, panelId);
            if (typeof editor.moveBlocks === 'function') {
                editor.moveBlocks([src], tgt, 'end');
            } else {
                const merged = [
                    ...cloneBlocks((tgt.children ?? []) as Block[]),
                    cloneBlocks([src])[0],
                ];
                editor.updateBlock(tgt, { children: merged });
                editor.removeBlocks([src]);
            }
            refreshPanelMembership(editor, tabsBlockId);
            const tabsAfter = editor.getBlock(tabsBlockId);
            if (tabsAfter?.type === 'notionTabs') {
                const panelIdx = getTabPanels(tabsAfter).findIndex((p) => p.id === panelId);
                if (panelIdx >= 0) applyTabVisibility(editor, tabsBlockId, panelIdx);
            }
            return true;
        } catch {
            return false;
        }
    });
}

/** Move a block out of tabs to become a page-level sibling directly below the tabs block. */
export function moveBlockToPageBelowTabs(
    editor: BlockNoteEditor,
    blockId: string,
    tabsBlockId: string,
): boolean {
    const src = editor.getBlock(blockId);
    const tabs = editor.getBlock(tabsBlockId);
    if (!src || !tabs || tabs.type !== 'notionTabs') return false;

    const parent = editor.getParentBlock(tabs);
    if (!parent?.children?.length) return false;

    return runReparent(() => {
        try {
            if (typeof editor.moveBlocks === 'function') {
                editor.moveBlocks([src], tabs, 'after');
            } else {
                const siblings = parent.children as Block[];
                const tabsIdx = siblings.findIndex((b) => b.id === tabsBlockId);
                if (tabsIdx < 0) return false;
                const nextSiblings = [...siblings];
                const srcIdx = nextSiblings.findIndex((b) => b.id === blockId);
                if (srcIdx < 0) {
                    nextSiblings.splice(tabsIdx + 1, 0, cloneBlocks([src])[0]);
                } else {
                    const [removed] = nextSiblings.splice(srcIdx, 1);
                    nextSiblings.splice(tabsIdx + 1, 0, removed);
                }
                editor.updateBlock(parent, { children: nextSiblings });
            }
            refreshPanelMembership(editor, tabsBlockId);
            applyTabVisibility(editor, tabsBlockId);
            return true;
        } catch {
            return false;
        }
    });
}

export type TabDropTarget = {
    panelId: string;
    tabIndex: number;
};

/** Resolve a DOM node inside the tabs card to a target panel for drops. */
export function resolveDropTarget(
    editor: BlockNoteEditor,
    tabsBlockId: string,
    domTarget: EventTarget | null,
): TabDropTarget | null {
    if (!(domTarget instanceof HTMLElement)) return null;

    const tabs = editor.getBlock(tabsBlockId);
    if (!tabs || tabs.type !== 'notionTabs') return null;

    const panels = getTabPanels(tabs);
    if (!panels.length) return null;

    const panelEl = domTarget.closest('[data-content-type="notionTabPanel"], .notion-tab-panel-outer');
    if (panelEl instanceof HTMLElement) {
        const panelId =
            panelEl.getAttribute('data-id') ??
            panelEl.querySelector('[data-content-type="notionTabPanel"]')?.getAttribute('data-id');
        if (panelId) {
            const idx = panels.findIndex((p) => p.id === panelId);
            if (idx >= 0) return { panelId, tabIndex: idx };
        }
    }

    const activeIdx = readActiveTabIndex(editor, tabsBlockId);
    const activePanel = panels[activeIdx];
    if (!activePanel) return null;
    return { panelId: activePanel.id, tabIndex: activeIdx };
}

/** Page-level siblings below the tabs card that should be adopted into a panel (drag/create). */
export function needsPageStrayAdoption(editor: BlockNoteEditor, tabsBlockId: string): boolean {
    return collectFreshStraySiblings(editor, tabsBlockId).length > 0;
}

/** True when L1 hoists or containment fixes need a reparent pass (not plain in-panel typing). */
export function needsTabsStructureReparentSync(
    editor: BlockNoteEditor,
    tabsBlockId: string,
): boolean {
    return (
        needsPageStrayAdoption(editor, tabsBlockId) ||
        collectL2ContainmentFixes(editor, tabsBlockId).length > 0
    );
}

export function adoptStrayBlocksIntoActivePanel(
    editor: BlockNoteEditor,
    tabsBlockId: string,
): boolean {
    if (reparentInFlight || isTabSwitchInFlight() || isEmptyHintFocusInFlight()) return false;

    const tabs = editor.getBlock(tabsBlockId);
    if (!tabs || tabs.type !== 'notionTabs') return false;

    const stray = collectFreshStraySiblings(editor, tabsBlockId);
    if (!stray.length) {
        panelMemberIdsByTabs.set(tabsBlockId, panelMemberIds(tabs));
        return false;
    }

    const panels = panelBlocks(tabs);
    const activeIdx = readActiveTabIndex(editor, tabsBlockId);
    const activePanel = panels[activeIdx];
    if (!activePanel) return false;

    const livePanel = editor.getBlock(activePanel.id);
    if (!livePanel || livePanel.type !== 'notionTabPanel') return false;

    return runReparent(() => {
        try {
            const mergedChildren = [
                ...cloneBlocks((livePanel.children ?? []) as Block[]),
                ...cloneBlocks(stray),
            ];
            editor.updateBlock(livePanel, { children: mergedChildren });
            editor.removeBlocks(stray);
            refreshPanelMembership(editor, tabsBlockId);
            if (!shouldDeferTabsEditingChrome(editor, tabsBlockId)) {
                applyTabVisibility(editor, tabsBlockId, activeIdx);
            }
            return true;
        } catch {
            return false;
        }
    });
}

export function scheduleAdoptStrayBlocks(editor: BlockNoteEditor, tabsBlockId: string): void {
    if (adoptScheduled) return;
    adoptScheduled = true;
    requestAnimationFrame(() => {
        adoptScheduled = false;
        adoptStrayBlocksIntoActivePanel(editor, tabsBlockId);
    });
}

function buildBlockPanelOwnerMap(tabs: Block): Map<string, string> {
    const owners = new Map<string, string>();
    for (const panel of panelBlocks(tabs)) {
        const walk = (b: Block) => {
            owners.set(b.id, panel.id);
            for (const child of (b.children ?? []) as Block[]) walk(child);
        };
        walk(panel);
    }
    return owners;
}

/** Prime the membership snapshot — call on mount so the first onChange tick has a baseline. */
export function refreshPanelMembership(editor: BlockNoteEditor, tabsBlockId: string): void {
    const tabs = editor.getBlock(tabsBlockId);
    if (tabs?.type === 'notionTabs') {
        panelMemberIdsByTabs.set(tabsBlockId, panelMemberIds(tabs));
        blockPanelOwnerByTabs.set(tabsBlockId, buildBlockPanelOwnerMap(tabs));
    }
}

type L2ReparentFix = { blockId: string; panelId: string };

/** Resolve which panel an L1 stray block belongs to (never default all strays to active tab). */
function resolveL1StrayTargetPanel(
    editor: BlockNoteEditor,
    tabsBlockId: string,
    tabs: Block,
    blockId: string,
    panels: Block[],
): string | null {
    const prevOwners = blockPanelOwnerByTabs.get(tabsBlockId);
    const remembered = prevOwners?.get(blockId);
    if (remembered && panels.some((p) => p.id === remembered)) {
        return remembered;
    }

    let sectionPanelId: string | null = null;
    let currentPanelId: string | null = null;
    for (const child of (tabs.children ?? []) as Block[]) {
        if (child.type === 'notionTabPanel') {
            currentPanelId = child.id;
            continue;
        }
        if (child.id === blockId) {
            sectionPanelId = currentPanelId;
            break;
        }
    }
    if (sectionPanelId) return sectionPanelId;

    const activeIdx = readActiveTabIndex(editor, tabsBlockId);
    return panels[activeIdx]?.id ?? panels[0]?.id ?? null;
}

/** Blocks that belong inside L2 (panel) but sit as direct children of L1 (tabs). */
function collectL2ContainmentFixes(
    editor: BlockNoteEditor,
    tabsBlockId: string,
): L2ReparentFix[] {
    const tabs = editor.getBlock(tabsBlockId);
    if (!tabs || tabs.type !== 'notionTabs') return [];

    const panels = getTabPanels(tabs);
    if (!panels.length) return [];

    const fixes: L2ReparentFix[] = [];
    const seen = new Set<string>();

    const queue = (panelId: string, blocks: Block[]) => {
        for (const block of blocks) {
            if (block.type === 'notionTabs') {
                const parent = editor.getParentBlock(block);
                if (parent?.id === tabsBlockId && !seen.has(block.id)) {
                    seen.add(block.id);
                    fixes.push({ blockId: block.id, panelId });
                }
                if (block.children?.length) queue(panelId, block.children as Block[]);
                continue;
            }
            const parent = editor.getParentBlock(block);
            if (parent?.id === tabsBlockId && block.id !== panelId) {
                if (!seen.has(block.id)) {
                    seen.add(block.id);
                    fixes.push({ blockId: block.id, panelId });
                }
            }
            if (block.children?.length) {
                queue(panelId, block.children as Block[]);
            }
        }
    };

    for (const panel of panels) {
        const live = editor.getBlock(panel.id) ?? panel;
        queue(panel.id, (live.children ?? []) as Block[]);
    }

    for (const child of (tabs.children ?? []) as Block[]) {
        if (child.type === 'notionTabPanel') continue;
        if (seen.has(child.id)) continue;
        const panelId = resolveL1StrayTargetPanel(editor, tabsBlockId, tabs, child.id, panels);
        if (!panelId) continue;
        seen.add(child.id);
        fixes.push({ blockId: child.id, panelId });
    }

    return fixes;
}

/**
 * Notion L1/L2 model: `notionTabs` (L1) only contains `notionTabPanel` children (L2).
 * All user blocks must live under a panel — never as siblings of panels on L1.
 */
export function enforceTabL2Containment(
    editor: BlockNoteEditor,
    tabsBlockId: string,
): boolean {
    if (reparentInFlight || switchInFlight) return false;

    const fixes = collectL2ContainmentFixes(editor, tabsBlockId);
    if (!fixes.length) return false;

    logTabsBackspaceDebug('H-L2-containment', 'notionTabsReparent.ts:enforceTabL2Containment', 'reparent blocks into panel after edit', {
        tabsBlockId,
        fixCount: fixes.length,
        blockIds: fixes.map((f) => f.blockId),
    });

    const tabs = editor.getBlock(tabsBlockId);
    if (!tabs || tabs.type !== 'notionTabs') return false;

    return runReparent(() => {
        try {
            const byPanel = new Map<string, Block[]>();
            for (const { blockId, panelId } of fixes) {
                const src = editor.getBlock(blockId);
                if (!src) continue;
                const list = byPanel.get(panelId) ?? [];
                list.push(src);
                byPanel.set(panelId, list);
            }

            for (const [panelId, blocks] of byPanel) {
                const tgt = editor.getBlock(panelId);
                if (!tgt || tgt.type !== 'notionTabPanel' || !blocks.length) continue;

                const existingChildren = (tgt.children ?? []) as Block[];
                const existingIds = new Set(existingChildren.map((b) => b.id));
                const newcomers = blocks.filter((b) => !existingIds.has(b.id));
                const alreadyInPanel = blocks.filter((b) => existingIds.has(b.id));

                if (typeof editor.moveBlocks === 'function') {
                    for (const block of alreadyInPanel) {
                        editor.moveBlocks([block], tgt, 'end');
                    }
                    const l1Order = ((editor.getBlock(tabsBlockId)?.children ?? []) as Block[]).map(
                        (b) => b.id,
                    );
                    newcomers.sort((a, b) => {
                        const ia = l1Order.indexOf(a.id);
                        const ib = l1Order.indexOf(b.id);
                        const ai = ia >= 0 ? ia : Number.MAX_SAFE_INTEGER;
                        const bi = ib >= 0 ? ib : Number.MAX_SAFE_INTEGER;
                        return ai - bi;
                    });
                    for (const block of newcomers) {
                        editor.moveBlocks([block], tgt, 'end');
                    }
                } else {
                    const keep = existingChildren.filter(
                        (c) => !newcomers.some((n) => n.id === c.id),
                    );
                    const merged = [...cloneBlocks(keep), ...cloneBlocks(newcomers)];
                    editor.updateBlock(tgt, { children: merged });
                    const l1Strays = newcomers.filter(
                        (b) => editor.getParentBlock(b)?.id === tabsBlockId,
                    );
                    if (l1Strays.length) editor.removeBlocks(l1Strays);
                }
            }

            refreshPanelMembership(editor, tabsBlockId);
            pruneGhostParagraphsWhenTabHasBody(editor, tabsBlockId);
            if (!shouldDeferTabsEditingChrome(editor, tabsBlockId)) {
                applyTabVisibility(editor, tabsBlockId, readActiveTabIndex(editor, tabsBlockId));
            }
            return true;
        } catch {
            return false;
        }
    });
}

export function reparentStrayBlocksIntoActivePanel(
    editor: BlockNoteEditor,
    tabsBlockId: string,
): boolean {
    return adoptStrayBlocksIntoActivePanel(editor, tabsBlockId);
}

export function persistStrayBlocksToPanelCache(
    _editor: BlockNoteEditor,
    _tabsBlockId: string,
): void {
    /* no-op: multi-mount keeps content in panel children */
}

export function schedulePersistStrayToPanelCache(
    _editor: BlockNoteEditor,
    _tabsBlockId: string,
): void {
    /* no-op */
}
