import { WebClient, KnownBlock } from '@slack/web-api';
import { EnrichedMergeRequest } from './JenkinsLookup';
import Logger from './Logger';

const ONE_MINUTE = 60000;
const ONE_HOUR = 3600000;
const ONE_DAY = 86400000;

const prettyAge = (dateString: string) => {
  const date = new Date(dateString).getTime();
  const now = new Date().getTime();
  const timeDiff = now - date;

  // Less than 60 seconds (60 * 1000ms = 60000ms)
  if (timeDiff < ONE_MINUTE) {
    return 'less than one minute ago';
  }
  // 60 seconds or more (60000ms) but less than 1 hour (60000ms * 60 = 3600000ms)
  if (timeDiff >= ONE_MINUTE && timeDiff < ONE_HOUR) {
    const minutesAgo = Math.floor(timeDiff / 60000);
    return minutesAgo === 1 ? `${minutesAgo} minute ago` : `${minutesAgo} minutes ago`;
  }
  // One hour or more (3600000ms) but less than 1 day (86400000ms)
  if (timeDiff >= ONE_HOUR && timeDiff < ONE_DAY) {
    const hoursAgo = Math.floor(timeDiff / (60000 * 60));
    return hoursAgo === 1 ? `${hoursAgo} hour ago` : `${hoursAgo} hours ago`;
  }
  // 1 day or more (86400000ms)
  if (timeDiff >= ONE_DAY) {
    const daysAgo = Math.floor(timeDiff / (60000 * 60 * 24));
    return daysAgo === 1 ? `${daysAgo} day ago` : `${daysAgo} days ago`;
  }
  // "Should" never happen
  return 'Unknown';
};

class SlackMessenger {
  private client: WebClient

  private channelId: string;

  constructor(client: WebClient) {
    this.client = client;
    if (!process.env.SLACK_CHANNEL_ID) {
      throw new Error('SLACK_CHANNEL_ID environment variable not set');
    }
    this.channelId = process.env.SLACK_CHANNEL_ID;
  }

  public static async initialise() {
    Logger.debug('Initialising Slack Web Client');
    if (!process.env.SLACK_BOT_OAUTH_TOKEN) {
      throw new Error('SLACK_BOT_OAUTH_TOKEN environment variable not set.');
    }
    const client = new WebClient(process.env.SLACK_BOT_OAUTH_TOKEN);
    try {
      const result = await client.auth.test();
      if (result.ok) {
        Logger.info('Successfully authenticated with Slack API', { team: result.team, teamId: result.team_id });
        const messenger = new SlackMessenger(client);
        await messenger.test();
        return messenger;
      }
      Logger.crit('Failed to authenticate with Slack API', { error: result.error });
      throw new Error('Failed to authenticate with Slack API');
    } catch (error) {
      Logger.error('Failed to authenticate with Slack API', { error });
      throw new Error('Failed to authenticate with Slack API');
    }
  }

  public async test() {
    Logger.debug('Testing Slack configuration');
    if (!process.env.SLACK_CHANNEL_ID) {
      throw new Error('SLACK_CHANNEL_ID environment variable not set');
    }
    try {
      if (process.env.NODE_ENV !== 'development') {
        await this.client.chat.postMessage({
          channel: this.channelId,
          text: '_Ignore me, this is just to check I can talk to the channel!_',
        });
        Logger.info('Successfully pinged Slack Channel', { channelId: this.channelId });
      }
      Logger.debug('Skipping Channel Ping Test', { channelId: this.channelId });
    } catch (error) {
      Logger.crit('Slack Channel ping failed', { error, channelId: this.channelId });
      throw error;
    }
  }

  private buildBaseBlocks = (mergeRequestCount: number): KnownBlock[] => [{
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: process.env.SLACK_GREETING ? `${process.env.SLACK_GREETING} There are currently *${mergeRequestCount}* open merge requests.` : `There are currently *${mergeRequestCount}* open merge requests.`,
    },
  }, { type: 'divider' }]

  private buildMessage = (mergeRequests: EnrichedMergeRequest[]): KnownBlock[] => {
    const baseBlocks = this.buildBaseBlocks(mergeRequests.length);
    mergeRequests.forEach(({ buildStatus, mergeRequest }) => {
      baseBlocks.push({
        type: 'section',
        text: { type: 'mrkdwn', text: `<${mergeRequest.web_url}|${mergeRequest.title}>${buildStatus === 'failed' ? ' :thisisfine: Failing Build :thisisfine:' : ''}${mergeRequest.merge_status === 'can_be_merged' ? '' : ' :mergemonkey: Merge Conflicts :mergemonkey:'}` },
      });
      baseBlocks.push({
        type: 'section',
        fields: [{
          type: 'mrkdwn',
          text: `*Created:* ${prettyAge(mergeRequest.created_at)}`,
        }, {
          type: 'mrkdwn',
          text: `*Author:* ${mergeRequest.author.name}`,
        }],
      });
      baseBlocks.push({ type: 'divider' });
    });
    return baseBlocks;
  }

  public async sendUpdate(mergeRequests: EnrichedMergeRequest[]) {
    Logger.verbose('Sending update to Slack Channel...', { channel: this.channelId });
    try {
      const result = await this.client.chat.postMessage({ channel: this.channelId, blocks: this.buildMessage(mergeRequests), text: '' });
      if (result.ok) {
        Logger.info('Update successfully sent to Slack Channel', { channel: this.channelId, result: result.response_metadata });
      } else {
        Logger.error('Failed to send update to Slack Channel', { error: result.error, channel: this.channelId });
        throw new Error(result.error?.toString());
      }
    } catch (error) {
      Logger.error('Failed to send update to Slack Channel', { error, channel: this.channelId });
    }
  }
}

export default SlackMessenger;
