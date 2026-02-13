import { type AppConfig, AppConfigSchema, type ProjectConfig } from '@fmdt/core';
import { useKeyboard, useRenderer, useSelectionHandler } from '@opentui/solid';
import { createSignal, For, Match, onMount, Show, Switch } from 'solid-js';
import type { ClientConfig } from './client.ts';
import { fetchJSON } from './client.ts';
import { ErrorView } from './components/error.tsx';
import { Footer } from './components/footer.tsx';
import { Header } from './components/header.tsx';
import { Loading } from './components/loading.tsx';
import type { AppStatus } from './store/index.ts';
import { colors } from './theme.ts';
import { copyToClipboard, writeOsc52 } from './utils/clipboard.ts';
import { BranchReportView } from './views/branch-report.tsx';
import { EnvReportView } from './views/env-report.tsx';
import { SetupWizard } from './views/setup.tsx';

type ViewMode = 'branch' | 'environment';

export interface AppProps {
  url: string;
  fetchFn?: typeof fetch | undefined;
  onExit?: (() => Promise<void>) | undefined;
  /** If true, skip config check and go straight to setup. */
  configure?: boolean | undefined;
  /** Override active project by name. */
  project?: string | undefined;
  /** Subscribe to server bus events for scan progress. */
  onBusEvent?: ((handler: (event: unknown) => void) => () => void) | undefined;
}

