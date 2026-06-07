import { NOTION_PAGE_STORAGE_KEY, type NotionPagePayload } from './types';

export function createEmptyNotionBlocks(): any[] {
    return [
        {
            id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'b_' + Math.random().toString(36).substr(2, 9),
            type: 'paragraph',
            content: '',
        },
    ];
}

function migrateBlockNoteToNotionZest(bnBlocks: any[]): any[] {
    if (!Array.isArray(bnBlocks)) return [];
    
    return bnBlocks.map(block => {
        if (!block || typeof block !== 'object') return null;
        
        let contentStr = '';
        if (Array.isArray(block.content)) {
            contentStr = block.content.map((inline: any) => {
                if (!inline || typeof inline !== 'object') return '';
                if (inline.type === 'text') {
                    let text = inline.text || '';
                    if (inline.styles) {
                        if (inline.styles.bold) text = `<b>${text}</b>`;
                        if (inline.styles.italic) text = `<i>${text}</i>`;
                        if (inline.styles.underline) text = `<u>${text}</u>`;
                        if (inline.styles.strikethrough) text = `<s>${text}</s>`;
                        if (inline.styles.code) text = `<code>${text}</code>`;
                    }
                    return text;
                } else if (inline.type === 'link' && inline.href) {
                    const text = Array.isArray(inline.content) 
                        ? inline.content.map((c: any) => c.text || '').join('') 
                        : (inline.text || inline.href);
                    return `<a href="${inline.href}">${text}</a>`;
                }
                return '';
            }).join('');
        } else if (typeof block.content === 'string') {
            contentStr = block.content;
        }

        let type = block.type || 'paragraph';
        if (type === 'bulletListItem') type = 'bulleted_list';
        if (type === 'numberedListItem') type = 'numbered_list';
        if (type === 'checkListItem') type = 'todo';
        if (type === 'heading') {
            const level = block.props?.level || 1;
            type = `heading${level}`;
        }
        if (type === 'notionQuote') type = 'quote';
        if (type === 'notionCallout') type = 'callout';
        if (type === 'notionDivider') type = 'divider';
        if (type === 'codeBlock') type = 'code';
        if (type === 'notionToggle') type = 'toggle';
        if (type === 'notionTabs') type = 'tabs';
        if (type === 'notionColumns') type = 'columns';

        const extra: any = {};
        if (block.props) {
            if (block.props.checked !== undefined) extra.checked = block.props.checked;
            if (block.props.language !== undefined) extra.language = block.props.language;
            if (block.props.url !== undefined) extra.url = block.props.url;
            if (block.props.caption !== undefined) extra.caption = block.props.caption;
            if (block.props.isOpen !== undefined) extra.open = block.props.isOpen;
            if (block.props.activeTab !== undefined) extra.activeTabId = block.props.activeTab;
            if (block.props.icon !== undefined) extra.calloutIcon = block.props.icon;
        }

        let children: any[] = [];
        if (Array.isArray(block.children)) {
            children = migrateBlockNoteToNotionZest(block.children);
        }

        if (type === 'table') {
            const rows: string[][] = [];
            const tableContent = block.content;
            if (tableContent && typeof tableContent === 'object' && Array.isArray(tableContent.rows)) {
                for (const row of tableContent.rows) {
                    if (row && Array.isArray(row.cells)) {
                        rows.push(row.cells.map(cell => typeof cell === 'string' ? cell : ''));
                    }
                }
            }
            if (rows.length === 0) {
                rows.push(['Column 1', 'Column 2'], ['', '']);
            }
            extra.rows = rows;
            contentStr = '';
        }

        if (type === 'tabs') {
            const tabs: any[] = [];
            if (Array.isArray(block.children)) {
                for (const child of block.children) {
                    if (child.type === 'notionTabPanel') {
                        tabs.push({
                            id: child.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'tab_' + Math.random().toString(36).substr(2, 9)),
                            name: child.props?.label || 'Tab',
                            blocks: migrateBlockNoteToNotionZest(child.children)
                        });
                    }
                }
            }
            extra.tabs = tabs;
            if (tabs.length > 0) {
                extra.activeTabId = tabs[0].id;
            }
            children = [];
        }

        if (type === 'columns') {
            const columns: any[] = [];
            if (Array.isArray(block.children)) {
                for (const child of block.children) {
                    columns.push({
                        id: child.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'col_' + Math.random().toString(36).substr(2, 9)),
                        blocks: migrateBlockNoteToNotionZest(child.children || [child])
                    });
                }
            }
            if (columns.length === 0) {
                columns.push(
                    { id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'col_' + Math.random().toString(36).substr(2, 9), blocks: [] },
                    { id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'col_' + Math.random().toString(36).substr(2, 9), blocks: [] }
                );
            }
            extra.columns = columns;
            children = [];
        }

        return {
            id: block.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'b_' + Math.random().toString(36).substr(2, 9)),
            type,
            content: contentStr,
            ...(children.length > 0 ? { children } : {}),
            ...extra
        };
    }).filter(Boolean);
}

