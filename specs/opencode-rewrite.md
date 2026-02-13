# FMDT v2 — OpenCode Architecture Rewrite

**Status:** Ready for approval
**Date:** 2026-02-12
**Type:** Feature Plan (Full Rewrite)
**Effort:** XL (>2 days)

---

## Problem Statement

**Who:** Developers managing multi-repo Azure DevOps (and now GitHub) projects
**What:** Need visibility into where feature branches have been deployed across environment branches, and a holistic view of what's in each environment across an entire project
**Why it matters:** Without this, teams manually check PR status across dozens of repos — error-prone, slow, blocks release confidence
**Evidence:** v1 exists and is used; this rewrite adds GitHub support, richer reports, and a maintainable architecture modeled on opencode

---

## Proposed Solution

Rewrite FMDT as a **Bun monorepo** following opencode's architecture: a Hono HTTP server as the core, with a SolidJS + opentui terminal UI as the primary interface. The CLI boots the server, connects the TUI, and tears down on exit.

Two report types replace the single current view:
1. **Branch Report** — track a specific branch across all repos in a project (current behavior, enhanced)
2. **Environment Report** — for one project, show everything in each environment branch: merged PRs, commits ahead, work items reached, and branches with open PRs targeting each environment

Both Azure DevOps and GitHub are supported as data sources. Users configure which branches are "server branches" (environment branches) per project — no more hardcoded dev/qa/staging/master.

---

## Architecture

### Monorepo Structure

```
fmdt/
├── packages/
│   ├── core/              # @fmdt/core — types, schemas, provider interfaces
│   ├── server/            # @fmdt/server — Hono API + auth + provider implementations
│   ├── tui/               # @fmdt/tui — SolidJS + opentui terminal app
│   └── cli/               # fmdt — CLI entry point, boots server + TUI
├── package.json           # Bun workspace root
├── biome.jsonc
├── tsconfig.json
└── vitest.workspace.ts
```

### Data Flow

```
CLI (packages/cli)
  │
  ├─ boots ──► Hono Server (packages/server)
  │               │
  │               ├─ /auth/*          ─► credential store (keyring)
  │               ├─ /config/*        ─► project config (XDG)
  │               ├─ /report/branch   ─► Branch Report
  │               ├─ /report/env      ─► Environment Report
  │               └─ /event           ─► SSE stream (progress, results)
  │
  └─ renders ─► TUI (packages/tui)
                  │
                  └─ connects to server via HTTP + SSE
```

### Communication: TUI ↔ Server

Following opencode's pattern:
- **HTTP** for request/response (fetch reports, save config, auth)
- **SSE** (`/event`) for server-push (scan progress, partial results, errors)
- **Event Bus** (Zod-validated) on server side for internal pub/sub

---

## Scope & Deliverables

| # | Deliverable | Effort | Depends On |
|---|-------------|--------|------------|
| D1 | Monorepo scaffold + build pipeline | M | - |
| D2 | `@fmdt/core` — types, schemas, provider interface | M | D1 |
| D3 | `@fmdt/server` — Hono server, event bus, auth routes | L | D2 |
| D4 | Azure DevOps provider implementation | L | D2, D3 |
| D5 | GitHub provider implementation | L | D2, D3 |
| D6 | Branch Report API endpoint | M | D3, D4/D5 |
| D7 | Environment Report API endpoint | L | D3, D4/D5 |
| D8 | `@fmdt/tui` — SolidJS + opentui app shell | L | D1 |
| D9 | TUI: Setup/Auth flow | M | D3, D8 |
| D10 | TUI: Branch Report view | M | D6, D8 |
| D11 | TUI: Environment Report view | L | D7, D8 |
| D12 | `fmdt` CLI entry point | M | D3, D8 |
| D13 | Config: server branches per project | S | D2, D3 |
| D14 | Migration: v1 config → v2 | S | D3 |

### Dependency Graph

```
D1 ─► D2 ─┬─► D3 ─┬─► D4 ─┬─► D6 ─► D10
           │       │       │
           │       ├─► D5 ─┤─► D7 ─► D11
           │       │       │
           │       ├─► D13 │
           │       └─► D14 │
           │               │
           └─► D8 ─────────┼─► D9
                            └─► D12
```

---

## Non-Goals (Explicit Exclusions)

- Web UI / browser dashboard (future, not this phase)
- Desktop app (Tauri wrapper)
- SDK package for external consumers
- GitLab / Bitbucket support
- Merge/PR creation actions (read-only tool)
- Real-time webhooks (polling/on-demand only)
- Multi-org support in a single session

