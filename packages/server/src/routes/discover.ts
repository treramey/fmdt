import type { AuthStore, Provider } from '@fmdt/core';
import { ProjectSchema } from '@fmdt/core';
import { Hono } from 'hono';
import { z } from 'zod/v4';
import { getOrganizations, getProfile } from '../providers/azure-devops/api.ts';
import { createAzureDevOpsProvider } from '../providers/azure-devops/index.ts';
import { createAuthHeader as createAzureAuthHeader } from '../providers/azure-devops/utils.ts';
import { getOrgs as getGitHubOrgs, getUser } from '../providers/github/api.ts';
import { createGitHubProvider } from '../providers/github/index.ts';
import { createAuthHeader as createGitHubAuthHeader } from '../providers/github/utils.ts';
import { lazy } from '../util/lazy.ts';

const DiscoverProjectsSchema = z.object({
  provider: z.enum(['azure-devops', 'github']),
  org: z.string().min(1),
});

const DiscoverOrgsSchema = z.object({
  provider: z.enum(['azure-devops', 'github']),
});

/** Discovery routes — used during setup to probe provider APIs. */
export const createDiscoverRoutes = (authStore: AuthStore) =>
  lazy(() => {
    const app = new Hono();

    app.post('/projects', async (c) => {
      const body = await c.req.json();
      const parsed = DiscoverProjectsSchema.safeParse(body);
      if (!parsed.success) {
        return c.json({ code: 'VALIDATION_ERROR', message: parsed.error.message }, 400);
      }

      const authInfo = await authStore.get(parsed.data.provider);
      if (!authInfo) {
        return c.json({ code: 'AUTH_REQUIRED', message: `No credentials for ${parsed.data.provider}` }, 401);
      }
      if (authInfo.type !== 'pat') {
        return c.json({ code: 'AUTH_REQUIRED', message: 'PAT authentication required' }, 401);
      }

      let provider: Provider;
      if (parsed.data.provider === 'azure-devops') {
        // Reason: create a minimal provider just for listing projects — project/serverBranches aren't used
        provider = createAzureDevOpsProvider({
          org: parsed.data.org,
          project: '_discover',
          pat: authInfo.token,
          serverBranches: [],
        });
      } else {
        provider = createGitHubProvider({
          org: parsed.data.org,
          pat: authInfo.token,
          repoFilter: { type: 'all' },
          serverBranches: [],
        });
      }

      const projects = await provider.listProjects(parsed.data.org);
      return c.json(z.array(ProjectSchema).parse(projects));
    });

    app.post('/orgs', async (c) => {
      const body = await c.req.json();
      const parsed = DiscoverOrgsSchema.safeParse(body);
      if (!parsed.success) {
        return c.json({ code: 'VALIDATION_ERROR', message: parsed.error.message }, 400);
      }

      const authInfo = await authStore.get(parsed.data.provider);
      if (!authInfo) {
        return c.json({ code: 'AUTH_REQUIRED', message: `No credentials for ${parsed.data.provider}` }, 401);
      }
      if (authInfo.type !== 'pat') {
        return c.json({ code: 'AUTH_REQUIRED', message: 'PAT authentication required' }, 401);
      }

      if (parsed.data.provider === 'github') {
        const authHeader = createGitHubAuthHeader(authInfo.token);
        try {
          const [user, orgs] = await Promise.all([getUser(authHeader), getGitHubOrgs(authHeader)]);
          return c.json([user.login, ...orgs]);
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Failed to discover organizations';
          if (message.includes('401') || message.includes('403')) {
            return c.json({ code: 'AUTH_FAILED', message: 'PAT lacks permission for organization discovery.' }, 401);
          }
          return c.json({ code: 'DISCOVERY_ERROR', message }, 500);
        }
      }

      // Reason: Azure org discovery uses cross-org VSSPS APIs (app.vssps.visualstudio.com).
      // These require a global PAT. Org-scoped PATs (the default) get 401 here — that's expected,
      // so we return an empty array to trigger the TUI's manual-input fallback gracefully.
      const authHeader = createAzureAuthHeader(authInfo.token);
      try {
        const profile = await getProfile(authHeader);
        const orgs = await getOrganizations(profile.publicAlias, authHeader);
        return c.json(orgs);
      } catch {
        return c.json([]);
      }
    });

    return app;
  });
