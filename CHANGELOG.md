# Changelog

## [0.2.0](https://github.com/maciejdzierzek/quizbase-sdk-ts/compare/v0.1.0...v0.2.0) (2026-05-07)


### Features

* regen types — drop topic.description, neutralize Question.extensions desc ([260e398](https://github.com/maciejdzierzek/quizbase-sdk-ts/commit/260e398d96d91f2e70bab7d23a5f223c34aecdbb))

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
