import type { Block, BlockNoteEditor } from '@blocknote/core';
import { defaultTabContentBlocks, schedulePersistActivePanelCache } from './notionTabsActivate';
import {
    isEmptyHintFocusInFlight,
    isTabSwitchInFlight,
    isTabVisibilitySuppressed,
    withEmptyHintFocusInFlight,
} from './notionTabsSync';
import { getTabPanels, isManagedTabsBlock } from './notionTabsTree';

function editorRoot(): HTMLElement | null {
    return document.querySelector('.notion-nest-shell .bn-editor');
}

function cssEscape(id: string): string {
    return typeof CSS !== 'undefined' && 'escape' in CSS ? CSS.escape(id) : id;
}

/** Every mounted outer for a block id (BlockNote can mount the same id more than once). */
export function allBlockOutersById(
    blockId: string,
    scope?: ParentNode | null,
): HTMLElement[] {
    const esc = cssEscape(blockId);
    const root = scope ?? editorRoot();
    if (!root) return [];
    const hits = Array.from(root.querySelectorAll(`.bn-block-outer[data-id="${esc}"]`)).filter(
        (el): el is HTMLElement => el instanceof HTMLElement,
    );
    if (hits.length > 0) return hits;

    const legacy = root.querySelector(`.bn-block-outer[id="${esc}"]`);
    return legacy instanceof HTMLElement ? [legacy] : [];
}

function outerVisibilityScore(outer: HTMLElement): number {
    let score = 0;
    const cs = getComputedStyle(outer);
    if (cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity) > 0) {
        score += 1000;
    }
    if (outer.classList.contains('is-active-tab-panel')) score += 500;
    if (outer.classList.contains('notion-tabs-outer')) score += 400;
    if (outer.querySelector('[data-notion-tabs-bar]')) score += 600;
    if (outer.classList.contains('notion-tab-panel-outer')) score += 300;
    if (outer.getAttribute('data-tab-index') !== null) score += 100;
    if (outer.getAttribute('data-tab-active-empty') === 'true') score += 50;
    const root = editorRoot();
    if (root?.contains(outer)) score += 10;
    return score;
}

function pickPreferredBlockOuter(outers: HTMLElement[]): HTMLElement | null {
    if (outers.length === 0) return null;
    if (outers.length === 1) return outers[0];
    return outers.reduce((best, o) => (outerVisibilityScore(o) > outerVisibilityScore(best) ? o : best));
}

function tabsCardScore(tabsOuter: HTMLElement): number {
    let score = outerVisibilityScore(tabsOuter);
    const group = tabsOuter.querySelector(':scope > .bn-block > .bn-block-group');
    if (group) score += 200;
    const shells = directPanelOutersInTabs(tabsOuter);
    score += shells.length * 50;
    for (const shell of shells) {
        const cs = getComputedStyle(shell);
        if (cs.display !== 'none' && cs.visibility !== 'hidden') score += 150;
        if (shell.classList.contains('is-active-tab-panel')) score += 250;
    }
    return score;
}

function pickPreferredTabsOuter(outers: HTMLElement[]): HTMLElement | null {
    if (outers.length === 0) return null;
    if (outers.length === 1) return outers[0];
    const withPanels = outers.filter((o) => directPanelOutersInTabs(o).length > 0);
    const pool = withPanels.length > 0 ? withPanels : outers;
    return pool.reduce((best, o) => (tabsCardScore(o) > tabsCardScore(best) ? o : best));
}

export function blockOuterById(blockId: string): HTMLElement | null {
    return pickPreferredBlockOuter(allBlockOutersById(blockId));
}

/** Panel shell + any duplicate outers for this panel inside the tabs card (not editor-wide ghosts). */
export function tabScopedPanelOuters(tabsBlockId: string, panelId: string): HTMLElement[] {
    const tabsOuter = findTabsBlockOuter(tabsBlockId);
    if (!tabsOuter) return allBlockOutersById(panelId);

    const merged: HTMLElement[] = [];
    const shell = findPanelOuterInTabs(tabsOuter, panelId);
    if (shell) merged.push(shell);
    for (const outer of allBlockOutersById(panelId, tabsOuter)) {
        if (!merged.includes(outer)) merged.push(outer);
    }
    return merged;
}

function panelIdFromShellOuter(outer: HTMLElement): string | null {
    const direct = outer.getAttribute('data-id');
    if (direct) return direct;
    const anchor = outer.querySelector('[data-notion-tab-panel-id]');
    const anchorId = anchor?.getAttribute('data-notion-tab-panel-id');
    if (anchorId) return anchorId;
    const content = outer.querySelector('[data-content-type="notionTabPanel"]');
    return content?.getAttribute('data-id') ?? null;
}

function collectTabsBlockOuters(tabsBlockId: string): HTMLElement[] {
    const root = editorRoot() ?? document;
    const esc = cssEscape(tabsBlockId);
    const candidates: HTMLElement[] = [];

    for (const outer of allBlockOutersById(tabsBlockId, root)) {
        if (!candidates.includes(outer)) candidates.push(outer);
    }

    for (const outer of root.querySelectorAll('.bn-block-outer:has([data-content-type="notionTabs"])')) {
        if (!(outer instanceof HTMLElement) || candidates.includes(outer)) continue;
        const content = outer.querySelector('[data-content-type="notionTabs"]');
        const id = outer.getAttribute('data-id') ?? content?.getAttribute('data-id');
        if (id === tabsBlockId || Boolean(outer.querySelector(`[data-id="${esc}"]`))) {
            candidates.push(outer);
        }
    }

    return candidates;
}

