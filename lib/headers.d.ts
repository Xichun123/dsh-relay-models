interface UserAgentTarget {
    base: URL;
    userAgent: string;
}
/** Read only this route's UA; an explicit endpoint keeps OAuth and unrelated fetches out of scope. */
export declare function userAgentTarget(section: unknown, provider: string | undefined, baseURL?: string): UserAgentTarget | undefined;
/** Last-mile UA override, inspired by dsh-fetch-header-rewrite; no global URL rules or extra headers. */
export declare function createUserAgentRewrite(): {
    run: <T>(target: UserAgentTarget | undefined, callback: () => T) => T;
    install(): () => void;
    stream<T>(target: UserAgentTarget | undefined, next: () => AsyncIterable<T>): AsyncIterable<T>;
};
export {};
