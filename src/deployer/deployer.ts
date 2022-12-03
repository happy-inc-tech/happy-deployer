import { RequiredSteps } from './types.js';
import ServerService from '../server/server-service.js';
import { CommonConfigSettings, ServerConfigSettings } from '../server/types.js';
import TaskService from '../task/task-service.js';
import { TaskExecutor } from '../task/types.js';
import LoggerService from '../logger/logger-service.js';
import CoreTasksService from '../core-tasks/core-tasks-service.js';

export default class HappyDeployer {
  protected readonly steps: Record<RequiredSteps, boolean> = {
    [RequiredSteps.BASE_CONFIG]: false,
    [RequiredSteps.AT_LEAST_ONE_SERVER]: false,
    [RequiredSteps.HAS_BUILD_TASK]: false,
  };
  constructor(
    protected readonly serverService: ServerService,
    protected readonly taskService: TaskService,
    protected readonly coreTasksService: CoreTasksService,
    protected readonly logger: LoggerService,
  ) {}

  public baseConfig(settings: CommonConfigSettings): HappyDeployer {
    this.serverService.createCommonConfig(settings);
    this.changeStepStatus(RequiredSteps.BASE_CONFIG, true);
    return this;
  }

  public addServer(settings: ServerConfigSettings): HappyDeployer {
    this.serverService.createServerConfig(settings);
    this.changeStepStatus(RequiredSteps.AT_LEAST_ONE_SERVER, true);
    this.coreTasksService.createGitTask();
    return this;
  }

  public installDepsAndBuild(installDepsCommand = 'npm install', buildCommand = 'npm run build'): HappyDeployer {
    this.coreTasksService.createBuildTask(installDepsCommand, buildCommand);
    this.changeStepStatus(RequiredSteps.HAS_BUILD_TASK, true);
    return this;
  }

  public task(name: string, executor: TaskExecutor): HappyDeployer {
    this.checkRequiredSteps([RequiredSteps.HAS_BUILD_TASK]);
    this.taskService.addTask(name, executor);
    return this;
  }

  public async deploy(server: string) {
    this.coreTasksService.createSshConnectTask()
    this.coreTasksService.createReleaseTask();
    this.coreTasksService.createUploadReleaseTask();
    this.coreTasksService.createSshDisconnectTask()
    this.coreTasksService.createCleanupTask();
    this.logger.info('Start deploying');
    this.checkRequiredSteps();
    await this.taskService.runAllTasks(server);
    this.logger.success('Successfully deployed');
  }

  protected changeStepStatus(step: RequiredSteps, status: boolean) {
    this.steps[step] = status;
  }

  protected checkRequiredSteps(steps: RequiredSteps[] = Object.keys(this.steps) as RequiredSteps[]) {
    for (const stepName of steps) {
      if (!this.steps[stepName]) {
        this.logger.error(`Missing required step "${stepName}"`);
        process.exit(1);
      }
    }
  }
}
