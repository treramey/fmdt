import {
  type AppConfig,
  AppConfigSchema,
  DEFAULT_SERVER_BRANCHES,
  type Project,
  ProjectSchema,
  type ProviderType,
  type ServerBranch,
} from '@fmdt/core';
import { useKeyboard, usePaste } from '@opentui/solid';
import { createMemo, createSignal, For, Match, Show, Switch } from 'solid-js';
import { z } from 'zod/v4';
import type { ClientConfig } from '../client.ts';
import { fetchJSON, postJSON, putJSON } from '../client.ts';
import { colors, semantic } from '../theme.ts';

// --- Setup wizard state machine (discriminated union) ---

type SetupStep =
  | { step: 'selectProvider' }
  | { step: 'inputPat'; provider: ProviderType }
  | { step: 'fetchingOrgs'; provider: ProviderType; pat: string }
  | { step: 'selectOrg'; provider: ProviderType; pat: string; orgs: string[] }
  | { step: 'inputOrg'; provider: ProviderType; pat: string; fallbackHint?: string | undefined }
  | { step: 'validating'; provider: ProviderType; pat: string; org: string }
  | { step: 'selectProject'; provider: ProviderType; pat: string; org: string; projects: Project[] }
  | {
      step: 'editBranches';
      provider: ProviderType;
      org: string;
      project: Project;
      branches: ServerBranch[];
      editingIndex: number;
    }
  | { step: 'saving' }
  | { step: 'complete' }
  | { step: 'error'; message: string; canRetry: boolean };

export interface SetupProps {
  client: ClientConfig;
  onComplete: () => void;
}

