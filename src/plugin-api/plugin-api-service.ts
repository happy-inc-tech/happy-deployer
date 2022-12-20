import { inject, injectable } from 'inversify';
import HappyDeployer from '../deployer/deployer-service.js';
import { Task } from '../task/types.js';

@injectable()
export default class PluginApiService {
  constructor(@inject(HappyDeployer) protected readonly deployerService: HappyDeployer) {}

  /**
   * You can replace any service with your own that implements the
   * correct interface (except PluginApiService)
   * @param servicesMap
   */
  public replaceCoreServices(servicesMap: Record<string, unknown>) {}

  /**
   * Get all tasks in order of execution
   */
  public getAssembledTasks(): Task[] {
    return [];
  }

  /**
   * Set tasks in order of execution
   * @param tasks
   */
  public setTasks(tasks: Task[]) {}
}
