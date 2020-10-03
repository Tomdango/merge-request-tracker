import { createLogger, format, transports } from 'winston';

const Logger = createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: format.combine(
    format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss',
    }),
    format.errors({ stack: true }),
    format.splat(),
    format.json(),
  ),
  defaultMeta: { service: 'merge-request-tracker' },
  transports: [
    new transports.File({ filename: 'logs/merge-request-tracker-error.log', level: 'error' }),
    new transports.File({ filename: 'logs/merge-request-tracker-combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  Logger.add(new transports.Console({
    format: format.combine(
      format.colorize(),
      format.simple(),
    ),
  }));
}

export default Logger;
