# Changelog

## [0.4.0](https://github.com/maciejdzierzek/quizbase-sdk-ts/compare/v0.3.0...v0.4.0) (2026-05-19)


### Features

* add async iterator pagination (listAll / pages) ([40921aa](https://github.com/maciejdzierzek/quizbase-sdk-ts/commit/40921aa1d84e4c2374e4c23a292e11396d38ae85))

## [0.3.0](https://github.com/maciejdzierzek/quizbase-sdk-ts/compare/v0.2.3...v0.3.0) (2026-05-14)


### ⚠ BREAKING CHANGES

* README snippets, JSDoc tooltips, and key examples no longer reference test/live key variants. Consumers copying these snippets must use qb_pk_* or qb_sk_* keys minted after Plan 105.
* `apiKey.env` field removed from ApiKeyInfo. Consumers reading the env discriminator must drop it — there is no longer a test/live split (Plan 105 — flatten API key model).

### Features

* regenerate types from current /openapi.json ([dc72528](https://github.com/maciejdzierzek/quizbase-sdk-ts/commit/dc7252836d9afe03013cf3377cc5f3b2908cbe18))


### Documentation

* realign README + JSDoc with flat key model ([eccdcfd](https://github.com/maciejdzierzek/quizbase-sdk-ts/commit/eccdcfd613dbcab202565d77b22e63990ab9ead3))


### Miscellaneous Chores

* release 0.3.0 (override release-please major bump) ([dae7218](https://github.com/maciejdzierzek/quizbase-sdk-ts/commit/dae72185a735a2f249f738f7ebd9547138982602))

## [0.2.3](https://github.com/maciejdzierzek/quizbase-sdk-ts/compare/v0.2.2...v0.2.3) (2026-05-07)


### Bug Fixes

* **ci:** pin npm@11.5.1 with --force to avoid self-upgrade module conflicts ([e6e3eb8](https://github.com/maciejdzierzek/quizbase-sdk-ts/commit/e6e3eb8ec50ea63c2e5a3f08af0628ac66fed11e))

## [0.2.2](https://github.com/maciejdzierzek/quizbase-sdk-ts/compare/v0.2.1...v0.2.2) (2026-05-07)


### Bug Fixes

* **ci:** upgrade npm to latest for OIDC Trusted Publishing support ([4f7f340](https://github.com/maciejdzierzek/quizbase-sdk-ts/commit/4f7f3406fcfd1c89038da31acaaef935f4744bfc))

## [0.2.1](https://github.com/maciejdzierzek/quizbase-sdk-ts/compare/v0.2.0...v0.2.1) (2026-05-07)


### Bug Fixes

* **ci:** publish in same workflow run as release-please tag creation ([b03ac15](https://github.com/maciejdzierzek/quizbase-sdk-ts/commit/b03ac15465742eabf0fc3905c18ecfe69c3f84f8))

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
