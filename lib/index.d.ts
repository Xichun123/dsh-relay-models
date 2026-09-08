import type { IncomingMessage, ServerResponse } from 'node:http';
import type { DiscoveredModel, PathOp } from './enrich.ts';
interface Logger {
    warn(message: string, ...args: unknown[]): void;
}
/** DSH 0.1.3-alpha.2 discovery draft; cancellation is a separate argument. */
interface DiscoveryRequest {
    provider?: string;
    baseURL?: string;
    api?: string;
    apiKey?: string;
}
type Discover = (ns: string, request: DiscoveryRequest, signal?: AbortSignal) => Promise<DiscoveredModel[]>;
type Mutate = (ns: string, ops: readonly PathOp[], expectedRevision?: number) => Promise<void>;
interface SettingsService {
    get(ns: string): unknown;
    mutate: Mutate;
}
interface WebServer {
    register(route: {
        kind: 'exact';
        path: string;
        handler: (req: IncomingMessage, res: ServerResponse) => void | Promise<void>;
    }): () => void;
}
/** Minimal structural Host face; no second Cordis runtime is bundled. */
interface PluginContext {
    llm: {
        discoverModels: Discover;
    };
    settings?: SettingsService;
    webServer?: WebServer;
    logger: Logger;
    inject(names: string[], callback: (ctx: PluginContext) => void): void;
    effect(callback: () => (() => void) | void): void;
    on(event: 'llm/stream', listener: (options: {
        provider: string;
    }, next: () => AsyncIterable<unknown>) => AsyncIterable<unknown>): () => void;
}
export declare const name = "dsh-relay-models";
export declare const inject: string[];
/** Enrich native discovery and model-list writes; all registrations belong to Cordis effects. */
export declare function apply(ctx: PluginContext): void;
export {};
