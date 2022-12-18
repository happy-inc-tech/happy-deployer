import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServiceForTests } from '../../test-utils/setup.js';
import HappyDeployer from '../deployer-service.js';
import TaskService from '../../task/task-service.js';
import ProcessService from '../../process/process-service.js';

const deployerService = getServiceForTests(HappyDeployer);
const taskService = getServiceForTests(TaskService);
const processService = getServiceForTests(ProcessService);

vi.mock('../../task/task-service.js', async () => {
  const taskService = await import('../../task/task-service.js');
  const TaskService = taskService.default;
  return {
    default: class extends TaskService {
      public runAllTasks = vi.fn();
      public runTask = vi.fn();
    },
  };
});

vi.stubGlobal('process', {
  exit: vi.fn(),
});

vi.spyOn(taskService, 'assembleTasksArray');
vi.spyOn(processService, 'errorExit');

describe('deployer-service', () => {
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
