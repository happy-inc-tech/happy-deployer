/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { inject, injectable } from 'inversify';
import type { DeployerSshInterface } from './types.js';
import type { SshCredentials } from '../server/types.js';
import Ssh2SshService from './services/ssh2-ssh-service.js';
import ShellSshService from './services/shell-ssh-service.js';
import LoggerService from '../logger/logger-service.js';
import ProcessService from '../process/process-service.js';
import type { LoggerInterface } from '../logger/types.js';

@injectable()
export default class SshManager implements DeployerSshInterface {
  public serviceName = 'SshManager';
  protected services: DeployerSshInterface[] = [];
  protected service: DeployerSshInterface | null = null;

  constructor(
    @inject(Ssh2SshService) protected readonly ssh2SshService: Ssh2SshService,
    @inject(ShellSshService) protected readonly shellSshService: ShellSshService,
    @inject(LoggerService) protected readonly logger: LoggerInterface,
    @inject(ProcessService) protected readonly processService: ProcessService,
  ) {
    this.services = [this.ssh2SshService, this.shellSshService];
  }

  public async connect(credentials: SshCredentials): Promise<void> {
    for (const service of this.services) {
      try {
        await service.connect(credentials);
        this.logger.verbose('ssh manager: using', service.serviceName);
        this.service = service;
        return;
      } catch (e) {
        this.logger.verbose(service.serviceName, 'failed to connect');
      }
    }
    this.logger.error('SSH connection with all services failed');
    this.processService.errorExit();
  }

  public async disconnect(): Promise<void> {
    return this.service!.disconnect();
  }

  public async executeRemoteCommand(command: string): Promise<string> {
    return this.service!.executeRemoteCommand(command);
  }

  public async getDirectoriesList(remotePath: string): Promise<string[]> {
    return this.service!.getDirectoriesList(remotePath);
  }

  public async uploadDirectory(localPath: string, remotePath: string): Promise<void> {
    return this.service!.uploadDirectory(localPath, remotePath);
  }

  public async readRemoteSymlink(path: string): Promise<string> {
    return this.service!.readRemoteSymlink(path);
  }
}
