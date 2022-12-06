import { describe, it, expect, vi, Mock, beforeEach } from 'vitest';
import { getServiceForTests } from '../../test-utils/setup.js';
import TaskService from '../task-service.js';
import StorageService from '../../storage/storage-service.js';

const taskService = getServiceForTests(TaskService);

const tasks: [string, Mock][] = [
  ['test-task', vi.fn()],
  ['test-task-2', vi.fn()],
];

describe('task-service', () => {
  beforeEach(() => {
    getServiceForTests(StorageService).setDeployerAction('deploy');
  });

  it('creates and retrieves task', () => {
    taskService.addTask(...tasks[0]);
    expect(taskService.getTask('other-task')).toBeUndefined();
    expect(taskService.getTask('test-task')).toBeDefined();
  });

  it('executes task', async () => {
    taskService.addTask(...tasks[0]);
    await taskService.runTask('serv', 'test-task');
    expect(tasks[0][1]).toHaveBeenCalled();
  });

  it('throws an error if run not existed task', async () => {
    expect(async () => {
      await taskService.runTask('serv', 'other-task');
    }).rejects.toThrowError();
  });

  it('runs all tasks', async () => {
    vi.resetAllMocks();
    taskService.addTask(...tasks[1]);
    await taskService.runAllTasks('serv');
    for (const task of tasks) {
      expect(task[1]).toHaveBeenCalled();
    }
  });
});
