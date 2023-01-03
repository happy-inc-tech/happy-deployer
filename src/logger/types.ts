export interface LoggerInterface {
  info(...messages: any[]): void;
  error(...messages: any[]): void;
  warn(...messages: any[]): void;
  success(...messages: any[]): void;
  verbose(...messages: any[]): void;
  command(...messages: any[]): void;
}

export enum LoggerLevels {
  INFO = 'INFO',
  ERROR = 'ERROR',
  SUCCESS = 'SUCCESS',
  WARNING = 'WARN',
  COMMAND = 'COMMAND',
  VERBOSE = 'VERBOSE',
}
