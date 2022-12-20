import { describe, it, expect, vi } from 'vitest';
import { getServiceForTests } from '../../test-utils/setup.js';
import ServerService from '../server-service.js';
import CacheService from '../../cache/cache-service.js';
import OsOperationsService from '../../os-operations/os-operations-service.js';
import ReleaseService from '../../release/release-service.js';
import { BaseConfig, ServerConfiguration } from '../types.js';
import StorageService from '../../storage/storage-service.js';

const serverService = getServiceForTests(ServerService);
const cacheService = getServiceForTests(CacheService);
const storageService = getServiceForTests(StorageService);
const osOpsService = getServiceForTests(OsOperationsService);
const releaseService = getServiceForTests(ReleaseService);

const osOpsSpy = vi.spyOn(osOpsService, 'getRandomBuildDirectory');

vi.stubGlobal('process', {
  exit: () => {
    throw new Error();
  },
});

describe('server-service', () => {
  it('creates and caches common config', () => {
    serverService.createBaseConfig({
      repository: 'git@git.com/1/2',
    });

    expect(storageService.getCommonConfig()).toEqual({
      branch: 'master',
      repository: 'git@git.com/1/2',
      releaseNameGetter: releaseService.getReleaseNameFromCurrentTime,
      releaseNameComparer: releaseService.releasesSorter,
      tempDirectory: osOpsSpy.mock.results[0].value,
      dirToCopy: 'dist',
      deployer: {
        currentReleaseSymlinkName: 'current',
        deleteOnRollback: true,
        keepReleases: 5,
        releasesDirName: 'releases',
        showCommandLogs: false,
      },
      meta: {},
    } as BaseConfig);
  });

  it('creates and retrieves server config', () => {
    serverService.createServerConfig({
      name: 'prod',
      deployPath: '/var/www/release',
      branch: 'main',
      ssh: {
        host: '127.0.0.1',
        port: 22,
        username: 'alexey',
      },
      deployer: {
        keepReleases: 10,
        deleteOnRollback: false,
        releasesDirName: 'all-releases',
      },
    });

    const serverConfig = serverService.getServerConfig('prod');
    expect(serverConfig).toBeDefined();

    expect(serverConfig).toEqual({
      repository: 'git@git.com/1/2',
      releaseNameGetter: releaseService.getReleaseNameFromCurrentTime,
      releaseNameComparer: releaseService.releasesSorter,
      tempDirectory: osOpsSpy.mock.results[0].value,
      name: 'prod',
      deployPath: '/var/www/release',
      branch: 'main',
      dirToCopy: 'dist',
      ssh: {
        host: '127.0.0.1',
        port: 22,
        username: 'alexey',
      },
      deployer: {
        currentReleaseSymlinkName: 'current',
        deleteOnRollback: false,
        keepReleases: 10,
        releasesDirName: 'all-releases',
        showCommandLogs: false,
      },
      meta: {},
    } as ServerConfiguration);
  });

  it('custom tempDirectory in baseConfig', () => {
    cacheService.reset();

    serverService.createBaseConfig({
      repository: 'git@git.com/1/2',
      tempDirectory: '/custom-temp',
    });

    serverService.createServerConfig({
      name: 'test-0',
      deployPath: 'path',
      ssh: {},
    });

    const serverConfig = serverService.getServerConfig('test-0');
    expect(serverConfig.tempDirectory).toEqual('/custom-temp');
  });

  it('custom tempDirectory in server', () => {
    cacheService.reset();

    serverService.createBaseConfig({
      repository: 'git@git.com/1/2',
    });

    serverService.createServerConfig({
      name: 'test-1',
      tempDirectory: '/custom-temp-2',
      deployPath: 'path',
      ssh: {},
    });

    const serverConfig = serverService.getServerConfig('test-1');
    expect(serverConfig.tempDirectory).toEqual('/custom-temp-2');
  });

  it('custom tempDirectory from server overrides one from commonConfig', () => {
    cacheService.reset();

    serverService.createBaseConfig({
      repository: 'git@git.com/1/2',
      tempDirectory: '/custom-temp-3',
    });

    serverService.createServerConfig({
      name: 'test-2',
      tempDirectory: '/custom-temp-4',
      deployPath: 'path',
      ssh: {},
    });

    const serverConfig = serverService.getServerConfig('test-2');
    expect(serverConfig.tempDirectory).toEqual('/custom-temp-4');
  });
});
