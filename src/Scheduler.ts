import { CronCommand, CronJob } from 'cron';

class Scheduler {
  private job: CronJob;

  private callback: Function

  constructor(callback: Function) {
    if (!process.env.CRON_JOB_SCHEDULE) {
      throw new Error('CRON_JOB_SCHEDULE not set or invalid');
    }
    this.callback = callback;
    this.job = new CronJob(process.env.CRON_JOB_SCHEDULE, this.onTrigger, null, true);
  }

  onTrigger: CronCommand = () => {
    if (process.env.ENABLE_WEEKENDS && process.env.ENABLE_WEEKENDS === '1') {
      this.callback();
    } else {
      const day = new Date().getDay();
      if (day !== 6 && day !== 7) {
        this.callback();
      }
    }
  }
}

export default Scheduler;
