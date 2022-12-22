import { describe, it, expect, vi } from 'vitest';
import ReleaseService from '../release-service.js';
import StorageService from '../../storage/storage-service.js';
import SshManager from '../../ssh/ssh-manager.js';
import { getService } from '../../container/index.js';

describe('release-service', () => {
  const releaseService = getService(ReleaseService);
  const storageService = getService(StorageService);
  const sshManager = getService(SshManager);

  const serverConfig: any = {
    releaseNameGetter: () => '1',
    deployPath: '/deploy/path',
    deployer: {
      releasesDirName: 'releases',
      currentReleaseSymlinkName: 'current',
      keepReleases: 3,
    },
    releaseNameComparer: releaseService.releasesSorter,
  };

  vi.spyOn(sshManager, 'executeRemoteCommand').mockImplementation(() => Promise.resolve(''));
  vi.spyOn(sshManager, 'getDirectoriesList').mockImplementation(() =>
    Promise.resolve(['20220522130000', '20220522130100', '20220522120000', '20220522140000']),
  );
  vi.spyOn(sshManager, 'readRemoteSymlink').mockImplementation(() => Promise.resolve('20220522140000'));

  it('gets release name', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2022, 4, 22, 13, 0, 0));

    expect(releaseService.getReleaseNameFromCurrentTime()).toEqual('20220522130000');

    vi.useRealTimers();
  });

  it('creates name and path in storage', () => {
    releaseService.createReleaseNameAndPath(serverConfig);

    expect(storageService.getReleaseName()).toEqual(serverConfig.releaseNameGetter());
    expect(storageService.getReleasePath()).toEqual(
      `${serverConfig.deployPath}/${serverConfig.deployer.releasesDirName}/${serverConfig.releaseNameGetter()}`,
    );
  });

  it('calls ssh command to create release', () => {
    releaseService.createRelease();
    expect(sshManager.executeRemoteCommand).toHaveBeenCalledWith(
      `mkdir -p ${serverConfig.deployPath}/${
        serverConfig.deployer.releasesDirName
      }/${serverConfig.releaseNameGetter()}`,
    );
  });

  it('sorts releases correctly', async () => {
    const releases = await sshManager.getDirectoriesList('');
    releases.sort(releaseService.releasesSorter);
    expect(releases).toStrictEqual(['20220522140000', '20220522130100', '20220522130000', '20220522120000']);
  });

  it('cleans releases correctly', async () => {
    await releaseService.cleanUpReleases(serverConfig);
    expect(sshManager.executeRemoteCommand).toHaveBeenCalledWith(
      `rm -rf ${serverConfig.deployPath}/${serverConfig.deployer.releasesDirName}/20220522120000`,
    );
  });

  it('correctly finds releases for rollback', async () => {
    await releaseService.findCurrentAndPreviousReleaseForRollback(serverConfig);
    expect(storageService.getReleaseName()).toEqual('20220522130100');
    expect(storageService.getPreviousReleaseName()).toEqual('20220522140000');
  });

  it('executes remote command for updating symlink', async () => {
    await releaseService.createReleaseNameAndPath(serverConfig);
    await releaseService.createSymlinkForCurrentRelease(serverConfig);
    expect(sshManager.executeRemoteCommand).toHaveBeenCalledWith(
      `cd ${serverConfig.deployPath} && rm -f ./${serverConfig.deployer.currentReleaseSymlinkName} && ln -s ./${
        serverConfig.deployer.releasesDirName
      }/${storageService.getReleaseName()} ./${serverConfig.deployer.currentReleaseSymlinkName}`,
    );
  });
});
