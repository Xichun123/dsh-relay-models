import type { DiscoveredModel, PathOp } from './enrich.ts';
interface Logger {
    warn(message: string, ...args: unknown[]): void;
}
type Discover = (ns: string, request: {
    api?: string;
}, signal?: AbortSignal) => Promise<DiscoveredModel[]>;
type Mutate = (ns: string, ops: PathOp[], expectedRevision?: number) => Promise<void>;
interface LlmService {
    discoverModels: Discover;
}
interface SettingsService {
    get(ns: string): unknown;
    mutate: Mutate;
}
interface HttpResponse {
    writeHead(status: number, headers?: Record<string, string>): void;
    end(body?: string): void;
}
interface HttpRequest {
    method?: string;
    on(event: 'data', cb: (chunk: Uint8Array) => void): void;
    on(event: 'end', cb: () => void): void;
    on(event: 'error', cb: (error: Error) => void): void;
}
interface WebServer {
    register(route: {
        kind: 'exact' | 'prefix';
        path: string;
        handler: (req: HttpRequest, res: HttpResponse) => void | Promise<void>;
    }): () => void;
}
interface PluginContext {
    llm: LlmService;
    settings?: SettingsService;
    webServer?: WebServer;
    logger: Logger;
    inject(names: string[], callback: (ctx: PluginContext) => void): void;
    effect(callback: () => (() => void) | void): void;
}
export declare const name = "dsh-relay-models";
export declare const inject: string[];
export declare function apply(ctx: PluginContext): void;
export {};
