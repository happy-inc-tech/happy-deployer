import { Config } from 'node-ssh';

declare enum RequiredSteps {
    BASE_CONFIG = "BASE_CONFIG",
    AT_LEAST_ONE_SERVER = "AT_LEAST_ONE_SERVER"
}
type DeployerAction = 'deploy' | 'rollback';

declare enum LoggerLevels {
    INFO = "INFO",
    ERROR = "ERROR",
    SUCCESS = "SUCCESS",
    WARNING = "WARN",
    COMMAND = "COMMAND",
    VERBOSE = "VERBOSE"
}

declare class CacheService {
    protected readonly _cache: Map<string, unknown>;
    cache(key: string, value: unknown): void;
    getCached<T = unknown>(key: string): T | null;
    reset(): void;
}

type DeepPartial<T> = T extends object ? {
    [P in keyof T]?: DeepPartial<T[P]>;
} : T;
type ValuesOf<T extends Record<string, unknown>> = T[keyof T];

type SshCredentials = Config;
type DeployerBehavior = {
    keepReleases: number;
    deleteOnRollback: boolean;
    releasesDirName: string;
    currentReleaseSymlinkName: string;
    showCommandLogs: boolean;
};
type ServerConfiguration<MetaType extends Record<string, unknown> = Record<string, unknown>> = {
    name: string;
    repository?: string;
    branch: string;
    deployPath: string;
    dirToCopy: string;
    tempDirectory: string;
    releaseNameGetter: () => string;
    releaseNameComparer: (a: string, b: string) => number;
    ssh: SshCredentials;
    deployer: DeployerBehavior;
    meta: MetaType;
};
type DefaultServerConfigValues = Pick<ServerConfiguration, 'branch' | 'dirToCopy' | 'tempDirectory' | 'releaseNameGetter' | 'deployer' | 'releaseNameComparer' | 'meta'>;
type ServerConfigurationParameters<MetaType extends Record<string, unknown> = Record<string, unknown>> = DeepPartial<ServerConfiguration<MetaType>> & Pick<ServerConfiguration<MetaType>, 'name'>;
type ServerConfigurationParametersWithoutName<MetaType extends Record<string, unknown> = Record<string, unknown>> = Omit<ServerConfigurationParameters<MetaType>, 'name'>;
type BaseConfig = ServerConfigurationParametersWithoutName & DefaultServerConfigValues;

declare class StorageService {
    protected readonly cacheService: CacheService;
    constructor(cacheService: CacheService);
    setCurrentConfig(config: ServerConfiguration): void;
    getCurrentConfig(): ServerConfiguration;
    setCommonConfig(config: BaseConfig): void;
    getCommonConfig(): BaseConfig;
    setReleaseName(name: string): void;
    getReleaseName(): string;
    setReleasePath(path: string): void;
    getReleasePath(): string;
    setPreviousReleaseName(name: string): void;
    getPreviousReleaseName(): string;
    setDeployerAction(action: DeployerAction): void;
    getDeployerAction(): DeployerAction;
    addServerConfig(config: ServerConfiguration): void;
    getServerConfigs(): Record<string, ServerConfiguration>;
    protected safelyGetFromCache<T>(key: string): T;
}

declare class LoggerService {
    protected readonly storage: StorageService;
    constructor(storage: StorageService);
    info(...messages: any[]): void;
    error(...messages: any[]): void;
    warn(...messages: any[]): void;
    command(...messages: any[]): void;
    success(...messages: any[]): void;
    verbose(...messages: any[]): void;
    protected stdout(level: LoggerLevels, ...messages: any[]): void;
}

type FsEntity = {
    name: string;
    type: 'directory' | 'file';
};

declare class OsOperationsService {
    protected readonly logger: LoggerService;
    constructor(logger: LoggerService);
    getTempDirectoryPath(): string;
    getHomeDirectoryPath(): string;
    getRandomBuildDirectory(): string;
    getPathRelativeToBuildDirectory(buildDir: string, ...pathParts: string[]): string;
    execute(command: string, runIn?: string): Promise<string>;
    createDirectory(path: string): Promise<void>;
    removeDirectory(path: string): void;
    getDirectoryContents(path: string): Promise<FsEntity[]>;
}

