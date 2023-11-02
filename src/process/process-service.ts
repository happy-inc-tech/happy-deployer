import { inject, injectable } from 'inversify';
import LoggerService from '../logger/logger-service.js';
import type { LoggerInterface } from '../logger/types.js';

@injectable()
export default class ProcessService {
  constructor(@inject(LoggerService) protected readonly logger: LoggerInterface) {}

  public exit() {
    process.exit();
  }

  public errorExit(code = 1) {
    this.logger.error('[PROCESS]', `process terminated with code "${code}"`);
    process.exit(code);
  }
}
