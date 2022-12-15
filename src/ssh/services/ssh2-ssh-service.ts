import { inject, injectable } from 'inversify';
import { NodeSSH } from 'node-ssh';
import LoggerService from '../../logger/logger-service.js';
import type { SshCredentials } from '../../server/types.js';
import ProcessService from '../../process/process-service.js';
import fs from 'node:fs';
import { DeployerSshInterface } from '../types.js';
import OsOperationsService from '../../os-operations/os-operations-service.js';
import path from 'node:path';

@injectable()
export default class Ssh2SshService implements DeployerSshInterface {
  public serviceName = 'SSH2 (node-ssh) service';
  protected sshClient = new NodeSSH();
  protected connected = false;

  constructor(
    @inject(LoggerService) protected readonly logger: LoggerService,
    @inject(ProcessService) protected readonly processService: ProcessService,
    @inject(OsOperationsService) protected readonly osOperationsService: OsOperationsService,
  ) {}

  public async executeRemoteCommand(command: string) {
    const { stdout, stderr, code } = await this.sshClient.execCommand(command);
    stdout && this.logger.info('[SSH]', stdout);
    stderr && this.logger.error('[SSH]', stderr);
    if (code !== 0) {
      this.logger.error('[SSH]', `remote command "${command}" failed`);
      this.processService.errorExit(1);
    }
  }

  public async uploadDirectory(localPath: string, remotePath: string) {
    const status = await this.sshClient.putDirectory(localPath, remotePath, {
      recursive: true,
      concurrency: 5,
      tick: (localFile, remoteFile, error) => {
        if (error) {
          this.logger.error('[SSH]', 'failed upload file', localFile);
        }
      },
    });

    if (!status) {
      this.logger.error('[SSH]', 'directory upload failed');
    }
  }

  public async getDirectoriesList(remotePath: string): Promise<string[]> {
    const sftp = await this.sshClient.requestSFTP();
    return new Promise((resolve) => {
      sftp.readdir(remotePath, (err, list) => {
        if (err) {
          this.logger.error('[SSH]', err.message);
          this.processService.errorExit(1);
          return [];
        }

        const directories = list.reduce<string[]>((total, current) => {
          if ((current.attrs.mode & fs.constants.S_IFMT) === fs.constants.S_IFDIR) {
            total.push(current.filename);
          }

          return total;
        }, []);

        resolve(directories);
      });
    });
  }

  public async connect(credentials: SshCredentials) {
    if (!credentials.password && !credentials.privateKey && !credentials.privateKeyPath) {
      return this.connectWithEnumerationOfSshKeys(credentials);
    }
    await this.sshClient.connect(credentials);
    this.connected = true;
  }

  public async disconnect() {
    this.sshClient.dispose();
  }

  protected async connectWithEnumerationOfSshKeys(credentials: SshCredentials) {
    const homeDir = this.osOperationsService.getHomeDirectoryPath();
    const sshDir = path.join(homeDir, '.ssh');
    const sshDirContents = await this.osOperationsService.getDirectoryContents(sshDir);
    const FORBIDDEN_VALUES = ['known_hosts', 'authorized_keys'];
    const sshPrivateKeysPaths = sshDirContents.reduce<string[]>((total, entry) => {
      if (entry.type === 'file' && !FORBIDDEN_VALUES.includes(entry.name) && !entry.name.endsWith('.pub')) {
        total.push(path.join(sshDir, entry.name));
      }
      return total;
    }, []);

    for (const keyPath of sshPrivateKeysPaths) {
      try {
        this.log(`trying to connect with ${keyPath}`, 'verbose');
        await this.sshClient.connect({
          ...credentials,
          privateKeyPath: keyPath,
        });
        this.connected = true;
        return;
      } catch (e) {
        this.log(`failed to connect with ${keyPath}`, 'verbose');
      }
    }

    throw new Error('All SSH keys failed to connect');
  }

  protected log(message: string, level: keyof LoggerService = 'info') {
    this.logger[level]('[SSH]', message);
  }
}
