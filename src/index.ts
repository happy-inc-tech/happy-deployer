import 'reflect-metadata';
import HappyDeployer from './deployer/deployer-service.js';
import createContainer, { getService } from './container/index.js';
import { Task } from './task/types.js';
import TaskService from './task/task-service.js';

export function createDeployer(): HappyDeployer {
  createContainer();
  return getService(HappyDeployer);
}

export function buildTask(buildCommand: string = 'npm run build'): Task {
  return getService(TaskService).createTask(
    'app:build',
    async ({ execLocal, logger, action, serverConfig: { tempDirectory } }) => {
      if (action === 'rollback') {
        logger.info('skipping this task for rollback');
        return;
      }
      await execLocal(buildCommand, [], tempDirectory);
    },
  );
}

export function installDepsTask(installDepsCommand: string = 'npm install'): Task {
  return getService(TaskService).createTask(
    'app:install-deps',
    async ({ execLocal, logger, action, serverConfig: { tempDirectory } }) => {
      if (action === 'rollback') {
        logger.info('skipping this task for rollback');
        return;
      }
      await execLocal(installDepsCommand, [], tempDirectory);
    },
  );
}
