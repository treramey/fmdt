import { z } from 'zod/v4';

// --- Provider Type ---

export const ProviderTypeSchema = z.enum(['azure-devops', 'github']);
export type ProviderType = z.infer<typeof ProviderTypeSchema>;

// --- Repo Filter (GitHub-specific) ---

export const RepoFilterAllSchema = z.object({
  type: z.literal('all'),
});

export const RepoFilterSelectedSchema = z.object({
  type: z.literal('selected'),
  repos: z.array(z.string().min(1)),
});

export const RepoFilterPatternSchema = z.object({
  type: z.literal('pattern'),
  include: z.array(z.string().min(1)),
});

export const RepoFilterTopicSchema = z.object({
  type: z.literal('topic'),
  topics: z.array(z.string().min(1)),
});

export const RepoFilterSchema = z.discriminatedUnion('type', [
  RepoFilterAllSchema,
  RepoFilterSelectedSchema,
  RepoFilterPatternSchema,
  RepoFilterTopicSchema,
]);
export type RepoFilter = z.infer<typeof RepoFilterSchema>;

// --- Project Reference (provider-specific) ---

export const AzureDevOpsProjectRefSchema = z.object({
  provider: z.literal('azure-devops'),
  org: z.string().min(1),
  project: z.string().min(1),
});

export const GitHubProjectRefSchema = z.object({
  provider: z.literal('github'),
  org: z.string().min(1),
  repoFilter: RepoFilterSchema,
});

export const ProjectRefSchema = z.discriminatedUnion('provider', [AzureDevOpsProjectRefSchema, GitHubProjectRefSchema]);
export type ProjectRef = z.infer<typeof ProjectRefSchema>;

// --- Provider Interface ---

import type { Project, Repository } from './project.ts';
import type { BranchMergeStatus, BranchReportRequest, EnvironmentReport, EnvReportRequest } from './report.ts';

export interface Provider {
  readonly type: ProviderType;
  listOrgs(): Promise<string[]>;
  listProjects(org: string): Promise<Project[]>;
  listRepositories(ref: ProjectRef): Promise<Repository[]>;
  getBranchMergeStatus(opts: BranchReportRequest): Promise<BranchMergeStatus[]>;
  getEnvironmentReport(opts: EnvReportRequest): Promise<EnvironmentReport>;
  validateCredentials(): Promise<boolean>;
}
