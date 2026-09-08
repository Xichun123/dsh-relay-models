import { type ModelIndex, type PiModel } from './catalog.ts';
import type { CompatFilter } from './compat.ts';
export interface DiscoveredModel {
    id: string;
    name?: string;
    contextWindow?: number;
    maxTokens?: number;
}
export interface PathOp {
    op: string;
    path?: readonly string[];
    value?: unknown;
}
export declare function reasoningEfforts(model: PiModel): Record<string, string | null> | undefined;
export declare function enrichDiscovered(models: readonly DiscoveredModel[], index: ModelIndex, api?: string): DiscoveredModel[];
export declare function enrichEntry(entry: Record<string, unknown>, index: ModelIndex, api?: string, filterCompat?: CompatFilter): Record<string, unknown>;
export declare function enrichOps(ops: readonly PathOp[], section: unknown, index: ModelIndex, filterCompat?: CompatFilter): PathOp[];
