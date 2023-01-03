import { inject, injectable } from 'inversify';
import type { LoggerInterface } from './types.js';
import { LoggerLevels } from './types.js';
import StorageService from '../storage/storage-service.js';
import type { DeployerBehavior } from '../server/types.js';
import { COLORS } from './consts.js';

const LoggerLevelsColorMap: Record<LoggerLevels, string> = {
  [LoggerLevels.INFO]: 'white',
  [LoggerLevels.ERROR]: 'red',
  [LoggerLevels.WARNING]: 'yellow',
  [LoggerLevels.COMMAND]: 'gray',
  [LoggerLevels.SUCCESS]: 'green',
  [LoggerLevels.VERBOSE]: 'cyan',
};

@injectable()
export default class LoggerService implements LoggerInterface {
  constructor(@inject(StorageService) protected readonly storage: StorageService) {}

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

  public verbose(...messages: any[]) {
    let deployerSettings: DeployerBehavior | null = null;
    try {
      deployerSettings = this.storage.getCurrentConfig().deployer;
    } catch (e) {}

    if (deployerSettings?.showCommandLogs) {
      this.stdout(LoggerLevels.VERBOSE, ...messages);
    }
  }

  protected stdout(level: LoggerLevels, ...messages: any[]): void {
    const colorKey = LoggerLevelsColorMap[level];
    const header = `${COLORS[colorKey]}[${new Date().toUTCString()}] [${level}]`;
    console.log(header, ...messages, COLORS.reset);
  }
}
