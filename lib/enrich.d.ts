import { type ModelIndex, type PiModel } from './catalog.ts';
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
export declare function compatFields(compat: Record<string, unknown> | undefined, api: string | undefined): Record<string, unknown> | undefined;
export declare function enrichDiscovered(models: readonly DiscoveredModel[], index: ModelIndex, api?: string): DiscoveredModel[];
export declare function enrichEntry(entry: Record<string, unknown>, index: ModelIndex, api?: string): Record<string, unknown>;
export declare function enrichOps(ops: readonly PathOp[], section: unknown, index: ModelIndex): PathOp[];
