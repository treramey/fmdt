import { type BranchMergeStatus, BranchMergeStatusSchema } from '@fmdt/core';
import { useKeyboard, usePaste } from '@opentui/solid';
import { createSignal, For, Match, onCleanup, onMount, Show, Switch } from 'solid-js';
import { z } from 'zod/v4';
import type { ClientConfig } from '../client.ts';
import { fetchJSON, postJSON } from '../client.ts';
import { colors, semantic } from '../theme.ts';
import { formatDateShort } from '../utils/formatters.ts';

// --- Branch report state machine ---

type ReportState =
  | { step: 'input' }
  | { step: 'loading'; branch: string }
  | { step: 'results'; branch: string; results: BranchMergeStatus[] }
  | { step: 'error'; branch: string; message: string };

export interface BranchReportProps {
  client: ClientConfig;
  projectId: string;
  onBusEvent?: ((handler: (event: unknown) => void) => () => void) | undefined;
}

export function BranchReportView(props: BranchReportProps) {
  const [state, setState] = createSignal<ReportState>({ step: 'input' });
  const [inputValue, setInputValue] = createSignal('');
  const [history, setHistory] = createSignal<string[]>([]);
  // Reason: -1 means "not browsing history"; 0..n indexes into history()
  const [historyIndex, setHistoryIndex] = createSignal(-1);
  const [savedInput, setSavedInput] = createSignal('');
  const [scanProgress, setScanProgress] = createSignal('');

  onMount(async () => {
    try {
      const entries = await fetchJSON(props.client, '/history', z.array(z.string()));
      setHistory(entries);
    } catch {
      // Reason: History is non-critical — silently ignore failures
    }
  });

  // Reason: Subscribe to bus events for real-time scan progress
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

  // Reason: Terminal paste events bypass useKeyboard (bracketed paste mode)
  usePaste((event) => {
    if (state().step === 'input') {
      event.preventDefault();
      const text = event.text.replace(/[\r\n]/g, '');
      if (text.length > 0) {
        setHistoryIndex(-1);
        setInputValue((v) => v + text);
      }
    }
  });

  useKeyboard((key) => {
    const current = state();

    if (current.step === 'input') {
      if (key.name === 'return') {
        key.preventDefault();
        const branch = inputValue().trim();
        if (branch.length > 0) {
          handleSubmit(branch);
        }
      } else if (key.name === 'up') {
        key.preventDefault();
        const h = history();
        if (h.length === 0) return;
        const idx = historyIndex();
        if (idx === -1) {
          const first = h[0];
          if (first === undefined) return;
          setSavedInput(inputValue());
          setHistoryIndex(0);
          setInputValue(first);
        } else if (idx < h.length - 1) {
          const next = idx + 1;
          const entry = h[next];
          if (entry === undefined) return;
          setHistoryIndex(next);
          setInputValue(entry);
        }
      } else if (key.name === 'down') {
        key.preventDefault();
        const idx = historyIndex();
        if (idx === -1) return;
        if (idx === 0) {
          setHistoryIndex(-1);
          setInputValue(savedInput());
        } else {
          const next = idx - 1;
          const entry = history()[next];
          if (entry === undefined) return;
          setHistoryIndex(next);
          setInputValue(entry);
        }
      } else if (key.name === 'backspace') {
        key.preventDefault();
        setHistoryIndex(-1);
        setInputValue((v) => v.slice(0, -1));
      } else if (key.name.length === 1 && !key.ctrl && !key.meta) {
        key.preventDefault();
        setHistoryIndex(-1);
        setInputValue((v) => v + key.name);
      }
      return;
    }

    if (current.step === 'results') {
      if (key.name === 'escape' || key.name === 'q') {
        key.preventDefault();
        setState({ step: 'input' });
        setInputValue('');
      }
      return;
    }

    if (current.step === 'error') {
      if (key.name === 'escape' || key.name === 'return') {
        key.preventDefault();
        setState({ step: 'input' });
      }
    }
  });

  async function handleSubmit(branch: string) {
    setState({ step: 'loading', branch });
    setHistoryIndex(-1);
    setScanProgress('');

    try {
      const results = await postJSON(
        props.client,
        '/report/branch',
        { branch, projectId: props.projectId },
        z.array(BranchMergeStatusSchema),
      );
      setState({ step: 'results', branch, results });

      // Reason: Fire-and-forget — don't block UI on history save
      postJSON(props.client, '/history', { entry: branch }, z.array(z.string()))
        .then((updated) => setHistory(updated))
        .catch(() => {});
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setState({ step: 'error', branch, message });
    }
  }

  return (
    <box flexDirection="column" gap={1}>
      <Switch>
        <Match when={state().step === 'input'}>
          <text fg={colors.iris}>Enter branch name:</text>
          <text fg={colors.text}>
            {'> '}
            {inputValue()}
            {'█'}
          </text>
          <text fg={colors.muted}>enter to search | up/down for history</text>
        </Match>

        <Match when={state().step === 'loading'}>
          {(() => {
            const s = state();
            if (s.step !== 'loading') return null;
            return (
              <box flexDirection="column">
                <text fg={colors.subtle}>Scanning repositories for {s.branch}...</text>
                <Show when={scanProgress().length > 0}>
                  <text fg={colors.muted}>{scanProgress()}</text>
                </Show>
              </box>
            );
          })()}
        </Match>

        <Match when={state().step === 'results'}>
          {(() => {
            const s = state();
            if (s.step !== 'results') return null;
            return (
              <box flexDirection="column" gap={1}>
                <text fg={colors.iris}>Results for: {s.branch}</text>
                <Show
                  when={s.results.length > 0}
                  fallback={<text fg={colors.subtle}>No repositories found with this branch.</text>}
                >
                  <For each={s.results}>{(repo) => <MergeStatusRow repo={repo} />}</For>
                </Show>
                <text fg={colors.muted}>esc/q to search again, arrows to scroll</text>
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
                <text fg={colors.muted}>press esc or enter to try again</text>
              </box>
            );
          })()}
        </Match>
      </Switch>
    </box>
  );
}

// --- Merge status row for a single repository ---

function MergeStatusRow(props: { repo: BranchMergeStatus }) {
  return (
    <box flexDirection="column">
      <text fg={colors.text}>{props.repo.repository}</text>
      <box flexDirection="column" paddingLeft={2}>
        <For each={props.repo.environments}>
          {(env) => (
            <box flexDirection="row" gap={1}>
              <text fg={colors.subtle} width={14}>
                {env.name}
              </text>
              <text fg={env.merged ? semantic.success : semantic.error} width={14}>
                {env.merged ? 'Merged' : 'Not Merged'}
              </text>
              <text fg={colors.muted} width={20}>
                {env.mergeDate ? formatDateShort(env.mergeDate) : '-'}
              </text>
              <text fg={colors.muted}>{env.mergedBy ?? '-'}</text>
            </box>
          )}
        </For>
      </box>
    </box>
  );
}
