import { describe, it, expect, vi } from 'vitest';
import { getServiceForTests } from '../../test-utils/setup.js';
import ServerService from '../server-service.js';
import CacheService from '../../cache/cache-service.js';
import { COMMON_CONFIG_KEY } from '../../storage/const.js';
import OsOperationsService from '../../os-operations/os-operations-service.js';
import ReleaseService from '../../release/release-service.js';
import { BaseConfig, ServerConfiguration } from '../types.js';

const serverService = getServiceForTests(ServerService);
const cacheService = getServiceForTests(CacheService);
const osOpsService = getServiceForTests(OsOperationsService);
const releaseService = getServiceForTests(ReleaseService);

const osOpsSpy = vi.spyOn(osOpsService, 'getRandomBuildDirectory');

describe('server-service', () => {
  it('creates and caches common config', () => {
    serverService.createBaseConfig({
      repository: 'git@git.com/1/2',
    });

    expect(cacheService.getCached(COMMON_CONFIG_KEY)).toEqual({
      branch: 'master',
      repository: 'git@git.com/1/2',
      releaseNameGetter: releaseService.getReleaseNameFromCurrentTime,
      releaseNameComparer: releaseService.releasesSorter,
      tempDirectory: osOpsSpy.mock.results[0].value,
      dirToCopy: osOpsSpy.mock.results[0].value + '/dist',
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
      dirToCopy: osOpsSpy.mock.results[0].value + '/dist',
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
});
