/** GitHub Bearer auth header from PAT. */
export function createAuthHeader(pat: string): string {
  return `Bearer ${pat}`;
}

/** Extract Jira-style work item IDs from branch name. E.g. `LAAIR-1548-fix` → `["LAAIR-1548"]` */
export function extractWorkItemIds(branchName: string): string[] {
  const match = branchName.match(/^([A-Z]+-\d+)/);
  const id = match?.[1];
  return id ? [id] : [];
}

/** Parse GitHub Link header for pagination. Returns URL for `rel="next"` or null. */
export function parseLinkHeader(header: string | null): string | null {
  if (!header) return null;
  const match = header.match(/<([^>]+)>;\s*rel="next"/);
  return match?.[1] ?? null;
}

/** Paginated fetch helper for GitHub list APIs using Link header. */
export async function fetchPaginated<T>(url: string, authHeader: string): Promise<T[]> {
  const items: T[] = [];
  let nextUrl: string | null = url.includes('per_page=') ? url : `${url}${url.includes('?') ? '&' : '?'}per_page=100`;

  while (nextUrl) {
    const response = await fetch(nextUrl, {
      headers: {
        Authorization: authHeader,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as T[];
    items.push(...data);
    nextUrl = parseLinkHeader(response.headers.get('Link'));
  }

  return items;
}
