import { render } from '@opentui/solid';
import type { AppProps } from './app.tsx';
import { App } from './app.tsx';
import { copyToClipboard } from './utils/clipboard.ts';

export type { AppProps } from './app.tsx';
export type { ClientConfig } from './client.ts';
export { fetchJSON, postJSON, putJSON } from './client.ts';
export type { AppStatus } from './store/index.ts';
export { ASCII_ART, colors, semantic } from './theme.ts';

export type BusEventSubscriber = (handler: (event: unknown) => void) => () => void;

export interface TuiConfig {
  url: string;
  fetch?: typeof fetch | undefined;
  onExit?: (() => Promise<void>) | undefined;
  configure?: boolean | undefined;
  project?: string | undefined;
  onBusEvent?: BusEventSubscriber | undefined;
}

/** Start the FMDT TUI. Returns a promise that resolves when the user exits. */
export function startTui(config: TuiConfig): Promise<void> {
  return new Promise<void>((resolve) => {
    const props: AppProps = {
      url: config.url,
      fetchFn: config.fetch,
      configure: config.configure,
      project: config.project,
      onBusEvent: config.onBusEvent,
      onExit: async () => {
        await config.onExit?.();
        resolve();
      },
    };

    render(() => <App {...props} />, {
      targetFps: 60,
      exitOnCtrlC: false,
      autoFocus: false,
      consoleOptions: {
        keyBindings: [{ name: 'y', ctrl: true, action: 'copy-selection' as const }],
        onCopySelection: (text) => {
          copyToClipboard(text).catch(() => {});
        },
      },
    });
  });
}
