import { RequiredSteps } from './types.js';
import ServerService from '../server/server-service.js';
import TaskService from '../task/task-service.js';
import type { Task, TaskExecutor } from '../task/types.js';
import LoggerService from '../logger/logger-service.js';
import CoreTasksService from '../core-tasks/core-tasks-service.js';
import type { ServerConfigurationParameters, ServerConfigurationParametersWithoutName } from '../server/types.js';
import { inject, injectable } from 'inversify';
import ProcessService from '../process/process-service.js';
import StorageService from '../storage/storage-service.js';

@injectable()
export default class HappyDeployer {
  protected readonly steps: Record<RequiredSteps, boolean> = {
    [RequiredSteps.BASE_CONFIG]: false,
    [RequiredSteps.AT_LEAST_ONE_SERVER]: false,
  };
  constructor(
    @inject(ServerService) protected readonly serverService: ServerService,
    @inject(TaskService) protected readonly taskService: TaskService,
    @inject(CoreTasksService) protected readonly coreTasksService: CoreTasksService,
    @inject(LoggerService) protected readonly logger: LoggerService,
    @inject(ProcessService) protected readonly processService: ProcessService,
    @inject(StorageService) protected readonly storage: StorageService,
  ) {}

  public baseConfig<MetaType extends Record<string, unknown> = Record<string, unknown>>(
    settings: ServerConfigurationParametersWithoutName<MetaType>,
  ): HappyDeployer {
    this.serverService.createBaseConfig(settings);
    this.changeStepStatus(RequiredSteps.BASE_CONFIG, true);
    return this;
  }

  public addServer<MetaType extends Record<string, unknown> = Record<string, unknown>>(
    settings: ServerConfigurationParameters<MetaType>,
  ): HappyDeployer {
    this.serverService.createServerConfig(settings);
    this.changeStepStatus(RequiredSteps.AT_LEAST_ONE_SERVER, true);
    return this;
  }

  public task<T extends Record<string, unknown> = Record<string, unknown>>(task: Task<T>): HappyDeployer;
  public task<T extends Record<string, unknown> = Record<string, unknown>>(
    name: string,
    executor: TaskExecutor<T>,
  ): HappyDeployer;
  public task<T extends Record<string, unknown> = Record<string, unknown>>(
    taskOrName: Task<T> | string,
    executor?: TaskExecutor<T>,
  ): HappyDeployer {
    if (this.taskService.isTask(taskOrName)) {
      this.taskService.addTask(taskOrName.name, taskOrName.executor);
    }

    if (typeof taskOrName === 'string' && executor !== undefined) {
      this.taskService.addTask(taskOrName, executor);
    }

    return this;
  }

  public async deploy(server: string) {
    this.storage.setDeployerAction('deploy');
    const config = this.serverService.getServerConfig(server);
    this.storage.setCurrentConfig(config);
    this.createInternalDeployTasks();
    this.checkRequiredSteps();
    this.logger.info('Start deploying');
    await this.taskService.runAllTasks(server);
    this.logger.success('Successfully deployed');
  }

  public async rollback(server: string) {
    this.storage.setDeployerAction('rollback');
    const config = this.serverService.getServerConfig(server);
    this.storage.setCurrentConfig(config);
    this.createInternalRollbackTasks();
    this.checkRequiredSteps();
    this.logger.info('Start rollback');
    await this.taskService.runAllTasks(server);
    this.logger.success('Rollback was successful');
  }

  protected createInternalDeployTasks(): void {
    this.coreTasksService.createGitTask();
    this.coreTasksService.createSshConnectTask();
    this.coreTasksService.createReleaseTask();
    this.coreTasksService.createUploadReleaseTask();
    this.coreTasksService.createUpdateSymlinkTask();
    this.coreTasksService.createCleanUpReleasesTask();
    this.coreTasksService.createSshDisconnectTask();
    this.coreTasksService.createCleanupTask();
  }

  protected createInternalRollbackTasks(): void {
    this.coreTasksService.createSshConnectTask();
    this.coreTasksService.createRollbackFindReleasesTask();
    this.coreTasksService.createUpdateSymlinkTask();
    this.coreTasksService.createRemoveRollbackRelease();
    this.coreTasksService.createSshDisconnectTask();
  }

  protected changeStepStatus(step: RequiredSteps, status: boolean) {
    this.steps[step] = status;
  }

  protected checkRequiredSteps(steps: RequiredSteps[] = Object.keys(this.steps) as RequiredSteps[]) {
    for (const stepName of steps) {
      if (!this.steps[stepName]) {
        this.logger.error(`Missing required step "${stepName}"`);
        this.processService.errorExit(1);
      }
    }
  }
}
