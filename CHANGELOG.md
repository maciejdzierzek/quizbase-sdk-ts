# Changelog

## 1.0.0 (2026-05-07)


### Features

* initial SDK 0.1.0 — typed client, retry, RFC 9457 errors, telemetry hook ([82da079](https://github.com/maciejdzierzek/quizbase-sdk-ts/commit/82da0795fe0303eb8a578bdaa99bd7f716c25594))


### Bug Fixes

* **tests:** align stats integration test with actual response shape ([8085e0c](https://github.com/maciejdzierzek/quizbase-sdk-ts/commit/8085e0c83e25e6d4eec35ace658c3a71af60fd52))

## 0.1.0 (2026-05-07)

Initial release. **0.x — API may change.** A 1.0 with stability commitment will follow ~6–8 weeks after public launch based on user feedback.

### Features

- Typed client for all 13 QuizBase `/api/v1/*` endpoints, generated from `https://quizbase.runriva.com/openapi.json`
- `createClient({ apiKey, baseUrl, timeout, timeouts, retries, onRequest, fetch, userAgent })`
- Resource namespaces: `questions`, `categories`, `languages`, `topics`, `tags`, `subcategories`, `stats`, `me`, `usage`, `report`
- `QuizbaseError` carrying parsed RFC 9457 Problem Details, `X-Request-Id`, parsed `Retry-After`
- Retry on 429 / 5xx / network errors with exponential backoff + jitter, honors server `Retry-After`
- `onRequest` telemetry hook fired after every attempt (for PostHog / Datadog / Sentry breadcrumbs)
- Performance-aware per-endpoint timeouts (10–15s defaults, 30s ceiling) — see [/docs/performance](https://quizbase.runriva.com/docs/performance)
- Auto-generated `X-Request-Id` (UUID) per request
- Zero runtime dependencies
- ESM + CJS + `.d.ts` build via tsup, Node ≥20
