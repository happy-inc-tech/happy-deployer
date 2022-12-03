import { inject, injectable } from 'inversify';
import TaskService from '../task/task-service.js';
import GitService from '../git/git-service.js';
import OsOperationsService from '../os-operations/os-operations-service.js';
import ReleaseService from "../release/release-service.js";
import SshService from "../ssh/ssh-service.js";

@injectable()
export default class CoreTasksService {
  constructor(
    @inject(TaskService) protected readonly taskService: TaskService,
    @inject(GitService) protected readonly gitService: GitService,
    @inject(OsOperationsService) protected readonly osOperationsService: OsOperationsService,
    @inject(ReleaseService) protected readonly releaseService: ReleaseService,
    @inject(SshService) protected readonly sshService: SshService
  ) {}

  public createGitTask() {
    this.taskService.addTask('git:clone-branch-pull', async ({ repository, tempDirectory, branch }) => {
      await this.gitService.cloneRepository(repository, tempDirectory);
      await this.gitService.changeBranch(tempDirectory, branch);
      await this.gitService.pull(tempDirectory);
    });
  }

  public createBuildTask(installDepsCommand: string, buildCommand: string) {
    this.taskService.addTask('install-deps', async ({ tempDirectory }) => {
      await this.osOperationsService.execute(installDepsCommand, [], tempDirectory);
    });
    this.taskService.addTask('build', async ({ tempDirectory }) => {
      await this.osOperationsService.execute(buildCommand, [], tempDirectory);
    });
  }

  public createCleanupTask() {
    this.taskService.addTask('cleanup', async ({ tempDirectory }) => {
      this.osOperationsService.removeDirectory(tempDirectory);
    });
  }

  public createReleaseTask() {
    this.taskService.addTask('create-release', async ({ name }) => {
      await this.releaseService.createRelease(name)
    })
  }

  public createUploadReleaseTask() {
    this.taskService.addTask('upload-release', async ({ name }) => {
      await this.releaseService.uploadRelease(name)
    })
  }

  public createSshConnectTask() {
    this.taskService.addTask('ssh:connect', async (serverConfig) => {
      await this.sshService.connect(this.releaseService.serverConfigToSshCredentials(serverConfig))
    })
  }

  public createSshDisconnectTask() {
    this.taskService.addTask('ssh:disconnect', async () => {
      await this.sshService.disconnect()
    })
  }
}
