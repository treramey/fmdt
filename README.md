# fmdt (Feature Merge Detection Tool)

<div align="center">
  <strong>Interactive CLI tool for tracking branch merge status across Azure DevOps and GitHub repositories</strong>
  <br><br>
  <a href="https://www.npmjs.com/package/fmdt">
    <img src="https://img.shields.io/npm/v/fmdt.svg" alt="npm version">
  </a>
  <a href="https://www.npmjs.com/package/fmdt">
    <img src="https://img.shields.io/npm/dm/fmdt.svg" alt="npm downloads">
  </a>
  <a href="https://github.com/treramey/fmdt/blob/main/LICENSE">
    <img src="https://img.shields.io/npm/l/fmdt.svg" alt="license">
  </a>
</div>

## Overview

**fmdt** is a terminal UI tool for tracking branch merge status and environment deployments across your repositories. It supports both **Azure DevOps** and **GitHub**, with configurable server branches per project and multi-project management.

### Key Features

- **Branch Report** — Check which environments (dev, QA, staging, production) a branch has been merged into, across all repos in a project
- **Environment Report** — Per-environment view: merged PRs, commits ahead, open PRs, work item rollup
- **Multi-Provider** — Azure DevOps (PAT) and GitHub (PAT) with a unified interface
- **Multi-Project** — Configure multiple projects, switch between them with `p`
- **Configurable Server Branches** — Add/remove/reorder environments per project (not hardcoded)
- **Work Item Tracking** — Extracts Jira-style ticket IDs (`ABC-123`) from branch names
- **Secure Credentials** — PAT tokens stored in system keyring (macOS Keychain, Windows Credential Manager, Linux Secret Service)
- **Search History** — Up/down arrows cycle through previous branch searches

## Installation

```bash
# npm
npm install -g fmdt

# Bun (recommended)
bun add -g fmdt

# npx (no install)
bunx fmdt@latest
```

## Quick Start

```bash
# Launch TUI — runs setup wizard on first use
fmdt

# Scan a specific branch (non-interactive)
fmdt --branch feature-123

# Select a specific project
fmdt --project "My Project" --branch feature-123

# Reset config and re-run setup
fmdt --configure
```

## Setup

On first run, the setup wizard guides you through:

1. **Select provider** — Azure DevOps or GitHub
2. **Enter PAT** — Personal Access Token (stored in system keyring)
3. **Enter organization** — Your org name
4. **Select project** — Discovered from your org
5. **Configure server branches** — Add/edit/delete environments (defaults: Dev, QA, Staging, Production)

### Azure DevOps PAT Scopes

- **Code**: Read
- **Project and Team**: Read

### GitHub PAT Scopes

**Classic PAT**: `repo` + `read:org`

**Fine-grained PAT**:
- Metadata (read)
- Contents (read)
- Pull requests (read)

## Usage

### TUI Mode (default)

```bash
fmdt                    # Launch interactive TUI
```

**Keybindings:**

| Key | Action |
|-----|--------|
| `tab` | Switch between Branch and Environment views |
| `p` | Switch project (when multiple configured) |
| `up/down` | Navigate history in branch input |
| `left/right` or `h/l` | Switch environment tabs |
| `r` | Refresh environment report |
| `q` / `esc` | Back to input / cancel |
| `ctrl+c` | Quit |

### CLI Flags

```bash
fmdt --branch <name>       # Non-interactive branch report to stdout
fmdt -b <name>             # Short flag
fmdt --project <name>      # Select project by name
fmdt -p <name>             # Short flag
fmdt --configure           # Reset config and re-run setup
fmdt -c                    # Short flag
```

## Configuration

- **Credentials**: System keyring (`fmdt:azure-devops`, `fmdt:github`)
- **Config file**: `~/.config/fmdt/config.json` (XDG)
- **Search history**: `~/.local/share/fmdt/history.json` (XDG)

V1 configs are auto-migrated to v2 format on first run.

## Architecture

```
packages/
  core/     @fmdt/core     — Zod schemas, types, provider interface
  server/   @fmdt/server   — Hono HTTP server, providers, event bus, config
  tui/      @fmdt/tui      — SolidJS + opentui terminal UI
  cli/      fmdt           — CLI entry, Worker thread + RPC, bundled binary
```

The CLI boots a Hono server in a Worker thread, communicates via RPC, and renders the TUI in the main thread. The server exposes REST routes for auth, config, reports, history, and SSE events.

## Development

```bash
git clone https://github.com/treramey/fmdt.git
cd fmdt
bun install

# Quality checks
bun run typecheck          # tsgo --noEmit
bun run check              # biome check
bun run test               # vitest run
bun run build              # tsdown bundle

# All at once
bun run ci
```

### Tech Stack

- **Runtime**: Bun
- **Server**: Hono
- **TUI**: SolidJS + opentui
- **Bundler**: tsdown
- **Validation**: Zod v4
- **Testing**: Vitest
- **Linting**: Biome v2

## License

MIT License - see [LICENSE](./LICENSE) file for details
