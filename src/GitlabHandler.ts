/* eslint-disable camelcase */
import { Gitlab } from '@gitbeaker/node';
import Logger from './Logger';

export interface Author {
  id: number;
  name: string;
  username: string;
  state: string;
  avatar_url: string;
  web_url: string;
}

export interface TimeStats {
  time_estimate: number;
  total_time_spent: number;
  human_time_estimate: null;
  human_total_time_spent: null;
}

export interface MergeRequest {
  id: number;
  iid: number;
  project_id: number;
  title: string;
  description: string;
  state: string;
  created_at: string;
  updated_at: string;
  merged_by: null;
  merged_at: null;
  closed_by: null;
  closed_at: null;
  target_branch: string;
  source_branch: string;
  upvotes: number;
  downvotes: number;
  author: Author;
  assignee: null;
  source_project_id: number;
  target_project_id: number;
  labels: any[];
  work_in_progress: boolean;
  milestone: null;
  merge_when_pipeline_succeeds: boolean;
  merge_status: string;
  sha: string;
  merge_commit_sha: null;
  user_notes_count: number;
  discussion_locked: null;
  should_remove_source_branch: null;
  force_remove_source_branch: boolean;
  web_url: string;
  time_stats: TimeStats;
  squash: boolean;
}

type RequestConfig = {
  projectId: string;
  wip: 'no',
  state: 'opened',
  with_merge_status_recheck: true
}

class GitlabHandler {
  private api: InstanceType<typeof Gitlab>;

  private projectId: string;

  constructor() {
    this.api = new Gitlab({
      host: 'http://git.spine2.ncrs.nhs.uk',
      token: process.env.GIT_ACCESS_TOKEN,
    });
    if (!process.env.GITLAB_PROJECT_ID) {
      throw new Error('GITLAB_PROJECT_ID environment variable not set');
    }
    this.projectId = process.env.GITLAB_PROJECT_ID;
  }

  private getRequestConfig(): RequestConfig {
    return {
      projectId: this.projectId,
      wip: 'no',
      state: 'opened',
      with_merge_status_recheck: true,
    };
  }

  public async getOpenMergeRequests(): Promise<MergeRequest[]> {
    Logger.verbose('Retriving Merge Requests', { projectId: this.projectId });
    const mergeRequests = await this.api.MergeRequests.all(this.getRequestConfig());
    Logger.info('Merge Requests Retrieved from Gitlab', { count: mergeRequests.length, projectId: this.projectId });
    return mergeRequests as unknown as Promise<MergeRequest[]>;
  }
}

export default GitlabHandler;