export function SetupWizard(props: SetupProps) {
  const [state, setState] = createSignal<SetupStep>({ step: 'selectProvider' });
  const [inputValue, setInputValue] = createSignal('');
  const [selectedIndex, setSelectedIndex] = createSignal(0);
  const [filterText, setFilterText] = createSignal('');
  const [filtering, setFiltering] = createSignal(false);

  // Reason: Derived filtered project list — case-insensitive substring match
  const filteredProjects = createMemo(() => {
    const s = state();
    if (s.step !== 'selectProject') return [];
    const q = filterText().toLowerCase();
    if (q.length === 0) return s.projects;
    return s.projects.filter((p) => p.name.toLowerCase().includes(q));
  });

  const providers: { id: ProviderType; label: string }[] = [
    { id: 'azure-devops', label: 'Azure DevOps' },
    { id: 'github', label: 'GitHub' },
  ];

  // Reason: Terminal paste events bypass useKeyboard (bracketed paste mode)
  usePaste((event) => {
    const current = state();
    if (
      current.step === 'inputPat' ||
      current.step === 'inputOrg' ||
      (current.step === 'editBranches' && current.editingIndex >= 0)
    ) {
      event.preventDefault();
      // Reason: Strip newlines — these inputs are single-line
      const text = event.text.replace(/[\r\n]/g, '');
      if (text.length > 0) {
        setInputValue((v) => v + text);
      }
    }
  });

  useKeyboard((key) => {
    const current = state();

    if (current.step === 'selectProvider') {
      if (key.name === 'up') {
        key.preventDefault();
        setSelectedIndex((i) => Math.max(0, i - 1));
      } else if (key.name === 'down') {
        key.preventDefault();
        setSelectedIndex((i) => Math.min(providers.length - 1, i + 1));
      } else if (key.name === 'return') {
        key.preventDefault();
        const provider = providers[selectedIndex()];
        if (provider) {
          setState({ step: 'inputPat', provider: provider.id });
          setInputValue('');
        }
      }
      return;
    }

    if (current.step === 'inputPat') {
      if (key.name === 'return') {
        key.preventDefault();
        const val = inputValue().trim();
        if (val.length > 0) {
          handleFetchOrgs(current.provider, val);
        }
      } else if (key.name === 'backspace') {
        key.preventDefault();
        setInputValue((v) => v.slice(0, -1));
      } else if (key.name === 'escape') {
        key.preventDefault();
        setState({ step: 'selectProvider' });
        setSelectedIndex(0);
      } else if (key.name.length === 1 && !key.ctrl && !key.meta) {
        key.preventDefault();
        setInputValue((v) => v + key.name);
      }
      return;
    }

    if (current.step === 'inputOrg') {
      if (key.name === 'return') {
        key.preventDefault();
        const val = inputValue().trim();
        if (val.length > 0) {
          handleOrgSubmit(current.provider, current.pat, val);
        }
      } else if (key.name === 'backspace') {
        key.preventDefault();
        setInputValue((v) => v.slice(0, -1));
      } else if (key.name === 'escape') {
        key.preventDefault();
        setState({ step: 'inputPat', provider: current.provider });
        setInputValue('');
      } else if (key.name.length === 1 && !key.ctrl && !key.meta) {
        key.preventDefault();
        setInputValue((v) => v + key.name);
      }
      return;
    }

    if (current.step === 'selectOrg') {
      // Reason: Last item is "Other (enter manually)" — orgs.length is the index for it
      const itemCount = current.orgs.length + 1;
      if (key.name === 'up') {
        key.preventDefault();
        setSelectedIndex((i) => Math.max(0, i - 1));
      } else if (key.name === 'down') {
        key.preventDefault();
        setSelectedIndex((i) => Math.min(itemCount - 1, i + 1));
      } else if (key.name === 'return') {
        key.preventDefault();
        if (selectedIndex() === current.orgs.length) {
          // "Other" selected — fall back to manual input
          setState({ step: 'inputOrg', provider: current.provider, pat: current.pat });
          setInputValue('');
        } else {
          const org = current.orgs[selectedIndex()];
          if (org) {
            handleOrgSubmit(current.provider, current.pat, org);
          }
        }
      } else if (key.name === 'escape') {
        key.preventDefault();
        setState({ step: 'inputPat', provider: current.provider });
        setInputValue('');
      }
      return;
    }

    if (current.step === 'selectProject') {
      if (filtering()) {
        if (key.name === 'escape') {
          key.preventDefault();
          setFiltering(false);
          setFilterText('');
          setSelectedIndex(0);
        } else if (key.name === 'backspace') {
          key.preventDefault();
          setFilterText((v) => v.slice(0, -1));
          setSelectedIndex(0);
        } else if (key.name === 'return') {
          key.preventDefault();
          const filtered = filteredProjects();
          const project = filtered[selectedIndex()];
          if (project) {
            setFiltering(false);
            setFilterText('');
            handleProjectSelect(current.provider, current.org, project);
          }
        } else if (key.name === 'up') {
          key.preventDefault();
          setSelectedIndex((i) => Math.max(0, i - 1));
        } else if (key.name === 'down') {
          key.preventDefault();
          setSelectedIndex((i) => Math.min(filteredProjects().length - 1, i + 1));
        } else if (key.name.length === 1 && !key.ctrl && !key.meta) {
          key.preventDefault();
          setFilterText((v) => v + key.name);
          setSelectedIndex(0);
        }
      } else {
        if (key.name === '/') {
          key.preventDefault();
          setFiltering(true);
          setFilterText('');
          setSelectedIndex(0);
        } else if (key.name === 'up') {
          key.preventDefault();
          setSelectedIndex((i) => Math.max(0, i - 1));
        } else if (key.name === 'down') {
          key.preventDefault();
          setSelectedIndex((i) => Math.min(current.projects.length - 1, i + 1));
        } else if (key.name === 'return') {
          key.preventDefault();
          const project = current.projects[selectedIndex()];
          if (project) {
            handleProjectSelect(current.provider, current.org, project);
          }
        } else if (key.name === 'escape') {
          key.preventDefault();
          setState({ step: 'inputOrg', provider: current.provider, pat: current.pat });
          setInputValue(current.org);
        }
      }
      return;
    }

    if (current.step === 'editBranches') {
      if (current.editingIndex >= 0) {
        // Reason: Inline editing a branch name/branch pair
        if (key.name === 'return') {
          key.preventDefault();
          const val = inputValue().trim();
          if (val.length > 0) {
            const parts = val.split('/');
            const name = parts[0] ?? val;
            const branch = parts[1] ?? name.toLowerCase();
            const updated = [...current.branches];
            const idx = current.editingIndex;
            updated[idx] = { name, branch, order: idx };
            setState({ ...current, branches: updated, editingIndex: -1 });
            setInputValue('');
          }
        } else if (key.name === 'escape') {
          key.preventDefault();
          setState({ ...current, editingIndex: -1 });
          setInputValue('');
        } else if (key.name === 'backspace') {
          key.preventDefault();
          setInputValue((v) => v.slice(0, -1));
        } else if (key.name.length === 1 && !key.ctrl && !key.meta) {
          key.preventDefault();
          setInputValue((v) => v + key.name);
        }
      } else {
        if (key.name === 'up') {
          key.preventDefault();
          setSelectedIndex((i) => Math.max(0, i - 1));
        } else if (key.name === 'down') {
          key.preventDefault();
          setSelectedIndex((i) => Math.min(current.branches.length - 1, i + 1));
        } else if (key.name === 'd') {
          key.preventDefault();
          if (current.branches.length > 1) {
            const updated = current.branches.filter((_, i) => i !== selectedIndex());
            // Reason: Re-index order after deletion
            const reindexed = updated.map((b, i) => ({ ...b, order: i }));
            setState({ ...current, branches: reindexed });
            setSelectedIndex((i) => Math.min(i, reindexed.length - 1));
          }
        } else if (key.name === 'a') {
          key.preventDefault();
          const idx = current.branches.length;
          const updated = [...current.branches, { name: 'New', branch: 'new', order: idx }];
          setState({ ...current, branches: updated, editingIndex: idx });
          setInputValue('New/new');
        } else if (key.name === 'e') {
          key.preventDefault();
          const branch = current.branches[selectedIndex()];
          if (branch) {
            setState({ ...current, editingIndex: selectedIndex() });
            setInputValue(`${branch.name}/${branch.branch}`);
          }
        } else if (key.name === 'return') {
          key.preventDefault();
          handleSaveConfig(current.provider, current.org, current.project, current.branches);
        } else if (key.name === 'escape') {
          key.preventDefault();
          setState({ step: 'selectProvider' });
          setSelectedIndex(0);
        }
      }
      return;
    }

    if (current.step === 'error' && current.canRetry) {
      if (key.name === 'return') {
        key.preventDefault();
        setState({ step: 'selectProvider' });
        setSelectedIndex(0);
        setInputValue('');
      }
    }
  });

  async function handleFetchOrgs(provider: ProviderType, pat: string) {
    setState({ step: 'fetchingOrgs', provider, pat });

    try {
      // Reason: Save PAT first so the discover/orgs route can read it from auth store
      await putJSON(props.client, `/auth/${provider}`, { type: 'pat', token: pat }, z.object({ ok: z.literal(true) }));

      const orgs = await postJSON(props.client, '/discover/orgs', { provider }, z.array(z.string()));

      if (orgs.length === 0) {
        const hint =
          provider === 'azure-devops'
            ? 'Org-scoped PAT detected — enter your organization name'
            : 'No organizations found';
        setState({ step: 'inputOrg', provider, pat, fallbackHint: hint });
        setInputValue('');
        return;
      }

      setSelectedIndex(0);
      setState({ step: 'selectOrg', provider, pat, orgs });
    } catch (err) {
      // Reason: Org-scoped PATs or missing permissions — graceful fallback to manual entry
      const hint = err instanceof Error ? err.message : 'Could not auto-detect organizations';
      setState({ step: 'inputOrg', provider, pat, fallbackHint: hint });
      setInputValue('');
    }
  }

  async function handleOrgSubmit(provider: ProviderType, pat: string, org: string) {
    setState({ step: 'validating', provider, pat, org });

    try {
      // Reason: Save PAT to auth store first so discover route can use it
      await putJSON(props.client, `/auth/${provider}`, { type: 'pat', token: pat }, z.object({ ok: z.literal(true) }));

      const projects = await postJSON(props.client, '/discover/projects', { provider, org }, z.array(ProjectSchema));

      if (projects.length === 0) {
        setState({ step: 'error', message: 'No projects found in this organization.', canRetry: true });
        return;
      }

      setSelectedIndex(0);
      setState({ step: 'selectProject', provider, pat, org, projects });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setState({ step: 'error', message, canRetry: true });
    }
  }

  function handleProjectSelect(provider: ProviderType, org: string, project: Project) {
    setSelectedIndex(0);
    setState({
      step: 'editBranches',
      provider,
      org,
      project,
      branches: [...DEFAULT_SERVER_BRANCHES],
      editingIndex: -1,
    });
  }

  async function handleSaveConfig(provider: ProviderType, org: string, project: Project, branches: ServerBranch[]) {
    setState({ step: 'saving' });

    try {
      const projectId = `${provider}:${org}:${project.name}`;
      const now = new Date().toISOString();

      const existing = await fetchJSON(props.client, '/config', AppConfigSchema).catch(() => null);

      const config: AppConfig = {
        version: existing?.version ?? '2.0.0',
        autoUpdate: existing?.autoUpdate ?? true,
        activeProject: projectId,
        projects: {
          ...existing?.projects,
          [projectId]: {
            id: projectId,
            name: project.name,
            ref:
              provider === 'azure-devops'
                ? { provider: 'azure-devops', org, project: project.name }
                : { provider: 'github', org, repoFilter: { type: 'all' } },
            serverBranches: branches,
            createdAt: now,
          },
        },
      };

      await putJSON(props.client, '/config', config, AppConfigSchema);

      setState({ step: 'complete' });
      setTimeout(() => props.onComplete(), 800);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save configuration';
      setState({ step: 'error', message, canRetry: false });
    }
  }

  return (
    <box flexDirection="column" gap={1}>
      <Switch>
        <Match when={state().step === 'selectProvider'}>
          <text fg={colors.iris}>Select a provider:</text>
          <box flexDirection="column">
            <For each={providers}>
              {(p, i) => (
                <text fg={i() === selectedIndex() ? colors.iris : colors.subtle}>
                  {i() === selectedIndex() ? '> ' : '  '}
                  {p.label}
                </text>
              )}
            </For>
          </box>
          <text fg={colors.muted}>arrow keys to navigate, enter to select</text>
        </Match>

        <Match when={state().step === 'inputPat'}>
          <text fg={colors.iris}>Enter Personal Access Token:</text>
          <text fg={colors.text}>
            {'> '}
            {'*'.repeat(inputValue().length)}
            {'█'}
          </text>
          <text fg={colors.muted}>enter to submit, esc to go back</text>
        </Match>

        <Match when={state().step === 'fetchingOrgs'}>
          <text fg={colors.subtle}>Fetching organizations...</text>
        </Match>

        <Match when={state().step === 'selectOrg'}>
          {(() => {
            const s = state();
            if (s.step !== 'selectOrg') return null;
            return (
              <>
                <text fg={colors.iris}>Select an organization:</text>
                <box flexDirection="column">
                  <For each={s.orgs}>
                    {(org, i) => (
                      <text fg={i() === selectedIndex() ? colors.iris : colors.subtle}>
                        {i() === selectedIndex() ? '> ' : '  '}
                        {org}
                      </text>
                    )}
                  </For>
                  <text fg={s.orgs.length === selectedIndex() ? colors.iris : colors.subtle}>
                    {s.orgs.length === selectedIndex() ? '> ' : '  '}
                    Other (enter manually)
                  </text>
                </box>
                <text fg={colors.muted}>arrow keys to navigate, enter to select, esc to go back</text>
              </>
            );
          })()}
        </Match>

        <Match when={state().step === 'inputOrg'}>
          {(() => {
            const s = state();
            if (s.step !== 'inputOrg') return null;
            return s.fallbackHint ? <text fg={colors.muted}>{s.fallbackHint}</text> : null;
          })()}
          <text fg={colors.iris}>Enter organization name:</text>
          <text fg={colors.text}>
            {'> '}
            {inputValue()}
            {'█'}
          </text>
          <text fg={colors.muted}>enter to submit, esc to go back</text>
        </Match>

        <Match when={state().step === 'validating'}>
          <text fg={colors.subtle}>Validating credentials and fetching projects...</text>
        </Match>

        <Match when={state().step === 'selectProject'}>
          {(() => {
            const s = state();
            if (s.step !== 'selectProject') return null;
            const items = filtering() ? filteredProjects() : s.projects;
            return (
              <>
                <text fg={colors.iris}>Select a project:</text>
                <Show when={filtering()}>
                  <text fg={colors.text}>
                    {'/ '}
                    {filterText()}
                    {'█'}
                  </text>
                </Show>
                <box flexDirection="column">
                  <For each={items}>
                    {(p, i) => (
                      <text fg={i() === selectedIndex() ? colors.iris : colors.subtle}>
                        {i() === selectedIndex() ? '> ' : '  '}
                        {p.name}
                      </text>
                    )}
                  </For>
                  <Show when={filtering() && items.length === 0}>
                    <text fg={colors.muted}> No matches</text>
                  </Show>
                </box>
                <text fg={colors.muted}>
                  {filtering()
                    ? 'type to filter, enter to select, esc to clear'
                    : 'arrow keys to navigate, enter to select, / to filter, esc to go back'}
                </text>
              </>
            );
          })()}
        </Match>

        <Match when={state().step === 'editBranches'}>
          {(() => {
            const s = state();
            if (s.step !== 'editBranches') return null;
            return (
              <box flexDirection="column" gap={1}>
                <text fg={colors.iris}>Configure server branches:</text>
                <box flexDirection="column">
                  <For each={s.branches}>
                    {(b, i) => (
                      <text fg={i() === selectedIndex() ? colors.iris : colors.subtle}>
                        {i() === selectedIndex() ? '> ' : '  '}
                        {s.editingIndex === i() ? `${inputValue()}█` : `${b.name} (${b.branch})`}
                      </text>
                    )}
                  </For>
                </box>
                <text fg={colors.muted}>
                  {s.editingIndex >= 0
                    ? 'enter to save (Name/branch), esc to cancel'
                    : 'a:add  d:delete  e:edit  enter:confirm  esc:back'}
                </text>
              </box>
            );
          })()}
        </Match>

        <Match when={state().step === 'saving'}>
          <text fg={colors.subtle}>Saving configuration...</text>
        </Match>

        <Match when={state().step === 'complete'}>
          <text fg={semantic.success}>Configuration saved successfully!</text>
        </Match>

        <Match when={state().step === 'error'}>
          {(() => {
            const s = state();
            if (s.step !== 'error') return null;
            return (
              <box flexDirection="column" gap={1}>
                <text fg={semantic.error}>Error: {s.message}</text>
                {s.canRetry ? <text fg={colors.muted}>press enter to retry</text> : null}
              </box>
            );
          })()}
        </Match>
      </Switch>
    </box>
  );
}