export function findTabsBlockOuter(tabsBlockId: string): HTMLElement | null {
    const root = editorRoot();
    if (root) {
        const esc = cssEscape(tabsBlockId);
        const outers: HTMLElement[] = [];
        for (const anchor of root.querySelectorAll(`[data-notion-tabs-block-id="${esc}"]`)) {
            if (!(anchor instanceof HTMLElement)) continue;
            const outer = anchor.closest('.bn-block-outer');
            if (outer instanceof HTMLElement && !outers.includes(outer)) outers.push(outer);
        }
        const preferred = pickPreferredTabsOuter(outers);
        if (preferred) return preferred;
    }
    return pickPreferredTabsOuter(collectTabsBlockOuters(tabsBlockId));
}

/** Direct child panel shells under the tabs block body group. */
function directPanelOutersInTabs(tabsOuter: HTMLElement): HTMLElement[] {
    const group = tabsOuter.querySelector(':scope > .bn-block > .bn-block-group');
    if (!group) return [];

    return Array.from(group.children).filter((el): el is HTMLElement => {
        if (!(el instanceof HTMLElement) || !el.classList.contains('bn-block-outer')) {
            return false;
        }
        return (
            el.classList.contains('notion-tab-panel-outer') ||
            el.getAttribute('data-content-type') === 'notionTabPanel' ||
            Boolean(el.querySelector('[data-content-type="notionTabPanel"]'))
        );
    });
}

function findPanelOuterInTabs(tabsOuter: HTMLElement, panelId: string): HTMLElement | null {
    const esc = cssEscape(panelId);
    const hits: HTMLElement[] = [];

    for (const hit of tabsOuter.querySelectorAll(`[data-id="${esc}"]`)) {
        if (!(hit instanceof HTMLElement)) continue;
        const outer = hit.classList.contains('bn-block-outer')
            ? hit
            : hit.closest('.bn-block-outer');
        if (outer instanceof HTMLElement && tabsOuter.contains(outer) && !hits.includes(outer)) {
            hits.push(outer);
        }
    }

    for (const outer of directPanelOutersInTabs(tabsOuter)) {
        if (panelIdFromShellOuter(outer) === panelId && !hits.includes(outer)) hits.push(outer);
    }

    return pickPreferredBlockOuter(hits);
}

function panelShellOuterFromAnchor(tabsOuter: HTMLElement, panelId: string): HTMLElement | null {
    const esc = cssEscape(panelId);
    const directShells = directPanelOutersInTabs(tabsOuter);
    const fromDirect = directShells.filter((shell) => panelIdFromShellOuter(shell) === panelId);
    if (fromDirect.length > 0) return pickPreferredBlockOuter(fromDirect);

    const directSet = new Set(directShells);
    const outers: HTMLElement[] = [];
    for (const anchor of tabsOuter.querySelectorAll(`[data-notion-tab-panel-id="${esc}"]`)) {
        if (!(anchor instanceof HTMLElement)) continue;
        const outer = anchor.closest('.bn-block-outer');
        if (!(outer instanceof HTMLElement) || !tabsOuter.contains(outer) || outers.includes(outer)) {
            continue;
        }
        outers.push(outer);
    }
    const inDirect = outers.filter((o) => directSet.has(o));
    if (inDirect.length > 0) return pickPreferredBlockOuter(inDirect);
    return pickPreferredBlockOuter(outers);
}

/** Panel shell for a panel id inside the visible tabs card (React anchor → outer). */
export function panelShellOuterForPanel(tabsBlockId: string, panelId: string): HTMLElement | null {
    const tabsOuter = findTabsBlockOuter(tabsBlockId);
    if (!tabsOuter) return null;
    return panelShellOuterFromAnchor(tabsOuter, panelId);
}

/** Active tab panel shell in the visible tabs card (React anchor → outer). */
export function activePanelShellOuter(
    tabsBlockId: string,
    activeIdx: number,
    activePanelId?: string,
): HTMLElement | null {
    const tabsOuter = findTabsBlockOuter(tabsBlockId);
    if (!tabsOuter) return null;

    const shells = directPanelOutersInTabs(tabsOuter);

    if (activePanelId) {
        const fromId = panelShellOuterFromAnchor(tabsOuter, activePanelId);
        if (fromId) return fromId;
    }

    return shells[activeIdx] ?? null;
}

/** Stamp empty-tab attrs on real panel shells (data-id often lives on inner content, not the outer). */
export function stampPanelEmptyAttrsByShellOrder(
    editor: BlockNoteEditor,
    tabsBlockId: string,
    activeIndex?: number,
): boolean {
    const tabs = editor.getBlock(tabsBlockId);
    if (!tabs || tabs.type !== 'notionTabs') return false;

    const panels = getTabPanels(tabs);
    const safeActive = Math.min(
        Math.max(0, activeIndex ?? readActiveTabIndex(editor, tabsBlockId)),
        Math.max(0, panels.length - 1),
    );

    const tabsOuter = findTabsBlockOuter(tabsBlockId);
    if (!tabsOuter) return false;

    const shells = directPanelOutersInTabs(tabsOuter);
    for (let i = 0; i < shells.length; i++) {
        const shell = shells[i];
        let panel = panels[i];
        const resolvedId = panelIdFromShellOuter(shell);
        if (resolvedId) {
            const byId = panels.find((p) => p.id === resolvedId);
            if (byId) panel = byId;
        }
        if (!panel) continue;

        const live = editor.getBlock(panel.id);
        const source = live?.type === 'notionTabPanel' ? live : panel;
        const empty = isPanelContentEmpty(source);
        const panelIdx = panels.findIndex((p) => p.id === panel.id);
        const activeEmpty = panelIdx === safeActive && empty;

        const stampTarget =
            panelShellOuterFromAnchor(tabsOuter, panel.id) ?? shell;
        stampTarget.setAttribute('data-tab-empty', empty ? 'true' : 'false');
        if (activeEmpty) stampTarget.setAttribute('data-tab-active-empty', 'true');
        else stampTarget.removeAttribute('data-tab-active-empty');
    }

    return true;
}