declare class ProcessService {
    protected readonly logger: LoggerService;
    constructor(logger: LoggerService);
    exit(): void;
    errorExit(code?: number): void;
}

interface DeployerSshInterface {
    serviceName: string;
    executeRemoteCommand(command: string): Promise<string>;
    uploadDirectory(localPath: string, remotePath: string): Promise<void>;
    getDirectoriesList(remotePath: string): Promise<string[]>;
    connect(credentials: SshCredentials): Promise<void>;
    disconnect(): void | Promise<void>;
    readRemoteSymlink(path: string): Promise<string>;
}

declare class ReleaseService {
    protected readonly sshManager: DeployerSshInterface;
    protected readonly storage: StorageService;
    protected readonly logger: LoggerService;
    protected readonly process: ProcessService;
    constructor(sshManager: DeployerSshInterface, storage: StorageService, logger: LoggerService, process: ProcessService);
    getReleaseNameFromCurrentTime(): string;
    releasesSorter(a: string, b: string): number;
    createReleaseNameAndPath(serverConfig: ServerConfiguration): void;
    createRelease(): Promise<void>;
    uploadRelease(serverConfig: ServerConfiguration): Promise<void>;
    getCurrentReleaseName(): string;
    getCurrentReleasePath(): string;
    cleanUpReleases(serverConfig: ServerConfiguration): Promise<void>;
    findCurrentAndPreviousReleaseForRollback(serverConfig: ServerConfiguration): Promise<void>;
    deleteReleaseForRollback(serverConfig: ServerConfiguration): Promise<void>;
    createSymlinkForCurrentRelease(serverConfig: ServerConfiguration): Promise<void>;
    protected getAllOtherReleases(serverConfig: ServerConfiguration): Promise<string[]>;
    protected deleteRelease(serverConfig: ServerConfiguration, releaseName: string): Promise<void>;
    protected getReleaseFromCurrentSymlinkOnRemote(serverConfig: ServerConfiguration): Promise<string>;
}

declare class ServerService {
    protected readonly osOperationsService: OsOperationsService;
    protected readonly storage: StorageService;
    protected readonly logger: LoggerService;
    protected readonly processService: ProcessService;
    protected readonly releaseService: ReleaseService;
    constructor(osOperationsService: OsOperationsService, storage: StorageService, logger: LoggerService, processService: ProcessService, releaseService: ReleaseService);
    createBaseConfig(settings: ServerConfigurationParametersWithoutName): BaseConfig;
    createServerConfig(settings: ServerConfigurationParameters): void;
    getServerConfig(name: string): ServerConfiguration;
    protected getDefaultServerConfigValues(): DefaultServerConfigValues;
    protected isServerConfiguration(value: unknown): value is ServerConfiguration;
}

declare const taskPositions: {
    readonly ORDER: "order";
    readonly FIRST: "first";
    readonly AFTER_RELEASE_UPLOAD: "after-release-upload";
    readonly DIRECT: "direct";
};

type TaskExecutorContext<MetaType extends Record<string, unknown> = Record<string, unknown>> = {
    serverConfig: ServerConfiguration;
    logger: LoggerService;
    execLocal: typeof OsOperationsService.prototype.execute;
    execRemote: DeployerSshInterface['executeRemoteCommand'];
    action: DeployerAction;
    releaseName: string;
    releasePath: string;
    meta: MetaType;
};
type TaskExecutor<T extends Record<string, unknown> = Record<string, unknown>> = (serverConfig: TaskExecutorContext<T>) => void | Promise<void>;
interface Task<T extends Record<string, unknown> = Record<string, unknown>> {
    name: string;
    executor: TaskExecutor<T>;
}
type TaskPosition = ValuesOf<typeof taskPositions>;
type TaskGroups = {
    [taskPositions.FIRST]: Task | null;
    [taskPositions.ORDER]: Task[];
    [taskPositions.AFTER_RELEASE_UPLOAD]: Task[];
};

