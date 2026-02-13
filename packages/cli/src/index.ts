#!/usr/bin/env bun
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { boot } from './boot.ts';

await yargs(hideBin(process.argv))
  .scriptName('fmdt')
  .usage('$0 [options]')
  .command(
    '$0',
    'Start FMDT terminal UI',
    (y) =>
      y
        .option('branch', { alias: 'b', type: 'string', describe: 'Branch name to check' })
        .option('project', { alias: 'p', type: 'string', describe: 'Project name' })
        .option('configure', { alias: 'c', type: 'boolean', describe: 'Run setup wizard' }),
    async (args) => {
      await boot({
        branch: args.branch,
        project: args.project,
        configure: args.configure,
      });
    },
  )
  .help()
  .version()
  .strict()
  .parse();