function resolvePanelShellIndex(
    shellOuter: HTMLElement,
    panelIdToIdx: Map<string, number>,
    orderedShells: HTMLElement[],
): number {
    const panelId = panelIdFromShellOuter(shellOuter);
    if (panelId && panelIdToIdx.has(panelId)) return panelIdToIdx.get(panelId)!;
    const pos = orderedShells.indexOf(shellOuter);
    if (pos >= 0) return pos;
    return 0;
}

type TabBodySection = { tabIndex: number; nodes: HTMLElement[] };

/** Panel shell + hoisted L1 siblings between shells (BlockNote flat list). */
function collectTabBodySections(
    group: HTMLElement,
    panelIdToIdx: Map<string, number>,
    ownership: Map<string, number>,
    orderedShells: HTMLElement[],
): TabBodySection[] {
    const children = Array.from(group.children).filter(
        (el): el is HTMLElement => el instanceof HTMLElement && el.classList.contains('bn-block-outer'),
    );

    const sections: TabBodySection[] = [];
    let current: TabBodySection | null = null;

    for (const child of children) {
        if (isPanelShellOuter(child)) {
            if (current) sections.push(current);
            current = {
                tabIndex: resolvePanelShellIndex(child, panelIdToIdx, orderedShells),
                nodes: [child],
            };
            continue;
        }

        const childId = child.getAttribute('data-id');
        const owned = childId ? ownership.get(childId) : undefined;
        const tabIndex = owned !== undefined ? owned : (current?.tabIndex ?? 0);
        if (!current) {
            current = { tabIndex, nodes: [child] };
        } else {
            current.nodes.push(child);
        }
    }

    if (current) sections.push(current);
    return sections;
}

/**
 * BlockNote often lays out tab panels as a flat list: panel shell, then its hoisted
 * content blocks, then the next panel shell. Assign tab index by DOM section order.
 */
function applyTabVisibilityByBodyGroupOrder(
    tabsOuter: HTMLElement,
    panels: Block[],
    safeActive: number,
    ownership: Map<string, number>,
): { groupChildCount: number; hiddenCount: number } {
    const group = tabsOuter.querySelector(':scope > .bn-block > .bn-block-group');
    if (!group) return { groupChildCount: 0, hiddenCount: 0 };

    const panelIdToIdx = new Map(panels.map((p, i) => [p.id, i]));
    const orderedShells = directPanelOutersInTabs(tabsOuter);
    const sections = collectTabBodySections(group, panelIdToIdx, ownership, orderedShells);

    let hiddenCount = 0;
    for (const section of sections) {
        const hoistedNodes = section.nodes.filter((n) => !isPanelShellOuter(n));
        const shellNodes = section.nodes.filter((n) => isPanelShellOuter(n));
        const hasHoistedBody = hoistedNodes.length > 0;
        for (const shell of shellNodes) {
            if (hasHoistedBody) shell.setAttribute('data-tab-body-hoisted', 'true');
            else shell.removeAttribute('data-tab-body-hoisted');
        }

        const isActive = section.tabIndex === safeActive;
        for (const child of section.nodes) {
            if (!isActive) hiddenCount++;
            applyPanelVisibility(child, isActive, section.tabIndex, isPanelShellOuter(child));
            if (isPanelShellOuter(child)) {
                const panelId = resolvePanelIdForShell(child, panelIdToIdx);
                const panelBlock = panelId ? panels[section.tabIndex] : null;
                if (panelId && panelBlock) {
                    stampPanelShellEmptyState(
                        child,
                        panelId,
                        section.tabIndex,
                        safeActive,
                        panelBlock,
                        tabsOuter,
                    );
                }
            }

            child.querySelectorAll('.bn-block-outer').forEach((nested) => {
                if (!(nested instanceof HTMLElement) || nested === child) return;
                if (!outerBelongsToTabsCard(nested, tabsOuter)) return;
                const nestedId = nested.getAttribute('data-id');
                const nestedIdx =
                    nestedId !== null && nestedId !== '' && ownership.has(nestedId)
                        ? ownership.get(nestedId)!
                        : section.tabIndex;
                const nestedActive = nestedIdx === safeActive;
                if (!nestedActive) hiddenCount++;
                applyPanelVisibility(nested, nestedActive, nestedIdx, isPanelShellOuter(nested));
            });
        }
    }

    const childCount = sections.reduce((n, s) => n + s.nodes.length, 0);
    return { groupChildCount: childCount, hiddenCount };
}

