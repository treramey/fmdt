/** Azure DevOps Basic auth header from PAT. */
export function createAuthHeader(pat: string): string {
  const credentials = Buffer.from(`:${pat}`).toString('base64');
  return `Basic ${credentials}`;
}

/** Extract Jira-style work item IDs from branch name. E.g. `LAAIR-1548-fix` → `["LAAIR-1548"]` */
export function extractWorkItemIds(branchName: string): string[] {
  const match = branchName.match(/^([A-Z]+-\d+)/);
  const id = match?.[1];
  return id ? [id] : [];
}

const PAGE_SIZE = 101;

/** Paginated fetch helper for Azure DevOps list APIs. */
export async function fetchPaginated<T>(url: string, authHeader: string): Promise<T[]> {
  const items: T[] = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const separator = url.includes('?') ? '&' : '?';
    const pagedUrl = `${url}${separator}$skip=${page * PAGE_SIZE}&$top=${PAGE_SIZE}`;

    const response = await fetch(pagedUrl, {
      headers: { Authorization: authHeader, Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Azure DevOps API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as { value: T[]; count: number };
    items.push(...data.value);
    hasMore = data.value.length === PAGE_SIZE;
    page++;
  }

  return items;
}
