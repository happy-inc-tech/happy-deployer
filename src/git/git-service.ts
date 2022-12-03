import { inject, injectable } from 'inversify';
import OsOperationsService from '../os-operations/os-operations-service.js';
import LoggerService from '../logger/logger-service.js';

@injectable()
export default class GitService {
  constructor(
    @inject(OsOperationsService) protected readonly osOperationsService: OsOperationsService,
    @inject(LoggerService) protected readonly logger: LoggerService,
  ) {}

  public async cloneRepository(repo: string, cloneTo: string): Promise<void> {
    this.log(`repo url: ${repo}`);
    await this.osOperationsService.createDirectory(cloneTo);
    await this.runGitCommand(['clone', repo, '.'], cloneTo);
  }

  public async changeBranch(repoPath: string, branch: string): Promise<void> {
    this.log(`use branch "${branch}"`);
    await this.runGitCommand(['checkout', branch], repoPath);
  }

  public async pull(repoPath: string): Promise<void> {
    await this.runGitCommand(['pull'], repoPath);
  }

  protected log(...messages: any[]) {
    return this.logger.info('[GIT]', ...messages);
  }

  protected async runGitCommand(args: string[], runIn?: string): Promise<void> {
    return this.osOperationsService.execute('git', args, runIn);
  }
}
