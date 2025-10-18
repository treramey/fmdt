import { render } from 'ink-testing-library';
import { describe, expect, it } from 'vitest';
import { UpdateNotification } from '../src/components/UpdateNotification.js';

describe('UpdateNotification', () => {
  it('should render alert with versions', () => {
    const { lastFrame } = render(<UpdateNotification currentVersion="1.0.0" latestVersion="1.2.0" />);

    const output = lastFrame();
    expect(output).toContain('1.0.0');
    expect(output).toContain('1.2.0');
    expect(output).toContain('A new version is available');
  });

  it('should display auto-update message', () => {
    const { lastFrame } = render(<UpdateNotification currentVersion="1.0.0" latestVersion="1.2.0" />);

    const output = lastFrame();
    expect(output).toContain('Updating automatically in the background');
  });
});
