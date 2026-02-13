declare module '@folder/xdg' {
  interface XdgPaths {
    cache: string;
    config: string;
    data: string;
    runtime: string;
    state: string;
  }
  export default function xdg(): XdgPaths;
}
