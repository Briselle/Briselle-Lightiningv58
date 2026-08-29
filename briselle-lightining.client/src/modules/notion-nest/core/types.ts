export const NOTION_PAGE_STORAGE_KEY = '__notion_page';

export type NotionPagePayload = {
    version: 1;
    icon: string;
    coverUrl: string;
    fullWidth: boolean;
    smallText: boolean;
    restrictedDeletion?: boolean;
    blocks: any[];
    comments?: any[];
    commentsAlwaysShow?: boolean;
    commentsAlwaysOff?: boolean;
    commentsAutoHideDelay?: number;
    commentsHoverMode?: 'text' | 'region' | 'both';
    coverPosition?: number;
    updatedAt?: string;
    showAuditMetadata?: boolean;
    showAuditCreatedOn?: boolean;
    showAuditCreatedBy?: boolean;
    showAuditModifiedOn?: boolean;
    showAuditModifiedBy?: boolean;
    showAuditWordCount?: boolean;
    freezeTitle?: boolean;
    fontFamily?: string;
    fontFavorites?: string[];
    fontSize?: -2 | -1 | 0 | 1 | 2;
};

export type NotionRecordContext = {
    ddataId: number;
    dobjId: number;
    entityId: number;
    objectLabel: string;
    objectRouteId: string;
    title: string;
    page: NotionPagePayload;
    rawValues: Record<string, unknown>;
    createdAt?: string;
    updatedAt?: string;
    createdById?: number;
    modifiedById?: number;
};
