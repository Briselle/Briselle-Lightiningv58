/* ============================================================
   NotionNest — UndoHistoryManager
   Two-tier undo/redo: 100-step normal + positional checkpoints
   ============================================================ */

import type { NotionPagePayload } from './types';

export interface PositionalCheckpoint {
    saveNumber: number;
    timestamp: string;
}

export interface VersionEntry {
    id: number;
    saveNumber: number;
    createdAt: string;
}

const MAX_UNDO_STACK = 100;
const CHECKPOINT_INTERVAL = 50;

export class UndoHistoryManager {
    private undoStack: NotionPagePayload[] = [];
    private redoStack: NotionPagePayload[] = [];
    private saveCount = 0;
    private positionalCheckpoints: PositionalCheckpoint[] = [];

    /** Record a new state snapshot. Caps at MAX_UNDO_STACK, discards oldest. */
    pushSnapshot(state: NotionPagePayload): void {
        this.undoStack.push(JSON.parse(JSON.stringify(state)));
        if (this.undoStack.length > MAX_UNDO_STACK) {
            this.undoStack.shift();
        }
        // New mutation branch — clear redo
        this.redoStack = [];
    }

    /** Pop the most recent undo snapshot. Returns null if empty. */
    undo(): NotionPagePayload | null {
        if (this.undoStack.length <= 1) return null;
        const current = this.undoStack.pop()!;
        this.redoStack.push(current);
        return JSON.parse(JSON.stringify(this.undoStack[this.undoStack.length - 1]));
    }

    /** Pop the most recent redo snapshot. Returns null if empty. */
    redo(): NotionPagePayload | null {
        if (this.redoStack.length === 0) return null;
        const snapshot = this.redoStack.pop()!;
        this.undoStack.push(JSON.parse(JSON.stringify(snapshot)));
        return JSON.parse(JSON.stringify(snapshot));
    }

    canUndo(): boolean {
        return this.undoStack.length > 1;
    }

    canRedo(): boolean {
        return this.redoStack.length > 0;
    }

    getSnapshotCount(): number {
        return this.undoStack.length;
    }

    getSaveCount(): number {
        return this.saveCount;
    }

    incrementSaveCount(): number {
        this.saveCount++;
        return this.saveCount;
    }

    setSaveCount(n: number): void {
        this.saveCount = n;
    }

    isCheckpointSave(): boolean {
        return this.saveCount > 0 && this.saveCount % CHECKPOINT_INTERVAL === 0;
    }

    getCheckpointInterval(): number {
        return CHECKPOINT_INTERVAL;
    }

    /* ---- Positional Checkpoints (metadata only, data lives in Supabase) ---- */

    addCheckpoint(saveNumber: number, timestamp: string): void {
        this.positionalCheckpoints.push({ saveNumber, timestamp });
    }

    setCheckpoints(checkpoints: PositionalCheckpoint[]): void {
        this.positionalCheckpoints = checkpoints;
    }

    getCheckpointSaveNumbers(): number[] {
        return this.positionalCheckpoints.map(c => c.saveNumber);
    }

    getCheckpoints(): PositionalCheckpoint[] {
        return [...this.positionalCheckpoints];
    }

    /** Find the checkpoint entry for a given save number. */
    findCheckpoint(saveNumber: number): PositionalCheckpoint | undefined {
        return this.positionalCheckpoints.find(c => c.saveNumber === saveNumber);
    }

    clear(): void {
        this.undoStack = [];
        this.redoStack = [];
        this.saveCount = 0;
        this.positionalCheckpoints = [];
    }
}

/** Singleton per page — created once per NotionPage mount. */
export function createUndoHistoryManager(): UndoHistoryManager {
    return new UndoHistoryManager();
}
