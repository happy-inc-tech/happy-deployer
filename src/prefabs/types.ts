import type { Task, TaskExecutorContext } from '../task/types.js';

export type PrefabTask = {
  (customCommand?: string): Task;
  (customCommandFactory?: (context: TaskExecutorContext) => string): Task;
};
