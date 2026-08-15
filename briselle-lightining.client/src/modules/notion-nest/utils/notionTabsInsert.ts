import { insertOrUpdateBlock } from '@blocknote/core';
import type { Block } from '@blocknote/core';

import type { NotionSlashEditor } from '../notionSlashMenuItems';
import {
    flushActivePanelCache,
    readPanelCache,
    writePanelLiveChildrenToCache,
} from './notionTabsActivate';
import {
    applyTabVisibility,
    pruneGhostParagraphsWhenTabHasBody,
    readActiveTabIndex,
    syncTabPanelChrome,
} from './notionTabsDom';
import { enforceTabL2Containment, refreshPanelMembership } from './notionTabsReparent';
import { getTabPanels } from './notionTabsTree';
import { nextDefaultTabLabel } from './notionTabLabels';
import { panelBlockToRegistryEntry, writePanelRegistry } from './notionTabsRegistry';
import { withTabSwitchInFlight } from './notionTabsSync';

const DEFAULT_TABS_PROPS = {
    activeTab: 0,
    tabStyle: 'standard',
    tabShowUnderline: false,
    tabGap: 6,
    tabHeight: 'medium' as const,
    tabCustomSelection: false,
    tabSelectionColor: '#2563eb',
    tabAlignment: 'left' as const,
    textColor: 'default' as const,
    backgroundColor: 'default' as const,
    textAlignment: 'left' as const,
    panelCache: '{}',
};

function newTabPanel(label: string): Block {
    return {
        id: crypto.randomUUID(),
        type: 'notionTabPanel',
        props: {
            label,
            tabIcon: '',
            tabIconCustom: '',
            textColor: 'default',
            backgroundColor: 'default',
            textAlignment: 'left',
        },
        children: [],
    } as Block;
}

/** Build a fresh tabs block (clone addBlock('tabs') — Tab 1 + Tab 2, empty panels). */
export function buildNewNotionTabsBlock(blockId?: string): Block {
    const tabsId = blockId ?? crypto.randomUUID();
    const panel1 = newTabPanel('Tab 1');
    const panel2 = newTabPanel('Tab 2');
    const registry = [
        panelBlockToRegistryEntry(panel1),
        panelBlockToRegistryEntry(panel2),
    ];

    return {
        id: tabsId,
        type: 'notionTabs',
        props: {
            ...DEFAULT_TABS_PROPS,
            activeTab: 0,
            panelRegistry: JSON.stringify(registry),
            panelCache: '{}',
        },
        children: [
            { ...panel1, children: [] } as Block,
            { ...panel2, children: [] } as Block,
        ],
    } as Block;
}

/** Parent `notionTabs` when cursor is inside a tab panel (clone findBlockContainer). */
function findParentTabsBlockIdFromCursor(editor: NotionSlashEditor): string | null {
    try {
        let block = editor.getTextCursorPosition()?.block;
        while (block) {
            const parent = editor.getParentBlock(block);
            if (!parent) return null;
            if (parent.type === 'notionTabs') return parent.id;
            block = parent;
        }
    } catch {
        /* cursor unavailable */
    }
    return null;
}

/**
 * Clone appendBlockToContainer / container.arr.splice(index + 1, 0, newBlock):
 * append nested tabs at the END of the active panel's blocks array.
 */
function appendNotionTabsToActivePanel(
    editor: NotionSlashEditor,
    parentTabsId: string,
    newTabsBlock: Block,
): void {
    withTabSwitchInFlight(() => {
        enforceTabL2Containment(editor, parentTabsId);

        const tabs = editor.getBlock(parentTabsId);
        if (!tabs || tabs.type !== 'notionTabs') return;

        const panels = getTabPanels(tabs);
        const activeIdx = readActiveTabIndex(editor, parentTabsId);
        const activePanel = panels[activeIdx];
        if (!activePanel) return;

        const livePanel = editor.getBlock(activePanel.id);
        if (!livePanel || livePanel.type !== 'notionTabPanel') return;

        const existing = [...((livePanel.children ?? []) as Block[])];
        editor.updateBlock(livePanel, {
            children: [...existing, newTabsBlock],
        });

        enforceTabL2Containment(editor, parentTabsId);
        refreshPanelMembership(editor, parentTabsId);
        pruneGhostParagraphsWhenTabHasBody(editor, parentTabsId);
        flushActivePanelCache(editor, parentTabsId);
        applyTabVisibility(editor, parentTabsId, activeIdx);
        syncTabPanelChrome(editor, newTabsBlock.id, 0);

        // #region agent log
        const afterPanel = editor.getBlock(activePanel.id);
        const childOrder = ((afterPanel?.children ?? []) as Block[]).map((b) => ({
            id: b.id.slice(0, 8),
            type: b.type,
        }));
        fetch('http://127.0.0.1:7785/ingest/ce2bb16d-d021-452b-a139-834b64666894', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'fdfc50' },
            body: JSON.stringify({
                sessionId: 'fdfc50',
                location: 'notionTabsInsert.ts:appendNotionTabsToActivePanel',
                message: 'nested tabs append order',
                data: {
                    newTabsId: newTabsBlock.id.slice(0, 8),
                    parentTabsId: parentTabsId.slice(0, 8),
                    childOrder,
                    newAtEnd: childOrder.at(-1)?.id === newTabsBlock.id.slice(0, 8),
                },
                timestamp: Date.now(),
                hypothesisId: 'H-INSERT-ORDER',
                runId: 'post-fix-7',
            }),
        }).catch(() => {});
        // #endregion
    });
}

