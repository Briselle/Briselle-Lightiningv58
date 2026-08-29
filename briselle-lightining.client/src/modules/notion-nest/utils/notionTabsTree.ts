import type { Block, BlockNoteEditor } from '@blocknote/core';
import { readPanelRegistry, registryToPanelBlocks } from './notionTabsRegistry';

export {
    getPrimaryPageTabsBlockId,
    isManagedTabsBlock,
    isPrimaryPageTabsBlock,
    resolveInnermostManagedTabsBlockId,
} from './notionTabsRepair';

export function findBlockInTree(
    blocks: Block[],
    id: string,
    parent: Block | null = null,
): { block: Block; parent: Block | null; index: number } | null {
    for (let i = 0; i < blocks.length; i++) {
        const b = blocks[i];
        if (b.id === id) return { block: b, parent, index: i };
        if (b.children?.length) {
            const found = findBlockInTree(b.children as Block[], id, b);
            if (found) return found;
        }
    }
    return null;
}

function documentTabPanels(tabsBlock: Block): Block[] {
    return ((tabsBlock.children ?? []) as Block[]).filter((c) => c.type === 'notionTabPanel');
}

/**
 * Tab panels in registry order, merged with live document children (content blocks included).
 * Registry defines order/labels; mounted `notionTabPanel` children supply actual content.
 */
export function getTabPanels(tabsBlock: Block): Block[] {
    const registry = readPanelRegistry(tabsBlock);
    const docPanels = documentTabPanels(tabsBlock);
    const docById = new Map(docPanels.map((p) => [p.id, p]));

    if (registry.length > 0) {
        return registry.map((entry) => {
            const doc = docById.get(entry.id);
            if (doc) return doc;
            return registryToPanelBlocks([entry])[0];
        });
    }

    return docPanels;
}
