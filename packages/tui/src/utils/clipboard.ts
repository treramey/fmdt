import { platform } from 'node:os';

/** Cross-platform clipboard copy using native commands. */
export async function copyToClipboard(text: string): Promise<void> {
  const os = platform();

  if (os === 'darwin') {
    const escaped = text.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const proc = Bun.spawn(['osascript', '-e', `set the clipboard to "${escaped}"`], {
      stdout: 'ignore',
      stderr: 'ignore',
    });
    await proc.exited;
    return;
  }

  if (os === 'linux') {
    // Reason: Prefer Wayland clipboard, fall back to X11 xclip/xsel
    const tool = process.env.WAYLAND_DISPLAY ? Bun.which('wl-copy') : (Bun.which('xclip') ?? Bun.which('xsel'));

    if (tool) {
      const args = tool.endsWith('xclip')
        ? ['xclip', '-selection', 'clipboard']
        : tool.endsWith('xsel')
          ? ['xsel', '--clipboard', '--input']
          : ['wl-copy'];

      const proc = Bun.spawn(args, { stdin: 'pipe', stdout: 'ignore', stderr: 'ignore' });
      proc.stdin.write(text);
      proc.stdin.end();
      await proc.exited;
      return;
    }
  }

  if (os === 'win32') {
    const escaped = text.replace(/"/g, '""');
    const proc = Bun.spawn(['powershell', '-command', `Set-Clipboard -Value "${escaped}"`], {
      stdout: 'ignore',
      stderr: 'ignore',
    });
    await proc.exited;
    return;
  }
}

/** Write text to terminal clipboard via OSC 52 escape sequence. Tmux-aware. */
export function writeOsc52(text: string, write: (data: string) => void): void {
  const base64 = Buffer.from(text).toString('base64');
  const osc52 = `\x1b]52;c;${base64}\x07`;
  // Reason: Tmux requires wrapping OSC 52 in a DCS passthrough sequence
  const final = process.env.TMUX ? `\x1bPtmux;\x1b${osc52}\x1b\\` : osc52;
  write(final);
}
