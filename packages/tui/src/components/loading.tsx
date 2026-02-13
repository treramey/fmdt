import { colors } from '../theme.ts';

export function Loading(props: { message: string }) {
  return <text fg={colors.subtle}>{props.message}</text>;
}
