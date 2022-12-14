import type { SshCredentials } from '../server/types.js';

export interface DeployerSshInterface {
  serviceName: string;
  executeRemoteCommand(command: string): Promise<string>;
  uploadDirectory(localPath: string, remotePath: string): Promise<void>;
  getDirectoriesList(remotePath: string): Promise<string[]>;
  connect(credentials: SshCredentials): Promise<void>;
  disconnect(): void | Promise<void>;
  readRemoteSymlink(path: string): Promise<string>;
}
