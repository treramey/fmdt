# fmdt (Feature Merge Detection Tool)

<div align="center">
  <!-- <img src="assets/icon.svg" alt="fmdt Icon" width="128" height="128"> -->
  <!-- <br><br> -->
  <strong>Interactive CLI tool for checking branch merge status across Azure DevOps repositories</strong>
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
  <a href="https://github.com/treramey/fmdt">
    <img src="https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg" alt="node version">
  </a>
</div>

## Overview

**fmdt** (Feature Merge Detection Tool) is a React Ink-based CLI tool that provides an interactive terminal interface for tracking branch merge status across Azure DevOps repositories. Quickly discover which feature branches (dev, qa, staging, master) your code has been merged into, across all repositories in your organization.

## Features

- 🔍 **Organization-Wide Scanning** - Automatically scan all repositories for a branch across your organization
- 🎨 **Beautiful Terminal UI** - Powered by React Ink v6 with clear, color-coded status display
- ⚡ **Fast Parallel Scanning** - Concurrent API requests for maximum performance
- 📊 **Rich Merge History** - View merge dates, authors, and status at a glance
- 🚀 **Smart Filtering** - Display results only for repositories containing the branch
- 🔐 **Secure Credentials** - PAT tokens stored safely in system keychain
- 🛠️ **Type Safety** - Full TypeScript implementation with strict type checking
- ✅ **Comprehensive Testing** - Full test coverage with vitest

<!-- ## Screenshots

<div align="center">
  <img src="assets/thumbnail.png" alt="fmdt Thumbnail" width="600">
  <br><br>
  <img src="assets/screenshot_scan.png" alt="fmdt Branch Scan" width="800">
  <br><br>
  <img src="assets/screenshot_results.png" alt="fmdt Results Display" width="800">
</div> -->

## Prerequisites

- **Node.js** ≥ 20.19.3
- **Bun** (recommended) or npm/pnpm
- **Azure DevOps Personal Access Token** (PAT) with Code (Read) and Project and Team (Read) scopes
- **Azure DevOps** organization and project access

## Installation

### Quick Start (Recommended)

No installation required! Run directly with:

```bash
# Using Bun (fastest)
bunx fmdt@latest

# Using npm
npx fmdt@latest

# Using pnpm
pnpm dlx fmdt@latest
```

### Global Installation

For frequent use, install globally:

```bash
# npm
npm install -g fmdt

# Bun
bun install -g fmdt

# pnpm
pnpm add -g fmdt
```

Then run from anywhere:

```bash
fmdt --branch feature-123
```

### From Source

```bash
# Clone the repository
git clone https://github.com/treramey/fmdt.git
cd fmdt

# Install dependencies
bun install

# Build the project
bun run build

# Link globally (optional)
npm link
```

## Configuration

### First-Time Setup

When you run `fmdt` for the first time, you'll be guided through an interactive setup wizard that will:

1. Prompt you for your Azure DevOps Personal Access Token (PAT)
2. Ask for your organization name
3. Validate your credentials
4. Let you select a project from your organization
5. Securely store your configuration

Your PAT is stored in your system's keychain (macOS Keychain, Windows Credential Manager, or Linux Secret Service), ensuring secure credential storage. The organization and project settings are saved in a configuration file.

### Getting an Azure DevOps PAT Token

Before running the setup, create a Personal Access Token:

1. Navigate to Azure DevOps: `https://dev.azure.com/{organization}`
2. Click on User Settings → Personal Access Tokens
3. Click "New Token"
4. Set the following scopes:
   - **Code**: Read
   - **Project and Team**: Read
5. Copy the token - you'll enter it during the setup wizard

### Reconfiguring

To reconfigure your settings at any time:

```bash
fmdt --configure
```

This will delete your existing configuration and run the setup wizard again.

### Configuration Storage

- **PAT Token**: Stored securely in your system keychain
  - macOS: Keychain Access (search for "fmdt")
  - Windows: Credential Manager
  - Linux: Secret Service (requires gnome-keyring or libsecret)
- **Organization & Project**: Stored in a config file
  - macOS: `~/Library/Application Support/fmdt/config.json`
  - Linux: `~/.config/fmdt/config.json`
  - Windows: `%APPDATA%\fmdt\config.json`

## Usage

### Interactive Mode (Default)

```bash
fmdt                           # Launch with interactive setup/branch input
fmdt --branch feature-123      # Direct branch scan
fmdt -b feature-123            # Short flag version
```

### Command Line Options

```bash
fmdt --help                    # Show help information
fmdt --version                 # Show version number
fmdt --branch <name>           # Scan for specific branch
fmdt --configure               # Reconfigure credentials
```

### Examples

```bash
# First-time use - interactive setup wizard
bunx fmdt@latest

# Scan for a specific branch
bunx fmdt@latest --branch feature-123

# Interactive branch input (after setup)
bunx fmdt@latest

# Reconfigure Azure DevOps credentials
bunx fmdt@latest --configure

# Using alias (after global install)
fmdt --branch feature-123
fmdt -b feature-123
```

### Common Use Cases

```bash
# Check merge status before release
fmdt --branch feature-new-auth

# Verify hotfix deployment
fmdt --branch hotfix-critical-bug

# Track feature across multiple repos
fmdt --branch feature-shared-component

# Quick status check with global install
fmdt -b my-feature
```

**Note**: The tool automatically scans all accessible repositories in your Azure DevOps organization and displays results only for repositories where the branch exists.

## Output

The tool displays the merge status in a clear, color-coded format:

### Single Repository Result

