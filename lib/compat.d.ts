export type CompatFilter = (compat: Record<string, unknown> | undefined, api: string | undefined) => Record<string, unknown> | undefined;
/** Keep future compat vocabulary, but never pass unsafe/non-JSON data to the Host schema. */
export declare function isCompatJson(value: unknown, depth?: number): boolean;
/**
 * Use the running namespace's own schema AND protocol validator, never a second
 * installed package or an on-disk source snapshot. No settings writes, credentials,
 * provider registration or model requests take place during these detached checks.
 *
 * ponytail: registrations is a private Host seam until DSH exposes read-only
 * validation. If its shape changes, fail closed instead of parsing bundled JS.
 */
export declare function createCompatFilter(settings: object, warn: (message: string) => void): CompatFilter;
