import { inject, injectable } from 'inversify';
import OsOperationsService from '../os-operations/os-operations-service.js';
import LoggerService from '../logger/logger-service.js';
import type { VSCServiceInterface } from './types.js';
import type { LoggerInterface } from '../logger/types.js';

@injectable()
export default class GitService implements VSCServiceInterface {
  constructor(
    @inject(OsOperationsService) protected readonly osOperationsService: OsOperationsService,
    @inject(LoggerService) protected readonly logger: LoggerInterface,
  ) {}

  public async fetchFiles(remoteRepo: string, branch: string, localPath: string): Promise<void> {
    await this.osOperationsService.createDirectory(localPath);
    this.log(`repo url: ${remoteRepo}`);
    await this.osOperationsService.execute(`git clone -b ${branch} --single-branch ${remoteRepo} .`, localPath);
    this.log(`use branch "${branch}"`);
  }

  protected log(...messages: any[]) {
    return this.logger.info('[GIT]', ...messages);
  }
}
