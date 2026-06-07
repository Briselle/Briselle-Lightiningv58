export const NOTION_PAGE_STORAGE_KEY = '__notion_page';

export type NotionPagePayload = {
    version: 1;
    icon: string;
    coverUrl: string;
    fullWidth: boolean;
    smallText: boolean;
    blocks: any[];
    updatedAt?: string;
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
};