---

## Data Model

### Core Types (`@fmdt/core`)

```typescript
// Provider abstraction
type ProviderType = "azure-devops" | "github"

interface Provider {
  type: ProviderType
  listOrgs(): Promise<string[]>
  // Azure: list projects in org. GitHub: returns single synthetic "project" (the org itself)
  listProjects(org: string): Promise<Project[]>
  // Azure: repos in project. GitHub: repos in org, filtered by RepoFilter
  listRepositories(ref: ProjectRef): Promise<Repository[]>
  getBranchMergeStatus(opts: BranchReportRequest): Promise<BranchMergeStatus[]>
  getEnvironmentReport(opts: EnvReportRequest): Promise<EnvironmentReport>
  validateCredentials(): Promise<boolean>
}

// Shared domain types
interface Project {
  id: string
  name: string
  provider: ProviderType
}

// Provider-specific project reference (see Resolved Questions for full definition)
type ProjectRef =
  | { provider: "azure-devops"; org: string; project: string }
  | { provider: "github"; org: string; repoFilter: RepoFilter }

interface Repository {
  id: string
  name: string
  defaultBranch: string
  disabled: boolean
}

// --- Branch Report ---

interface BranchReportRequest {
  branch: string
  projectId: string
  repositoryId?: string  // optional: scope to single repo
}

interface BranchMergeStatus {
  branch: string
  repository: string
  environments: EnvironmentStatus[]
}

interface EnvironmentStatus {
  name: string               // "dev", "qa", etc. (user-configured)
  branch: string             // "refs/heads/dev"
  merged: boolean
  mergeDate: string | null
  mergedBy: string | null
  verified: boolean          // diff-validated (not just PR closed)
}

// --- Environment Report ---

interface EnvReportRequest {
  projectId: string
  environments?: string[]    // filter to specific envs, default: all configured
}

interface EnvironmentReport {
  project: string
  environments: EnvironmentDetail[]
}

interface EnvironmentDetail {
  name: string
  branch: string
  repositories: RepoEnvironmentDetail[]
}

interface RepoEnvironmentDetail {
  repository: string
  mergedPRs: MergedPR[]
  commitsAhead: CommitSummary[]
  openPRs: OpenPR[]
  workItems: WorkItemStatus[]
}

interface MergedPR {
  id: number
  title: string
  sourceBranch: string
  mergedDate: string
  mergedBy: string
  workItemIds: string[]
}

interface CommitSummary {
  sha: string
  message: string
  author: string
  date: string
}

interface OpenPR {
  id: number
  title: string
  sourceBranch: string
  author: string
  createdDate: string
}

interface WorkItemStatus {
  id: string                       // Jira ticket ID parsed from branch name (e.g., "LAAIR-1548")
  branches: string[]               // source branches containing this ticket ID
  environments: string[]           // which server branches these have reached
}

// --- Configuration ---

// See "Multi-Project Config Shape" in Resolved Questions for full AppConfig
// ProjectConfig per-project:
interface ProjectConfig {
  id: string
  name: string
  ref: ProjectRef
  serverBranches: ServerBranch[]
  createdAt: string
}

interface ServerBranch {
  name: string              // display name: "Dev", "QA", "Staging", "Production"
  branch: string            // git ref: "dev", "qa", "staging", "main"
  order: number             // display order (promotion pipeline order)
}

// --- Auth ---

type AuthInfo =
  | { type: "pat"; token: string }
  | { type: "oauth"; accessToken: string; refreshToken: string; expiresAt: number }

interface AuthStore {
  get(providerId: string): Promise<AuthInfo | null>
  set(providerId: string, info: AuthInfo): Promise<void>
  remove(providerId: string): Promise<void>
}
```

### Zod Schemas

Every type above gets a corresponding Zod schema in `@fmdt/core`. Schemas are the source of truth; TypeScript types are inferred via `z.infer<>`.

---

## API / Interface Contract

### Hono Server Routes

```
Auth
  PUT    /auth/:providerId          → Set credentials (body: AuthInfo)
  DELETE /auth/:providerId          → Remove credentials
  GET    /auth/status               → { configured: boolean, provider: ProviderType }

Config
  GET    /config                    → ProjectConfig
  PUT    /config                    → Update ProjectConfig
  GET    /config/projects           → Project[] (list available projects for org)
  GET    /config/server-branches    → ServerBranch[]
  PUT    /config/server-branches    → Update ServerBranch[]

Reports
  POST   /report/branch             → BranchMergeStatus[] (body: BranchReportRequest)
  POST   /report/environment        → EnvironmentReport (body: EnvReportRequest)

Events
  GET    /event                     → SSE stream

Health
  GET    /health                    → { ok: true, version: string }
```

