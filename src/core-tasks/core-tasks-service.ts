import { inject, injectable } from 'inversify';
import TaskService from '../task/task-service.js';
import GitService from '../git/git-service.js';
import OsOperationsService from '../os-operations/os-operations-service.js';
import ReleaseService from '../release/release-service.js';
import SshManager from '../ssh/ssh-manager.js';
import type { DeployerSshInterface } from '../ssh/types.js';
import { TASK_POSITIONS } from '../task/const.js';
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

@injectable()
export default class CoreTasksService {
  constructor(
    @inject(TaskService) protected readonly taskService: TaskService,
    @inject(GitService) protected readonly gitService: GitService,
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
        await this.gitService.cloneRepository(repository, tempDirectory);
        await this.gitService.changeBranch(tempDirectory, branch);
        await this.gitService.pull(tempDirectory);
      },
      TASK_POSITIONS.FIRST,
    );
  }

  public createCleanupTask() {
    this.taskService.addTask(
      CLEANUP_CORE_TASK_NAME,
      async ({ serverConfig: { tempDirectory } }) => {
        this.osOperationsService.removeDirectory(tempDirectory);
      },
      TASK_POSITIONS.DIRECT,
    );
  }

  public createReleaseTask() {
    this.taskService.addTask(
      RELEASES_CREATE_DIR_CORE_TASK_NAME,
      async () => {
        await this.releaseService.createRelease();
      },
      TASK_POSITIONS.DIRECT,
    );
  }

  public createUploadReleaseTask() {
    this.taskService.addTask(
      RELEASES_UPLOAD_CORE_TASK_NAME,
      async ({ serverConfig }) => {
        await this.releaseService.uploadRelease(serverConfig);
      },
      TASK_POSITIONS.DIRECT,
    );
  }

  public createSshConnectTask() {
    this.taskService.addTask(
      SSH_CONNECT_CORE_TASK_NAME,
      async ({ serverConfig }) => {
        await this.sshManager.connect(serverConfig.ssh);
      },
      TASK_POSITIONS.DIRECT,
    );
  }

  public createSshDisconnectTask() {
    this.taskService.addTask(
      SSH_DISCONNECT_CORE_TASK_NAME,
      async () => {
        await this.sshManager.disconnect();
      },
      TASK_POSITIONS.DIRECT,
    );
  }

  public createCleanUpReleasesTask() {
    this.taskService.addTask(
      RELEASES_CLEANUP_CORE_TASK_NAME,
      async ({ serverConfig }) => {
        await this.releaseService.cleanUpReleases(serverConfig);
      },
      TASK_POSITIONS.DIRECT,
    );
  }

  public createUpdateSymlinkTask() {
    this.taskService.addTask(
      RELEASES_UPDATE_SYMLINK_CORE_TASK_NAME,
      async ({ serverConfig }) => {
        await this.releaseService.createSymlinkForCurrentRelease(serverConfig);
      },
      TASK_POSITIONS.DIRECT,
    );
  }

  public createRollbackFindReleasesTask() {
    this.taskService.addTask(RELEASES_ROLLBACK_FIND_RELEASES_CORE_TASK_NAME, async ({ serverConfig }) => {
      await this.releaseService.findCurrentAndPreviousReleaseForRollback(serverConfig);
    });
  }

  public createRemoveRollbackRelease() {
    this.taskService.addTask(RELEASES_ROLLBACK_DELETE_IF_NEED_CORE_TASK_NAME, async ({ serverConfig }) => {
      await this.releaseService.deleteReleaseForRollback(serverConfig);
    });
  }
}
