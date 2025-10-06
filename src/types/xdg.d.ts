declare module '@folder/xdg' {
  interface XdgPaths {
    cache: string;
    config: string;
    data: string;
    state: string;
    runtime: string;
    logs: string;
    config_dirs: string[];
    data_dirs: string[];
  }

  interface XdgOptions {
    platform?: string;
    env?: NodeJS.ProcessEnv;
    subdir?: string;
    homedir?: string;
    tempdir?: string;
    expanded?: boolean;
  }

  function xdg(options?: XdgOptions): XdgPaths;

  export = xdg;
}
