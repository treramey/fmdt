import { colors, semantic } from '../theme.ts';

export function ErrorView(props: { message: string }) {
  return (
    <box flexDirection="column" gap={1}>
      <text fg={semantic.error}>Error</text>
      <text fg={colors.text}>{props.message}</text>
    </box>
  );
}
