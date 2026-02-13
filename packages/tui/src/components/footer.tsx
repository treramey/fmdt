import { colors } from '../theme.ts';

export function Footer() {
  return (
    <box flexDirection="row" paddingLeft={2} paddingBottom={1} gap={2}>
      <text fg={colors.muted}>ctrl+c </text>
      <text fg={colors.subtle}>quit</text>
      <text fg={colors.muted}>tab </text>
      <text fg={colors.subtle}>switch view</text>
      <text fg={colors.muted}>p </text>
      <text fg={colors.subtle}>project</text>
    </box>
  );
}
