import { QuizbaseError, type ProblemDetails } from './errors.js';
import type { OnRequestHook } from './telemetry.js';
import type { components, paths } from './types.gen.js';

type Schemas = components['schemas'];

/** Logical endpoint identifiers — stable across path-param values, used for telemetry + per-endpoint timeouts. */
export type EndpointKey =
	| 'questions.list'
	| 'questions.random'
	| 'questions.get'
	| 'categories.list'
	| 'languages.list'
	| 'topics.list'
	| 'topics.get'
	| 'tags.list'
	| 'subcategories.list'
	| 'stats.get'
	| 'me.get'
	| 'usage.get'
	| 'report.create';

const DEFAULT_TIMEOUTS: Record<EndpointKey, number> = {
	'questions.list': 15_000,
	'questions.random': 10_000,
	'questions.get': 10_000,
	'categories.list': 10_000,
	'languages.list': 10_000,
	'topics.list': 15_000,
	'topics.get': 10_000,
	'tags.list': 15_000,
	'subcategories.list': 15_000,
	'stats.get': 10_000,
	'me.get': 10_000,
	'usage.get': 10_000,
	'report.create': 15_000
};

export interface ClientOptions {
	/** API key — `qb_pk_*` (publishable, CORS-safe for browsers) or `qb_sk_*` (secret, backend-only). Get one at https://quizbase.runriva.com/dashboard/keys. */
	apiKey: string;
	/** Override base URL. Defaults to `https://quizbase.runriva.com`. */
	baseUrl?: string;
	/** Default request timeout in ms. Defaults to 30_000. Per-endpoint overrides take precedence. */
	timeout?: number;
	/** Per-endpoint timeout overrides keyed by `EndpointKey`. */
	timeouts?: Partial<Record<EndpointKey, number>>;
	/** Number of retries for 429 / 5xx / network errors. Defaults to 2 (3 total attempts). */
	retries?: number;
	/** Optional `fetch` implementation. Defaults to global `fetch`. */
	fetch?: typeof fetch;
	/** Telemetry hook fired after every HTTP attempt (including retries). */
	onRequest?: OnRequestHook;
	/** User-Agent suffix appended to the SDK identifier. */
	userAgent?: string;
}

type QuestionsListParams = paths['/api/v1/questions']['get']['parameters']['query'];
type TopicsListParams = paths['/api/v1/topics']['get']['parameters']['query'];
type TagsListParams = paths['/api/v1/tags']['get']['parameters']['query'];
type SubcategoriesListParams = paths['/api/v1/subcategories']['get']['parameters']['query'];

export interface QuizbaseClient {
	questions: {
		list(params?: QuestionsListParams): Promise<Schemas['QuestionsListResponse']>;
		random(
			params?: paths['/api/v1/questions/random']['get']['parameters']['query']
		): Promise<Schemas['QuestionsRandomResponse']>;
		get(
			id: string,
			params?: paths['/api/v1/questions/{id}']['get']['parameters']['query']
		): Promise<Schemas['QuestionByIdResponse']>;
		/** Iterate every page of `/questions`, auto-following `_links.next`. */
		pages(params?: QuestionsListParams): AsyncIterableIterator<Schemas['QuestionsListResponse']>;
		/** Iterate every question across all pages. */
		listAll(params?: QuestionsListParams): AsyncIterableIterator<Schemas['Question']>;
	};
	categories: {
		list(
			params?: paths['/api/v1/categories']['get']['parameters']['query']
		): Promise<Schemas['CategoriesResponse']>;
	};
	languages: {
		list(): Promise<Schemas['LanguagesResponse']>;
	};
	topics: {
		list(params?: TopicsListParams): Promise<Schemas['TopicsListResponse']>;
		get(
			slug: string,
			params?: paths['/api/v1/topics/{slug}']['get']['parameters']['query']
		): Promise<Schemas['TopicDetailResponse']>;
		/** Iterate every page of `/topics`, auto-following `_links.next`. */
		pages(params?: TopicsListParams): AsyncIterableIterator<Schemas['TopicsListResponse']>;
		/** Iterate every topic across all pages. */
		listAll(params?: TopicsListParams): AsyncIterableIterator<Schemas['TopicEntry']>;
	};
	tags: {
		list(params?: TagsListParams): Promise<Schemas['TagsListResponse']>;
		/** Iterate every page of `/tags`, auto-following `_links.next`. */
		pages(params?: TagsListParams): AsyncIterableIterator<Schemas['TagsListResponse']>;
		/** Iterate every tag across all pages. */
		listAll(params?: TagsListParams): AsyncIterableIterator<Schemas['RawSlugEntry']>;
	};
	subcategories: {
		list(params?: SubcategoriesListParams): Promise<Schemas['SubcategoriesListResponse']>;
		/** Iterate every page of `/subcategories`, auto-following `_links.next`. */
		pages(
			params?: SubcategoriesListParams
		): AsyncIterableIterator<Schemas['SubcategoriesListResponse']>;
		/** Iterate every subcategory across all pages. */
		listAll(params?: SubcategoriesListParams): AsyncIterableIterator<Schemas['RawSlugEntry']>;
	};
	stats: {
		get(): Promise<Schemas['StatsResponse']>;
	};
	me: {
		get(): Promise<Schemas['MeResponse']>;
	};
	usage: {
		get(
			params?: paths['/api/v1/usage']['get']['parameters']['query']
		): Promise<Schemas['UsageResponse']>;
	};
	report: {
		create(
			body: NonNullable<
				paths['/api/v1/report']['post']['requestBody']
			>['content']['application/json']
		): Promise<Schemas['ReportAcceptedResponse']>;
	};
}

