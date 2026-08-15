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
                        rows.push(row.cells.map((cell: any) => typeof cell === 'string' ? cell : ''));
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
            ...(block.columns ? { columns: Array.isArray(block.columns) ? block.columns.map((c: any) => ({ ...c, blocks: sanitizeNotionBlocks(c.blocks) })) : [] } : {}),
            ...(block.tabs ? { tabs: Array.isArray(block.tabs) ? block.tabs.map((t: any) => ({ ...t, blocks: sanitizeNotionBlocks(t.blocks) })) : [] } : {}),
            ...(block.activeTabId !== undefined ? { activeTabId: block.activeTabId } : {}),
            ...(block.url !== undefined ? { url: String(block.url) } : {}),
            ...(block.bookmarkTitle !== undefined ? { bookmarkTitle: String(block.bookmarkTitle) } : {}),
            ...(block.description !== undefined ? { description: String(block.description) } : {}),
            ...(block.image !== undefined ? { image: String(block.image) } : {}),
            ...(block.favicon !== undefined ? { favicon: String(block.favicon) } : {}),
            ...(block.isVisualBookmark !== undefined ? { isVisualBookmark: !!block.isVisualBookmark } : {}),
            ...(block.caption !== undefined ? { caption: String(block.caption) } : {}),
            ...(block.expression !== undefined ? { expression: String(block.expression) } : {}),
            ...(block.pageTitle !== undefined ? { pageTitle: String(block.pageTitle) } : {}),
            ...(block.fontFamily !== undefined ? { fontFamily: String(block.fontFamily) } : {}),
            ...(block.fontSize !== undefined ? { fontSize: block.fontSize } : {}),
            ...(block.textColor !== undefined ? { textColor: String(block.textColor) } : {}),
            ...(block.backgroundColor !== undefined ? { backgroundColor: String(block.backgroundColor) } : {}),
            // Table-specific settings, styles, structure options
            ...(block.hasHeader !== undefined ? { hasHeader: !!block.hasHeader } : {}),
            ...(block.hasTotalRow !== undefined ? { hasTotalRow: !!block.hasTotalRow } : {}),
            ...(block.colBorders !== undefined ? { colBorders: !!block.colBorders } : {}),
            ...(block.rowBorders !== undefined ? { rowBorders: !!block.rowBorders } : {}),
            ...(block.striped !== undefined ? { striped: !!block.striped } : {}),
            ...(block.lockCols !== undefined ? { lockCols: !!block.lockCols } : {}),
            ...(block.lockTable !== undefined ? { lockTable: !!block.lockTable } : {}),
            ...(block.cellColors !== undefined ? { cellColors: block.cellColors } : {}),
            // Created At: 2026-07-20 | Last Modified: 2026-07-20 | Previous Version Back URL: file:///c:/BriselleServer/Briselle-Lightiningv58/briselle-lightining.client/src/modules/notion-nest/notionPageDefaults.ts#L190
            // Meeting Notes specific settings & data
            ...(block.title !== undefined ? { title: String(block.title) } : {}),
            ...(block.date !== undefined ? { date: String(block.date) } : {}),
            ...(block.participants !== undefined ? { participants: block.participants } : {}),
            ...(block.mode !== undefined ? { mode: String(block.mode) } : {}),
            ...(block.includeSummary !== undefined ? { includeSummary: !!block.includeSummary } : {}),
            ...(block.includeBullets !== undefined ? { includeBullets: !!block.includeBullets } : {}),
            ...(block.includeActionItems !== undefined ? { includeActionItems: !!block.includeActionItems } : {}),
            ...(block.includeFollowUp !== undefined ? { includeFollowUp: !!block.includeFollowUp } : {}),
            ...(block.summary !== undefined ? { summary: String(block.summary) } : {}),
            ...(block.bulletPoints !== undefined ? { bulletPoints: block.bulletPoints } : {}),
            ...(block.transcription !== undefined ? { transcription: String(block.transcription) } : {}),
            ...(block.transcriptLines !== undefined ? { transcriptLines: block.transcriptLines } : {}),
            ...(block.aiInsights !== undefined ? { aiInsights: block.aiInsights } : {}),
            ...(block.finalNotes !== undefined ? { finalNotes: String(block.finalNotes) } : {}),
            ...(block.audioData !== undefined ? { audioData: String(block.audioData) } : {}),
            ...(block.audioDuration !== undefined ? { audioDuration: Number(block.audioDuration) } : {}),
            ...(block.consentEnabled !== undefined ? { consentEnabled: !!block.consentEnabled } : {}),
            ...(block.consentMode !== undefined ? { consentMode: String(block.consentMode) } : {}),
            ...(block.audioSource !== undefined ? { audioSource: String(block.audioSource) } : {}),
            ...(block.selectedOutputDevice !== undefined ? { selectedOutputDevice: String(block.selectedOutputDevice) } : {}),
            ...(block.selectedLanguage !== undefined ? { selectedLanguage: String(block.selectedLanguage) } : {}),
            ...(block.selectedInstruction !== undefined ? { selectedInstruction: String(block.selectedInstruction) } : {}),
            ...(block.showCaption !== undefined ? { showCaption: !!block.showCaption } : {}),
            /* BRIS-NN-MNB-H12: MeetingNotesBlock header date-tag state.
               Additive only — these were previously stripped, so the selected
               tag and its Current/Last mode never survived a sanitize pass. */
            ...(block.calendarEvent !== undefined ? { calendarEvent: String(block.calendarEvent) } : {}),
            ...(block.calendarEventMode !== undefined ? { calendarEventMode: String(block.calendarEventMode) } : {}),
            ...(block.calendarSource !== undefined ? { calendarSource: String(block.calendarSource) } : {}),
            /* BRIS-NN-MNB-T24: pinned transcript insights shown on the
               collapsed Insights header. Without this the pins were
               stripped on every sanitize pass and never persisted. */
            ...(block.pinnedInsights !== undefined ? { pinnedInsights: block.pinnedInsights } : {}),
            /* BRIS-NN-MNB-T27: summary-instruction menu preferences. */
            ...(block.defaultInstruction !== undefined ? { defaultInstruction: String(block.defaultInstruction) } : {}),
            ...(block.hiddenInstructions !== undefined ? { hiddenInstructions: block.hiddenInstructions } : {}),
            ...(block.instructionIcons !== undefined ? { instructionIcons: block.instructionIcons } : {}),
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
        restrictedDeletion: false,
        fontFamily: 'sans-serif',
        fontFavorites: ['sans-serif', 'serif', 'mono'],
        fontSize: 0,
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
            restrictedDeletion: p.restrictedDeletion === true,
            blocks: sanitizeNotionBlocks(p.blocks),
            comments: Array.isArray(p.comments) ? p.comments : [],
            commentsAlwaysShow: p.commentsAlwaysShow === true,
            commentsAlwaysOff: p.commentsAlwaysOff === true,
            coverPosition: typeof p.coverPosition === 'number' ? p.coverPosition : 50,
            commentsAutoHideDelay: typeof p.commentsAutoHideDelay === 'number' ? p.commentsAutoHideDelay : 30,
            commentsHoverMode: (p.commentsHoverMode === 'text' || p.commentsHoverMode === 'region' || p.commentsHoverMode === 'both') ? p.commentsHoverMode : 'text',
            showAuditMetadata: p.showAuditMetadata === true,
            showAuditCreatedOn: p.showAuditCreatedOn !== false,
            showAuditCreatedBy: p.showAuditCreatedBy !== false,
            showAuditModifiedOn: p.showAuditModifiedOn !== false,
            showAuditModifiedBy: p.showAuditModifiedBy !== false,
            showAuditWordCount: p.showAuditWordCount !== false,
            freezeTitle: p.freezeTitle === true,
            fontFamily: typeof p.fontFamily === 'string' ? p.fontFamily : 'sans-serif',
            fontFavorites: Array.isArray(p.fontFavorites) ? p.fontFavorites : ['sans-serif', 'serif', 'mono'],
            fontSize: (() => {
                const fs = p.fontSize;
                if (fs === -2 || fs === -1 || fs === 0 || fs === 1 || fs === 2) return fs;
                if (fs === 'small') return -1;
                if (fs === 'medium') return 0;
                if (fs === 'large') return 1;
                if (fs === 'extra-large') return 2;
                return 0;
            })(),
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
