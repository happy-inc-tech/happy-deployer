import { ServerConfig } from '../server/types.js';

export type TaskExecutor = (serverConfig: ServerConfig) => Promise<void>;

export interface Task {
  name: string;
  executor: TaskExecutor;
}