export function sanitizeNotionBlocks(blocks: unknown): any[] {
    if (!Array.isArray(blocks)) return createEmptyNotionBlocks();

    if (blocks.length > 0) {
        const first = blocks[0];
        if (first && typeof first === 'object' && (first.props !== undefined || Array.isArray(first.content))) {
            return migrateBlockNoteToNotionZest(blocks);
        }
    }

    return blocks.map((block: any) => {
        if (!block || typeof block !== 'object') return null;
        return {
            id: block.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'b_' + Math.random().toString(36).substr(2, 9)),
            type: block.type || 'paragraph',
            content: typeof block.content === 'string' ? block.content : '',
            ...(block.children ? { children: sanitizeNotionBlocks(block.children) } : {}),
            ...(block.checked !== undefined ? { checked: !!block.checked } : {}),
            ...(block.open !== undefined ? { open: !!block.open } : {}),
            ...(block.calloutIcon !== undefined ? { calloutIcon: String(block.calloutIcon) } : {}),
            ...(block.language !== undefined ? { language: String(block.language) } : {}),
            ...(block.rows !== undefined ? { rows: block.rows } : {}),
            ...(block.columns !== undefined ? { columns: block.columns } : {}),
            ...(block.tabs !== undefined ? { tabs: block.tabs } : {}),
            ...(block.activeTabId !== undefined ? { activeTabId: block.activeTabId } : {}),
            ...(block.url !== undefined ? { url: String(block.url) } : {}),
            ...(block.bookmarkTitle !== undefined ? { bookmarkTitle: String(block.bookmarkTitle) } : {}),
            ...(block.description !== undefined ? { description: String(block.description) } : {}),
            ...(block.caption !== undefined ? { caption: String(block.caption) } : {}),
            ...(block.expression !== undefined ? { expression: String(block.expression) } : {}),
            ...(block.pageTitle !== undefined ? { pageTitle: String(block.pageTitle) } : {}),
        };
    }).filter(Boolean);
}

export function createDefaultNotionPage(title?: string): NotionPagePayload {
    const blocks = createEmptyNotionBlocks();

    if (title?.trim()) {
        blocks[0] = {
            ...blocks[0],
            content: title.trim(),
        };
    }

    return {
        version: 1,
        icon: '📄',
        coverUrl: '',
        fullWidth: false,
        smallText: false,
        blocks,
        updatedAt: new Date().toISOString(),
    };
}

export function parseNotionPageFromValues(values: Record<string, unknown> | null): NotionPagePayload {
    const raw = values?.[NOTION_PAGE_STORAGE_KEY];

    if (raw && typeof raw === 'object') {
        const p = raw as Partial<NotionPagePayload>;
        return {
            version: 1,
            icon: String(p.icon ?? '📄'),
            coverUrl: String(p.coverUrl ?? ''),
            fullWidth: p.fullWidth === true,
            smallText: p.smallText === true,
            blocks: sanitizeNotionBlocks(p.blocks),
            updatedAt: typeof p.updatedAt === 'string' ? p.updatedAt : undefined,
        };
    }

    if (typeof raw === 'string') {
        try {
            return parseNotionPageFromValues({ [NOTION_PAGE_STORAGE_KEY]: JSON.parse(raw) });
        } catch {
            /* fall through */
        }
    }

    const title = String(values?.sys_record_name ?? '').trim();
    return createDefaultNotionPage(title || undefined);
}

export { NOTION_PAGE_STORAGE_KEY };
