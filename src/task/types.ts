import type { ServerConfiguration } from '../server/types.js';
import type LoggerService from '../logger/logger-service.js';
import type OsOperationsService from '../os-operations/os-operations-service.js';
import type SshService from '../ssh/ssh-service.js';
import type { DeployerAction } from '../deployer/types.js';

export type TaskExecutorContext<MetaType extends Record<string, unknown> = Record<string, unknown>> = {
  serverConfig: ServerConfiguration;
  logger: LoggerService;
  execLocal: typeof OsOperationsService.prototype.execute;
  execRemote: typeof SshService.prototype.executeRemoteCommand;
  action: DeployerAction;
  releaseName: string;
  releasePath: string;
  meta: MetaType;
};

export type TaskExecutor<T extends Record<string, unknown> = Record<string, unknown>> = (
  serverConfig: TaskExecutorContext<T>,
) => void | Promise<void>;

export interface Task<T extends Record<string, unknown> = Record<string, unknown>> {
  name: string;
  executor: TaskExecutor<T>;
}
