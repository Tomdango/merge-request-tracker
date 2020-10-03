import { config } from 'dotenv';
import GitlabHandler from './GitlabHandler';
import { enrichWithBuildInfo } from './JenkinsLookup';
import CronScheduler from './CronScheduler';
import SlackMessenger from './SlackMessenger';
import Logger from './Logger';

const appCallback = (gitlab: GitlabHandler, slack: SlackMessenger) => async () => {
  const mergeRequests = await gitlab.getOpenMergeRequests();
  const mergeRequestsWithBuildInfo = await enrichWithBuildInfo(mergeRequests);
  await slack.sendUpdate(mergeRequestsWithBuildInfo);
};

const bootstrapApplication = async () => {
  Logger.info('Bootstapping application...');
  const slack = await SlackMessenger.initialise();
  const gitlab = new GitlabHandler();
  const scheduler = new CronScheduler(appCallback(gitlab, slack));
  Logger.info('Scheduler Initialised', { schedule: scheduler.schedule, nextDate: scheduler.nextDate });
};

if (require.main === module) {
  config();
  bootstrapApplication();
}