### SSE Event Types

```typescript
type ServerEvent =
  | { type: "scan.started"; data: { totalRepos: number } }
  | { type: "scan.repo.complete"; data: { repo: string; index: number } }
  | { type: "scan.complete"; data: { duration: number } }
  | { type: "scan.error"; data: { repo: string; error: string } }
  | { type: "server.heartbeat"; data: {} }
```

### Error Shape

```typescript
interface ApiError {
  code: string           // "AUTH_INVALID" | "ORG_NOT_FOUND" | "RATE_LIMITED" | ...
  message: string
  details?: unknown
}
```

---

## Key Technical Decisions

### Decision: Hono over direct CLI

**Why:** Decouples data fetching from rendering. TUI is just a client. Enables future web UI without touching core logic. Matches opencode pattern.
**Trade-off:** Extra complexity of HTTP layer for what starts as a local-only tool.
**Revisit if:** Performance overhead of localhost HTTP becomes noticeable in scan-heavy workflows.

### Decision: Provider interface abstraction

**Why:** Azure DevOps and GitHub have wildly different APIs. A shared interface keeps report logic provider-agnostic.
**Trade-off:** Lowest-common-denominator risk — some provider-specific features may not fit the interface.
**Revisit if:** A third provider (GitLab) reveals the interface is too narrow.

### Decision: opentui/solid over React Ink

**Why:** Aligns with opencode ecosystem. SolidJS fine-grained reactivity is better suited for TUI updates (no virtual DOM diffing). Zig rendering engine is faster.
**Trade-off:** Smaller ecosystem than React Ink. Team must learn SolidJS + opentui.
**Revisit if:** opentui proves too immature or lacks critical primitives.

### Decision: Server branches as user config (not hardcoded)

**Why:** Not every team uses dev/qa/staging/master. Some have `develop`, `release/*`, `production`. Config makes this flexible.
**Trade-off:** Setup is slightly more complex (must configure branches).
**Revisit if:** 90%+ of users use the same 4 branches — could add smart defaults.

### Decision: Monorepo with Bun workspaces

**Why:** Clean separation of concerns. Each package has a focused responsibility. Mirrors opencode structure.
**Trade-off:** More build config, workspace dependency management.
**Revisit if:** Package count stays at 4 and never grows — might be over-structured.

---

## Trade-offs Made

| Chose | Over | Because |
|-------|------|---------|
| Hono server + HTTP | Direct function calls in CLI | Enables future web UI; clean separation; matches opencode |
| Provider interface | Azure-specific service class | GitHub support requires abstraction; cleaner testing |
| SolidJS + opentui | React Ink (current) | Aligns with opencode; better reactivity model for TUI |
| Configurable server branches | Hardcoded dev/qa/staging/master | Real teams use different branch names |
| SSE for progress | Polling / callback props | Server-push is cleaner; TUI stays reactive without timers |
| Zod schemas as source of truth | TypeScript-first types | Runtime validation at API boundaries; schemas shared across packages |

---

## Acceptance Criteria

- [ ] `bunx fmdt` boots server, renders TUI, prompts for setup if unconfigured
- [ ] Setup flow: select provider → enter credentials → select org → select project (Azure) or configure repo filter (GitHub) → configure server branches
- [ ] Multi-project: user can add multiple projects and switch between them in TUI
- [ ] Branch Report: given a branch name, shows merge status across all repos in active project (v1 parity)
- [ ] Environment Report: for active project, shows per-environment: merged PRs, commits ahead, open PRs targeting, work item rollup
- [ ] Work items extracted from branch names via Jira-style ticket ID regex (`/^([A-Z]+-\d+)/`)
- [ ] Server branches are configurable per project (add/remove/reorder)
- [ ] Credentials stored in system keyring (not plaintext)
- [ ] Azure DevOps provider: PAT auth, all existing v1 functionality preserved
- [ ] GitHub provider: PAT auth, repo filtering (all / selected / pattern / topic)
- [ ] SSE events stream scan progress to TUI (repo-by-repo updates)
- [ ] `fmdt --configure` resets config and re-runs setup
- [ ] `fmdt --branch LAAIR-1548` runs branch report non-interactively
- [ ] `fmdt --project <name>` selects active project for CLI usage
- [ ] All packages pass `biome check`, `tsgo --noEmit`, `vitest run`
- [ ] v1 config auto-migrates to v2 format on first run