/** Insert tabs — append inside active panel (nested) or at cursor (page level). */
export function insertNotionTabs(editor: NotionSlashEditor) {
    const parentTabsId = findParentTabsBlockIdFromCursor(editor);

    if (parentTabsId) {
        appendNotionTabsToActivePanel(editor, parentTabsId, buildNewNotionTabsBlock());
        return;
    }

    const inserted = insertOrUpdateBlock(editor, {
        type: 'notionTabs',
        props: { ...DEFAULT_TABS_PROPS },
    });
    const withChildren = buildNewNotionTabsBlock(inserted.id);
    editor.replaceBlocks([inserted], [withChildren]);
    requestAnimationFrame(() => {
        syncTabPanelChrome(editor, withChildren.id, 0);
    });
}

/** Ensure Tab 1 + Tab 2 exist (slash insert inside a tab panel sometimes yields a bare tabs block). */
export function ensureStarterTabPanels(editor: NotionSlashEditor, tabsBlockId: string): void {
    const base = editor.getBlock(tabsBlockId);
    if (!base || base.type !== 'notionTabs') return;

    const panels = getTabPanels(base);
    if (panels.length >= 2) return;

    withTabSwitchInFlight(() => {
        const live = editor.getBlock(tabsBlockId);
        if (!live || live.type !== 'notionTabs') return;

        const existing = getTabPanels(live);
        const toAdd: Block[] = [];
        if (existing.length === 0) {
            toAdd.push(newTabPanel('Tab 1'), newTabPanel('Tab 2'));
        } else if (existing.length === 1) {
            toAdd.push(newTabPanel('Tab 2'));
        }
        if (!toAdd.length) return;

        const activeIdx = readActiveTabIndex(editor, tabsBlockId);
        const cache = { ...readPanelCache(live) };
        const activePanel = existing[activeIdx];
        if (activePanel) {
            writePanelLiveChildrenToCache(cache, editor, activePanel.id, tabsBlockId);
        }
        for (const p of toAdd) cache[p.id] = [];

        const registry = [
            ...existing.map((p) => panelBlockToRegistryEntry(p)),
            ...toAdd.map((p) => panelBlockToRegistryEntry(p)),
        ];

        const nextChildren: Block[] = [
            ...existing.map((p, i) => {
                const block = editor.getBlock(p.id) ?? p;
                return {
                    ...block,
                    type: 'notionTabPanel' as const,
                    children:
                        i === activeIdx ? structuredClone(cache[p.id] ?? []) : [],
                } as Block;
            }),
            ...toAdd.map((p) => ({ ...p, children: [] } as Block)),
        ];

        editor.replaceBlocks(
            [live],
            [
                {
                    ...live,
                    props: {
                        ...live.props,
                        ...writePanelRegistry(live, registry),
                        panelCache: JSON.stringify(cache),
                        activeTab: activeIdx,
                    },
                    children: nextChildren,
                } as Block,
            ],
        );
        applyTabVisibility(editor, tabsBlockId, activeIdx);
    });
}

/** Append a new tab to an existing tabs block — all existing panels stay mounted. */
export function addNotionTabPanel(editor: NotionSlashEditor, tabsBlockId: string) {
    withTabSwitchInFlight(() => {
        const tabs = editor.getBlock(tabsBlockId);
        if (!tabs || tabs.type !== 'notionTabs') return;

        const panels = getTabPanels(tabs);
        const activeIdx = readActiveTabIndex(editor, tabsBlockId);
        const cache = { ...readPanelCache(tabs) };
        const activePanel = panels[activeIdx];
        if (activePanel) {
            writePanelLiveChildrenToCache(cache, editor, activePanel.id, tabsBlockId);
        }

        const label = nextDefaultTabLabel(panels.map((p) => String((p.props as { label?: unknown }).label ?? '')));
        const panel = newTabPanel(label);
        cache[panel.id] = [];

        const registry = [
            ...panels.map((p) => panelBlockToRegistryEntry(p)),
            panelBlockToRegistryEntry(panel),
        ];

        const nextChildren: Block[] = [
            ...panels.map((p, i) => {
                const block = editor.getBlock(p.id) ?? p;
                return {
                    ...block,
                    type: 'notionTabPanel' as const,
                    children:
                        i === activeIdx ? structuredClone(cache[p.id] ?? []) : [],
                } as Block;
            }),
            { ...panel, children: [] } as Block,
        ];

        const newActive = panels.length;
        editor.replaceBlocks(
            [tabs],
            [
                {
                    ...tabs,
                    props: {
                        ...tabs.props,
                        ...writePanelRegistry(tabs, registry),
                        panelCache: JSON.stringify(cache),
                        activeTab: newActive,
                    },
                    children: nextChildren,
                } as Block,
            ],
        );
        applyTabVisibility(editor, tabsBlockId, newActive);
    });
}
