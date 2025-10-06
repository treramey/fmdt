#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { program } from 'commander';
import { render } from 'ink';
import { App } from './App.js';
import { CliOptionsSchema } from './types/index.js';
import { deletePatFromKeyring, getConfigFilePath } from './utils/config.js';

// Load package.json in ESM
const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8')) as { version: string };

// CLI configuration
program
  .name('fmdt')
  .description('CLI tool for checking if a branch has been merged into feature branches (dev, qa, staging, master)')
  .version(packageJson.version)
  .option('-b, --branch <branch>', 'branch name to check')
  .option('-r, --repository <repository>', 'repository name (optional)')
  .option('-c, --configure', 'Run configuration setup')
  .option('--reset', 'Clear all configuration and exit')
  .parse();

const rawOptions = program.opts();
const options = CliOptionsSchema.parse(rawOptions);

// Handle --reset flag: delete config and exit
if (options.reset) {
  console.log('🧹 Clearing configuration...');

  await deletePatFromKeyring();

  try {
    const configPath = getConfigFilePath();
    await rm(configPath, { force: true });
    console.log('✓ Config file removed');
  } catch {
    console.log('ℹ  Config file not found (already clean)');
  }

  console.log('✓ PAT removed from keychain');
  console.log('✅ Configuration cleared successfully!');
  console.log('');
  console.log('Run fmdt again to set up a new configuration.');

  process.exit(0);
}

// Handle --configure flag: delete existing config and trigger setup
if (options.configure) {
  // Delete existing PAT from keyring and config file
  await deletePatFromKeyring();

  try {
    const configPath = getConfigFilePath();
    await rm(configPath, { force: true });
  } catch {
    // Config file might not exist, that's OK
  }

  // Clear branch option to ensure setup runs
  options.branch = undefined;
}

// Render React app
render(<App cliOptions={options} />);
