import type { ServerConfiguration } from '../server/types.js';
import type LoggerService from '../logger/logger-service.js';
import type OsOperationsService from '../os-operations/os-operations-service.js';
import type { DeployerAction } from '../deployer/types.js';
import type { DeployerSshInterface } from '../ssh/types.js';
import type { ValuesOf } from '../types.js';
import type { taskPositions } from './const.js';

export type TaskExecutorContext<MetaType extends Record<string, unknown> = Record<string, unknown>> = {
  serverConfig: ServerConfiguration;
  logger: LoggerService;
  execLocal: typeof OsOperationsService.prototype.execute;
  execRemote: DeployerSshInterface['executeRemoteCommand'];
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

export type TaskPosition = ValuesOf<typeof taskPositions>;

export type TaskGroups = {
  [taskPositions.FIRST]: Task | null;
  [taskPositions.ORDER]: Task[];
  [taskPositions.AFTER_RELEASE_UPLOAD]: Task[];
};