function isPanelShellOuter(outer: HTMLElement): boolean {
    return (
        outer.classList.contains('notion-tab-panel-outer') ||
        outer.getAttribute('data-content-type') === 'notionTabPanel' ||
        Boolean(outer.querySelector('[data-content-type="notionTabPanel"]')) ||
        Boolean(outer.querySelector('[data-notion-tab-panel-id]'))
    );
}

/** Sync the panel shell BlockNote mounted for this React view (avoids ghost outer lookups). */
export function syncPanelShellFromReactMount(
    outer: HTMLElement,
    tabIndex: number,
    isActive: boolean,
    isEmpty: boolean,
): void {
    applyPanelVisibility(outer, isActive, tabIndex, true);
    outer.setAttribute('data-tab-empty', isEmpty ? 'true' : 'false');
    if (isActive && isEmpty) outer.setAttribute('data-tab-active-empty', 'true');
    else outer.removeAttribute('data-tab-active-empty');
}

function applyPanelVisibility(
    panelOuter: HTMLElement,
    isActive: boolean,
    tabIndex: number,
    isPanelShell = isPanelShellOuter(panelOuter),
): void {
    panelOuter.setAttribute('data-tab-index', String(tabIndex));
    if (isPanelShell) {
        panelOuter.classList.add('notion-tab-panel-outer');
        panelOuter.classList.toggle('is-active-tab-panel', isActive);
    } else {
        panelOuter.classList.remove('is-active-tab-panel');
    }

    if (isActive) {
        panelOuter.style.removeProperty('display');
        panelOuter.style.removeProperty('visibility');
        panelOuter.style.removeProperty('height');
        panelOuter.style.removeProperty('max-height');
        panelOuter.style.removeProperty('overflow');
        panelOuter.style.removeProperty('opacity');
        panelOuter.style.removeProperty('pointer-events');
        if (isPanelShell) {
            panelOuter.querySelectorAll('.bn-block, .bn-block-group, .bn-block-outer, .bn-block-content').forEach((node) => {
                if (!(node instanceof HTMLElement) || node === panelOuter) return;
                node.style.removeProperty('display');
                node.style.removeProperty('visibility');
                node.style.removeProperty('height');
                node.style.removeProperty('max-height');
                node.style.removeProperty('overflow');
                node.style.removeProperty('opacity');
                node.style.removeProperty('pointer-events');
            });
        }
    } else {
        panelOuter.style.setProperty('display', 'none', 'important');
        panelOuter.style.setProperty('visibility', 'hidden', 'important');
        panelOuter.style.setProperty('height', '0', 'important');
        panelOuter.style.setProperty('max-height', '0', 'important');
        panelOuter.style.setProperty('overflow', 'hidden', 'important');
        panelOuter.style.setProperty('opacity', '0', 'important');
        panelOuter.style.setProperty('pointer-events', 'none', 'important');
        if (isPanelShell) {
            panelOuter.querySelectorAll('.bn-block-outer, .bn-block-content').forEach((node) => {
                if (!(node instanceof HTMLElement) || node === panelOuter) return;
                node.style.setProperty('display', 'none', 'important');
                node.style.setProperty('visibility', 'hidden', 'important');
                node.style.setProperty('height', '0', 'important');
                node.style.setProperty('max-height', '0', 'important');
                node.style.setProperty('overflow', 'hidden', 'important');
                node.style.setProperty('opacity', '0', 'important');
                node.style.setProperty('pointer-events', 'none', 'important');
            });
        }
    }
}

function livePanelBlock(editor: BlockNoteEditor, panel: Block): Block | null {
    const live = editor.getBlock(panel.id);
    return live?.type === 'notionTabPanel' ? live : null;
}

function isInlineContentEmpty(content: unknown): boolean {
    if (!Array.isArray(content) || content.length === 0) return true;
    return content.every((item) => {
        if (!item || typeof item !== 'object') return true;
        const text = String((item as { text?: unknown }).text ?? '').trim();
        return text.length === 0;
    });
}

/** True before the user has clicked the tab body (no child blocks in the tree). */
export function isPanelNeverActivated(panel: Block): boolean {
    return ((panel.children ?? []) as Block[]).length === 0;
}

/** Whether a block (and its descendants) carry user-visible content. */
export function blockHasMeaningfulContent(block: Block): boolean {
    // Tabs cards are structural — must stay in panelCache even with empty panels.
    if (block.type === 'notionTabs') return true;

    const children = (block.children ?? []) as Block[];

    if (block.type === 'paragraph' || block.type === 'heading') {
        if (!isInlineContentEmpty(block.content)) return true;
        return children.some(blockHasMeaningfulContent);
    }

    if (
        block.type === 'bulletListItem' ||
        block.type === 'numberedListItem' ||
        block.type === 'checkListItem'
    ) {
        if (!isInlineContentEmpty(block.content)) return true;
        return children.some(blockHasMeaningfulContent);
    }

    if (block.type === 'codeBlock') {
        const code = String((block.props as { code?: unknown }).code ?? '').trim();
        if (code.length > 0) return true;
        return children.some(blockHasMeaningfulContent);
    }

    if (block.type === 'image' || block.type === 'video' || block.type === 'audio' || block.type === 'file') {
        const url = String((block.props as { url?: unknown }).url ?? '').trim();
        const name = String((block.props as { name?: unknown }).name ?? '').trim();
        if (url.length > 0 || name.length > 0) return true;
        return children.some(blockHasMeaningfulContent);
    }

    if (block.type === 'table') {
        return true;
    }

    if (!isInlineContentEmpty(block.content)) return true;
    return children.some(blockHasMeaningfulContent);
}

