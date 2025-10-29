export type CommandDefinition = {
  readonly trigger: string;
  readonly aliases: readonly string[];
  readonly description: string;
};

export type Suggestion =
  | {
      readonly kind: 'branch';
      readonly value: string;
    }
  | {
      readonly kind: 'command';
      readonly value: string;
      readonly description: string;
    }
  | {
      readonly kind: 'unknown';
      readonly value: string;
      readonly message: string;
    };