const DEFAULT_BASE_URL = 'https://quizbase.runriva.com';
const SDK_VERSION = '0.1.0';

interface RequestParams {
	endpoint: EndpointKey;
	method: 'GET' | 'POST';
	path: string;
	query?: Record<string, unknown> | undefined;
	body?: unknown;
}

export function createClient(options: ClientOptions): QuizbaseClient {
	if (!options.apiKey) {
		throw new Error('createClient: `apiKey` is required.');
	}
	const baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
	const defaultTimeout = options.timeout ?? 30_000;
	const timeouts: Record<EndpointKey, number> = { ...DEFAULT_TIMEOUTS };
	if (options.timeouts) {
		for (const [key, value] of Object.entries(options.timeouts) as [
			EndpointKey,
			number | undefined
		][]) {
			if (typeof value === 'number') timeouts[key] = value;
		}
	}
	const retries = Math.max(0, options.retries ?? 2);
	const doFetch = options.fetch ?? globalThis.fetch;
	if (typeof doFetch !== 'function') {
		throw new Error(
			'createClient: global `fetch` is unavailable. Pass `fetch` option (Node ≥20 or polyfill).'
		);
	}
	const userAgent = `quizbase-client/${SDK_VERSION}${options.userAgent ? ` ${options.userAgent}` : ''}`;

	async function request<T>(params: RequestParams): Promise<T> {
		const timeoutMs = timeouts[params.endpoint] ?? defaultTimeout;
		const url = buildUrl(baseUrl, params.path, params.query);
		const requestId = generateRequestId();
		const headers: Record<string, string> = {
			Accept: 'application/json',
			Authorization: `Bearer ${options.apiKey}`,
			'X-Request-Id': requestId,
			'User-Agent': userAgent
		};
		let body: string | undefined;
		if (params.body !== undefined) {
			headers['Content-Type'] = 'application/json';
			body = JSON.stringify(params.body);
		}

		let attempt = 0;
		let lastError: unknown;
		while (attempt <= retries) {
			const startedAt = Date.now();
			const controller = new AbortController();
			const timer = setTimeout(() => controller.abort(), timeoutMs);
			let status = 0;
			let response: Response | undefined;
			let attemptError: Error | undefined;
			try {
				response = await doFetch(url, {
					method: params.method,
					headers,
					body,
					signal: controller.signal
				});
				status = response.status;
				if (response.ok) {
					const data = (await response.json()) as T;
					await emit(options.onRequest, {
						method: params.method,
						endpoint: params.endpoint,
						url,
						duration: Date.now() - startedAt,
						status,
						requestId: response.headers.get('x-request-id') ?? requestId,
						retryCount: attempt,
						final: true
					});
					return data;
				}
				const problem = await safeProblem(response);
				const retryAfterHeader = response.headers.get('retry-after');
				const retryAfter = retryAfterHeader ? parseRetryAfter(retryAfterHeader) : null;
				const err = new QuizbaseError({
					status,
					problem,
					requestId: response.headers.get('x-request-id') ?? requestId,
					retryAfter,
					url,
					method: params.method
				});
				attemptError = err;
				if (shouldRetry(status) && attempt < retries) {
					await emit(options.onRequest, {
						method: params.method,
						endpoint: params.endpoint,
						url,
						duration: Date.now() - startedAt,
						status,
						requestId: err.requestId,
						retryCount: attempt,
						final: false,
						error: err
					});
					await sleep(backoffMs(attempt, retryAfter));
					attempt += 1;
					lastError = err;
					continue;
				}
				await emit(options.onRequest, {
					method: params.method,
					endpoint: params.endpoint,
					url,
					duration: Date.now() - startedAt,
					status,
					requestId: err.requestId,
					retryCount: attempt,
					final: true,
					error: err
				});
				throw err;
			} catch (err) {
				if (err instanceof QuizbaseError) throw err;
				const networkErr = err instanceof Error ? err : new Error(String(err));
				attemptError = networkErr;
				if (attempt < retries) {
					await emit(options.onRequest, {
						method: params.method,
						endpoint: params.endpoint,
						url,
						duration: Date.now() - startedAt,
						status,
						requestId: null,
						retryCount: attempt,
						final: false,
						error: networkErr
					});
					await sleep(backoffMs(attempt, null));
					attempt += 1;
					lastError = networkErr;
					continue;
				}
				await emit(options.onRequest, {
					method: params.method,
					endpoint: params.endpoint,
					url,
					duration: Date.now() - startedAt,
					status,
					requestId: null,
					retryCount: attempt,
					final: true,
					error: networkErr
				});
				throw networkErr;
			} finally {
				clearTimeout(timer);
				void attemptError;
				void response;
			}
		}
		throw lastError ?? new Error('quizbase-client: retry loop exhausted unexpectedly');
	}

	return {
		questions: (() => {
			const list = (params?: QuestionsListParams) =>
				request<Schemas['QuestionsListResponse']>({
					endpoint: 'questions.list',
					method: 'GET',
					path: '/api/v1/questions',
					query: params
				});
			return {
				list,
				random: (params) =>
					request({
						endpoint: 'questions.random',
						method: 'GET',
						path: '/api/v1/questions/random',
						query: params
					}),
				get: (id, params) =>
					request({
						endpoint: 'questions.get',
						method: 'GET',
						path: `/api/v1/questions/${encodeURIComponent(id)}`,
						query: params
					}),
				pages: (params) => paginate(list, params),
				listAll: (params) => paginateItems(list, params)
			} satisfies QuizbaseClient['questions'];
		})(),
		categories: {
			list: (params) =>
				request({
					endpoint: 'categories.list',
					method: 'GET',
					path: '/api/v1/categories',
					query: params
				})
		},
		languages: {
			list: () =>
				request({
					endpoint: 'languages.list',
					method: 'GET',
					path: '/api/v1/languages'
				})
		},
		topics: (() => {
			const list = (params?: TopicsListParams) =>
				request<Schemas['TopicsListResponse']>({
					endpoint: 'topics.list',
					method: 'GET',
					path: '/api/v1/topics',
					query: params
				});
			return {
				list,
				get: (slug, params) =>
					request({
						endpoint: 'topics.get',
						method: 'GET',
						path: `/api/v1/topics/${encodeURIComponent(slug)}`,
						query: params
					}),
				pages: (params) => paginate(list, params),
				listAll: (params) => paginateItems(list, params)
			} satisfies QuizbaseClient['topics'];
		})(),
		tags: (() => {
			const list = (params?: TagsListParams) =>
				request<Schemas['TagsListResponse']>({
					endpoint: 'tags.list',
					method: 'GET',
					path: '/api/v1/tags',
					query: params
				});
			return {
				list,
				pages: (params) => paginate(list, params),
				listAll: (params) => paginateItems(list, params)
			} satisfies QuizbaseClient['tags'];
		})(),
		subcategories: (() => {
			const list = (params?: SubcategoriesListParams) =>
				request<Schemas['SubcategoriesListResponse']>({
					endpoint: 'subcategories.list',
					method: 'GET',
					path: '/api/v1/subcategories',
					query: params
				});
			return {
				list,
				pages: (params) => paginate(list, params),
				listAll: (params) => paginateItems(list, params)
			} satisfies QuizbaseClient['subcategories'];
		})(),
		stats: {
			get: () =>
				request({
					endpoint: 'stats.get',
					method: 'GET',
					path: '/api/v1/stats'
				})
		},
		me: {
			get: () =>
				request({
					endpoint: 'me.get',
					method: 'GET',
					path: '/api/v1/me'
				})
		},
		usage: {
			get: (params) =>
				request({
					endpoint: 'usage.get',
					method: 'GET',
					path: '/api/v1/usage',
					query: params
				})
		},
		report: {
			create: (body) =>
				request({
					endpoint: 'report.create',
					method: 'POST',
					path: '/api/v1/report',
					body
				})
		}
	};
}

