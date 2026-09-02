/** Live pi.dev model catalog. Not the npm `@earendil-works/pi-ai` snapshot. */
export const CATALOG_URL = 'https://pi.dev/api/models';
const MAX_BYTES = 8 * 1024 * 1024;
const PROVIDERS = [
    'openai', 'anthropic', 'google', 'xai', 'deepseek',
    'moonshotai', 'minimax', 'qwen', 'zai', 'xiaomi',
];
function asModel(id, raw) {
    if (raw === null || typeof raw !== 'object' || Array.isArray(raw))
        return undefined;
    const row = raw;
    const resolvedId = typeof row.id === 'string' && row.id.length > 0 ? row.id : id;
    return { ...row, id: resolvedId };
}
export function indexCatalog(catalog) {
    const byId = new Map();
    for (const [provider, models] of Object.entries(catalog)) {
        if (!PROVIDERS.includes(provider))
            continue;
        if (models === null || typeof models !== 'object' || Array.isArray(models))
            continue;
        for (const [id, raw] of Object.entries(models)) {
            const model = asModel(id, raw);
            if (model === undefined)
                continue;
            const list = byId.get(model.id) ?? [];
            list.push(model);
            byId.set(model.id, list);
        }
    }
    return byId;
}
function rank(model) {
    const at = PROVIDERS.indexOf(model.provider ?? '');
    return at === -1 ? PROVIDERS.length : at;
}
function pick(models) {
    return models.reduce((a, b) => rank(a) <= rank(b) ? a : b);
}
const aliases = new Map();
export function aliasOf(id) {
    return aliases.get(id)
        ?? (id.includes('/') ? aliases.get(id.slice(id.lastIndexOf('/') + 1)) : undefined);
}
export function setAlias(id, catalogId) {
    if (id.length === 0)
        return;
    if (catalogId === undefined || catalogId.length === 0)
        aliases.delete(id);
    else
        aliases.set(id, catalogId);
}
export function resetAliases() {
    aliases.clear();
}
export function listAliases() {
    return Object.fromEntries(aliases);
}
function lookupDirect(index, id, api) {
    const exact = index.get(id);
    const slash = id.includes('/') ? index.get(id.slice(id.lastIndexOf('/') + 1)) : undefined;
    const candidates = exact ?? slash;
    if (candidates === undefined || candidates.length === 0)
        return undefined;
    if (api !== undefined) {
        const matched = candidates.filter(model => model.api === api);
        if (matched.length > 0)
            return pick(matched);
    }
    return pick(candidates);
}
export function lookup(index, id, api) {
    const hit = lookupDirect(index, id, api);
    if (hit !== undefined)
        return hit;
    const mapped = aliasOf(id);
    return mapped === undefined ? undefined : lookupDirect(index, mapped, api);
}
export function listChoices(index) {
    const out = [];
    for (const [id, models] of index) {
        const model = pick(models);
        out.push({
            id,
            name: typeof model.name === 'string' && model.name.length > 0 ? model.name : id,
            provider: model.provider ?? '',
        });
    }
    return out.sort((a, b) => a.id.localeCompare(b.id));
}
// ponytail: one in-flight fetch for the process; aborted/failed callers retry.
let pending;
export async function loadIndex(signal) {
    pending ??= fetchCatalog(signal).then(indexCatalog).catch((error) => {
        pending = undefined;
        throw error;
    });
    return pending;
}
async function fetchCatalog(signal) {
    const response = await fetch(CATALOG_URL, {
        headers: { accept: 'application/json' },
        ...signal === undefined ? {} : { signal },
    });
    if (!response.ok)
        throw new Error(`pi.dev models HTTP ${String(response.status)}`);
    const text = await response.text();
    if (text.length > MAX_BYTES)
        throw new Error('pi.dev models response too large');
    const body = JSON.parse(text);
    if (body === null || typeof body !== 'object' || Array.isArray(body)) {
        throw new Error('pi.dev models: expected a provider map');
    }
    return body;
}
