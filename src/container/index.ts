import { Container, interfaces } from 'inversify';
import CacheService from '../cache/cache-service.js';
import CoreTasksService from '../core-tasks/core-tasks-service.js';
import GitService from '../git/git-service.js';
import LoggerService from '../logger/logger-service.js';
import OsOperationsService from '../os-operations/os-operations-service.js';
import ServerService from '../server/server-service.js';
import TaskService from '../task/task-service.js';
import Ssh2SshService from '../ssh/services/ssh2-ssh-service.js';
import ReleaseService from '../release/release-service.js';
import ProcessService from '../process/process-service.js';
import ServiceIdentifier = interfaces.ServiceIdentifier;
import StorageService from '../storage/storage-service.js';
import ShellSshService from '../ssh/services/shell-ssh-service.js';
import SshManager from '../ssh/ssh-manager.js';

let container: Container;

export default function createContainer(): Container {
  container = new Container({ defaultScope: 'Singleton', autoBindInjectable: true });

  container.bind(CacheService).to(CacheService);
  container.bind(CoreTasksService).to(CoreTasksService);
  container.bind(GitService).to(GitService);
  container.bind(LoggerService).to(LoggerService);
  container.bind(OsOperationsService).to(OsOperationsService);
  container.bind(ServerService).to(ServerService);
  container.bind(TaskService).to(TaskService);
  container.bind(Ssh2SshService).to(Ssh2SshService);
  container.bind(ShellSshService).to(ShellSshService);
  container.bind(SshManager).to(SshManager);
  container.bind(ReleaseService).to(ReleaseService);
  container.bind(ProcessService).to(ProcessService);
  container.bind(StorageService).to(StorageService);

  return container;
}

export function getService<T>(serviceConstructor: ServiceIdentifier<T>) {
  if (!container) {
    throw new Error('No DI container');
  }
  return container.get<T>(serviceConstructor);
}
