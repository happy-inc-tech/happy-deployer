export interface OsOperationsInterface {
  getTempDirectoryPath(): string;
  getHomeDirectoryPath(): string;
  getRandomBuildDirectory(): string;
  /**
   * Expected return value is whole stdout of
   * executed command
   * @param command
   * @param cwd
   */
  execute(command: string, cwd?: string): Promise<string>;
  createDirectory(path: string): Promise<void>;
  removeDirectory(path: string): Promise<void> | void;
  getFilesAndFoldersFromDirectory(path: string): Promise<FsEntity[]>;
}

export type FsEntity = {
  name: string;
  type: 'directory' | 'file';
};
