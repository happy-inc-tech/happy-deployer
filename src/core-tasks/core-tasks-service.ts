import { inject, injectable } from 'inversify';
import TaskService from '../task/task-service.js';
import GitService from '../vcs/git-service.js';
import OsOperationsService from '../os-operations/os-operations-service.js';
import ReleaseService from '../release/release-service.js';
import SshManager from '../ssh/ssh-manager.js';
import type { DeployerSshInterface } from '../ssh/types.js';
import { taskPositions } from '../task/const.js';
import {
  CLEANUP_CORE_TASK_NAME,
  GIT_CORE_TASK_NAME,
  RELEASES_CLEANUP_CORE_TASK_NAME,
  RELEASES_CREATE_DIR_CORE_TASK_NAME,
  RELEASES_ROLLBACK_DELETE_IF_NEED_CORE_TASK_NAME,
  RELEASES_ROLLBACK_FIND_RELEASES_CORE_TASK_NAME,
  RELEASES_UPDATE_SYMLINK_CORE_TASK_NAME,
  RELEASES_UPLOAD_CORE_TASK_NAME,
  SSH_CONNECT_CORE_TASK_NAME,
  SSH_DISCONNECT_CORE_TASK_NAME,
} from './const.js';
import type { VSCServiceInterface } from '../vcs/types.js';

@injectable()
export default class CoreTasksService {
  constructor(
    @inject(TaskService) protected readonly taskService: TaskService,
    @inject(GitService) protected readonly gitService: VSCServiceInterface,
    @inject(OsOperationsService) protected readonly osOperationsService: OsOperationsService,
    @inject(ReleaseService) protected readonly releaseService: ReleaseService,
    @inject(SshManager) protected readonly sshManager: DeployerSshInterface,
  ) {}

  public createGitTask() {
    this.taskService.addTask(
      GIT_CORE_TASK_NAME,
      async ({ serverConfig: { repository, tempDirectory, branch }, logger }) => {
        if (!repository) {
          logger.info('"repository" key is undefined, skipping task');
          return;
        }
        await this.gitService.fetchFiles(repository, branch, tempDirectory);
      },
      taskPositions.FIRST,
    );
  }

  public createCleanupTask() {
    this.taskService.addTask(
      CLEANUP_CORE_TASK_NAME,
      async ({ serverConfig: { tempDirectory } }) => {
        this.osOperationsService.removeDirectory(tempDirectory);
      },
      taskPositions.DIRECT,
    );
  }

  public createReleaseTask() {
    this.taskService.addTask(
      RELEASES_CREATE_DIR_CORE_TASK_NAME,
      async () => {
        await this.releaseService.createRelease();
      },
      taskPositions.DIRECT,
    );
  }

  public createUploadReleaseTask() {
    this.taskService.addTask(
      RELEASES_UPLOAD_CORE_TASK_NAME,
      async ({ serverConfig }) => {
        await this.releaseService.uploadRelease(serverConfig);
      },
      taskPositions.DIRECT,
    );
  }

  public createSshConnectTask() {
    this.taskService.addTask(
      SSH_CONNECT_CORE_TASK_NAME,
      async ({ serverConfig }) => {
        await this.sshManager.connect(serverConfig.ssh);
      },
      taskPositions.DIRECT,
    );
  }

  public createSshDisconnectTask() {
    this.taskService.addTask(
      SSH_DISCONNECT_CORE_TASK_NAME,
      async () => {
        await this.sshManager.disconnect();
      },
      taskPositions.DIRECT,
    );
  }

  public createCleanUpReleasesTask() {
    this.taskService.addTask(
      RELEASES_CLEANUP_CORE_TASK_NAME,
      async ({ serverConfig }) => {
        await this.releaseService.cleanUpReleases(serverConfig);
      },
      taskPositions.DIRECT,
    );
  }

  public createUpdateSymlinkTask() {
    this.taskService.addTask(
      RELEASES_UPDATE_SYMLINK_CORE_TASK_NAME,
      async ({ serverConfig }) => {
        await this.releaseService.createSymlinkForCurrentRelease(serverConfig);
      },
      taskPositions.DIRECT,
    );
  }

  public createRollbackFindReleasesTask() {
    this.taskService.addTask(
      RELEASES_ROLLBACK_FIND_RELEASES_CORE_TASK_NAME,
      async ({ serverConfig }) => {
        await this.releaseService.findCurrentAndPreviousReleaseForRollback(serverConfig);
      },
      taskPositions.DIRECT,
    );
  }

  public createRemoveRollbackRelease() {
    this.taskService.addTask(
      RELEASES_ROLLBACK_DELETE_IF_NEED_CORE_TASK_NAME,
      async ({ serverConfig }) => {
        await this.releaseService.deleteReleaseForRollback(serverConfig);
      },
      taskPositions.DIRECT,
    );
  }
}
