# fmdt (Feature Merge Detection Tool)

A CLI tool for checking if a branch has been merged into feature branches (dev, qa, staging, master) in Azure DevOps.

## Features

- 🔍 Automatically scan all repositories for a branch across your organization
- 🎨 Beautiful terminal UI powered by React Ink
- ⚡ Fast parallel scanning using Azure DevOps API
- 📊 Clear visual display of merge history with dates and authors
- 🚀 Display results only for repositories containing the branch
- 🛠️ TypeScript for type safety
- ✅ Comprehensive test coverage

## Prerequisites

- Node.js ≥ 20.19.3
- Bun (recommended) or npm/pnpm
- Azure DevOps Personal Access Token (PAT)
- Azure DevOps organization and project access

## Installation

### From Source

```bash
# Clone the repository
git clone <repository-url>
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

### Basic Usage

```bash
# First run - interactive setup wizard
fmdt

# Scan all repositories for a branch
fmdt --branch feature-123

# Using short flags
fmdt -b feature-123

# Reconfigure credentials
fmdt --configure

# Interactive mode - will prompt for branch name (if already configured)
fmdt
```

**Note**: The tool automatically scans all accessible repositories in your Azure DevOps organization and displays results only for repositories where the branch exists.

### Development Mode

```bash
# Run in development mode with hot reload
bun run dev -- --branch feature-123

# Or directly with bun
bun run start -- --branch feature-123
```

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

### Available Scripts

```bash
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

### Running Tests

```bash
# Run tests once
bun run test

# Run tests in watch mode
bun run test:watch

# Run specific test file
CI=true vitest run tests/formatters.test.ts
```

### Code Quality

This project uses:

- **TypeScript** with ultra-strict configuration
- **Biome** for linting and formatting
- **vitest** for testing
- **knip** for unused dependency detection

Before committing, ensure all checks pass:

```bash
bun run ci
```

## Architecture

### Technology Stack

- **Runtime**: Bun + Node.js (ESM only)
- **UI Framework**: React Ink v6 for terminal UI
- **Build Tool**: tsdown (Rolldown/Oxc-based bundler)
- **Testing**: vitest
- **Linting**: Biome v2
- **Validation**: Zod

### Key Design Patterns

- **Service Layer**: Azure DevOps API integration abstracted into service class
- **Component-Based UI**: React Ink components for modular, testable UI
- **Type Safety**: Strict TypeScript configuration with Zod runtime validation
- **State Management**: React hooks for UI state
- **Functional Programming**: Utility functions for data transformation

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

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests and quality checks (`bun run ci`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## License

MIT

## Author

TRamey

## Acknowledgments

- Built with [React Ink](https://github.com/vadimdemedes/ink)
- Inspired by [ccexp](https://github.com/nyatinte/ccexp) for TUI best practices
- Business logic derived from LAAIRDevOps Azure DevOps integration patterns
