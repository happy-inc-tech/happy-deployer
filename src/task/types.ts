import type { ServerConfiguration } from '../server/types.js';
import type LoggerService from '../logger/logger-service.js';
import type OsOperationsService from '../os-operations/os-operations-service.js';
import type SshService from '../ssh/ssh-service.js';
import { DeployerAction } from '../deployer/types.js';

export type TaskExecutorContext = {
  serverConfig: ServerConfiguration;
  logger: LoggerService;
  execLocal: typeof OsOperationsService.prototype.execute;
  execRemote: typeof SshService.prototype.executeRemoteCommand;
  action: DeployerAction;
};

export type TaskExecutor = (serverConfig: TaskExecutorContext) => Promise<void>;

export interface Task {
  name: string;
  executor: TaskExecutor;
}
