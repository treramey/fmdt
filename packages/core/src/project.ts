import { z } from 'zod/v4';
import { ProjectRefSchema, ProviderTypeSchema } from './provider.ts';

// --- Project ---

export const ProjectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  provider: ProviderTypeSchema,
});
export type Project = z.infer<typeof ProjectSchema>;

// --- Repository ---

export const RepositorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  defaultBranch: z.string(),
  disabled: z.boolean(),
});
export type Repository = z.infer<typeof RepositorySchema>;

// --- Server Branch ---

export const ServerBranchSchema = z.object({
  name: z.string().min(1),
  branch: z.string().min(1),
  order: z.number().int().min(0),
});
export type ServerBranch = z.infer<typeof ServerBranchSchema>;

/** Default server branches for new projects */
export const DEFAULT_SERVER_BRANCHES: ServerBranch[] = [
  { name: 'Dev', branch: 'dev', order: 0 },
  { name: 'QA', branch: 'qa', order: 1 },
  { name: 'Staging', branch: 'staging', order: 2 },
  { name: 'Production', branch: 'master', order: 3 },
];

// --- Project Config ---

export const ProjectConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  ref: ProjectRefSchema,
  serverBranches: z.array(ServerBranchSchema),
  createdAt: z.string(),
});
export type ProjectConfig = z.infer<typeof ProjectConfigSchema>;

// --- App Config ---

export const AppConfigSchema = z.object({
  version: z.string(),
  autoUpdate: z.boolean(),
  activeProject: z.string(),
  projects: z.record(z.string(), ProjectConfigSchema),
});
export type AppConfig = z.infer<typeof AppConfigSchema>;
