import { type EnvironmentReport, EnvironmentReportSchema } from '@fmdt/core';
import { useKeyboard } from '@opentui/solid';
import { createSignal, For, Match, onCleanup, Show, Switch } from 'solid-js';
import type { ClientConfig } from '../client.ts';
import { postJSON } from '../client.ts';
import { colors, semantic } from '../theme.ts';
import { formatDateShort, truncate } from '../utils/formatters.ts';

// --- Env report state machine ---

type EnvReportState =
  | { step: 'loading' }
  | { step: 'display'; report: EnvironmentReport; tabIndex: number }
  | { step: 'error'; message: string };

export interface EnvReportProps {
  client: ClientConfig;
  projectId: string;
  onBusEvent?: ((handler: (event: unknown) => void) => () => void) | undefined;
}

export function EnvReportView(props: EnvReportProps) {
  const [state, setState] = createSignal<EnvReportState>({ step: 'loading' });
  const [scanProgress, setScanProgress] = createSignal('');

  // Reason: Subscribe to bus events for scan progress
  if (props.onBusEvent) {
    const unsub = props.onBusEvent((event) => {
      if (state().step !== 'loading') return;
      const e = event as { type?: string; properties?: Record<string, unknown> };
      if (e.type === 'scan.repo.complete') {
        const repo = e.properties?.repo;
        const index = e.properties?.index;
        if (typeof repo === 'string' && typeof index === 'number') {
          setScanProgress(`Scanned ${repo} (${index + 1})...`);
        }
      }
    });
    onCleanup(unsub);
  }

  // Reason: Fetch report on mount
  void fetchReport();

  async function fetchReport() {
    setScanProgress('');
    try {
      const report = await postJSON(
        props.client,
        '/report/environment',
        { projectId: props.projectId },
        EnvironmentReportSchema,
      );
      setState({ step: 'display', report, tabIndex: 0 });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setState({ step: 'error', message });
    }
  }

  useKeyboard((key) => {
    const current = state();

    if (current.step === 'display') {
      const envCount = current.report.environments.length;
      if (key.name === 'left' || key.name === 'h') {
        key.preventDefault();
        setState({ ...current, tabIndex: Math.max(0, current.tabIndex - 1) });
      } else if (key.name === 'right' || key.name === 'l') {
        key.preventDefault();
        setState({ ...current, tabIndex: Math.min(envCount - 1, current.tabIndex + 1) });
      } else if (key.name === 'r') {
        key.preventDefault();
        setState({ step: 'loading' });
        void fetchReport();
      }
      return;
    }

    if (current.step === 'error') {
      if (key.name === 'return' || key.name === 'r') {
        key.preventDefault();
        setState({ step: 'loading' });
        void fetchReport();
      }
    }
  });

  return (
    <box flexDirection="column" gap={1}>
      <Switch>
        <Match when={state().step === 'loading'}>
          <box flexDirection="column">
            <text fg={colors.subtle}>Loading environment report...</text>
            <Show when={scanProgress().length > 0}>
              <text fg={colors.muted}>{scanProgress()}</text>
            </Show>
          </box>
        </Match>

        <Match when={state().step === 'display'}>
          {(() => {
            const s = state();
            if (s.step !== 'display') return null;
            const env = s.report.environments[s.tabIndex];
            if (!env) return <text fg={colors.subtle}>No environments configured.</text>;
            return (
              <box flexDirection="column" gap={1}>
                {/* Tab bar */}
                <box flexDirection="row" gap={2}>
                  <For each={s.report.environments}>
                    {(e, i) => (
                      <text fg={i() === s.tabIndex ? colors.iris : colors.muted}>
                        {i() === s.tabIndex ? `[${e.name}]` : ` ${e.name} `}
                      </text>
                    )}
                  </For>
                </box>

                {/* Environment detail */}
                <text fg={colors.text}>
                  {env.name} ({env.branch})
                </text>

                <For each={env.repositories}>
                  {(repo) => (
                    <box flexDirection="column" paddingLeft={1}>
                      <text fg={colors.rose}>{repo.repository}</text>

                      <Show when={repo.mergedPRs.length > 0}>
                        <text fg={colors.subtle}>Merged PRs:</text>
                        <For each={repo.mergedPRs}>
                          {(pr) => (
                            <text fg={colors.text} paddingLeft={2}>
                              #{pr.id} {truncate(pr.title, 40)} ({formatDateShort(pr.mergedDate)})
                            </text>
                          )}
                        </For>
                      </Show>

                      <Show when={repo.commitsAhead.length > 0}>
                        <text fg={colors.subtle}>Commits ahead: {repo.commitsAhead.length}</text>
                      </Show>

                      <Show when={repo.openPRs.length > 0}>
                        <text fg={colors.subtle}>Open PRs:</text>
                        <For each={repo.openPRs}>
                          {(pr) => (
                            <text fg={colors.gold} paddingLeft={2}>
                              #{pr.id} {truncate(pr.title, 40)} by {pr.author}
                            </text>
                          )}
                        </For>
                      </Show>

                      <Show when={repo.workItems.length > 0}>
                        <text fg={colors.subtle}>Work Items:</text>
                        <For each={repo.workItems}>
                          {(wi) => (
                            <text fg={colors.foam} paddingLeft={2}>
                              {wi.id} → {wi.environments.join(', ')}
                            </text>
                          )}
                        </For>
                      </Show>
                    </box>
                  )}
                </For>

                <text fg={colors.muted}>left/right to switch tabs, r to refresh</text>
              </box>
            );
          })()}
        </Match>

        <Match when={state().step === 'error'}>
          {(() => {
            const s = state();
            if (s.step !== 'error') return null;
            return (
              <box flexDirection="column" gap={1}>
                <text fg={semantic.error}>Error: {s.message}</text>
                <text fg={colors.muted}>press r or enter to retry</text>
              </box>
            );
          })()}
        </Match>
      </Switch>
    </box>
  );
}