declare class TaskService {
    protected readonly serverService: ServerService;
    protected readonly logger: LoggerService;
    protected readonly processService: ProcessService;
    protected readonly osOperationsService: OsOperationsService;
    protected readonly sshManager: DeployerSshInterface;
    protected readonly storage: StorageService;
    protected tasks: Task[];
    protected taskGroups: TaskGroups;
    constructor(serverService: ServerService, logger: LoggerService, processService: ProcessService, osOperationsService: OsOperationsService, sshManager: DeployerSshInterface, storage: StorageService);
    assembleTasksArray(): void;
    addTask(name: string, executor: TaskExecutor<any>, position?: TaskPosition): void;
    getTask(taskName: string): Task | undefined;
    runTask(forServer: string, taskName: string): Promise<void>;
    runAllTasks(forServer: string): Promise<void>;
    createTask(name: string, executor: TaskExecutor): Task;
    isTask(value: unknown): value is Task;
    getAssembledTasks(): Task<Record<string, unknown>>[];
    clearAssembledTasks(): void;
    clearTasksGroups(): void;
    getTaskExecutorContext<T extends Record<string, unknown> = Record<string, unknown>>(serverConfig: ServerConfiguration<T>): TaskExecutorContext<T>;
}

declare class GitService {
    protected readonly osOperationsService: OsOperationsService;
    protected readonly logger: LoggerService;
    constructor(osOperationsService: OsOperationsService, logger: LoggerService);
    cloneRepository(repo: string, cloneTo: string): Promise<void>;
    changeBranch(repoPath: string, branch: string): Promise<void>;
    pull(repoPath: string): Promise<void>;
    protected log(...messages: any[]): void;
    protected runGitCommand(args: string[], runIn?: string): Promise<void>;
}

declare class CoreTasksService {
    protected readonly taskService: TaskService;
    protected readonly gitService: GitService;
    protected readonly osOperationsService: OsOperationsService;
    protected readonly releaseService: ReleaseService;
    protected readonly sshManager: DeployerSshInterface;
    constructor(taskService: TaskService, gitService: GitService, osOperationsService: OsOperationsService, releaseService: ReleaseService, sshManager: DeployerSshInterface);
    createGitTask(): void;
    createCleanupTask(): void;
    createReleaseTask(): void;
    createUploadReleaseTask(): void;
    createSshConnectTask(): void;
    createSshDisconnectTask(): void;
    createCleanUpReleasesTask(): void;
    createUpdateSymlinkTask(): void;
    createRollbackFindReleasesTask(): void;
    createRemoveRollbackRelease(): void;
}

declare class HappyDeployer {
    protected readonly serverService: ServerService;
    protected readonly taskService: TaskService;
    protected readonly coreTasksService: CoreTasksService;
    protected readonly logger: LoggerService;
    protected readonly processService: ProcessService;
    protected readonly storage: StorageService;
    protected readonly releaseService: ReleaseService;
    protected readonly steps: Record<RequiredSteps, boolean>;
    constructor(serverService: ServerService, taskService: TaskService, coreTasksService: CoreTasksService, logger: LoggerService, processService: ProcessService, storage: StorageService, releaseService: ReleaseService);
    baseConfig<MetaType extends Record<string, unknown> = Record<string, unknown>>(settings: ServerConfigurationParametersWithoutName<MetaType>): HappyDeployer;
    addServer<MetaType extends Record<string, unknown> = Record<string, unknown>>(settings: ServerConfigurationParameters<MetaType>): HappyDeployer;
    task<T extends Record<string, unknown> = Record<string, unknown>>(task: Task<T>, position?: TaskPosition): HappyDeployer;
    task<T extends Record<string, unknown> = Record<string, unknown>>(name: string, executor: TaskExecutor<T>, position?: TaskPosition): HappyDeployer;
    deploy(server: string): Promise<void>;
    rollback(server: string): Promise<void>;
    protected createInternalDeployTasks(): void;
    protected createInternalRollbackTasks(): void;
    protected changeStepStatus(step: RequiredSteps, status: boolean): void;
    protected checkRequiredSteps(steps?: RequiredSteps[]): void;
}

type PrefabTask = {
    (customCommand?: string): Task;
    (customCommandFactory?: (context: TaskExecutorContext) => string): Task;
};

declare const installDepsTask: PrefabTask;
declare const buildTask: PrefabTask;

declare function createDeployer(): HappyDeployer;

export { buildTask, createDeployer, installDepsTask };
