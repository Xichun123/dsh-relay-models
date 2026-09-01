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
export declare function lookup(index: ModelIndex, id: string, api?: string): PiModel | undefined;
export declare function listChoices(index: ModelIndex): CatalogChoice[];
export declare function loadIndex(signal?: AbortSignal): Promise<ModelIndex>;
