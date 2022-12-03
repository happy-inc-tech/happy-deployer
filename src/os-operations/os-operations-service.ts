import { inject, injectable } from 'inversify';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import child_process from 'node:child_process';
import fs from 'node:fs';
import LoggerService from '../logger/logger-service.js';
import format from 'date-fns/format'

@injectable()
export default class OsOperationsService {
  constructor(@inject(LoggerService) protected readonly logger: LoggerService) {}

  public getReleaseNameFromCurrentTime(): string {
    const now = new Date();
    return format(now, 'yyyyMMddHHmmss')
  }

  public getTempDirectoryPath(): string {
    return os.tmpdir();
  }

  public getRandomBuildDirectory(): string {
    return path.resolve(this.getTempDirectoryPath(), crypto.randomUUID());
  }

  public getPathRelativeToBuildDirectory(buildDir: string, ...pathParts: string[]): string {
    return path.resolve(buildDir, ...pathParts);
  }

  public execute(command: string, args: string[], runIn?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const resultCommand = [command, ...args].join(' ');
      child_process.exec(
        resultCommand,
        {
          cwd: runIn,
        },
        (error, stdout, stderr) => {
          if (stderr) {
            this.logger.dev(stderr);
          }

          if (stdout) {
            this.logger.dev(stdout);
          }

          if (error) {
            this.logger.error(error);
            reject(error);
            return;
          } else {
            resolve();
          }
        },
      );
    });
  }

  public async createDirectory(path: string) {
    this.logger.dev('creating directory', path);
    return fs.promises.mkdir(path);
  }

  public removeDirectory(path: string) {
    this.logger.dev('removing directory', path);
    return fs.rmSync(path, { recursive: true });
  }
}
