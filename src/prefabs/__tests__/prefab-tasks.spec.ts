import 'reflect-metadata';
import { describe, expect, it, vi } from 'vitest';
import { createLocalCommandPrefabTask } from '../index.js';
import createContainer from '../../container/index.js';

createContainer();

const testTaskContext: any = {
  serverConfig: {
    tempDirectory: '/temp',
    meta: {
      arg: '--arg',
    },
  },
  execLocal: vi.fn(),
  logger: {
    verbose: vi.fn(),
  },
};

describe('prefab-tasks', () => {
  it('create simple task', () => {
    const factory = createLocalCommandPrefabTask('test', 'ls -la');
    const task = factory();

    expect(task.name).toEqual('test');
    task.executor(testTaskContext);
    expect(testTaskContext.execLocal).toHaveBeenCalledWith('ls -la', '/temp');
  });

  it('override default command', () => {
    const factory = createLocalCommandPrefabTask('test', 'ls -la');
    const task = factory('pwd');
    task.executor(testTaskContext);
    expect(testTaskContext.execLocal).toHaveBeenCalledWith('pwd', '/temp');
  });

  it('function that returns command override', () => {
    const factory = createLocalCommandPrefabTask('test', 'ls -la');
    const task = factory((context) => `node ${context.serverConfig.meta.arg}`);
    task.executor(testTaskContext);
    expect(testTaskContext.execLocal).toHaveBeenCalledWith('node --arg', '/temp');
  });
});
