import { injectable } from 'inversify';
import { LoggerLevels } from './types.js';
import chalk, { ColorName } from 'chalk';

const LoggerLevelsColorMap: Record<LoggerLevels, ColorName> = {
  [LoggerLevels.INFO]: 'white',
  [LoggerLevels.ERROR]: 'red',
  [LoggerLevels.WARNING]: 'yellow',
  [LoggerLevels.COMMAND]: 'gray',
  [LoggerLevels.SUCCESS]: 'green',
  [LoggerLevels.DEV]: 'cyan',
};

@injectable()
export default class LoggerService {
  public info(...messages: any[]) {
    this.stdout(LoggerLevels.INFO, ...messages);
  }

  public error(...messages: any[]) {
    this.stdout(LoggerLevels.ERROR, ...messages);
  }

  public warn(...messages: any[]) {
    this.stdout(LoggerLevels.WARNING, ...messages);
  }

  public command(...messages: any[]) {
    this.stdout(LoggerLevels.COMMAND, ...messages);
  }

  public success(...messages: any[]) {
    this.stdout(LoggerLevels.SUCCESS, ...messages);
  }

  public dev(...messages: any[]) {
    if (process.env.NODE_ENV !== 'development') {
      return;
    }
    this.stdout(LoggerLevels.DEV, ...messages);
  }

  protected stdout(level: LoggerLevels, ...messages: any[]): void {
    const header = `[${new Date().toUTCString()}] [${level}]`;
    console.log(chalk[LoggerLevelsColorMap[level]](header, ...messages));
  }
}
