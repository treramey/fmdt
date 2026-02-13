import { ASCII_ART, colors } from '../theme.ts';

export function Header() {
  return (
    <box paddingLeft={2} paddingTop={1}>
      <text fg={colors.iris}>{ASCII_ART}</text>
    </box>
  );
}
