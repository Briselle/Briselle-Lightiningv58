import type { Block, BlockNoteEditor } from '@blocknote/core';
import { deleteNotionTabPanelAtIndex } from './notionTabsActivate';
import { isCursorInTabsBlock, isPanelContentEmpty } from './notionTabsDom';

import { isIntentionalTabDelete, runIntentionalTabDelete } from './notionTabsSync';
import { getTabPanels } from './notionTabsTree';

export { isIntentionalTabDelete, runIntentionalTabDelete } from './notionTabsSync';

function cloneTabsBlock(block: Block): Block {
    return structuredClone(block) as Block;
}

function findRemovedPanelIndex(prevPanels: Block[], currPanels: Block[]): number {
    const currIds = new Set(currPanels.map((p) => p.id));
    for (let i = 0; i < prevPanels.length; i++) {
        if (!currIds.has(prevPanels[i].id)) return i;
    }
    return -1;
}

/**
 * When BlockNote removes a tab panel (backspace / delete block), revert and ask to confirm.
 */
export function handleAccidentalTabPanelRemoval(
    editor: BlockNoteEditor,
    tabsBlockId: string,
    previousTabs: Block,
    currentTabs: Block,
): boolean {
    if (isIntentionalTabDelete()) return false;

    const prevPanels = getTabPanels(previousTabs);
    const currPanels = getTabPanels(currentTabs);
    if (currPanels.length >= prevPanels.length) return false;

    const removedIndex = findRemovedPanelIndex(prevPanels, currPanels);
    if (removedIndex < 0) return false;

    const removed = prevPanels[removedIndex];
    const label = String(removed.props.label ?? `Tab ${removedIndex + 1}`);

    // While typing inside the tab: restore panel shell only — no cursor hijacking.
    if (isCursorInTabsBlock(editor, tabsBlockId)) {
        editor.replaceBlocks([currentTabs], [cloneTabsBlock(previousTabs)]);
        return true;
    }

    // Empty tab shell removal when focus already left the card.
    if (isPanelContentEmpty(removed)) {
        return false;
    }

    editor.replaceBlocks([currentTabs], [cloneTabsBlock(previousTabs)]);

    const ok = window.confirm(
        `Delete "${label}"?\n\nAll content in this tab will be removed. This cannot be undone.`,
    );
    if (!ok) return true;

    runIntentionalTabDelete(() => {
        deleteNotionTabPanelAtIndex(editor, tabsBlockId, removedIndex, false);
    });
    return true;
}
