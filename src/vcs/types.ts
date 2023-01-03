export interface VSCServiceInterface {
  fetchFiles(remoteRepo: string, branch: string, localPath: string): Promise<void>;
}