interface PaginatedParams {
	cursor?: string;
	[key: string]: unknown;
}

interface PaginatedPage<T> {
	data: T[];
	_links?: { next?: string; prev?: string };
}

/**
 * Extract the `cursor` query param from an absolute or relative `_links.next` URL.
 * Returns `null` when the URL is absent or malformed — caller treats that as end-of-stream.
 */
function extractCursor(nextUrl: string | undefined): string | null {
	if (!nextUrl) return null;
	try {
		const url = nextUrl.startsWith('http')
			? new URL(nextUrl)
			: new URL(nextUrl, 'http://placeholder');
		return url.searchParams.get('cursor');
	} catch {
		return null;
	}
}

async function* paginate<P extends PaginatedParams, R extends PaginatedPage<unknown>>(
	fetchPage: (params?: P) => Promise<R>,
	initial: P | undefined
): AsyncIterableIterator<R> {
	let nextParams: P | undefined = initial;
	while (true) {
		const page = await fetchPage(nextParams);
		yield page;
		const cursor = extractCursor(page._links?.next);
		if (!cursor) return;
		nextParams = { ...(nextParams ?? ({} as P)), cursor } as P;
	}
}

async function* paginateItems<P extends PaginatedParams, T>(
	fetchPage: (params?: P) => Promise<PaginatedPage<T>>,
	initial: P | undefined
): AsyncIterableIterator<T> {
	for await (const page of paginate(fetchPage, initial)) {
		for (const item of page.data) yield item;
	}
}

