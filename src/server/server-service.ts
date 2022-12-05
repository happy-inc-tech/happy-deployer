import { inject, injectable } from 'inversify';
import OsOperationsService from '../os-operations/os-operations-service.js';
import type {
  BaseConfig,
  DefaultServerConfigValues,
  ServerConfiguration,
  ServerConfigurationParameters,
  ServerConfigurationParametersWithoutName,
} from './types.js';
import LoggerService from '../logger/logger-service.js';
import ProcessService from '../process/process-service.js';
import ReleaseService from '../release/release-service.js';
import StorageService from '../storage/storage-service.js';
import merge from 'lodash.merge';

@injectable()
export default class ServerService {
  protected readonly serverConfigs: Record<string, ServerConfiguration> = {};
  constructor(
    @inject(OsOperationsService) protected readonly osOperationsService: OsOperationsService,
    @inject(StorageService) protected readonly storage: StorageService,
    @inject(LoggerService) protected readonly logger: LoggerService,
    @inject(ProcessService) protected readonly processService: ProcessService,
    @inject(ReleaseService) protected readonly releaseService: ReleaseService,
  ) {}

  public createBaseConfig(settings: ServerConfigurationParametersWithoutName): BaseConfig {
    try {
      const cached = this.storage.getCommonConfig();
      return cached;
    } catch (e) {}

    const config = merge(this.getDefaultServerConfigValues(), settings);
    this.storage.setCommonConfig(config);
    return config;
  }

  public createServerConfig(settings: ServerConfigurationParameters): void {
    const baseConfig = this.storage.getCommonConfig();

    const serverConfig = merge(baseConfig, settings);
    if (!this.isServerConfiguration(serverConfig)) {
      return this.processService.errorExit(1);
    }

    this.serverConfigs[serverConfig.name] = serverConfig;
  }

  public getServerConfig(name: string): ServerConfiguration {
    return this.serverConfigs[name];
  }

  protected getDefaultServerConfigValues(): DefaultServerConfigValues {
    const tempDirectory = this.osOperationsService.getRandomBuildDirectory();
    return {
      branch: 'master',
      tempDirectory,
      dirToCopy: this.osOperationsService.getPathRelativeToBuildDirectory(tempDirectory, 'dist'),
      releaseNameGetter: this.releaseService.getReleaseNameFromCurrentTime,
      releaseNameComparer: this.releaseService.releasesSorter,
      deployer: {
        keepReleases: 5,
        deleteOnRollback: true,
        releasesDirName: 'releases',
        currentReleaseSymlinkName: 'current',
        showCommandLogs: false,
      },
    };
  }

  protected isServerConfiguration(value: unknown): value is ServerConfiguration {
    if (typeof value !== 'object' || value === null) {
      return false;
    }

    const requiredKeys: Array<keyof ServerConfiguration> = [
      'name',
      'repository',
      'branch',
      'deployPath',
      'dirToCopy',
      'tempDirectory',
      'releaseNameGetter',
      'ssh',
      'deployer',
    ];

    const missingKeys: string[] = [];

    for (const key of requiredKeys) {
      if (!(key in value) || (value as any)[key] === undefined) {
        missingKeys.push(key);
      }
    }

    missingKeys.length && this.logger.error('missing required keys in result server config:', missingKeys.join(', '));

    return missingKeys.length === 0;
  }
}
