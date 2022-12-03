import { inject, injectable } from 'inversify';
import { Task, TaskExecutor } from './types.js';
import ServerService from '../server/server-service.js';
import LoggerService from '../logger/logger-service.js';

@injectable()
export default class TaskService {
  protected tasks: Task[] = [];

  constructor(
    @inject(ServerService) protected readonly serverService: ServerService,
    @inject(LoggerService) protected readonly logger: LoggerService,
  ) {}

  public addTask(name: string, executor: TaskExecutor): void {
    if (this.tasks.some((task) => task.name === name)) {
      this.logger.warn(`Duplicate task name "${name}", new one is skipped`);
      return;
    }

    this.tasks.push({
      name,
      executor,
    });
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
    return task.executor(serverConfig);
  }

  public async runAllTasks(forServer: string): Promise<void> {
    for (const task of this.tasks) {
      try {
        await this.runTask(forServer, task.name);
      } catch (e) {
        this.logger.error(`task ${task.name}" failed`);
        this.logger.error(e);
        process.exit(1);
      }
    }
    this.logger.info('All tasks finished');
  }
}
