import { describe, it, expect, vi, Mock, beforeEach } from 'vitest';
import { getServiceForTests } from '../../test-utils/setup.js';
import TaskService from '../task-service.js';
import StorageService from '../../storage/storage-service.js';
import HappyDeployer from '../../deployer/deployer-service.js';
import CoreTasksService from '../../core-tasks/core-tasks-service.js';
import {
  GIT_CORE_TASK_NAME,
  RELEASES_UPDATE_SYMLINK_CORE_TASK_NAME,
  RELEASES_UPLOAD_CORE_TASK_NAME,
  SSH_DISCONNECT_CORE_TASK_NAME,
} from '../../core-tasks/const.js';
import { taskPositions } from '../const.js';

vi.stubGlobal('process', {
  exit: vi.fn(),
});

const taskService = getServiceForTests(TaskService);
const deployerService = getServiceForTests(HappyDeployer);
const coreTaskService = getServiceForTests(CoreTasksService);

const tasks: [string, Mock][] = [
  ['test-task', vi.fn()],
  ['test-task-2', vi.fn()],
  ['first-task', vi.fn()],
  ['another-first-task', vi.fn()],
];

describe('task-service', () => {
  beforeEach(() => {
    taskService.clearAssembledTasks();
    taskService.clearTasksGroups();

    deployerService
      .baseConfig({
        repository: 'repo',
        deployPath: 'deploy/path',
        ssh: {},
      })
      .addServer({
        name: 'server',
      })
      .task(...tasks[0])
      .task(...tasks[1]);

    getServiceForTests(StorageService).setReleaseName('release');
    getServiceForTests(StorageService).setReleasePath('release/path');
    taskService.assembleTasksArray();
  });

  it('creates and retrieves task', () => {
    expect(taskService.getTask('other-task')).toBeUndefined();
    expect(taskService.getTask('test-task')).toBeDefined();
  });

  it('executes task', async () => {
    getServiceForTests(StorageService).setDeployerAction('deploy');
    await taskService.runTask('server', 'test-task');
    expect(tasks[0][1]).toHaveBeenCalled();
  });

  it('throws an error if run not existed task', async () => {
    expect(async () => {
      await taskService.runTask('server', 'other-task');
    }).rejects.toThrowError();
  });

  it('runs all tasks', async () => {
    await taskService.runAllTasks('server');
    for (const task of tasks.slice(0, 2)) {
      expect(task[1]).toHaveBeenCalled();
    }
  });

  it('test order first', async () => {
    taskService.clearAssembledTasks();
    taskService.addTask(...tasks[2], taskPositions.FIRST);
    taskService.assembleTasksArray();
    expect(taskService.getAssembledTasks().length).toEqual(3);
    expect(taskService.getAssembledTasks()[0].name).toEqual(tasks[2][0]);
  });

  it('reorder first if added another', async () => {
    taskService.clearAssembledTasks();
    taskService.addTask(...tasks[2], taskPositions.FIRST);
    taskService.addTask(...tasks[3], taskPositions.FIRST);
    taskService.assembleTasksArray();
    expect(taskService.getAssembledTasks().length).toEqual(4);
    expect(taskService.getAssembledTasks()[0].name).toEqual('another-first-task');
  });

  it('correctly adds direct tasks', async () => {
    taskService.clearAssembledTasks();
    coreTaskService.createGitTask();
    coreTaskService.createUploadReleaseTask();
    taskService.assembleTasksArray();
    const assembled = taskService.getAssembledTasks();

    expect(assembled.length).toEqual(4);
    expect(assembled[0].name).toEqual(GIT_CORE_TASK_NAME);
    expect(assembled[3].name).toEqual(RELEASES_UPLOAD_CORE_TASK_NAME);
  });

  it('correctly adds tasks after release upload', async () => {
    taskService.clearAssembledTasks();
    taskService.clearTasksGroups();
    coreTaskService.createGitTask();
    coreTaskService.createUploadReleaseTask();
    coreTaskService.createSshDisconnectTask();
    taskService.addTask(...tasks[0]);
    taskService.addTask(...tasks[1]);
    taskService.addTask(...tasks[2], taskPositions.AFTER_RELEASE_UPLOAD);
    taskService.addTask(...tasks[3], taskPositions.AFTER_RELEASE_UPLOAD);
    coreTaskService.createUpdateSymlinkTask();
    taskService.assembleTasksArray();

    const assembledTasksNames = taskService.getAssembledTasks().map((task) => task.name);

    expect(assembledTasksNames.length).toEqual(8);
    expect(assembledTasksNames).toStrictEqual([
      GIT_CORE_TASK_NAME,
      tasks[0][0],
      tasks[1][0],
      RELEASES_UPLOAD_CORE_TASK_NAME,
      tasks[2][0],
      tasks[3][0],
      SSH_DISCONNECT_CORE_TASK_NAME,
      RELEASES_UPDATE_SYMLINK_CORE_TASK_NAME,
    ]);
  });
});
