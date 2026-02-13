import { z } from 'zod/v4';

// --- Branch Report ---

export const BranchReportRequestSchema = z.object({
  branch: z.string().min(1),
  projectId: z.string().min(1),
  repositoryId: z.string().optional(),
});
export type BranchReportRequest = z.infer<typeof BranchReportRequestSchema>;

export const EnvironmentStatusSchema = z.object({
  name: z.string(),
  branch: z.string(),
  merged: z.boolean(),
  mergeDate: z.string().nullable(),
  mergedBy: z.string().nullable(),
  verified: z.boolean(),
});
export type EnvironmentStatus = z.infer<typeof EnvironmentStatusSchema>;

export const BranchMergeStatusSchema = z.object({
  branch: z.string(),
  repository: z.string(),
  environments: z.array(EnvironmentStatusSchema),
});
export type BranchMergeStatus = z.infer<typeof BranchMergeStatusSchema>;

// --- Environment Report ---

export const EnvReportRequestSchema = z.object({
  projectId: z.string().min(1),
  environments: z.array(z.string()).optional(),
});
export type EnvReportRequest = z.infer<typeof EnvReportRequestSchema>;

export const MergedPRSchema = z.object({
  id: z.number(),
  title: z.string(),
  sourceBranch: z.string(),
  mergedDate: z.string(),
  mergedBy: z.string(),
  workItemIds: z.array(z.string()),
});
export type MergedPR = z.infer<typeof MergedPRSchema>;

export const CommitSummarySchema = z.object({
  sha: z.string(),
  message: z.string(),
  author: z.string(),
  date: z.string(),
});
export type CommitSummary = z.infer<typeof CommitSummarySchema>;

export const OpenPRSchema = z.object({
  id: z.number(),
  title: z.string(),
  sourceBranch: z.string(),
  author: z.string(),
  createdDate: z.string(),
});
export type OpenPR = z.infer<typeof OpenPRSchema>;

export const WorkItemStatusSchema = z.object({
  id: z.string(),
  branches: z.array(z.string()),
  environments: z.array(z.string()),
});
export type WorkItemStatus = z.infer<typeof WorkItemStatusSchema>;

export const RepoEnvironmentDetailSchema = z.object({
  repository: z.string(),
  mergedPRs: z.array(MergedPRSchema),
  commitsAhead: z.array(CommitSummarySchema),
  openPRs: z.array(OpenPRSchema),
  workItems: z.array(WorkItemStatusSchema),
});
export type RepoEnvironmentDetail = z.infer<typeof RepoEnvironmentDetailSchema>;

export const EnvironmentDetailSchema = z.object({
  name: z.string(),
  branch: z.string(),
  repositories: z.array(RepoEnvironmentDetailSchema),
});
export type EnvironmentDetail = z.infer<typeof EnvironmentDetailSchema>;

export const EnvironmentReportSchema = z.object({
  project: z.string(),
  environments: z.array(EnvironmentDetailSchema),
});
export type EnvironmentReport = z.infer<typeof EnvironmentReportSchema>;
