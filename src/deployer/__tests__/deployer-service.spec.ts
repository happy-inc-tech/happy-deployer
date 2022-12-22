import { describe, it, expect, vi, beforeEach } from 'vitest';
import HappyDeployer from '../deployer-service.js';
import TaskService from '../../task/task-service.js';
import ProcessService from '../../process/process-service.js';
import { getService } from '../../container/index.js';

describe('deployer-service', () => {
  const deployerService = getService(HappyDeployer);
  const taskService = getService(TaskService);
  const processService = getService(ProcessService);
  vi.spyOn(taskService, 'assembleTasksArray');
  vi.spyOn(processService, 'errorExit');
  vi.spyOn(taskService, 'runAllTasks').mockImplementation(async () => {});
  vi.spyOn(taskService, 'runTask').mockImplementation(async () => {});

  let deployer: HappyDeployer;

  beforeEach(() => {
    vi.resetAllMocks();
    taskService.clearAssembledTasks();
    taskService.clearTasksGroups();
  });

  it('fails if no base config added', () => {
    expect(() => {
      deployer = deployerService.addServer({
        name: 'server',
      });
    }).toThrowError();
    deployer = deployerService
      .baseConfig({
        repository: 'repo',
        deployPath: 'deploy/path',
        ssh: {},
      })
      .addServer({
        name: 'server',
      });
  });

  it('assembles tasks for deploy', async () => {
    await deployer.deploy('server');
    expect(taskService.assembleTasksArray).toHaveBeenCalled();
    expect(taskService.getAssembledTasks().length).not.toBe(0);
  });

  it('assembles tasks for rollback', async () => {
    await deployer.rollback('server');
    expect(taskService.getAssembledTasks().length).toEqual(5);
    expect(taskService.assembleTasksArray).not.toHaveBeenCalled();
    expect(taskService.getAssembledTasks().length).not.toBe(0);
  });
});
