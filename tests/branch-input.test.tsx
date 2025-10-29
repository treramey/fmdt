import { render } from 'ink-testing-library';
import { describe, expect, test, vi } from 'vitest';
import { BranchInput } from '../src/components/BranchInput/index.js';

const waitForRender = (): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, 0);
  });

describe('BranchInput slash commands', () => {
  test('should show and execute command suggestion when submitting /project', async () => {
    const onSubmit = vi.fn();
    const onSwitchProject = vi.fn();

    const { stdin, lastFrame } = render(
      <BranchInput onSubmit={onSubmit} onSwitchProject={onSwitchProject} initialValue="/" />,
    );

    await waitForRender();

    expect(lastFrame()).toContain('/project');
    expect(lastFrame()).toContain('Switch the active project');

    stdin.write('\u001B[B');
    await waitForRender();

    stdin.write('\r');
    await waitForRender();

    expect(onSwitchProject).not.toHaveBeenCalled();

    stdin.write('\r');
    await waitForRender();

    expect(onSwitchProject).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test('should display feedback and suggestion for unknown slash command', async () => {
    const onSubmit = vi.fn();

    const { stdin, lastFrame } = render(<BranchInput onSubmit={onSubmit} initialValue="/unknown" />);

    await waitForRender();
    expect(lastFrame()).toContain('Unknown command: /unknown');

    stdin.write('\r');
    await waitForRender();

    expect(lastFrame()).toContain('Unknown command: /unknown');
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