/** True when the panel has zero child blocks (empty-tab CSS hint). */
export function isPanelWithoutChildren(panel: Block): boolean {
    return ((panel.children ?? []) as Block[]).length === 0;
}

/** L1-hoisted siblings that belong to one panel index (BlockNote flat tab body). */
function collectL1HoistedBlockIdsForPanel(tabs: Block, panelIndex: number): string[] {
    const panels = getTabPanels(tabs);
    if (panelIndex < 0 || panelIndex >= panels.length) return [];
    const targetPanelId = panels[panelIndex].id;
    const ids: string[] = [];
    let currentPanelId: string | null = null;
    for (const child of (tabs.children ?? []) as Block[]) {
        if (child.type === 'notionTabPanel') {
            currentPanelId = child.id;
            continue;
        }
        if (currentPanelId === targetPanelId) ids.push(child.id);
    }
    return ids;
}

/** Panel empty hint only when tree, L1 hoists, and DOM mounts have no real body. */
export function isPanelVisuallyEmpty(
    editor: BlockNoteEditor,
    tabsBlockId: string,
    panelIndex: number,
    panel: Block,
): boolean {
    const live = editor.getBlock(panel.id) ?? panel;
    const children = (live.children ?? []) as Block[];
    if (children.some(blockHasMeaningfulContent)) return false;

    const tabs = editor.getBlock(tabsBlockId);
    if (tabs?.type === 'notionTabs') {
        for (const id of collectL1HoistedBlockIdsForPanel(tabs, panelIndex)) {
            const hoisted = editor.getBlock(id);
            if (hoisted && blockHasMeaningfulContent(hoisted)) return false;
        }
    }

    const domBlocks = collectDomMountedBlocksForTab(editor, tabsBlockId, panelIndex);
    return !domBlocks.some(blockHasMeaningfulContent);
}

function isGhostParagraph(block: Block): boolean {
    return block.type === 'paragraph' && !blockHasMeaningfulContent(block);
}

/** Remove auto-seeded empty paragraphs when nested tabs or other body content exists. */
export function pruneGhostParagraphsWhenTabHasBody(
    editor: BlockNoteEditor,
    tabsBlockId: string,
): boolean {
    const tabs = editor.getBlock(tabsBlockId);
    if (!tabs || tabs.type !== 'notionTabs') return false;

    const panels = getTabPanels(tabs);
    const toRemove: Block[] = [];
    const seen = new Set<string>();

    for (let i = 0; i < panels.length; i++) {
        const panel = panels[i];
        const live = editor.getBlock(panel.id) ?? panel;
        const sectionBlocks: Block[] = [...((live.children ?? []) as Block[])];
        for (const id of collectL1HoistedBlockIdsForPanel(tabs, i)) {
            const hoisted = editor.getBlock(id);
            if (hoisted) sectionBlocks.push(hoisted);
        }

        const hasRealBody = sectionBlocks.some(
            (b) => b.type === 'notionTabs' || (b.type !== 'paragraph' && blockHasMeaningfulContent(b)),
        );
        if (!hasRealBody) continue;

        for (const b of sectionBlocks) {
            if (!isGhostParagraph(b) || seen.has(b.id)) continue;
            seen.add(b.id);
            toRemove.push(b);
        }
    }

    if (!toRemove.length) return false;
    try {
        editor.removeBlocks(toRemove);
        return true;
    } catch {
        return false;
    }
}

/** True when the panel has no meaningful content (empty blocks are ignored). */
export function isPanelContentEmpty(panel: Block): boolean {
    const children = (panel.children ?? []) as Block[];
    if (children.length === 0) return true;
    return !children.some(blockHasMeaningfulContent);
}

/** Live document: panel has at least one block with real content (hint should hide). */
export function tabPanelHasBlocks(editor: BlockNoteEditor, panelId: string): boolean {
    const live = editor.getBlock(panelId);
    if (!live || live.type !== 'notionTabPanel') return false;
    return !isPanelContentEmpty(live);
}

/** Strip auto-seeded placeholder paragraphs so legacy tabs show the static empty hint again. */
export function normalizeUnactivatedTabPanels(
    editor: BlockNoteEditor,
    tabsBlockId: string,
): void {
    const tabs = editor.getBlock(tabsBlockId);
    if (!tabs || tabs.type !== 'notionTabs') return;

    for (const panel of getTabPanels(tabs)) {
        const live = editor.getBlock(panel.id);
        if (!live || live.type !== 'notionTabPanel') continue;
        if (!isPanelContentEmpty(live)) continue;
        if (((live.children ?? []) as Block[]).length === 0) continue;
        try {
            editor.updateBlock(live, { children: [] });
        } catch {
            /* editor not ready */
        }
    }
}

function registerDescendantOwnership(block: Block, tabIndex: number, ownership: Map<string, number>): void {
    // Nested tabs cards manage their own visibility — exclude from parent ownership map.
    if (block.type === 'notionTabs') return;
    ownership.set(block.id, tabIndex);
    for (const child of (block.children ?? []) as Block[]) {
        registerDescendantOwnership(child, tabIndex, ownership);
    }
}

