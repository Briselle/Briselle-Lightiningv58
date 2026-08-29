import type { Block, BlockNoteEditor } from '@blocknote/core';
import { getTabPanels } from './notionTabsTree';

/** Coordinates tab-switch document updates so onChange/MutationObserver do not loop. */

let switchInFlight = false;
let switchClearRaf = 0;
let visibilitySuppressedUntil = 0;

let emptyHintFocusInFlight = false;
let emptyHintFocusClearRaf = 0;

let intentionalTabDeleteUntil = 0;

export function runIntentionalTabDelete(fn: () => void): void {
    intentionalTabDeleteUntil = performance.now() + 2500;
    fn();
}

export function isIntentionalTabDelete(): boolean {
    return performance.now() < intentionalTabDeleteUntil;
}

export function isTabSwitchInFlight(): boolean {
    return switchInFlight;
}

/** Block MO/scheduled visibility while BlockNote remounts panel shells after a tab switch. */
export function isTabVisibilitySuppressed(): boolean {
    return switchInFlight || Date.now() < visibilitySuppressedUntil;
}

function suppressTabVisibility(ms: number): void {
    visibilitySuppressedUntil = Math.max(visibilitySuppressedUntil, Date.now() + ms);
}

export function isEmptyHintFocusInFlight(): boolean {
    return emptyHintFocusInFlight;
}

export function withTabSwitchInFlight<T>(fn: () => T): T {
    cancelAnimationFrame(switchClearRaf);
    switchInFlight = true;
    suppressTabVisibility(160);
    try {
        return fn();
    } finally {
        switchClearRaf = requestAnimationFrame(() => {
            switchClearRaf = requestAnimationFrame(() => {
                switchInFlight = false;
                suppressTabVisibility(120);
            });
        });
    }
}

/** Empty-hint click seeds L2; skip adopt/pin/MO resync until focus settles (tab 2+ loop guard). */
export function withEmptyHintFocusInFlight<T>(fn: () => T): T {
    cancelAnimationFrame(emptyHintFocusClearRaf);
    emptyHintFocusInFlight = true;
    try {
        return fn();
    } finally {
        emptyHintFocusClearRaf = requestAnimationFrame(() => {
            emptyHintFocusClearRaf = requestAnimationFrame(() => {
                emptyHintFocusInFlight = false;
            });
        });
    }
}

/**
 * L1 layout only: tab panel shells + hoisted siblings directly under the tabs card.
 * Ignores blocks inside panel.children so Enter/Backspace in tab body stay native.
 */
export function tabsL1LayoutFingerprint(tabs: Block, editor?: BlockNoteEditor): string {
    if (tabs.type !== 'notionTabs') return '';
    const parts = [`tabs:${tabs.id}`];
    for (const child of (tabs.children ?? []) as Block[]) {
        if (child.type === 'notionTabPanel') {
            parts.push(`panel:${child.id}`);
            continue;
        }
        const live = editor?.getBlock(child.id) ?? child;
        parts.push(`${live.type}:${live.id}`);
    }
    return parts.join('|');
}

/** Shallow tree fingerprint — block ids/types only (not inline text). */
export function tabsStructureFingerprint(
    tabs: Block,
    editor?: BlockNoteEditor,
): string {
    if (tabs.type !== 'notionTabs') return '';
    const parts = [`tabs:${tabs.id}`];
    for (const panel of getTabPanels(tabs)) {
        const source =
            editor?.getBlock(panel.id)?.type === 'notionTabPanel'
                ? (editor.getBlock(panel.id) as Block)
                : panel;
        parts.push(`panel:${panel.id}`);
        for (const child of (source.children ?? []) as Block[]) {
            parts.push(`${child.type}:${child.id}`);
            if (child.type === 'notionTabs') continue;
            for (const grand of (child.children ?? []) as Block[]) {
                parts.push(`${grand.type}:${grand.id}`);
            }
        }
    }
    return parts.join('|');
}

/** Nested notionTabs under this card (panel children + L1 siblings from BlockNote hoist). */
export function nestedTabsIdsUnderCard(editor: BlockNoteEditor, tabsBlockId: string): Set<string> {
    const ids = new Set<string>();
    const tabs = editor.getBlock(tabsBlockId);
    if (!tabs || tabs.type !== 'notionTabs') return ids;
    for (const child of (tabs.children ?? []) as Block[]) {
        if (child.type === 'notionTabs') ids.add(child.id);
    }
    for (const panel of getTabPanels(tabs)) {
        const live = editor.getBlock(panel.id) ?? panel;
        for (const child of (live.children ?? []) as Block[]) {
            if (child.type === 'notionTabs') ids.add(child.id);
        }
    }
    return ids;
}

/** This tabs card lives inside another tabs card (panel child or L1-hoisted sibling). */
export function isNestedTabsCard(editor: BlockNoteEditor, tabsBlockId: string): boolean {
    let walk = editor.getParentBlock(tabsBlockId);
    while (walk) {
        if (walk.type === 'notionTabs') return true;
        walk = editor.getParentBlock(walk) ?? undefined;
    }
    return false;
}

/** True when `blockId` is the tabs card or any block mounted under it (panel / hoisted / nested). */
export function isBlockUnderTabsCard(
    editor: BlockNoteEditor,
    blockId: string,
    tabsBlockId: string,
): boolean {
    let walk: Block | undefined = editor.getBlock(blockId);
    while (walk) {
        if (walk.type === 'notionTabs') return walk.id === tabsBlockId;
        walk = editor.getParentBlock(walk) ?? undefined;
    }
    return false;
}

/** Cursor is inside a child tabs card nested under this one — outer must not resync DOM. */
export function isEditingInsideNestedTabs(
    editor: BlockNoteEditor,
    tabsBlockId: string,
): boolean {
    let cursorId: string | undefined;
    try {
        cursorId = editor.getTextCursorPosition()?.block?.id;
    } catch {
        return false;
    }
    if (!cursorId) return false;

    let walk: Block | undefined = editor.getBlock(cursorId);
    while (walk) {
        if (walk.type === 'notionTabs' && walk.id !== tabsBlockId) {
            return isBlockUnderTabsCard(editor, walk.id, tabsBlockId);
        }
        walk = editor.getParentBlock(walk) ?? undefined;
    }
    return false;
}

const onChangeSyncByTabs = new Map<string, () => void>();
let onChangeSyncRaf = 0;

/** One rAF pass per tabs card per editor change burst (avoids double full sync). */
export function scheduleTabsOnChangeWork(tabsBlockId: string, work: () => void): void {
    onChangeSyncByTabs.set(tabsBlockId, work);
    cancelAnimationFrame(onChangeSyncRaf);
    onChangeSyncRaf = requestAnimationFrame(() => {
        onChangeSyncRaf = 0;
        const jobs = [...onChangeSyncByTabs.entries()];
        onChangeSyncByTabs.clear();
        for (const [, fn] of jobs) fn();
    });
}
