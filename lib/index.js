import { listAliases, listChoices, loadIndex, setAlias } from "./catalog.js";
import { enrichDiscovered, enrichOps } from "./enrich.js";
const NS = 'llm-pi-ai';
function readBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        let size = 0;
        req.on('data', (chunk) => {
            size += chunk.byteLength;
            if (size > 4096) {
                reject(new Error('alias body too large'));
                return;
            }
            chunks.push(chunk);
        });
        req.on('end', () => {
            const out = new Uint8Array(chunks.reduce((n, chunk) => n + chunk.byteLength, 0));
            let at = 0;
            for (const chunk of chunks) {
                out.set(chunk, at);
                at += chunk.byteLength;
            }
            resolve(new TextDecoder().decode(out));
        });
        req.on('error', reject);
    });
}
export const name = 'dsh-relay-models';
export const inject = ['llm'];
export function apply(ctx) {
    void loadIndex().catch(() => { });
    ctx.effect(() => {
        const orig = ctx.llm.discoverModels.bind(ctx.llm);
        ctx.llm.discoverModels = async (ns, request, signal) => {
            const models = await orig(ns, request, signal);
            if (ns !== NS)
                return models;
            try {
                return enrichDiscovered(models, await loadIndex(signal), request.api);
            }
            catch (error) {
                ctx.logger.warn('dsh-relay-models: pi.dev catalog unavailable; leaving discovered models unchanged');
                ctx.logger.warn(String(error));
                return models;
            }
        };
        return () => {
            ctx.llm.discoverModels = orig;
        };
    });
    ctx.inject(['webServer'], (webCtx) => {
        const server = webCtx.webServer;
        webCtx.effect(() => {
            const dropCatalog = server.register({
                kind: 'exact',
                path: '/dsh-relay-models/catalog',
                handler: async (req, res) => {
                    if (req.method !== 'GET') {
                        res.writeHead(405);
                        res.end();
                        return;
                    }
                    try {
                        const body = JSON.stringify({
                            choices: listChoices(await loadIndex()),
                            aliases: listAliases(),
                        });
                        res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
                        res.end(body);
                    }
                    catch (error) {
                        webCtx.logger.warn('dsh-relay-models: catalog route failed');
                        webCtx.logger.warn(String(error));
                        res.writeHead(502);
                        res.end();
                    }
                },
            });
            const dropAlias = server.register({
                kind: 'exact',
                path: '/dsh-relay-models/alias',
                handler: async (req, res) => {
                    if (req.method !== 'POST') {
                        res.writeHead(405);
                        res.end();
                        return;
                    }
                    try {
                        const body = JSON.parse(await readBody(req));
                        if (body === null || typeof body !== 'object' || Array.isArray(body)) {
                            res.writeHead(400);
                            res.end();
                            return;
                        }
                        const row = body;
                        if (typeof row.id !== 'string' || row.id.length === 0) {
                            res.writeHead(400);
                            res.end();
                            return;
                        }
                        setAlias(row.id, typeof row.catalogId === 'string' ? row.catalogId : undefined);
                        res.writeHead(204);
                        res.end();
                    }
                    catch {
                        res.writeHead(400);
                        res.end();
                    }
                },
            });
            return () => {
                dropCatalog();
                dropAlias();
            };
        });
    });
    ctx.inject(['settings'], (settingsCtx) => {
        const settings = settingsCtx.settings;
        settingsCtx.effect(() => {
            const orig = settings.mutate.bind(settings);
            settings.mutate = async (ns, ops, expectedRevision) => {
                if (ns !== NS)
                    return orig(ns, ops, expectedRevision);
                let next = ops;
                try {
                    next = enrichOps(ops, settings.get(NS), await loadIndex());
                }
                catch (error) {
                    settingsCtx.logger.warn('dsh-relay-models: pi.dev catalog unavailable; writing models without catalog fill');
                    settingsCtx.logger.warn(String(error));
                }
                return orig(ns, next, expectedRevision);
            };
            return () => {
                settings.mutate = orig;
            };
        });
    });
}