/** True when this block outer is controlled by the given tabs card (not a nested tabs card). */
function outerBelongsToTabsCard(outer: HTMLElement, tabsOuter: HTMLElement): boolean {
    const card = outer.closest('.bn-block-outer.notion-tabs-outer');
    return card === tabsOuter;
}

/** Map every block id under each tab panel to its registry tab index (document tree). */
export function buildBlockTabOwnership(
    editor: BlockNoteEditor,
    tabsBlockId: string,
): Map<string, number> {
    const ownership = new Map<string, number>();
    const tabs = editor.getBlock(tabsBlockId);
    if (!tabs || tabs.type !== 'notionTabs') return ownership;

    const panels = getTabPanels(tabs);
    panels.forEach((panel, idx) => {
        const live = editor.getBlock(panel.id);
        const source = live?.type === 'notionTabPanel' ? live : panel;
        registerDescendantOwnership(source, idx, ownership);
    });
    return ownership;
}

export function findOwningTabIndex(
    blockId: string,
    ownership: Map<string, number>,
): number | null {
    const hit = ownership.get(blockId);
    return hit !== undefined ? hit : null;
}

function resolveTabIndexForOuter(
    outer: HTMLElement,
    ownership: Map<string, number>,
    tabsOuter: HTMLElement,
): number | null {
    if (isPanelShellOuter(outer)) {
        const panelId = panelIdFromShellOuter(outer);
        if (panelId) {
            const shellIdx = findOwningTabIndex(panelId, ownership);
            if (shellIdx !== null) return shellIdx;
        }
    }

    const id = outer.getAttribute('data-id');
    if (id) {
        const direct = findOwningTabIndex(id, ownership);
        if (direct !== null) return direct;
    }

    let cursor: HTMLElement | null = outer;
    while (cursor && tabsOuter.contains(cursor) && cursor !== tabsOuter) {
        const cursorId = cursor.getAttribute('data-id');
        if (cursorId) {
            const idx = findOwningTabIndex(cursorId, ownership);
            if (idx !== null) return idx;
        }
        const parentOuter = cursor.parentElement?.closest('.bn-block-outer') ?? null;
        if (!parentOuter || parentOuter === cursor) break;
        cursor = parentOuter;
    }
    return null;
}

export function readActiveTabIndex(editor: BlockNoteEditor, tabsBlockId: string): number {
    const tabs = editor.getBlock(tabsBlockId);
    if (!tabs || tabs.type !== 'notionTabs') return 0;
    const panels = getTabPanels(tabs);
    return Math.min(
        Math.max(0, Number(tabs.props.activeTab) || 0),
        Math.max(0, panels.length - 1),
    );
}

/** NotionNestClone .tab-block — stamp outer + inner shell (CSS in notion-clone-tabs-reference.css). */
export function stampTabsCardShell(outer: HTMLElement): void {
    outer.classList.add('notion-tabs-outer');
    outer.classList.remove('notion-tab-block');
    outer.setAttribute('data-notion-tab-card', 'true');
    const inner = outer.querySelector(':scope > .bn-block');
    if (inner instanceof HTMLElement) {
        inner.classList.add('notion-tab-block');
    }
}

function stampAllTabCardShellsInScope(scope: HTMLElement): void {
    if (
        scope.classList.contains('bn-block-outer') &&
        (scope.classList.contains('notion-tabs-outer') ||
            scope.classList.contains('notion-tab-block') ||
            Boolean(scope.querySelector(':scope > .bn-block > .bn-block-content [data-content-type="notionTabs"]')))
    ) {
        stampTabsCardShell(scope);
    }
    scope.querySelectorAll('.bn-block-outer').forEach((el) => {
        if (!(el instanceof HTMLElement) || el === scope) return;
        if (!el.querySelector(':scope > .bn-block > .bn-block-content [data-content-type="notionTabs"]')) return;
        stampTabsCardShell(el);
    });
}

/**
 * Single source of truth for per-tab visibility. Stamps data-active-tab, data-tab-index,
 * .is-active-tab-panel, inline display on each shell (reliable when CSS lags), and syncs
 * hoisted BlockNote siblings in the tab body group.
 */
const visibilityRafByTabs = new Map<string, number>();
const visibilityMoTimerByTabs = new Map<string, ReturnType<typeof setTimeout>>();
const emptyHintResyncRafByTabs = new Map<string, number>();

function activeEmptyPanelShellReady(tabsOuter: HTMLElement, panelId: string): boolean {
    const shells = allBlockOutersById(panelId, tabsOuter).filter(isPanelShellOuter);
    const vis = pickPreferredBlockOuter(shells);
    return Boolean(
        vis &&
            vis.classList.contains('is-active-tab-panel') &&
            vis.getAttribute('data-tab-active-empty') === 'true' &&
            outerLooksVisible(vis),
    );
}

function scheduleEmptyHintResync(
    editor: BlockNoteEditor,
    tabsBlockId: string,
    activeIndex: number,
    resyncAttempt = 0,
): void {
    if (resyncAttempt > 24) return;
    cancelAnimationFrame(emptyHintResyncRafByTabs.get(tabsBlockId) ?? 0);
    const raf = requestAnimationFrame(() => {
        emptyHintResyncRafByTabs.delete(tabsBlockId);
        applyTabVisibility(editor, tabsBlockId, activeIndex, 0, resyncAttempt + 1);
    });
    emptyHintResyncRafByTabs.set(tabsBlockId, raf);
}