function buildUrl(baseUrl: string, path: string, query: Record<string, unknown> | undefined): string {
	const url = new URL(baseUrl + path);
	if (query) {
		for (const [key, value] of Object.entries(query)) {
			if (value === undefined || value === null) continue;
			if (Array.isArray(value)) {
				for (const item of value) {
					if (item !== undefined && item !== null) {
						url.searchParams.append(key, String(item));
					}
				}
			} else {
				url.searchParams.append(key, String(value));
			}
		}
	}
	return url.toString();
}

function generateRequestId(): string {
	const cryptoApi: Crypto | undefined = globalThis.crypto;
	if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
		return cryptoApi.randomUUID();
	}
	return `req-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

async function safeProblem(response: Response): Promise<ProblemDetails> {
	try {
		const data = (await response.json()) as ProblemDetails;
		if (data && typeof data === 'object') return data;
	} catch {
		// fall through
	}
	return {
		type: 'about:blank',
		title: response.statusText || `HTTP ${response.status}`,
		status: response.status,
		detail: '',
		instance: '',
		code: 'unknown'
	} satisfies ProblemDetails;
}

function shouldRetry(status: number): boolean {
	return status === 429 || (status >= 500 && status < 600);
}

function parseRetryAfter(value: string): number | null {
	const seconds = Number.parseInt(value, 10);
	if (Number.isFinite(seconds) && seconds >= 0) return seconds;
	const date = Date.parse(value);
	if (Number.isFinite(date)) {
		const diff = Math.max(0, Math.ceil((date - Date.now()) / 1000));
		return diff;
	}
	return null;
}

function backoffMs(attempt: number, retryAfterSeconds: number | null): number {
	if (retryAfterSeconds !== null) return retryAfterSeconds * 1000;
	const base = 250;
	const exp = base * 2 ** attempt;
	const jitter = Math.random() * 100;
	return Math.min(exp + jitter, 5_000);
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function emit(
	hook: OnRequestHook | undefined,
	event: Parameters<OnRequestHook>[0]
): Promise<void> {
	if (!hook) return;
	try {
		await hook(event);
	} catch {
		// telemetry must never break the caller
	}
}
