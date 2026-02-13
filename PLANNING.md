# FMDT v2 — Architecture & Planning

## Overview

FMDT v2 is a Bun monorepo rewrite following opencode's architecture: Hono HTTP server core, SolidJS + opentui TUI, provider abstraction (Azure DevOps + GitHub).

## Monorepo Structure

```
packages/
  core/     — @fmdt/core: Zod schemas, domain types, Provider interface
  server/   — @fmdt/server: Hono API, event bus, auth, providers
  tui/      — @fmdt/tui: SolidJS + opentui terminal UI
  cli/      — fmdt: CLI entry, worker thread, RPC
```

## Key Patterns

- **Zod-first**: Schemas are source of truth; TS types via `z.infer<>`
- **Event bus**: Pub/sub with Zod-validated events (mirrors opencode)
- **SSE**: Server pushes scan progress to TUI via `/event` endpoint
- **Provider interface**: `Provider` in `@fmdt/core` — Azure DevOps & GitHub implement it
- **Configurable server branches**: No hardcoded dev/qa/staging/master
- **Multi-project**: `AppConfig.projects` record, switchable active project

## Data Flow

```
CLI boots → Hono Server (worker thread) → Provider (Azure/GitHub)
                  ↓
            TUI (HTTP + SSE, main thread)
```

## Dependency Graph

```
D1 → D2 → D3 → D4 → D6 → D10
               → D5 → D7 → D11
               → D13
               → D14
      → D8 → D9, D12
```

## Naming Conventions

- Schemas: `FooSchema` (PascalCase + Schema suffix)
- Types: `Foo` (PascalCase, inferred from schema)
- Files: kebab-case (`branch-report.ts`)
- Packages: `@fmdt/core`, `@fmdt/server`, `@fmdt/tui`, `fmdt-v2` (CLI)

## Spec

Full spec at `specs/opencode-rewrite.md`.
