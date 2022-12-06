import { inject, injectable } from 'inversify';
import CacheService from '../cache/cache-service.js';
import type { BaseConfig, ServerConfiguration } from '../server/types.js';
import {
  COMMON_CONFIG_KEY,
  CURRENT_SERVER_CONFIG_KEY,
  DEPLOYER_ACTION_KEY,
  PREVIOUS_RELEASE_NAME_KEY,
  RELEASE_NAME_KEY,
  RELEASE_PATH_KEY,
} from './const.js';
import type { DeployerAction } from '../deployer/types.js';

@injectable()
export default class StorageService {
  constructor(@inject(CacheService) protected readonly cacheService: CacheService) {}

  public setCurrentConfig(config: ServerConfiguration): void {
    this.cacheService.cache(CURRENT_SERVER_CONFIG_KEY, config);
  }

  public getCurrentConfig(): ServerConfiguration {
    return this.safelyGetFromCache<ServerConfiguration>(CURRENT_SERVER_CONFIG_KEY);
  }

  public setCommonConfig(config: BaseConfig) {
    this.cacheService.cache(COMMON_CONFIG_KEY, config);
  }

  public getCommonConfig(): BaseConfig {
    return this.safelyGetFromCache<BaseConfig>(COMMON_CONFIG_KEY);
  }

  public setReleaseName(name: string) {
    this.cacheService.cache(RELEASE_NAME_KEY, name);
  }

  public getReleaseName(): string {
    return this.safelyGetFromCache<string>(RELEASE_NAME_KEY);
  }

  public setReleasePath(path: string) {
    this.cacheService.cache(RELEASE_PATH_KEY, path);
  }

  public getReleasePath(): string {
    return this.safelyGetFromCache<string>(RELEASE_PATH_KEY);
  }

  public setPreviousReleaseName(name: string) {
    this.cacheService.cache(PREVIOUS_RELEASE_NAME_KEY, name);
  }

  public getPreviousReleaseName(): string {
    return this.safelyGetFromCache<string>(PREVIOUS_RELEASE_NAME_KEY);
  }

  public setDeployerAction(action: DeployerAction) {
    this.cacheService.cache(DEPLOYER_ACTION_KEY, action);
  }

  public getDeployerAction(): DeployerAction {
    return this.safelyGetFromCache<DeployerAction>(DEPLOYER_ACTION_KEY);
  }

  protected safelyGetFromCache<T>(key: string): T {
    const value = this.cacheService.getCached<T>(key);
    if (!value) {
      throw new Error(`[STORAGE] missing key "${key}"`);
    }

    return value;
  }
}
