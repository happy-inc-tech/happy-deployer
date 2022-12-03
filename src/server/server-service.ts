import { CommonConfig, CommonConfigSettings, ServerConfig, ServerConfigSettings } from './types.js';
import { inject, injectable } from 'inversify';
import OsOperationsService from '../os-operations/os-operations-service.js';
import CacheService from '../cache/cache-service.js';
import { COMMON_CONFIG_KEY } from '../cache/const.js';

@injectable()
export default class ServerService {
  protected readonly serverConfigs: Record<string, ServerConfig> = {};
  constructor(
    @inject(OsOperationsService) protected readonly osOperationsService: OsOperationsService,
    @inject(CacheService) protected readonly cacheService: CacheService,
  ) {}

  public createCommonConfig(settings: CommonConfigSettings): CommonConfig {
    const cached = this.cacheService.getCached<CommonConfig>(COMMON_CONFIG_KEY);
    if (cached) {
      return cached;
    }

    const config = {
      repository: settings.repository,
      deleteOnRollback: settings.deleteOnRollback ?? true,
      releaseNameGetter: this.osOperationsService.getReleaseNameFromCurrentTime,
      tempDirectory: this.osOperationsService.getRandomBuildDirectory(),
    };

    this.cacheService.cache(COMMON_CONFIG_KEY, config);
    return config;
  }

  public createServerConfig(settings: ServerConfigSettings): ServerConfig {
    const commonConfig = this.cacheService.getCached<CommonConfig>(COMMON_CONFIG_KEY);
    if (!commonConfig) {
      throw new ReferenceError('CommonConfig is not created');
    }

    const serverConfig: ServerConfig = {
      ...commonConfig,
      repository: settings.repository ?? commonConfig.repository,
      name: settings.name,
      host: settings.host,
      port: settings.port,
      username: settings.username,
      deployPath: settings.deployPath,
      dirToCopy:
        settings.dirToCopy ??
        this.osOperationsService.getPathRelativeToBuildDirectory(commonConfig.tempDirectory, 'dist'),
      branch: settings.branch ?? 'master',
    };

    this.serverConfigs[serverConfig.name] = serverConfig;
    return serverConfig;
  }

  public getServerConfig(name: string): ServerConfig {
    return this.serverConfigs[name];
  }
}
