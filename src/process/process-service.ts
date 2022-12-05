import { inject, injectable } from 'inversify';
import LoggerService from '../logger/logger-service.js';

@injectable()
export default class ProcessService {
  constructor(@inject(LoggerService) protected readonly logger: LoggerService) {}

  public exit() {
    process.exit();
  }

  public errorExit(code = 1) {
    this.logger.error('[PROCESS]', `process terminated with code "${code}"`);
    process.exit(code);
  }
}
