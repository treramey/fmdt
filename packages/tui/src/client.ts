import type { ZodType } from 'zod/v4';

export interface ClientConfig {
  baseUrl: string;
  fetch?: typeof fetch | undefined;
}

/** GET JSON, validate with Zod schema. */
export async function fetchJSON<T>(config: ClientConfig, path: string, schema: ZodType<T>): Promise<T> {
  const fetchFn = config.fetch ?? globalThis.fetch;
  const res = await fetchFn(`${config.baseUrl}${path}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  const json = await res.json();
  return schema.parse(json);
}

/** POST JSON, validate response with Zod schema. */
export async function postJSON<T>(config: ClientConfig, path: string, body: unknown, schema: ZodType<T>): Promise<T> {
  const fetchFn = config.fetch ?? globalThis.fetch;
  const res = await fetchFn(`${config.baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  const json = await res.json();
  return schema.parse(json);
}

/** PUT JSON, validate response with Zod schema. */
export async function putJSON<T>(config: ClientConfig, path: string, body: unknown, schema: ZodType<T>): Promise<T> {
  const fetchFn = config.fetch ?? globalThis.fetch;
  const res = await fetchFn(`${config.baseUrl}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  const json = await res.json();
  return schema.parse(json);
}