---

## Test Strategy

| Layer | What | How |
|-------|------|-----|
| Unit | Provider implementations (Azure, GitHub) | Mock HTTP responses, verify parsed output |
| Unit | Report aggregation logic | Given provider results, verify report shape |
| Unit | Zod schemas | Validate/reject known good/bad payloads |
| Unit | Config read/write/migrate | fs-fixture for file system |
| Unit | Auth store (keyring) | Mock keyring, verify get/set/remove |
| Integration | Hono routes | `app.request()` with mocked providers |
| Integration | SSE event stream | Connect to `/event`, verify event sequence during scan |
| E2E | Full CLI boot → report | Spawn process, mock provider responses, verify TUI output |

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| opentui immaturity — missing primitives for tables/scrolling | Medium | High | Spike D8 early; fallback to raw terminal escape codes or fork opentui |
| GitHub API rate limits during large org scans | High | Medium | Implement pagination, caching, conditional requests (ETags), backoff |
| Azure DevOps diff validation is slow (current v1 issue) | Known | Medium | Make diff validation optional/configurable; run in parallel |
| Work item extraction differs wildly between Azure/GitHub | Medium | Medium | Define minimal WorkItemStatus; provider maps to it best-effort |
| Monorepo build complexity | Low | Low | Use Bun workspaces (native); keep package count small |

---

## Migration Plan (v1 → v2)

1. Detect existing v1 config at XDG path
2. Read `config.json` + keyring PAT
3. Map to v2 `ProjectConfig` with default server branches: `[dev, qa, staging, master]`
4. Set `provider: "azure-devops"`
5. Write v2 config, preserve keyring entry
6. Show "Migrated from v1" message in TUI

---

## Resolved Questions

- [x] **Work item extraction:** Parse Jira-style ticket IDs from branch names (e.g., `LAAIR-1548-fix-auth` → `LAAIR-1548`). Works identically for both providers — no reliance on Azure DevOps work item linking or GitHub Issues. Regex: `/^([A-Z]+-\d+)/`.
- [x] **Environment Report time range:** All-time. The report answers "which feature branches are in each server branch" — no time windowing.
- [x] **Multi-project support:** Yes. Config stores multiple projects, user switches between them. See provider hierarchy mapping below.
- [x] **opentui primitives:** Build whatever table/grid/list components are needed directly. No spike — just install opentui and implement.

### Provider → Project Hierarchy Mapping

| Concept | Azure DevOps | GitHub |
|---------|-------------|--------|
| **Organization** | Organization (e.g., `dev.azure.com/{org}`) | Organization or User (e.g., `github.com/{org}`) |
| **Project** | Project (contains repos) | *No equivalent* — org contains repos directly |
| **Repositories** | Repos under a project | All repos in org |

**GitHub's lack of project grouping** — handled by a `RepoGroup` concept:

```typescript
// A "project" in fmdt is either a native Azure DevOps project
// or a user-defined repo group for GitHub
type ProjectRef =
  | { provider: "azure-devops"; org: string; project: string }
  | { provider: "github"; org: string; repoFilter: RepoFilter }

type RepoFilter =
  | { type: "all" }                           // every repo in org
  | { type: "selected"; repos: string[] }     // manually picked repos
  | { type: "pattern"; include: string[] }    // glob patterns (e.g., "SvApi.*")
  | { type: "topic"; topics: string[] }       // GitHub topics
```

During GitHub setup, user picks a filter strategy. This keeps the `Provider.listRepositories()` interface clean — the filter is applied before repos are returned.

### Multi-Project Config Shape

```typescript
interface AppConfig {
  version: string
  autoUpdate: boolean
  activeProject: string              // ID of current project
  projects: Record<string, ProjectConfig>
}

interface ProjectConfig {
  id: string                         // generated UUID
  name: string                       // user-facing label
  ref: ProjectRef                    // provider + org + project/filter
  serverBranches: ServerBranch[]
  createdAt: string
}
```

TUI provides a project switcher (similar to v1's project selector during setup, but persistent).

---

## Open Questions

*All questions resolved.*

---

## Success Metrics

- Branch Report returns same data as v1 for Azure DevOps (parity)
- Environment Report renders for a 20+ repo project in <30s
- Setup flow completes in <2 minutes for new user
- Zero plaintext credentials on disk

---

*Spec written to: `specs/opencode-rewrite.md`*

---
Phase: DONE | All questions resolved, spec ready for task breakdown
