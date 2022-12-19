import type { TaskExecutorContext } from '../task/types.js';
import type { PrefabTask } from './types.js';
import { getService } from '../container/index.js';
import TaskService from '../task/task-service.js';

export const createLocalCommandPrefabTask = (
  name: string,
  defaultCommand: string,
  execIf?: (context: TaskExecutorContext) => boolean,
): PrefabTask => {
  return (commandOrFactory) => {
    return getService(TaskService).createTask(name, async (context) => {
      let command = defaultCommand;

      if (typeof commandOrFactory === 'string') {
        command = commandOrFactory;
      }

      if (typeof commandOrFactory === 'function') {
        command = commandOrFactory(context);
      }

      if (execIf && !execIf(context)) {
        context.logger.info('skipping task', name);
        return;
      }
      context.logger.verbose(`running command "${command}"`);
      await context.execLocal(command, context.serverConfig.tempDirectory);
    });
  };
};

export const installDepsTask = createLocalCommandPrefabTask(
  'app:install-deps',
  'npm install',
  ({ action }) => action === 'deploy',
);
export const buildTask = createLocalCommandPrefabTask(
  'app:build',
  'npm run build',
  ({ action }) => action === 'deploy',
);
