import { api } from './api';

export interface GitLabRepo {
  id: number;
  name: string;
  fullName: string;
  private: boolean;
  defaultBranch: string;
}

export interface GitLabStatus {
  connected: boolean;
  provider?: string;
}

export interface GitLabFile {
  path: string;
  sha: string;
  size: number;
}

export interface GitLabFileContent {
  path: string;
  sha: string;
  size: number;
  content: string;
}

export interface MRComment {
  id: number;
  type: 'review' | 'issue';
  body: string;
  user: { login: string; avatarUrl: string };
  path: string | null;
  line: number | null;
  createdAt: string;
  updatedAt: string;
}

export const gitlabService = {
  getAuthUrl: () => api.get<{ url: string }>('/gitlab/auth'),
  getStatus: () => api.get<GitLabStatus>('/gitlab/status'),
  listRepos: () => api.get<GitLabRepo[]>('/gitlab/repos'),
  listBranches: (projectId: string) =>
    api.get<{ branches: string[] }>(`/gitlab/projects/${encodeURIComponent(projectId)}/branches`),
  disconnect: () => api.delete('/gitlab/disconnect'),
  getRepoTree: (projectId: string, branch?: string) =>
    api.get<{ tree: GitLabFile[] }>(
      `/gitlab/projects/${encodeURIComponent(projectId)}/tree${branch ? `?branch=${branch}` : ''}`,
    ),
  getFileContents: (projectId: string, path: string, branch?: string) =>
    api.get<GitLabFileContent>(
      `/gitlab/projects/${encodeURIComponent(projectId)}/contents?path=${encodeURIComponent(path)}${branch ? `&branch=${branch}` : ''}`,
    ),
  getMRComments: (projectId: string, mrIid: number) =>
    api.get<{ comments: MRComment[] }>(
      `/gitlab/projects/${encodeURIComponent(projectId)}/merge_requests/${mrIid}/notes`,
    ),
  addMRComment: (
    projectId: string,
    mrIid: number,
    comment: { body: string; path?: string; line?: number },
  ) =>
    api.post<{ id: number; body: string; createdAt: string }>(
      `/gitlab/projects/${encodeURIComponent(projectId)}/merge_requests/${mrIid}/notes`,
      comment,
    ),
};
