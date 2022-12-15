import { DeployerSshInterface } from '../types.js';
import { inject, injectable } from 'inversify';
import { SshCredentials } from '../../server/types.js';
import OsOperationsService from '../../os-operations/os-operations-service.js';
import LoggerService from '../../logger/logger-service.js';
import ProcessService from '../../process/process-service.js';

@injectable()
export default class ShellSshService implements DeployerSshInterface {
  public serviceName = 'System ssh service';
  protected credentials: SshCredentials | null = null;

  constructor(
    @inject(OsOperationsService) protected readonly osOperationsService: OsOperationsService,
    @inject(LoggerService) protected readonly logger: LoggerService,
    @inject(ProcessService) protected readonly processService: ProcessService,
  ) {}

  public async connect(credentials: SshCredentials): Promise<void> {
    this.log('no need to connect in shell mode; storing credentials instead', 'verbose');
    this.log('it seems like node.js ssh failed to connect to remote server', 'warn');
    this.log('using your system\'s SSH: "password" setting is ignored', 'warn');
    this.credentials = credentials;
    const sshCommand = this.createSshRemoteCommandString('exit');
    await this.osOperationsService.execute(sshCommand, []);
  }

  public disconnect(): void | Promise<void> {
    this.log('no need to disconnect in shell mode', 'verbose');
    return undefined;
  }

  public async executeRemoteCommand(command: string): Promise<void> {
    const sshCommand = this.createSshRemoteCommandString(command);
    await this.osOperationsService.execute(sshCommand, []);
  }

  public async getDirectoriesList(remotePath: string): Promise<string[]> {
    const sshCommand = this.createSshRemoteCommandString(`cd ${remotePath} && ls -FlA`);
    const commandResult = await this.osOperationsService.execute(sshCommand, []);
    return this.getDirectoriesFromLsFlaResult(commandResult);
  }

  public async uploadDirectory(localPath: string, remotePath: string): Promise<void> {
    if (!this.credentials || !this.credentials.username || !this.credentials.host) {
      this.log('no required SSH credentials found in ShellSshService');
      this.processService.errorExit();
      throw new Error();
    }

    const { username, host, port = 22 } = this.credentials;

    const command = `scp -r -P ${port} ${localPath}/* ${username}@${host}:${remotePath}`;
    await this.osOperationsService.execute(command, []);
  }

  protected getDirectoriesFromLsFlaResult(commandResult: string): string[] {
    const lines = commandResult.split('\n');
    const directories: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line) {
        continue;
      }

      const split = line.split(/\s+/);
      const name = split[split.length - 1];
      if (!name.endsWith('/')) {
        continue;
      }
      directories.push(name.trim().slice(0, -1));
    }

    return directories;
  }

  protected createSshRemoteCommandString(command: string): string {
    if (!this.credentials || !this.credentials.username || !this.credentials.host) {
      this.log('no required SSH credentials found in ShellSshService');
      this.processService.errorExit();
      throw new Error();
    }

    const { username, host, port = 22 } = this.credentials;

    return `ssh ${username}@${host} -p ${port} '${command}'`;
  }

  protected log(message: string, level: keyof LoggerService = 'info') {
    this.logger[level]('[SSH-SHELL]', message);
  }
}
