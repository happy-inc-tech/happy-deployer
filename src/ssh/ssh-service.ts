import { inject, injectable } from 'inversify';
import { NodeSSH } from 'node-ssh';
import LoggerService from '../logger/logger-service.js';
import type { SshCredentials } from '../server/types.js';
import ProcessService from '../process/process-service.js';
import fs from 'node:fs';

@injectable()
export default class SshService {
  private sshClient = new NodeSSH();
  private connected = false;

  constructor(
    @inject(LoggerService) protected logger: LoggerService,
    @inject(ProcessService) protected processService: ProcessService,
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
    await this.sshClient.connect(credentials);
    this.connected = true;
  }

  public async disconnect() {
    this.sshClient.dispose();
  }
}
