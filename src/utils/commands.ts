import type { CommandDefinition, Suggestion } from '../types/branch-input.js';

export const commandDefinitions: readonly CommandDefinition[] = [
  {
    trigger: '/project',
    aliases: ['project', 'switch-project', 'change-project'],
    description: 'Switch the active project',
  },
];

export function normalizeCommandInput(command: string): string {
  const raw = command.startsWith('/') ? command.slice(1) : command;
  return raw.trim().toLowerCase();
}

export function buildCommandSuggestions(input: string): Suggestion[] {
  const normalized = normalizeCommandInput(input);

  if (input.trim() === '/') {
    return commandDefinitions.map((definition) => ({
      kind: 'command',
      value: definition.trigger,
      description: definition.description,
    }));
  }

  const matches = commandDefinitions.filter((definition) =>
    definition.aliases.some((alias) => alias.startsWith(normalized)),
  );

  if (matches.length > 0) {
    return matches.map((definition) => ({
      kind: 'command',
      value: definition.trigger,
      description: definition.description,
    }));
  }

  return [
    {
      kind: 'unknown',
      value: input,
      message: `Unknown command: ${input}`,
    },
  ];
}

export function findCommandDefinition(command: string): CommandDefinition | undefined {
  const normalized = normalizeCommandInput(command);
  return commandDefinitions.find((definition) =>
    definition.aliases.some((alias) => alias === normalized),
  );
}
