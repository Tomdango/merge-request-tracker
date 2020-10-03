import Axios from 'axios';
import { MergeRequest } from './GitlabHandler';
import Logger from './Logger';

export type BuildStatus= 'failed' | 'unstable' | 'successful' | 'unknown'

const colourMap: Record<string, BuildStatus> = {
  red: 'failed',
  yellow: 'unstable',
  blue: 'successful',
};

export type EnrichedMergeRequest = {
  mergeRequest: MergeRequest;
  buildStatus: BuildStatus
}

const buildJenkinsUrl = (branchName: string) => `${process.env.JENKINS_HOST}${encodeURIComponent(branchName)}/api/json`;

const getBuildStatusForBranch = async (branchName: string): Promise<BuildStatus> => {
  try {
    const result = await Axios.get(buildJenkinsUrl(branchName));
    Logger.debug('Retrieved build status for branch', { color: result.data.color, branchName });
    return colourMap[result.data.color] || 'unknown';
  } catch (error) {
    Logger.error('Failed to retrieve build status for branch', { branchName });
    return 'unknown';
  }
};

export const enrichWithBuildInfo = async (
  mergeRequests: MergeRequest[],
): Promise<EnrichedMergeRequest[]> => Promise.all(mergeRequests.map(async (mergeRequest) => ({
  mergeRequest,
  buildStatus: await getBuildStatusForBranch(mergeRequest.source_branch),
})));