/** Coalesce visibility passes (typing / MO) without delaying tab-switch updates. */
export function scheduleApplyTabVisibility(
    editor: BlockNoteEditor,
    tabsBlockId: string,
    activeIndex?: number,
): void {
    if (isTabVisibilitySuppressed()) return;
    cancelAnimationFrame(visibilityRafByTabs.get(tabsBlockId) ?? 0);
    const raf = requestAnimationFrame(() => {
        visibilityRafByTabs.delete(tabsBlockId);
        applyTabVisibility(editor, tabsBlockId, activeIndex);
    });
    visibilityRafByTabs.set(tabsBlockId, raf);
}

export function scheduleApplyTabVisibilityFromObserver(
    editor: BlockNoteEditor,
    tabsBlockId: string,
): void {
    if (isTabVisibilitySuppressed()) return;
    const prev = visibilityMoTimerByTabs.get(tabsBlockId);
    if (prev !== undefined) clearTimeout(prev);
    visibilityMoTimerByTabs.set(
        tabsBlockId,
        setTimeout(() => {
            visibilityMoTimerByTabs.delete(tabsBlockId);
            applyTabVisibility(editor, tabsBlockId);
        }, 80),
    );
}

export function applyTabVisibility(
    editor: BlockNoteEditor,
    tabsBlockId: string,
    activeIndex?: number,
    attempt = 0,
    onReady?: () => void,
): void {
    const tabs = editor.getBlock(tabsBlockId);
    if (!tabs || tabs.type !== 'notionTabs') return;

    const panels = getTabPanels(tabs);
    if (!panels.length) return;

    const safeActive = Math.min(
        Math.max(0, activeIndex ?? readActiveTabIndex(editor, tabsBlockId)),
        Math.max(0, panels.length - 1),
    );

    const tabsOuter = findTabsBlockOuter(tabsBlockId);
    if (!tabsOuter) {
        if (attempt < 12) {
            requestAnimationFrame(() =>
                applyTabVisibility(editor, tabsBlockId, activeIndex, attempt + 1, onReady),
            );
        }
        return;
    }

    tabsOuter.classList.add('notion-tabs-outer');
    const tabsRoot = tabsOuter.querySelector('.notion-tabs-root');
    if (tabsRoot instanceof HTMLElement) {
        stampTabsLiveMount(tabsBlockId, tabsRoot);
    }
    tabsOuter.setAttribute('data-active-tab', String(safeActive));

    const ownership = buildBlockTabOwnership(editor, tabsBlockId);
    const panelIdToIdx = new Map(panels.map((p, i) => [p.id, i]));
    const stamped = new Set<HTMLElement>();

    const stampOuter = (outer: HTMLElement, tabIndex: number) => {
        if (stamped.has(outer)) return;
        stamped.add(outer);
        const isActive = tabIndex === safeActive;
        const isShell = isPanelShellOuter(outer);
        applyPanelVisibility(outer, isActive, tabIndex, isShell);

        if (isShell) {
            const panelId = resolvePanelIdForShell(outer, panelIdToIdx);
            const panelBlock = panelId ? panels[tabIndex] : null;
            const live = panelBlock ? (livePanelBlock(editor, panelBlock) ?? panelBlock) : null;
            if (panelId && live) {
                stampPanelShellEmptyState(outer, panelId, tabIndex, safeActive, live, tabsOuter, panelIdToIdx);
            }
        }
    };

    // Pass 1: DOM section order (hoisted siblings between panel shells).
    applyTabVisibilityByBodyGroupOrder(tabsOuter, panels, safeActive, ownership);

    // Pass 1b: every direct panel shell in the body group (anchor id may be only signal).
    for (const shell of directPanelOutersInTabs(tabsOuter)) {
        const panelId = panelIdFromShellOuter(shell);
        const idx =
            panelId && panelIdToIdx.has(panelId) ? panelIdToIdx.get(panelId)! : orderedShellIndex(shell, tabsOuter);
        stampOuter(shell, idx);
    }

    // Pass 2: ownership map wins — stamp DOM mounts under this tabs card only (not whole editor).
    for (const [blockId, tabIndex] of ownership) {
        if (blockId === tabsBlockId) continue;
        for (const outer of allBlockOutersById(blockId, tabsOuter)) {
            stampOuter(outer, tabIndex);
        }
    }

    // Pass 3: catch unstamped outers under the tabs card (skip nested tabs cards).
    for (const outer of tabsOuter.querySelectorAll('.bn-block-outer')) {
        if (!(outer instanceof HTMLElement) || outer === tabsOuter) continue;
        if (!outerBelongsToTabsCard(outer, tabsOuter)) continue;

        const tabIndex = resolveTabIndexForOuter(outer, ownership, tabsOuter);
        if (tabIndex === null) {
            if (isPanelShellOuter(outer)) {
                const panelId = panelIdFromShellOuter(outer);
                if (panelId && panelIdToIdx.has(panelId)) {
                    stampOuter(outer, panelIdToIdx.get(panelId)!);
                    continue;
                }
                // Pass 1 may have stamped panel shells whose id lives on inner content, not the outer.
                if (outer.hasAttribute('data-tab-index')) continue;
            }
            outer.removeAttribute('data-tab-index');
            outer.classList.remove('is-active-tab-panel');
            applyPanelVisibility(outer, false, -1, isPanelShellOuter(outer));
            continue;
        }

        stampOuter(outer, tabIndex);
    }

    onReady?.();
}

