# AGENTS.md — instrukcje dla agentów AI pracujących w tym repo

Krótko: ten repo to publiczny TypeScript SDK `@quizbase/client`. Release-please automatycznie versionuje na podstawie conventional commits + publishuje do npm przy mergeu PR-a "chore(main): release ...". Każda zmiana README jest widoczna na npmjs.com + GitHub równocześnie.

## Preflight przed JAKĄKOLWIEK zmianą

**Zawsze** odpalaj zanim cokolwiek edytujesz:

```bash
git fetch origin
git status -uno                                                  # czy local == remote?
[ "$(jq -r .version package.json)" = "$(npm view @quizbase/client version)" ] \
  && echo "✅ package.json matches npm latest" \
  || echo "⚠️  package.json $(jq -r .version package.json) ≠ npm $(npm view @quizbase/client version) — pull or check release-please"
```

Jeśli local **nie jest** na `origin/main`:

```bash
git pull --rebase origin main
```

**Dlaczego to ma znaczenie:** release-please mergeuje "release" PR-y w trybie auto (npm publish jednoczesny). Jeśli zaczniesz edytować przy `package.json: 0.3.0` a remote jest już na `0.4.0`, twój commit siedzi na nieistniejącej historii — push'nie się zła wersja README do release notes.

## Commit conventions (release-please)

| Prefix             | Bump       | Use case                                              |
| ------------------ | ---------- | ----------------------------------------------------- |
| `feat:`            | minor      | Nowa funkcja / nowy resource / nowe parametry         |
| `fix:`             | patch      | Bug fix (kod lub broken example w README)             |
| `docs:`            | patch      | Tylko docs / README / JSDoc                           |
| `chore:` / `ci:`   | brak       | Build, CI, deps bez user-facing impact                |
| `feat!:` / `BREAKING CHANGE:` w body | major | Tylko świadomie, przed 1.0 unikamy |

**Co zostaje stale:** `0.x — API may change` claim w README. Po Show HN + 6-8 tygodniach feedback → świadomy bump do 1.0 z stability commitment.

## Quality gate (zawsze przed commitem)

```bash
pnpm install                # idempotentne, ok
pnpm typecheck              # 0 errors
pnpm test                   # 18+ pass, 2 skipped (DB-zależne, intentionally)
pnpm build                  # tsup CJS + ESM + .d.ts
```

Lint: brak ESLint config w tym repo (świadomie — minimalny stack). Prettier `tsup.config.ts` i `tsconfig.json` jako-są.

## Czego NIE robić w tym repo

- **NIE dodawać `examples/`** bez decyzji w głównym repo (`quizbase/`). Plan 116 explicite mówi że SDK ma zostać thin wrapper.
- **NIE linkować do `github.com/maciejdzierzek/quizbase`** — to private repo. Linki do publicznej dokumentacji `https://quizbase.runriva.com/...` lub do tego repo `quizbase-sdk-ts` są OK.
- **NIE hardkodować wersji** w README — używaj badges (`shields.io/npm/v/...`) które fetchuje live z npm.
- **NIE pushować** bez przejrzenia diffa przez Macieja (właściciela repo).

## Główny repo

Decyzje, plany, narrative — wszystko żyje w main repo `quizbase/` (private). Synchronizacja: typy SDK regenerujesz z `https://quizbase.runriva.com/openapi.json` (publiczny). Drift weryfikuje sentinel po stronie main repo, niewidoczny tutaj.
