import 'reflect-metadata';
import HappyDeployer from './deployer/deployer-service.js';
import createContainer, { getService } from './container/index.js';

export function createDeployer(): HappyDeployer {
  createContainer();
  return getService(HappyDeployer);
}

export { installDepsTask, buildTask } from './prefabs/index.js';
