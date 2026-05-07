import { describe, expect, it, vi } from 'vitest';
import { createClient, QuizbaseError } from '../src/index.js';

function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'content-type': 'application/json', ...headers }
	});
}

function problem(status: number, title: string, code: string): unknown {
	return {
		type: `https://quizbase.runriva.com/errors/${code}`,
		title,
		status,
		detail: title,
		instance: '/api/v1/test',
		code
	};
}

describe('createClient', () => {
	it('throws when apiKey is empty', () => {
		expect(() => createClient({ apiKey: '' })).toThrow(/apiKey/);
	});

	it('sends Bearer auth + X-Request-Id + User-Agent', async () => {
		const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
			const headers = new Headers(init?.headers);
			expect(headers.get('authorization')).toBe('Bearer qb_test_pk_xyz');
			expect(headers.get('x-request-id')).toMatch(/.+/);
			expect(headers.get('user-agent')).toMatch(/^quizbase-client\/0\.1\.0/);
			expect(String(input)).toContain('/api/v1/categories');
			return jsonResponse(200, { data: [], meta: {} });
		});
		const client = createClient({ apiKey: 'qb_test_pk_xyz', fetch: fetchMock as typeof fetch });
		await client.categories.list({ lang: 'en' });
		expect(fetchMock).toHaveBeenCalledOnce();
	});

	it('serializes array query params (e.g. tags_any)', async () => {
		const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
			const url = new URL(String(input));
			expect(url.searchParams.getAll('tags_any')).toEqual(['einstein', 'newton']);
			return jsonResponse(200, { data: [], meta: {} });
		});
		const client = createClient({ apiKey: 'qb_test_pk_x', fetch: fetchMock as typeof fetch });
		await client.questions.random({ tags_any: ['einstein', 'newton'] } as never);
	});

	it('throws QuizbaseError with parsed RFC 9457 problem on 4xx', async () => {
		const fetchMock = vi.fn(async () =>
			new Response(JSON.stringify(problem(401, 'Missing API key', 'missing_api_key')), {
				status: 401,
				headers: {
					'content-type': 'application/problem+json',
					'x-request-id': 'req_abc'
				}
			})
		);
		const client = createClient({
			apiKey: 'qb_test_pk_x',
			retries: 0,
			fetch: fetchMock as typeof fetch
		});
		await expect(client.me.get()).rejects.toMatchObject({
			name: 'QuizbaseError',
			status: 401,
			requestId: 'req_abc',
			isAuthError: true
		});
	});

	it('parses Retry-After header on 429', async () => {
		const fetchMock = vi.fn(async () =>
			new Response(JSON.stringify(problem(429, 'Rate limit exceeded', 'rate_limit_exceeded')), {
				status: 429,
				headers: { 'content-type': 'application/problem+json', 'retry-after': '7' }
			})
		);
		const client = createClient({
			apiKey: 'qb_test_pk_x',
			retries: 0,
			fetch: fetchMock as typeof fetch
		});
		try {
			await client.questions.random();
			throw new Error('should have thrown');
		} catch (err) {
			expect(err).toBeInstanceOf(QuizbaseError);
			expect((err as QuizbaseError).retryAfter).toBe(7);
			expect((err as QuizbaseError).isRateLimited).toBe(true);
		}
	});

	it('retries on 5xx + 429, succeeds on third attempt', async () => {
		let calls = 0;
		const fetchMock = vi.fn(async () => {
			calls += 1;
			if (calls === 1)
				return new Response(JSON.stringify(problem(503, 'Unavailable', 'unavailable')), {
					status: 503,
					headers: { 'content-type': 'application/problem+json' }
				});
			if (calls === 2)
				return new Response(JSON.stringify(problem(429, 'Rate limit', 'rate_limit_exceeded')), {
					status: 429,
					headers: { 'content-type': 'application/problem+json', 'retry-after': '0' }
				});
			return jsonResponse(200, { data: [], meta: {} });
		});
		const client = createClient({
			apiKey: 'qb_test_pk_x',
			retries: 2,
			fetch: fetchMock as typeof fetch
		});
		await client.categories.list();
		expect(calls).toBe(3);
	});

	it('does not retry on 4xx other than 429', async () => {
		let calls = 0;
		const fetchMock = vi.fn(async () => {
			calls += 1;
			return new Response(JSON.stringify(problem(400, 'Bad', 'invalid_query_param')), {
				status: 400,
				headers: { 'content-type': 'application/problem+json' }
			});
		});
		const client = createClient({
			apiKey: 'qb_test_pk_x',
			retries: 5,
			fetch: fetchMock as typeof fetch
		});
		await expect(client.categories.list()).rejects.toBeInstanceOf(QuizbaseError);
		expect(calls).toBe(1);
	});

	it('fires onRequest hook for every attempt with final flag', async () => {
		let calls = 0;
		const fetchMock = vi.fn(async () => {
			calls += 1;
			if (calls === 1)
				return new Response(JSON.stringify(problem(503, 'Unavailable', 'unavailable')), {
					status: 503,
					headers: { 'content-type': 'application/problem+json' }
				});
			return jsonResponse(200, { data: [], meta: {} }, { 'x-request-id': 'req_final' });
		});
		const events: unknown[] = [];
		const client = createClient({
			apiKey: 'qb_test_pk_x',
			retries: 1,
			fetch: fetchMock as typeof fetch,
			onRequest: (e) => {
				events.push(e);
			}
		});
		await client.categories.list();
		expect(events).toHaveLength(2);
		expect(events[0]).toMatchObject({
			endpoint: 'categories.list',
			status: 503,
			retryCount: 0,
			final: false
		});
		expect(events[1]).toMatchObject({
			endpoint: 'categories.list',
			status: 200,
			retryCount: 1,
			final: true,
			requestId: 'req_final'
		});
	});

	it('respects per-endpoint timeout override', async () => {
		const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
			expect(init?.signal).toBeInstanceOf(AbortSignal);
			return jsonResponse(200, { data: [], meta: {} });
		});
		const client = createClient({
			apiKey: 'qb_test_pk_x',
			timeout: 30_000,
			timeouts: { 'questions.random': 5_000 },
			fetch: fetchMock as typeof fetch
		});
		await client.questions.random();
		expect(fetchMock).toHaveBeenCalledOnce();
	});

	it('handles network errors with retry then surface', async () => {
		let calls = 0;
		const fetchMock = vi.fn(async () => {
			calls += 1;
			throw new TypeError('connection refused');
		});
		const client = createClient({
			apiKey: 'qb_test_pk_x',
			retries: 1,
			fetch: fetchMock as typeof fetch
		});
		await expect(client.categories.list()).rejects.toThrow(/connection refused/);
		expect(calls).toBe(2);
	});

	it('telemetry hook errors do not break caller', async () => {
		const fetchMock = vi.fn(async () => jsonResponse(200, { data: [], meta: {} }));
		const client = createClient({
			apiKey: 'qb_test_pk_x',
			fetch: fetchMock as typeof fetch,
			onRequest: () => {
				throw new Error('telemetry boom');
			}
		});
		await expect(client.categories.list()).resolves.toBeDefined();
	});

	it('builds correct URL with path params', async () => {
		const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
			expect(String(input)).toContain('/api/v1/topics/world-war-ii');
			return jsonResponse(200, { data: { slug: 'world-war-ii' }, meta: {} });
		});
		const client = createClient({ apiKey: 'qb_test_pk_x', fetch: fetchMock as typeof fetch });
		await client.topics.get('world-war-ii');
	});

	it('POST /report sends JSON body with content-type', async () => {
		const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
			const headers = new Headers(init?.headers);
			expect(headers.get('content-type')).toBe('application/json');
			expect(init?.body).toBe(JSON.stringify({ questionId: 'q1', kind: 'incorrect_answer' }));
			return jsonResponse(202, { data: { reportId: 'r1' }, meta: {} });
		});
		const client = createClient({ apiKey: 'qb_test_pk_x', fetch: fetchMock as typeof fetch });
		await client.report.create({ questionId: 'q1', kind: 'incorrect_answer' } as never);
	});
});

describe('integration (prod)', () => {
	const key = process.env.QUIZBASE_TEST_KEY;
	const skip = !key;
	(skip ? it.skip : it)('hits prod /api/v1/categories with real key', async () => {
		const client = createClient({ apiKey: key ?? '' });
		const result = await client.categories.list({ lang: 'en' });
		expect(Array.isArray(result.data)).toBe(true);
		expect(result.data.length).toBeGreaterThan(0);
	});
	(skip ? it.skip : it)('hits prod /api/v1/stats', async () => {
		const client = createClient({ apiKey: key ?? '' });
		const result = await client.stats.get();
		expect(typeof result.total).toBe('number');
		expect(result.total).toBeGreaterThan(0);
	});
});
