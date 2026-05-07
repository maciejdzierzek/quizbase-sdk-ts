import type { components } from './types.gen.js';

export type ProblemDetails = components['schemas']['ProblemDetails'];

export interface QuizbaseErrorOptions {
	status: number;
	problem: ProblemDetails;
	requestId: string | null;
	retryAfter: number | null;
	url: string;
	method: string;
}

/**
 * Thrown for any non-2xx response from the QuizBase API.
 * Carries the parsed RFC 9457 Problem Details body, X-Request-Id for support,
 * and a parsed retry-after (seconds) for 429s.
 */
export class QuizbaseError extends Error {
	readonly status: number;
	readonly problem: ProblemDetails;
	readonly requestId: string | null;
	readonly retryAfter: number | null;
	readonly url: string;
	readonly method: string;

	constructor(opts: QuizbaseErrorOptions) {
		const title = opts.problem.title ?? `HTTP ${opts.status}`;
		const detail = opts.problem.detail ? ` — ${opts.problem.detail}` : '';
		super(`QuizBase ${opts.method} ${opts.url} → ${opts.status} ${title}${detail}`);
		this.name = 'QuizbaseError';
		this.status = opts.status;
		this.problem = opts.problem;
		this.requestId = opts.requestId;
		this.retryAfter = opts.retryAfter;
		this.url = opts.url;
		this.method = opts.method;
	}

	get type(): string | undefined {
		return this.problem.type;
	}

	get isRateLimited(): boolean {
		return this.status === 429;
	}

	get isAuthError(): boolean {
		return this.status === 401 || this.status === 403;
	}

	get isServerError(): boolean {
		return this.status >= 500;
	}
}