function orderedShellIndex(shell: HTMLElement, tabsOuter: HTMLElement): number {
    const shells = directPanelOutersInTabs(tabsOuter);
    const pos = shells.indexOf(shell);
    return pos >= 0 ? pos : 0;
}

function stampPanelEmptyAttr(tabsBlockId: string, panelId: string, empty: boolean): void {
    for (const outer of tabScopedPanelOuters(tabsBlockId, panelId)) {
        outer.setAttribute('data-tab-empty', empty ? 'true' : 'false');
    }
}

/** First edit in an empty tab: add one paragraph so BlockNote shows its placeholder. */
export function seedTabPanelIfEmpty(
    editor: BlockNoteEditor,
    panelId: string,
): { block: Block | null; didSeed: boolean } {
    const live = editor.getBlock(panelId);
    if (!live || live.type !== 'notionTabPanel') return { block: null, didSeed: false };
    const children = (live.children ?? []) as Block[];
    if (children.length > 0) {
        return { block: children[0], didSeed: false };
    }
    const seeded = defaultTabContentBlocks();
    try {
        editor.updateBlock(live, { children: seeded });
    } catch {
        return { block: null, didSeed: false };
    }

    const after = editor.getBlock(panelId);
    const kids = (after?.children ?? []) as Block[];
    if (!kids.length) return { block: null, didSeed: false };
    return { block: kids[0], didSeed: true };
}

/** User clicked the tab body — seed L2 content if needed, then focus (shows "/" placeholder). */
export function focusActiveTabPanelContent(
    editor: BlockNoteEditor,
    tabsBlockId: string,
): boolean {
    const tabs = editor.getBlock(tabsBlockId);
    if (!tabs || tabs.type !== 'notionTabs') return false;

    const panels = getTabPanels(tabs);
    const activeIdx = readActiveTabIndex(editor, tabsBlockId);
    const panel = panels[activeIdx];
    if (!panel) return false;

    const { block: target, didSeed } = seedTabPanelIfEmpty(editor, panel.id);
    if (!target) return false;

    stampPanelEmptyAttr(
        panel.id,
        isPanelWithoutChildren(editor.getBlock(panel.id) ?? panel),
    );
    applyTabVisibility(editor, tabsBlockId, activeIdx);

    const focusBlock = (blockId: string) => {
        try {
            editor.setTextCursorPosition(blockId, 'start');
            return true;
        } catch {
            return false;
        }
    };

    const runFocus = () => {
        const live = editor.getBlock(target.id) ?? target;
        if (!focusBlock(live.id)) {
            const panelOuter = blockOuterById(panel.id);
            const inline = panelOuter?.querySelector('.bn-inline-content');
            if (inline instanceof HTMLElement) inline.focus();
        }
    };

    const resync = () => {
        applyTabVisibility(editor, tabsBlockId, activeIdx);
        runFocus();
    };

    if (didSeed) {
        requestAnimationFrame(() => requestAnimationFrame(resync));
    } else {
        resync();
    }

    return true;
}

/** Compatibility alias for existing call sites. */
export function syncTabPanelChrome(
    editor: BlockNoteEditor,
    tabsBlockId: string,
    activeIndex: number,
): void {
    applyTabVisibility(editor, tabsBlockId, activeIndex);
}

/** Recompute the empty-tab hint only (panel visibility unchanged). */
export function syncTabPanelEmptyHints(
    editor: BlockNoteEditor,
    tabsBlockId: string,
    _activeIndex: number,
): void {
    applyTabVisibility(editor, tabsBlockId, _activeIndex);
}

/** Install a MutationObserver that re-applies visibility when BlockNote re-renders tab children. */
export function observeTabsVisibility(
    editor: BlockNoteEditor,
    tabsBlockId: string,
    tabsOuter: HTMLElement,
): () => void {
    let raf = 0;
    const resync = (records?: MutationRecord[]) => {
        if (isTabVisibilitySuppressed() || isEmptyHintFocusInFlight()) return;
        const fromNestedCard = Boolean(
            records?.some((r) => {
                const el =
                    r.target instanceof HTMLElement
                        ? r.target
                        : r.target instanceof Element
                          ? r.target.parentElement
                          : null;
                if (!el) return false;
                const card = el.closest('.bn-block-outer.notion-tabs-outer');
                return Boolean(card && card !== tabsOuter);
            }),
        );
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
            if (isTabSwitchInFlight() || isEmptyHintFocusInFlight()) return;
            if (fromNestedCard) return;
            scheduleApplyTabVisibilityFromObserver(editor, tabsBlockId);
        });
    };
    const observer = new MutationObserver(resync);
    const bodyGroup = tabsOuter.querySelector(':scope > .bn-block > .bn-block-group');
    if (bodyGroup) {
        observer.observe(bodyGroup, { childList: true, subtree: true });
    }
    return () => {
        cancelAnimationFrame(raf);
        const moTimer = visibilityMoTimerByTabs.get(tabsBlockId);
        if (moTimer !== undefined) clearTimeout(moTimer);
        visibilityMoTimerByTabs.delete(tabsBlockId);
        observer.disconnect();
    };
}

/** Internal helper kept for deep-link / accidental-deletion guard logic. */
export function findPanelBlockInTabs(tabs: Block, panelId: string): Block | undefined {
    return ((tabs.children ?? []) as Block[]).find(
        (c) => c.type === 'notionTabPanel' && c.id === panelId,
    );
}
