import { inject, injectable } from 'inversify';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import child_process from 'node:child_process';
import fs from 'node:fs';
import LoggerService from '../logger/logger-service.js';
import { FsEntity } from './types.js';

@injectable()
export default class OsOperationsService {
  constructor(@inject(LoggerService) protected readonly logger: LoggerService) {}

  public getTempDirectoryPath(): string {
    return os.tmpdir();
  }

  public getHomeDirectoryPath(): string {
    return os.homedir();
  }

  public getRandomBuildDirectory(): string {
    return path.resolve(this.getTempDirectoryPath(), crypto.randomUUID());
  }

  public getPathRelativeToBuildDirectory(buildDir: string, ...pathParts: string[]): string {
    return path.resolve(buildDir, ...pathParts);
  }

  public execute(command: string, args: string[], runIn?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const resultCommand = [command, ...args].join(' ');
      child_process.exec(
        resultCommand,
        {
          cwd: runIn,
        },
        (error, stdout, stderr) => {
          if (stderr) {
            this.logger.verbose(stderr);
          }

          if (stdout) {
            this.logger.verbose(stdout);
          }

          if (error) {
            this.logger.error(error);
            reject(error);
            return;
          } else {
            resolve(stdout);
          }
        },
      );
    });
  }

  public async createDirectory(path: string) {
    this.logger.verbose('creating directory', path);
    return fs.promises.mkdir(path);
  }

  public removeDirectory(path: string) {
    this.logger.verbose('removing directory', path);
    return fs.rmSync(path, { recursive: true });
  }

  public async getDirectoryContents(path: string): Promise<FsEntity[]> {
    const contents = await fs.promises.readdir(path, { withFileTypes: true });
    return contents.map((entry) => {
      let type: FsEntity['type'] = 'file';
      if (entry.isDirectory()) {
        type = 'directory';
      }

      return {
        name: entry.name,
        type,
      };
    });
  }
}
