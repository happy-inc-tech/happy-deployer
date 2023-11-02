import { inject, injectable } from 'inversify';
import path from 'node:path';
import format from 'date-fns/format/index.js';
import parse from 'date-fns/parse/index.js';
import isBefore from 'date-fns/isBefore/index.js';
import type { ServerConfiguration } from '../server/types.js';
import { TIME_FORMAT } from './const.js';
import LoggerService from '../logger/logger-service.js';
import StorageService from '../storage/storage-service.js';
import ProcessService from '../process/process-service.js';
import SshManager from '../ssh/ssh-manager.js';
import type { DeployerSshInterface } from '../ssh/types.js';
import type { LoggerInterface } from '../logger/types.js';

@injectable()
export default class ReleaseService {
  constructor(
    @inject(SshManager) protected readonly sshManager: DeployerSshInterface,
    @inject(StorageService) protected readonly storage: StorageService,
    @inject(LoggerService) protected readonly logger: LoggerInterface,
    @inject(ProcessService) protected readonly process: ProcessService,
  ) {}

  public getReleaseNameFromCurrentTime(): string {
    const now = new Date();
    return format(now, TIME_FORMAT);
  }

  public releasesSorter(a: string, b: string): number {
    const dateAParsed = parse(a, TIME_FORMAT, new Date());
    const dateBParsed = parse(b, TIME_FORMAT, new Date());
    return isBefore(dateAParsed, dateBParsed) ? 1 : -1;
  }

  public createReleaseNameAndPath(serverConfig: ServerConfiguration) {
    const settings = serverConfig.deployer;
    const releaseName = serverConfig.releaseNameGetter();
    const releasePath = path.join(serverConfig.deployPath, settings.releasesDirName, releaseName);
    this.storage.setReleaseName(releaseName);
    this.storage.setReleasePath(releasePath);
  }

  public async createRelease() {
    await this.sshManager.executeRemoteCommand(`mkdir -p ${this.storage.getReleasePath()}`);
  }

  public async uploadRelease(serverConfig: ServerConfiguration) {
    const releasePath = this.getCurrentReleasePath();
    const dirToUpload = path.resolve(serverConfig.tempDirectory, serverConfig.dirToCopy);

    await this.sshManager.uploadDirectory(dirToUpload, releasePath);
  }

  public getCurrentReleaseName(): string {
    return this.storage.getReleaseName();
  }

  public getCurrentReleasePath(): string {
    return this.storage.getReleasePath();
  }

  public async cleanUpReleases(serverConfig: ServerConfiguration) {
    const allOtherReleases = await this.getAllOtherReleases(serverConfig);
    const sorted = [...allOtherReleases].sort(serverConfig.releaseNameComparer);
    const settings = serverConfig.deployer;
    const releasesToDelete = sorted.slice(settings.keepReleases, sorted.length);
    this.logger.info(`${releasesToDelete.length} release(s) will be deleted (keeping ${settings.keepReleases})`);

    for (const release of releasesToDelete) {
      await this.deleteRelease(serverConfig, release);
    }
  }

  public async findCurrentAndPreviousReleaseForRollback(serverConfig: ServerConfiguration) {
    const allOtherReleases = await this.getAllOtherReleases(serverConfig);
    const sorted = [...allOtherReleases].sort(serverConfig.releaseNameComparer);
    const currentRelease = await this.getReleaseFromCurrentSymlinkOnRemote(serverConfig);
    const idx = sorted.indexOf(currentRelease);

    if (idx === -1) {
      this.logger.error('cannot perform rollback: current release not found in releases dir');
      this.process.errorExit();
      return;
    }

    if (idx === sorted.length - 1) {
      this.logger.error(`cannot perform rollback: current release "${currentRelease}" is last`);
      this.process.errorExit(1);
      return;
    }

    this.storage.setReleaseName(sorted[idx + 1]);
    this.storage.setPreviousReleaseName(currentRelease);
  }

  public async deleteReleaseForRollback(serverConfig: ServerConfiguration) {
    if (!serverConfig.deployer.deleteOnRollback) {
      this.logger.info('deleteOnRollback is false - aborting');
      return;
    }

    const releaseToDelete = this.storage.getPreviousReleaseName();
    await this.deleteRelease(serverConfig, releaseToDelete);
  }

  public async createSymlinkForCurrentRelease(serverConfig: ServerConfiguration) {
    const currentRelease = this.getCurrentReleaseName();
    const settings = serverConfig.deployer;
    await this.sshManager.executeRemoteCommand(
      `cd ${serverConfig.deployPath} && rm -f ./${settings.currentReleaseSymlinkName} && ln -s ./${settings.releasesDirName}/${currentRelease} ./${settings.currentReleaseSymlinkName}`,
    );
  }

  protected async getAllOtherReleases(serverConfig: ServerConfiguration) {
    const settings = serverConfig.deployer;
    return this.sshManager.getDirectoriesList(path.join(serverConfig.deployPath, settings.releasesDirName));
  }

  protected async deleteRelease(serverConfig: ServerConfiguration, releaseName: string) {
    this.logger.info(`deleting release ${releaseName}`);
    const releasePath = path.join(serverConfig.deployPath, serverConfig.deployer.releasesDirName, releaseName);
    await this.sshManager.executeRemoteCommand(`rm -rf ${releasePath}`);
  }

  protected async getReleaseFromCurrentSymlinkOnRemote(serverConfig: ServerConfiguration): Promise<string> {
    const currentSymlinkFullPath = path.join(serverConfig.deployPath, serverConfig.deployer.currentReleaseSymlinkName);
    const releasePath = await this.sshManager.readRemoteSymlink(currentSymlinkFullPath);
    return path.basename(releasePath);
  }
}
