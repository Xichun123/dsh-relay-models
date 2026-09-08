import { Effect } from 'effect';
/** Live pi.dev model catalog. Not the npm `@earendil-works/pi-ai` snapshot. */
export declare const CATALOG_URL = "https://pi.dev/api/models";
export interface PiModel {
    id: string;
    name?: string;
    api?: string;
    provider?: string;
    input?: string[];
    contextWindow?: number;
    maxTokens?: number;
    reasoning?: boolean;
    thinkingLevelMap?: Record<string, string | null>;
    compat?: Record<string, unknown>;
}
export type Catalog = Record<string, Record<string, unknown>>;
export type ModelIndex = Map<string, PiModel[]>;
export interface CatalogChoice {
    id: string;
    name: string;
    provider: string;
}
export declare function indexCatalog(catalog: Catalog): ModelIndex;
export declare function aliasOf(id: string): string | undefined;
export declare function setAlias(id: string, catalogId: string | undefined): void;
export declare function resetAliases(): void;
export declare function listAliases(): Record<string, string>;
export declare function lookup(index: ModelIndex, id: string, api?: string): PiModel | undefined;
export declare function listChoices(index: ModelIndex): CatalogChoice[];
declare const CatalogError_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").VoidIfEmpty<{ readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }>) => import("effect/Cause").YieldableError & {
    readonly _tag: "CatalogError";
} & Readonly<A>;
/** A catalog failure is optional enrichment, never a provider discovery failure. */
export declare class CatalogError extends CatalogError_base<{
    message: string;
    cause?: unknown;
}> {
}
/**
 * One plugin-owned successful snapshot. Concurrent readers share the download;
 * interrupting a reader leaves other readers alive. Disposal aborts the download.
 */
export declare function createCatalog(options?: {
    timeoutMs?: number;
}): {
    load: Effect.Effect<ModelIndex, CatalogError>;
    dispose(): void;
};
export {};
