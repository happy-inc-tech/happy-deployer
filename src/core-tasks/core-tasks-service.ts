import { inject, injectable } from 'inversify';
import TaskService from '../task/task-service.js';
import GitService from '../git/git-service.js';
import OsOperationsService from '../os-operations/os-operations-service.js';
import ReleaseService from '../release/release-service.js';
import SshService from '../ssh/ssh-service.js';

@injectable()
export default class CoreTasksService {
  constructor(
    @inject(TaskService) protected readonly taskService: TaskService,
    @inject(GitService) protected readonly gitService: GitService,
    @inject(OsOperationsService) protected readonly osOperationsService: OsOperationsService,
    @inject(ReleaseService) protected readonly releaseService: ReleaseService,
    @inject(SshService) protected readonly sshService: SshService,
  ) {}

  public createGitTask() {
    this.taskService.addTask(
      'git:clone-branch-pull',
      async ({ serverConfig: { repository, tempDirectory, branch }, logger }) => {
        if (!repository) {
          logger.info('"repository" key is undefined, skipping task');
          return;
        }
        await this.gitService.cloneRepository(repository, tempDirectory);
        await this.gitService.changeBranch(tempDirectory, branch);
        await this.gitService.pull(tempDirectory);
      },
      true,
    );
  }

  public createCleanupTask() {
    this.taskService.addTask('cleanup', async ({ serverConfig: { tempDirectory } }) => {
      this.osOperationsService.removeDirectory(tempDirectory);
    });
  }

  public createReleaseTask() {
    this.taskService.addTask('releases:create', async ({ serverConfig }) => {
      await this.releaseService.createRelease(serverConfig);
    });
  }

  public createUploadReleaseTask() {
    this.taskService.addTask('releases:upload', async ({ serverConfig }) => {
      await this.releaseService.uploadRelease(serverConfig);
    });
  }

  public createSshConnectTask() {
    this.taskService.addTask('ssh:connect', async ({ serverConfig }) => {
      await this.sshService.connect(serverConfig.ssh);
    });
  }

  public createSshDisconnectTask() {
    this.taskService.addTask('ssh:disconnect', async () => {
      await this.sshService.disconnect();
    });
  }

  public createCleanUpReleasesTask() {
    this.taskService.addTask('releases:cleanup', async ({ serverConfig }) => {
      await this.releaseService.cleanUpReleases(serverConfig);
    });
  }

  public createUpdateSymlinkTask() {
    this.taskService.addTask('releases:update-symlink', async ({ serverConfig }) => {
      await this.releaseService.createSymlinkForCurrentRelease(serverConfig);
    });
  }

  public createRollbackFindReleasesTask() {
    this.taskService.addTask('releases:rollback:find-releases', async ({ serverConfig }) => {
      await this.releaseService.findCurrentAndPreviousReleaseForRollback(serverConfig);
    });
  }

  public createRemoveRollbackRelease() {
    this.taskService.addTask('releases:rollback:delete-if-need', async ({ serverConfig }) => {
      await this.releaseService.deleteReleaseForRollback(serverConfig);
    });
  }
}
