/**
 * Telemetry event emitted after every HTTP attempt (including retries).
 * Wire it to your observability stack of choice (PostHog, Datadog, Sentry breadcrumbs, ...).
 */
export interface RequestEvent {
	/** HTTP method, uppercase. */
	method: string;
	/** Logical endpoint key (e.g. `questions.random`). Stable across path-param values. */
	endpoint: string;
	/** Full URL hit (with query string). */
	url: string;
	/** Wall-clock duration of this attempt in milliseconds. */
	duration: number;
	/** HTTP status code, or `0` if the request never reached a response (network/timeout). */
	status: number;
	/** Server-issued `X-Request-Id`, if present. Useful for support requests. */
	requestId: string | null;
	/** Number of retries already attempted before this one. `0` for the first try. */
	retryCount: number;
	/** Final attempt that the caller will see, after retry loop terminates. */
	final: boolean;
	/** Error if this attempt threw (network / timeout / non-2xx). */
	error?: Error;
}

export type OnRequestHook = (event: RequestEvent) => void | Promise<void>;
