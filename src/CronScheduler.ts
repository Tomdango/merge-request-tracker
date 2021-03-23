import { Moment } from 'moment';
import { CronJob } from 'cron';
import Logger from './Logger';

class CronScheduler {
    private job: CronJob;

    public schedule: string;

    public nextDate: Moment;

    private timerCallback: () => Promise<void>;

    constructor(timerCallback: () => Promise<void>) {
      if (!process.env.CRON_JOB_SCHEDULE) {
        throw new Error('CRON_JOB_SCHEDULE not set or invalid');
      }
      this.schedule = process.env.CRON_JOB_SCHEDULE;
      this.timerCallback = timerCallback;
      this.job = new CronJob(process.env.CRON_JOB_SCHEDULE, this.onTrigger, null, true);
      this.nextDate = this.job.nextDate();
    }

    private safeCallback = async () => {
      try {
        await this.timerCallback();
      } catch (error) {
        Logger.error('Timer callback failed', { error });
      }
    }

    private onTrigger = async () => {
      Logger.debug('Cron Job Triggered', { schedule: this.schedule });
      if (process.env.ENABLE_WEEKENDS && process.env.ENABLE_WEEKENDS === '1') {
        Logger.info('Triggering Job (Weekend Mode Enabled)');
        await this.safeCallback();
        Logger.info('Job Completed Successfully');
      } else {
        const day = new Date().getDay();
        if (day !== 6 && day !== 0) { // Sunday = 0 , Saturday = 6
          Logger.info('Triggering Job');
          await this.safeCallback();
          Logger.info('Job Completed Successfully');
        } else {
          Logger.info('Skipping Job (Weekend Rule)');
        }
      }
      this.nextDate = this.job.nextDate();
      Logger.info('Next Trigger Scheduled', { nextDate: this.nextDate });
    }
}

export default CronScheduler;
