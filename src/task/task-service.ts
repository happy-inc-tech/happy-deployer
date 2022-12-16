import { inject, injectable } from 'inversify';
import type { Task, TaskExecutor, TaskExecutorContext, TaskGroups, TaskPosition } from './types.js';
import ServerService from '../server/server-service.js';
import LoggerService from '../logger/logger-service.js';
import ProcessService from '../process/process-service.js';
import type { ServerConfiguration } from '../server/types.js';
import OsOperationsService from '../os-operations/os-operations-service.js';
import StorageService from '../storage/storage-service.js';
import SshManager from '../ssh/ssh-manager.js';
import type { DeployerSshInterface } from '../ssh/types.js';
import { TASK_POSITIONS } from './const.js';

@injectable()
export default class TaskService {
  protected tasks: Task[] = [];
  protected taskGroups: TaskGroups = {
    [TASK_POSITIONS.FIRST]: null,
    [TASK_POSITIONS.ORDER]: [],
    [TASK_POSITIONS.AFTER_RELEASE]: [],
  };

  constructor(
    @inject(ServerService) protected readonly serverService: ServerService,
    @inject(LoggerService) protected readonly logger: LoggerService,
    @inject(ProcessService) protected readonly processService: ProcessService,
    @inject(OsOperationsService) protected readonly osOperationsService: OsOperationsService,
    @inject(SshManager) protected readonly sshManager: DeployerSshInterface,
    @inject(StorageService) protected readonly storage: StorageService,
  ) {}

  public assembleTasksArray() {
    const { first, ['after-release']: afterRelease, order } = this.taskGroups;
    this.tasks.unshift(...order);
    first && this.tasks.unshift(first);
    if (!afterRelease.length) return;

    // @todo change to constant
    const releaseTaskPos = this.tasks.findIndex((task) => task.name === 'releases:upload');
    this.tasks.splice(releaseTaskPos + 1, 0, ...afterRelease);
  }

  public addTask(name: string, executor: TaskExecutor<any>, position: TaskPosition = TASK_POSITIONS.ORDER): void {
    const newTask = this.createTask(name, executor);

    if (position === TASK_POSITIONS.DIRECT) {
      if (this.tasks.some((task) => task.name === name)) {
        this.logger.warn(`Duplicate task name "${name}", new one is skipped`);
        return;
      }
      this.tasks.push(newTask);
      return;
    }

    if (
      this.taskGroups[TASK_POSITIONS.FIRST]?.name === name ||
      this.taskGroups[TASK_POSITIONS.ORDER].some((task) => task.name === name) ||
      this.taskGroups[TASK_POSITIONS.AFTER_RELEASE].some((task) => task.name === name)
    ) {
      this.logger.warn(`Duplicate task name "${name}", new one is skipped`);
      return;
    }

    if (position === TASK_POSITIONS.FIRST) {
      if (this.taskGroups.first && !this.taskGroups.order.some((task) => task.name === name)) {
        this.taskGroups.order.unshift(this.taskGroups.first);
      }
      this.taskGroups.first = newTask;
      return;
    }

    this.taskGroups[position].push(newTask);
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

  public getAssembledTasks() {
    return this.tasks;
  }

  public clearAssembledTasks() {
    this.tasks = [];
  }

  public clearTasksGroups() {
    this.taskGroups = {
      first: null,
      order: [],
      'after-release': [],
    };
  }

  public getTaskExecutorContext<T extends Record<string, unknown> = Record<string, unknown>>(
    serverConfig: ServerConfiguration<T>,
  ): TaskExecutorContext<T> {
    return {
      serverConfig,
      execLocal: this.osOperationsService.execute.bind(this.osOperationsService),
      execRemote: this.sshManager.executeRemoteCommand.bind(this.sshManager),
      logger: this.logger,
      action: this.storage.getDeployerAction(),
      releaseName: this.storage.getReleaseName(),
      releasePath: this.storage.getReleasePath(),
      meta: serverConfig.meta,
    };
  }
}
