# FMDT v2 — Task Tracker

## Batch 1: Foundation

- [x] **D1: Monorepo scaffold** — root workspaces, tsconfig.base, biome, vitest workspace, 4 package stubs (2026-02-12)
- [x] **D2: @fmdt/core schemas** — provider, project, report, auth, event, error schemas + 68 tests (2026-02-12)

## Batch 2: Server Core

- [x] **D3: Hono server, event bus, auth routes** — server assembly, Bus pub/sub, auth store, SSE, health (2026-02-12)
- [x] **D13: Config routes** — GET/PUT /config, /config/projects, /config/server-branches (2026-02-12)
- [x] **D14: V1 config migration** — detect v1 config, transform to v2 AppConfig (2026-02-12)

## Batch 3: Azure DevOps Provider

- [x] **D4: Azure DevOps provider** — api, branch-report, env-report, utils, provider factory + 26 tests (2026-02-12)

## Batch 4: Branch Report API

- [x] **D6: Branch report endpoint** — POST /report/branch, executeBranchReport with bus events + 3 tests (2026-02-12)

## Batch 5: TUI Shell + CLI

- [x] **D8: TUI app shell** — opentui render, App/Header/Footer/Loading/Error components, HTTP client, Rose Pine theme + 6 tests (2026-02-12)
- [x] **D12: CLI entry point** — yargs commands, Worker thread + RPC (listen/emit/client), boot + shutdown (2026-02-12)

## Batch 6: TUI Features (v1 Parity)

- [x] **D9: Setup/auth flow** — multi-step wizard: provider select, PAT input, org input, project discovery + select, config save. Discover route + 3 tests (2026-02-12)
- [x] **D10: Branch report view** — branch input, merge status table with dynamic ServerBranch[] columns, formatters utility + 7 tests (2026-02-12)

## Batch 7: GitHub Provider

- [x] **D5: GitHub provider** — REST API (fetch-based, no Octokit), Link header pagination, repo filtering (all/selected/pattern/topic), branch report, env report, provider factory wired + 26 tests (2026-02-12)

## Batch 8: Environment Report

- [x] **D7: Environment report API** — POST /report/environment, executeEnvironmentReport with bus events + 3 tests (2026-02-12)
- [x] **D11: TUI environment report view** — tab-based env navigation (left/right), per-env merged PRs/commits/open PRs/work items, tab key to switch branch↔env views (2026-02-12)

## Post-Batch: Cleanup

- [x] **V1 cleanup** — deleted `src/`, `tests/`, removed v1 deps (ink, react, commander, etc.), updated vitest workspace, biome, tsconfig (2026-02-12)
- [x] **CLI bundling** — tsdown.config.ts for `packages/cli`, root build script, 4.2 kB bundle (2026-02-12)
- [x] **History persistence** — server-side XDG data dir, GET/POST /history routes, branch-report up/down arrow navigation, dedup + cap 100 entries + 13 tests (2026-02-12)

## Spec Gap Fixes

- [x] **Non-interactive `--branch` mode** — `fmdt --branch LAAIR-1548` runs headless branch report to stdout, `--project` selects project by name (2026-02-12)
- [x] **Multi-project switching** — `p` key opens project picker overlay in TUI, arrow keys + enter to switch (2026-02-12)
- [x] **SSE scan progress** — Worker forwards Bus events via Rpc.emit, branch/env report views show repo-by-repo progress (2026-02-12)
- [x] **Server branch editor** — Setup wizard editBranches step: add/delete/edit branches before saving, uses Name/branch format (2026-02-12)
- [x] **`--configure` reset** — DELETE /config route + deleteConfig(), TUI resets config before entering setup wizard (2026-02-12)

## Feature Enhancements

- [x] **Org discovery in setup wizard** — PAT entry → auto-fetch orgs → selectable list (+ manual fallback); Azure DevOps profile/accounts API, GitHub user + orgs API, POST /discover/orgs route, TUI fetchingOrgs/selectOrg steps + 10 new tests (2026-02-12)

## Bug Fixes

- [x] **Paste support in TUI inputs** — added `usePaste` hook to setup wizard (PAT, org, branch editing) and branch report view; strips newlines for single-line inputs (2026-02-12)

## Feature Enhancements (cont.)

- [x] **Select auto-copy** — clipboard utility (macOS/Linux/Windows), OSC 52 terminal clipboard (tmux-aware), console `onCopySelection` wired via Ctrl+Y keybinding (2026-02-12)

## Discovered During Work

- `hono-openapi` requires `@hono/standard-validator` as peer dep — added to server devDependencies
- SSE stream tests can't use `app.request()` (blocks forever) — test Bus integration directly instead
- `@folder/xdg` has no types — added custom `.d.ts` in server package
- `tsgo` doesn't support `--build` mode — per-package typecheck with project references fails; use root `tsgo --noEmit` instead
- `exactOptionalPropertyTypes` requires `| undefined` on all optional props (e.g. `fetch?: typeof fetch | undefined`)
- opentui JSX requires `jsxImportSource: "@opentui/solid"` in tsconfig + `bunfig.toml` preload
- TUI entry file must be `.tsx` when it contains JSX (even if barrel exports)
- opentui `<text>` has no `bold` prop — use `attributes` bitmask or styled text content instead
- opentui `KeyEvent` has no `input` property — use `key.name` (single chars have `key.name.length === 1`)
- Date formatting tests: use midday (T12:00:00Z) to avoid timezone boundary issues with `toLocaleDateString`
- GitHub PAT minimum scopes — classic: `repo` + `read:org`; fine-grained: Metadata (read), Contents (read), Pull requests (read)
- OpenCode uses manual `useKeyboard`/`onKeyDown` for input handling — no special opentui `<input>` component; our approach is correct