export function App(props: AppProps) {
  const renderer = useRenderer();

  // Reason: Wire console overlay copy (Ctrl+Y) → OSC 52 + system clipboard
  renderer.console.onCopySelection = (text: string) => {
    if (!text) return;
    writeOsc52(text, (data) => process.stdout.write(data));
    copyToClipboard(text).catch(() => {});
    renderer.clearSelection();
  };

  // Reason: Auto-copy on selection finish (mouse release after drag)
  useSelectionHandler((selection) => {
    const text = selection.getSelectedText();
    if (text && text.length > 0) {
      writeOsc52(text, (data) => process.stdout.write(data));
      copyToClipboard(text).catch(() => {});
      renderer.clearSelection();
    }
  });

  const [status, setStatus] = createSignal<AppStatus>('loading');
  const [message, setMessage] = createSignal('');
  const [activeProject, setActiveProject] = createSignal('');
  const [viewMode, setViewMode] = createSignal<ViewMode>('branch');
  const [showProjectPicker, setShowProjectPicker] = createSignal(false);
  const [projectList, setProjectList] = createSignal<{ id: string; config: ProjectConfig }[]>([]);
  const [pickerIndex, setPickerIndex] = createSignal(0);

  const client: ClientConfig = {
    baseUrl: props.url,
    fetch: props.fetchFn,
  };

  useKeyboard((key) => {
    if (key.ctrl && key.name === 'c') {
      key.preventDefault();
      props.onExit?.().then(() => renderer.destroy());
    }

    // Reason: Project picker intercepts keys when open
    if (showProjectPicker()) {
      if (key.name === 'escape') {
        key.preventDefault();
        setShowProjectPicker(false);
      } else if (key.name === 'up') {
        key.preventDefault();
        setPickerIndex((i) => Math.max(0, i - 1));
      } else if (key.name === 'down') {
        key.preventDefault();
        setPickerIndex((i) => Math.min(projectList().length - 1, i + 1));
      } else if (key.name === 'return') {
        key.preventDefault();
        const selected = projectList()[pickerIndex()];
        if (selected) {
          setActiveProject(selected.id);
          setShowProjectPicker(false);
        }
      }
      return;
    }

    if (status() === 'ready' && key.name === 'tab') {
      key.preventDefault();
      setViewMode((m) => (m === 'branch' ? 'environment' : 'branch'));
    }
    // Reason: 'p' opens project picker when multiple projects configured
    if (status() === 'ready' && key.name === 'p') {
      key.preventDefault();
      openProjectPicker();
    }
  });

  function handleConfigLoaded(cfg: AppConfig) {
    if (Object.keys(cfg.projects).length === 0) {
      setMessage('No projects configured.');
      setStatus('needsSetup');
      return;
    }

    // Reason: --project flag overrides activeProject by matching on project name
    let projectId = cfg.activeProject;
    const projectOverride = props.project;
    if (projectOverride) {
      const match = Object.entries(cfg.projects).find(
        ([, p]) => p.name.toLowerCase() === projectOverride.toLowerCase(),
      );
      if (match) {
        projectId = match[0];
      } else {
        setMessage(`Project "${projectOverride}" not found.`);
        setStatus('error');
        return;
      }
    }

    const project = cfg.projects[projectId];
    if (!project) {
      setMessage('No projects configured.');
      setStatus('needsSetup');
      return;
    }
    setActiveProject(projectId);
    setStatus('ready');
  }

  onMount(async () => {
    if (props.configure) {
      // Reason: --configure resets config before re-running setup
      const deleteFn = client.fetch ?? globalThis.fetch;
      try {
        await deleteFn(`${client.baseUrl}/config`, { method: 'DELETE' });
      } catch {
        // Reason: Ignore delete errors — proceed to setup regardless
      }
      setStatus('needsSetup');
      return;
    }

    try {
      const cfg = await fetchJSON(client, '/config', AppConfigSchema);
      handleConfigLoaded(cfg);
    } catch {
      setStatus('needsSetup');
    }
  });

  async function openProjectPicker() {
    try {
      const cfg = await fetchJSON(client, '/config', AppConfigSchema);
      const entries = Object.entries(cfg.projects).map(([id, config]) => ({ id, config }));
      if (entries.length <= 1) return;
      setProjectList(entries);
      const currentIdx = entries.findIndex((e) => e.id === activeProject());
      setPickerIndex(currentIdx >= 0 ? currentIdx : 0);
      setShowProjectPicker(true);
    } catch {
      // Reason: Non-critical — silently ignore if config can't be loaded
    }
  }

  async function handleSetupComplete() {
    setStatus('loading');
    try {
      const cfg = await fetchJSON(client, '/config', AppConfigSchema);
      handleConfigLoaded(cfg);
    } catch {
      setMessage('Failed to load config after setup.');
      setStatus('error');
    }
  }

  return (
    <box width="100%" height="100%" backgroundColor={colors.base} flexDirection="column">
      <Header />
      <box flexGrow={1} paddingLeft={2} paddingRight={2}>
        <Show when={showProjectPicker()}>
          <box flexDirection="column" gap={1}>
            <text fg={colors.iris}>Switch project:</text>
            <box flexDirection="column">
              <For each={projectList()}>
                {(entry, i) => (
                  <text fg={i() === pickerIndex() ? colors.iris : colors.subtle}>
                    {i() === pickerIndex() ? '> ' : '  '}
                    {entry.config.name}
                    {entry.id === activeProject() ? ' (active)' : ''}
                  </text>
                )}
              </For>
            </box>
            <text fg={colors.muted}>enter to select, esc to cancel</text>
          </box>
        </Show>
        <Show when={!showProjectPicker()}>
          <Switch>
            <Match when={status() === 'loading'}>
              <Loading message="Initializing..." />
            </Match>
            <Match when={status() === 'needsSetup'}>
              <SetupWizard client={client} onComplete={handleSetupComplete} />
            </Match>
            <Match when={status() === 'ready' && viewMode() === 'branch'}>
              <BranchReportView client={client} projectId={activeProject()} onBusEvent={props.onBusEvent} />
            </Match>
            <Match when={status() === 'ready' && viewMode() === 'environment'}>
              <EnvReportView client={client} projectId={activeProject()} onBusEvent={props.onBusEvent} />
            </Match>
            <Match when={status() === 'error'}>
              <ErrorView message={message()} />
            </Match>
          </Switch>
        </Show>
      </box>
      <Footer />
    </box>
  );
}