```
Found branch in 1 of 15 repositories

Branch: feature-123
Repository: MyRepo

Merge Status: 1/4 branches merged

Branch      Status          Date                 Author
────────────────────────────────────────────────────────
Dev         ✓ Merged        Jan 15, 10:30 AM     John Doe
QA          ✓ Merged        Jan 16, 02:15 PM     Jane Smith
Staging     ✗ Not Merged    -                    -
Master      ✗ Not Merged    -                    -
```

### Multiple Repository Results

```
Found branch in 3 of 15 repositories

Branch: feature-123
Repository: Frontend

Merge Status: 2/4 branches merged

Branch      Status          Date                 Author
────────────────────────────────────────────────────────
Dev         ✓ Merged        Jan 15, 10:30 AM     John Doe
QA          ✓ Merged        Jan 16, 02:15 PM     Jane Smith
Staging     ✗ Not Merged    -                    -
Master      ✗ Not Merged    -                    -

Branch: feature-123
Repository: Backend

Merge Status: 1/4 branches merged

Branch      Status          Date                 Author
────────────────────────────────────────────────────────
Dev         ✓ Merged        Jan 15, 11:00 AM     John Doe
QA          ✗ Not Merged    -                    -
Staging     ✗ Not Merged    -                    -
Master      ✗ Not Merged    -                    -

Branch: feature-123
Repository: API

Merge Status: 3/4 branches merged

Branch      Status          Date                 Author
────────────────────────────────────────────────────────
Dev         ✓ Merged        Jan 15, 09:45 AM     Jane Smith
QA          ✓ Merged        Jan 16, 01:00 PM     Jane Smith
Staging     ✓ Merged        Jan 17, 10:30 AM     John Doe
Master      ✗ Not Merged    -                    -
```

### Branch Not Found

```
Branch not found in any of 15 repositories
```

## Project Structure

```
fmdt/
├── src/
│   ├── services/          # Azure DevOps API integration
│   │   └── azure-devops.ts
│   ├── components/        # React Ink UI components
│   │   ├── MergeStatusDisplay.tsx
│   │   ├── LoadingScreen.tsx
│   │   ├── ErrorDisplay.tsx
│   │   └── RepositorySelector.tsx
│   ├── types/             # TypeScript type definitions
│   │   └── index.ts
│   ├── utils/             # Utility functions
│   │   ├── config.ts
│   │   └── formatters.ts
│   ├── App.tsx            # Main application
│   └── index.tsx          # CLI entry point
├── tests/                 # Unit tests
├── package.json
├── tsconfig.json
├── biome.jsonc
├── vitest.config.ts
└── README.md
```

## Development

For development setup and contribution guidelines:

### Quick Start

```bash
# Clone and setup
git clone https://github.com/treramey/fmdt.git
cd fmdt
bun install

# Development
bun run start              # Run CLI in development mode
bun run dev                # Run with watch mode
bun run build              # Build for production

# Testing
bun run test               # Run all tests
bun run test:watch         # Run tests in watch mode

# Code Quality
bun run typecheck          # TypeScript type checking
bun run check              # Biome lint/format check
bun run check:write        # Auto-fix lint/format issues
bun run knip               # Check unused dependencies

# Full CI Pipeline
bun run ci                 # Run all quality checks
```

### Technology Stack

- **Runtime**: Bun + Node.js (ESM only)
- **UI Framework**: React Ink v6 for terminal UI
- **Build Tool**: tsdown (Rolldown/Oxc-based bundler)
- **Testing**: vitest
- **Linting**: Biome v2
- **Validation**: Zod
- **State Management**: React hooks

### Code Quality Standards

This project maintains strict quality standards:

- **TypeScript** with ultra-strict configuration (no `any`, no type assertions)
- **Biome** for consistent linting and formatting
- **vitest** for comprehensive test coverage
- **knip** for dependency management

Before committing, ensure all checks pass:

```bash
bun run ci
```

## Troubleshooting

### Configuration Issues

**Setup wizard doesn't start:**
- Try running `fmdt --configure` to force the setup wizard

**Invalid PAT or Organization errors:**
- Verify your PAT has the correct scopes: Code (Read), Project and Team (Read)
- Double-check your organization name matches the URL: `https://dev.azure.com/YOUR-ORG`
- Ensure your PAT hasn't expired

**"Unable to save PAT to system keyring" error:**
- **Linux users**: Install gnome-keyring or libsecret
  ```bash
  # Ubuntu/Debian
  sudo apt-get install gnome-keyring libsecret-1-dev

  # Fedora
  sudo dnf install gnome-keyring libsecret-devel
  ```
- **macOS/Windows**: This error is rare; contact support if it occurs

### Runtime Issues

**"PAT not found in keyring" error:**
- Run `fmdt --configure` to set up your credentials again

**"Configuration file not found" error:**
- Run `fmdt --configure` to set up your credentials again

**"Failed to fetch repositories" Error:**
- Your PAT token may have expired - run `fmdt --configure` to update
- Verify you have access to the organization and project

**"Repository not found" Error:**
- Double-check the repository name (case-sensitive)
- Verify you have access to the repository
- Ensure the repository is not disabled

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes following the code quality standards
4. Run tests and quality checks (`bun run ci`)
5. Commit your changes with clear, descriptive messages
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## License

MIT License - see [LICENSE](./LICENSE) file for details

## Author

**treramey** - [trevor@trevors.email](mailto:trevor@trevors.email)

## Acknowledgments

- Built with [React Ink](https://github.com/vadimdemedes/ink) for beautiful terminal UIs
- Inspired by [ccexp](https://github.com/nyatinte/ccexp) for TUI best practices
- Secure credential storage powered by [@napi-rs/keyring](https://github.com/napi-rs/node-rs/tree/main/packages/keyring)
