import { inject, injectable } from 'inversify';
import type { Task, TaskExecutor, TaskExecutorContext } from './types.js';
import ServerService from '../server/server-service.js';
import LoggerService from '../logger/logger-service.js';
import ProcessService from '../process/process-service.js';
import type { ServerConfiguration } from '../server/types.js';
import OsOperationsService from '../os-operations/os-operations-service.js';
import SshService from '../ssh/ssh-service.js';
import StorageService from '../storage/storage-service.js';

@injectable()
export default class TaskService {
  protected tasks: Task[] = [];

  constructor(
    @inject(ServerService) protected readonly serverService: ServerService,
    @inject(LoggerService) protected readonly logger: LoggerService,
    @inject(ProcessService) protected readonly processService: ProcessService,
    @inject(OsOperationsService) protected readonly osOperationsService: OsOperationsService,
    @inject(SshService) protected readonly sshService: SshService,
    @inject(StorageService) protected readonly storage: StorageService,
  ) {}

  public addTask(name: string, executor: TaskExecutor, unshift = false): void {
    if (this.tasks.some((task) => task.name === name)) {
      this.logger.warn(`Duplicate task name "${name}", new one is skipped`);
      return;
    }

    this.tasks[unshift ? 'unshift' : 'push'](this.createTask(name, executor));
  }

  public getTask(taskName: string): Task | undefined {
    return this.tasks.find((task) => task.name === taskName);
  }

  public async runTask(forServer: string, taskName: string): Promise<void> {
    const serverConfig = this.serverService.getServerConfig(forServer);
    const task = this.getTask(taskName);
    if (!task) {
      throw new ReferenceError(`Task ${taskName} not found`);
    }
    this.logger.info(`executing task "${taskName}"`);
    return task.executor(this.getTaskExecutorContext(serverConfig));
  }

  public async runAllTasks(forServer: string): Promise<void> {
    for (const task of this.tasks) {
      try {
        await this.runTask(forServer, task.name);
      } catch (e) {
        this.logger.error(`task "${task.name}" failed`);
        this.logger.error(e);
        this.processService.errorExit(1);
      }
    }
    this.logger.info('All tasks finished');
  }

  public createTask(name: string, executor: TaskExecutor): Task {
    return {
      name,
      executor,
    };
  }

  public isTask(value: unknown): value is Task {
    if (typeof value !== 'object' || value === null) {
      return false;
    }

    return (
      'name' in value && typeof value.name === 'string' && 'executor' in value && typeof value.executor === 'function'
    );
  }

  public getTaskExecutorContext(serverConfig: ServerConfiguration): TaskExecutorContext {
    return {
      serverConfig,
      execLocal: this.osOperationsService.execute.bind(this.osOperationsService),
      execRemote: this.sshService.executeRemoteCommand.bind(this.sshService),
      logger: this.logger,
      action: this.storage.getDeployerAction(),
      releaseName: this.storage.getReleaseName(),
      releasePath: this.storage.getReleasePath(),
    };
  }
}
