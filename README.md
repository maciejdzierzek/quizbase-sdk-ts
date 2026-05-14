# @quizbase/client

TypeScript SDK for the [QuizBase API](https://quizbase.runriva.com) — multilingual trivia API with 1.4M+ quiz-ready questions blended from 11 open-licensed sources, English and Polish at launch.

[![npm](https://img.shields.io/npm/v/@quizbase/client.svg)](https://www.npmjs.com/package/@quizbase/client)
[![types](https://img.shields.io/npm/types/@quizbase/client.svg)](https://www.npmjs.com/package/@quizbase/client)
[![license](https://img.shields.io/npm/l/@quizbase/client.svg)](LICENSE)

> **0.x — API may change.** Generated from the live OpenAPI 3.1 spec, but the wrapper ergonomics may shift before 1.0. We aim to lock the surface ~6–8 weeks after public launch based on user feedback.

## Install

```bash
pnpm add @quizbase/client
# or: npm install @quizbase/client
# or: yarn add @quizbase/client
```

Requires Node ≥20 (or any modern browser with `fetch` + `AbortController`).

## Quick start

```ts
import { createClient } from '@quizbase/client';

const client = createClient({
  apiKey: process.env.QUIZBASE_API_KEY!  // qb_pk_… (publishable) or qb_sk_… (secret)
});

const random = await client.questions.random({ category: 'science-and-nature', lang: 'en' });
console.log(random.data.question);
```

Get a key at [quizbase.runriva.com/dashboard/keys](https://quizbase.runriva.com/dashboard/keys). The free tier is **500 requests/day across all your keys** against full production data — enough to ship a real app. Paid tiers at [/pricing](https://quizbase.runriva.com/pricing).

Use `qb_pk_*` (publishable) from browsers and edge functions — CORS is enabled. Use `qb_sk_*` (secret) only from servers and CI; CORS is blocked for these. Both formats authenticate identically and share the same per-user quota.

## Resources

```ts
client.questions.list({ category, tags_any, topics_any, subcategory, lang, cursor, limit, ... });
client.questions.random({ category, tags, lang, ... });
client.questions.get(id, { lang });

client.categories.list({ lang });
client.languages.list();
client.topics.list({ lang });
client.topics.get(slug, { lang });
client.tags.list({ lang });
client.subcategories.list({ lang });

client.stats.get();
client.me.get();
client.usage.get({ from, to });

client.report.create({ questionId, kind, comment });
```

Full parameter docs: [docs.quizbase.runriva.com/docs](https://quizbase.runriva.com/docs) and the interactive [API Reference](https://quizbase.runriva.com/docs/api-reference).

## Errors

Every non-2xx response throws `QuizbaseError` carrying the parsed [RFC 9457 Problem Details](https://www.rfc-editor.org/rfc/rfc9457):

```ts
import { createClient, QuizbaseError } from '@quizbase/client';

try {
  await client.questions.random({ category: 'unknown' });
} catch (err) {
  if (err instanceof QuizbaseError) {
    console.error(err.status);              // 400
    console.error(err.problem.code);        // "invalid_query_param"
    console.error(err.problem.detail);      // human-readable message
    console.error(err.requestId);           // for support requests
    if (err.isRateLimited) console.error(err.retryAfter); // seconds
  }
}
```

## Retries

By default, the SDK retries 2× (3 attempts total) on `429` and `5xx` responses with exponential backoff + jitter. Server-issued `Retry-After` is honored. `4xx` (other than 429) is not retried.

```ts
createClient({ apiKey, retries: 5 });   // tune
createClient({ apiKey, retries: 0 });   // disable
```

## Performance-aware timeouts

Per-endpoint defaults are tuned against [the public performance baseline](https://quizbase.runriva.com/docs/performance):

| Endpoint                                  | Default timeout |
|-------------------------------------------|-----------------|
| `questions.list`, `topics.list`, `tags.list`, `subcategories.list`, `report.create` | 15 s |
| `questions.random`, `questions.get`, `categories.list`, `languages.list`, `topics.get`, `stats.get`, `me.get`, `usage.get` | 10 s |
| Global default                            | 30 s            |

Override per-endpoint:

```ts
createClient({
  apiKey,
  timeout: 30_000,
  timeouts: {
    'questions.random': 5_000   // narrow filters → fail fast
  }
});
```

## Telemetry hook

Wire every HTTP attempt (including retries) to your observability stack:

```ts
import { posthog } from 'posthog-js';

const client = createClient({
  apiKey,
  onRequest: ({ method, endpoint, duration, status, requestId, retryCount, final, error }) => {
    posthog.capture('quizbase_api_call', {
      method, endpoint, duration, status, requestId, retryCount, final,
      error: error?.message
    });
  }
});
```

`final: false` means another retry will follow. The hook is async-safe; thrown errors inside it are swallowed so telemetry can never break the caller.

## Custom `fetch`

Pass a `fetch` implementation for testing or to use `undici`/`node-fetch`:

```ts
createClient({ apiKey, fetch: customFetch });
```

## Type-safe responses

All responses are typed from the OpenAPI spec. Hover over `client.questions.random(...)` in your IDE for autocomplete on every parameter and field.

## Source & releases

- **GitHub:** [maciejdzierzek/quizbase-sdk-ts](https://github.com/maciejdzierzek/quizbase-sdk-ts)
- **Issues / feedback:** [GitHub Issues](https://github.com/maciejdzierzek/quizbase-sdk-ts/issues)
- **Releases:** automated by [release-please](https://github.com/googleapis/release-please) from conventional commits
- **Drift guard:** the main repo [`tests/api/sdk-contract.spec.ts`](https://github.com/maciejdzierzek/quizbase) verifies the latest published SDK still matches `/openapi.json`

## License

MIT © Maciej Dzierżek
