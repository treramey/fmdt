import { AppConfigSchema, ProjectConfigSchema, ServerBranchSchema } from '@fmdt/core';
import { Hono } from 'hono';
import { describeRoute, resolver, validator } from 'hono-openapi';
import { z } from 'zod/v4';
import { defaultConfig, deleteConfig, loadConfig, saveConfig } from '../config/index.ts';
import { lazy } from '../util/lazy.ts';

export const ConfigRoutes = lazy(() =>
  new Hono()
    .get(
      '/',
      describeRoute({
        summary: 'Get app config',
        operationId: 'config.get',
        responses: {
          200: {
            description: 'Current app configuration',
            content: { 'application/json': { schema: resolver(AppConfigSchema) } },
          },
        },
      }),
      async (c) => {
        const config = (await loadConfig()) ?? defaultConfig();
        return c.json(config);
      },
    )
    .put(
      '/',
      describeRoute({
        summary: 'Update app config',
        operationId: 'config.put',
        responses: {
          200: {
            description: 'Updated config',
            content: { 'application/json': { schema: resolver(AppConfigSchema) } },
          },
        },
      }),
      validator('json', AppConfigSchema),
      async (c) => {
        const config = c.req.valid('json');
        await saveConfig(config);
        return c.json(config);
      },
    )
    .delete(
      '/',
      describeRoute({
        summary: 'Reset app config',
        operationId: 'config.delete',
        responses: {
          200: { description: 'Config deleted' },
        },
      }),
      async (c) => {
        await deleteConfig();
        return c.json({ ok: true });
      },
    )
    .get(
      '/projects',
      describeRoute({
        summary: 'List configured projects',
        operationId: 'config.projects.list',
        responses: {
          200: {
            description: 'All configured projects',
            content: { 'application/json': { schema: resolver(z.array(ProjectConfigSchema)) } },
          },
        },
      }),
      async (c) => {
        const config = (await loadConfig()) ?? defaultConfig();
        return c.json(Object.values(config.projects));
      },
    )
    .get(
      '/server-branches',
      describeRoute({
        summary: 'Get server branches for active project',
        operationId: 'config.serverBranches.get',
        responses: {
          200: {
            description: 'Server branches',
            content: { 'application/json': { schema: resolver(z.array(ServerBranchSchema)) } },
          },
          404: { description: 'No active project' },
        },
      }),
      async (c) => {
        const config = (await loadConfig()) ?? defaultConfig();
        const project = config.projects[config.activeProject];
        if (!project) return c.json({ code: 'CONFIG_NOT_FOUND', message: 'No active project' }, 404);
        return c.json(project.serverBranches);
      },
    )
    .put(
      '/server-branches',
      describeRoute({
        summary: 'Update server branches for active project',
        operationId: 'config.serverBranches.put',
        responses: {
          200: {
            description: 'Updated server branches',
            content: { 'application/json': { schema: resolver(z.array(ServerBranchSchema)) } },
          },
          404: { description: 'No active project' },
        },
      }),
      validator('json', z.array(ServerBranchSchema)),
      async (c) => {
        const branches = c.req.valid('json');
        const config = (await loadConfig()) ?? defaultConfig();
        const project = config.projects[config.activeProject];
        if (!project) return c.json({ code: 'CONFIG_NOT_FOUND', message: 'No active project' }, 404);
        project.serverBranches = branches;
        await saveConfig(config);
        return c.json(branches);
      },
    ),
);
