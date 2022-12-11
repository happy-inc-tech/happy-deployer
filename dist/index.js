import 'reflect-metadata';
import { injectable, inject, Container } from 'inversify';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import child_process from 'node:child_process';
import fs from 'node:fs';
import { NodeSSH } from 'node-ssh';
import format from 'date-fns/format/index.js';
import parse from 'date-fns/parse/index.js';
import isBefore from 'date-fns/isBefore/index.js';
import merge from 'lodash.merge';

/*! *****************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */

function __decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}

function __param(paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
}

function __metadata(metadataKey, metadataValue) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(metadataKey, metadataValue);
}

var RequiredSteps;
(function (RequiredSteps) {
    RequiredSteps["BASE_CONFIG"] = "BASE_CONFIG";
    RequiredSteps["AT_LEAST_ONE_SERVER"] = "AT_LEAST_ONE_SERVER";
})(RequiredSteps = RequiredSteps || (RequiredSteps = {}));

var LoggerLevels;
(function (LoggerLevels) {
    LoggerLevels["INFO"] = "INFO";
    LoggerLevels["ERROR"] = "ERROR";
    LoggerLevels["SUCCESS"] = "SUCCESS";
    LoggerLevels["WARNING"] = "WARN";
    LoggerLevels["COMMAND"] = "COMMAND";
    LoggerLevels["VERBOSE"] = "VERBOSE";
})(LoggerLevels = LoggerLevels || (LoggerLevels = {}));

let CacheService = class CacheService {
    _cache = new Map();
    cache(key, value) {
        this._cache.set(key, value);
    }
    getCached(key) {
        return this._cache.get(key) ?? null;
    }
};
CacheService = __decorate([
    injectable()
], CacheService);
var CacheService$1 = CacheService;

const COMMON_CONFIG_KEY = 'a3b40269-d30b-4c26-91ec-7147c340066b';
const RELEASE_NAME_KEY = '80432dd1-6753-43d1-8f11-c61579db85e7';
const RELEASE_PATH_KEY = 'b794ad04-09b8-407a-98b0-f3849b2fbb69';
const CURRENT_SERVER_CONFIG_KEY = 'b5951353-7dff-4e03-997c-771bf953ef25';
const PREVIOUS_RELEASE_NAME_KEY = 'd888cfd9-bb15-4b19-a9cc-0eb56ec60a71';
const DEPLOYER_ACTION_KEY = '68cc47e4-0ecb-4b14-8a5f-e69b1d8eaf23';

let StorageService = class StorageService {
    cacheService;
    constructor(cacheService) {
        this.cacheService = cacheService;
    }
    setCurrentConfig(config) {
        this.cacheService.cache(CURRENT_SERVER_CONFIG_KEY, config);
    }
    getCurrentConfig() {
        return this.safelyGetFromCache(CURRENT_SERVER_CONFIG_KEY);
    }
    setCommonConfig(config) {
        this.cacheService.cache(COMMON_CONFIG_KEY, config);
    }
    getCommonConfig() {
        return this.safelyGetFromCache(COMMON_CONFIG_KEY);
    }
    setReleaseName(name) {
        this.cacheService.cache(RELEASE_NAME_KEY, name);
    }
    getReleaseName() {
        return this.safelyGetFromCache(RELEASE_NAME_KEY);
    }
    setReleasePath(path) {
        this.cacheService.cache(RELEASE_PATH_KEY, path);
    }
    getReleasePath() {
        return this.safelyGetFromCache(RELEASE_PATH_KEY);
    }
    setPreviousReleaseName(name) {
        this.cacheService.cache(PREVIOUS_RELEASE_NAME_KEY, name);
    }
    getPreviousReleaseName() {
        return this.safelyGetFromCache(PREVIOUS_RELEASE_NAME_KEY);
    }
    setDeployerAction(action) {
        this.cacheService.cache(DEPLOYER_ACTION_KEY, action);
    }
    getDeployerAction() {
        return this.safelyGetFromCache(DEPLOYER_ACTION_KEY);
    }
    safelyGetFromCache(key) {
        const value = this.cacheService.getCached(key);
        if (!value) {
            throw new Error(`[STORAGE] missing key "${key}"`);
        }
        return value;
    }
};
StorageService = __decorate([
    injectable(),
    __param(0, inject(CacheService$1)),
    __metadata("design:paramtypes", [CacheService$1])
], StorageService);
var StorageService$1 = StorageService;

const COLORS = {
    reset: '\x1b[0m',
    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
};

const LoggerLevelsColorMap = {
    [LoggerLevels.INFO]: 'white',
    [LoggerLevels.ERROR]: 'red',
    [LoggerLevels.WARNING]: 'yellow',
    [LoggerLevels.COMMAND]: 'gray',
    [LoggerLevels.SUCCESS]: 'green',
    [LoggerLevels.VERBOSE]: 'cyan',
};
let LoggerService = class LoggerService {
    storage;
    constructor(storage) {
        this.storage = storage;
    }
    info(...messages) {
        this.stdout(LoggerLevels.INFO, ...messages);
    }
    error(...messages) {
        this.stdout(LoggerLevels.ERROR, ...messages);
    }
    warn(...messages) {
        this.stdout(LoggerLevels.WARNING, ...messages);
    }
    command(...messages) {
        this.stdout(LoggerLevels.COMMAND, ...messages);
    }
    success(...messages) {
        this.stdout(LoggerLevels.SUCCESS, ...messages);
    }
    verbose(...messages) {
        let deployerSettings = null;
        try {
            deployerSettings = this.storage.getCurrentConfig().deployer;
        }
        catch (e) { }
        if (deployerSettings?.showCommandLogs) {
            this.stdout(LoggerLevels.VERBOSE, ...messages);
        }
    }
    stdout(level, ...messages) {
        const colorKey = LoggerLevelsColorMap[level];
        const header = `${COLORS[colorKey]}[${new Date().toUTCString()}] [${level}]`;
        console.log(header, ...messages, COLORS.reset);
    }
};
LoggerService = __decorate([
    injectable(),
    __param(0, inject(StorageService$1)),
    __metadata("design:paramtypes", [StorageService$1])
], LoggerService);
var LoggerService$1 = LoggerService;

let OsOperationsService = class OsOperationsService {
    logger;
    constructor(logger) {
        this.logger = logger;
    }
    getTempDirectoryPath() {
        return os.tmpdir();
    }
    getRandomBuildDirectory() {
        return path.resolve(this.getTempDirectoryPath(), crypto.randomUUID());
    }
    getPathRelativeToBuildDirectory(buildDir, ...pathParts) {
        return path.resolve(buildDir, ...pathParts);
    }
    execute(command, args, runIn) {
        return new Promise((resolve, reject) => {
            const resultCommand = [command, ...args].join(' ');
            child_process.exec(resultCommand, {
                cwd: runIn,
            }, (error, stdout, stderr) => {
                if (stderr) {
                    this.logger.verbose(stderr);
                }
                if (stdout) {
                    this.logger.verbose(stdout);
                }
                if (error) {
                    this.logger.error(error);
                    reject(error);
                    return;
                }
                else {
                    resolve();
                }
            });
        });
    }
    async createDirectory(path) {
        this.logger.verbose('creating directory', path);
        return fs.promises.mkdir(path);
    }
    removeDirectory(path) {
        this.logger.verbose('removing directory', path);
        return fs.rmSync(path, { recursive: true });
    }
};
OsOperationsService = __decorate([
    injectable(),
    __param(0, inject(LoggerService$1)),
    __metadata("design:paramtypes", [LoggerService$1])
], OsOperationsService);
var OsOperationsService$1 = OsOperationsService;

let ProcessService = class ProcessService {
    logger;
    constructor(logger) {
        this.logger = logger;
    }
    exit() {
        process.exit();
    }
    errorExit(code = 1) {
        this.logger.error('[PROCESS]', `process terminated with code "${code}"`);
        process.exit(code);
    }
};
ProcessService = __decorate([
    injectable(),
    __param(0, inject(LoggerService$1)),
    __metadata("design:paramtypes", [LoggerService$1])
], ProcessService);
var ProcessService$1 = ProcessService;

let SshService = class SshService {
    logger;
    processService;
    sshClient = new NodeSSH();
    connected = false;
    constructor(logger, processService) {
        this.logger = logger;
        this.processService = processService;
    }
    async executeRemoteCommand(command) {
        const { stdout, stderr, code } = await this.sshClient.execCommand(command);
        stdout && this.logger.info('[SSH]', stdout);
        stderr && this.logger.error('[SSH]', stderr);
        if (code !== 0) {
            this.logger.error('[SSH]', `remote command "${command}" failed`);
            this.processService.errorExit(1);
        }
    }
    async uploadDirectory(localPath, remotePath) {
        const status = await this.sshClient.putDirectory(localPath, remotePath, {
            recursive: true,
            concurrency: 5,
            tick: (localFile, remoteFile, error) => {
                if (error) {
                    this.logger.error('[SSH]', 'failed upload file', localFile);
                }
            },
        });
        if (!status) {
            this.logger.error('[SSH]', 'directory upload failed');
        }
    }
    async getDirectoriesList(remotePath) {
        const sftp = await this.sshClient.requestSFTP();
        return new Promise((resolve) => {
            sftp.readdir(remotePath, (err, list) => {
                if (err) {
                    this.logger.error('[SSH]', err.message);
                    this.processService.errorExit(1);
                    return [];
                }
                const directories = list.reduce((total, current) => {
                    if ((current.attrs.mode & fs.constants.S_IFMT) === fs.constants.S_IFDIR) {
                        total.push(current.filename);
                    }
                    return total;
                }, []);
                resolve(directories);
            });
        });
    }
    async connect(credentials) {
        await this.sshClient.connect(credentials);
        this.connected = true;
    }
    async disconnect() {
        this.sshClient.dispose();
    }
};
SshService = __decorate([
    injectable(),
    __param(0, inject(LoggerService$1)),
    __param(1, inject(ProcessService$1)),
    __metadata("design:paramtypes", [LoggerService$1,
        ProcessService$1])
], SshService);
var SshService$1 = SshService;

const TIME_FORMAT = 'yyyyMMddHHmmss';

let ReleaseService = class ReleaseService {
    sshService;
    storage;
    logger;
    process;
    constructor(sshService, storage, logger, process) {
        this.sshService = sshService;
        this.storage = storage;
        this.logger = logger;
        this.process = process;
    }
    getReleaseNameFromCurrentTime() {
        const now = new Date();
        return format(now, TIME_FORMAT);
    }
    releasesSorter(a, b) {
        const dateAParsed = parse(a, TIME_FORMAT, new Date());
        const dateBParsed = parse(b, TIME_FORMAT, new Date());
        return isBefore(dateAParsed, dateBParsed) ? 1 : -1;
    }
    async createRelease(serverConfig) {
        const settings = serverConfig.deployer;
        const releaseName = serverConfig.releaseNameGetter();
        const releasePath = path.join(serverConfig.deployPath, settings.releasesDirName, releaseName);
        this.storage.setReleaseName(releaseName);
        this.storage.setReleasePath(releasePath);
        await this.sshService.executeRemoteCommand(`mkdir -p ${releasePath}`);
    }
    async uploadRelease(serverConfig) {
        const releasePath = this.getCurrentReleasePath();
        const dirToUpload = path.resolve(serverConfig.tempDirectory, serverConfig.dirToCopy);
        await this.sshService.uploadDirectory(dirToUpload, releasePath);
    }
    getCurrentReleaseName() {
        return this.storage.getReleaseName();
    }
    getCurrentReleasePath() {
        return this.storage.getReleasePath();
    }
    async cleanUpReleases(serverConfig) {
        const allOtherReleases = await this.getAllOtherReleases(serverConfig);
        const sorted = [...allOtherReleases].sort(serverConfig.releaseNameComparer);
        const settings = serverConfig.deployer;
        const releasesToDelete = sorted.slice(settings.keepReleases, sorted.length);
        this.logger.info(`${releasesToDelete.length} release(s) will be deleted (keeping ${settings.keepReleases})`);
        for (const release of releasesToDelete) {
            await this.deleteRelease(serverConfig, release);
        }
    }
    async findCurrentAndPreviousReleaseForRollback(serverConfig) {
        const allOtherReleases = await this.getAllOtherReleases(serverConfig);
        const sorted = [...allOtherReleases].sort(serverConfig.releaseNameComparer);
        if (sorted.length < 2) {
            this.logger.error(`cannot perform rollback with ${sorted.length} releases, 2 required`);
            this.process.errorExit(1);
            return;
        }
        const [toDelete, newCurrent] = sorted;
        this.storage.setReleaseName(newCurrent);
        this.storage.setPreviousReleaseName(toDelete);
    }
    async deleteReleaseForRollback(serverConfig) {
        if (!serverConfig.deployer.deleteOnRollback) {
            this.logger.info('deleteOnRollback is false - aborting');
            return;
        }
        const releaseToDelete = this.storage.getPreviousReleaseName();
        await this.deleteRelease(serverConfig, releaseToDelete);
    }
    async createSymlinkForCurrentRelease(serverConfig) {
        const currentRelease = this.getCurrentReleaseName();
        const settings = serverConfig.deployer;
        await this.sshService.executeRemoteCommand(`cd ${serverConfig.deployPath} && rm -f ./${settings.currentReleaseSymlinkName} && ln -s ./${settings.releasesDirName}/${currentRelease} ./${settings.currentReleaseSymlinkName}`);
    }
    async getAllOtherReleases(serverConfig) {
        const settings = serverConfig.deployer;
        return this.sshService.getDirectoriesList(path.join(serverConfig.deployPath, settings.releasesDirName));
    }
    async deleteRelease(serverConfig, releaseName) {
        this.logger.info(`deleting release ${releaseName}`);
        const releasePath = path.join(serverConfig.deployPath, serverConfig.deployer.releasesDirName, releaseName);
        await this.sshService.executeRemoteCommand(`rm -rf ${releasePath}`);
    }
};
ReleaseService = __decorate([
    injectable(),
    __param(0, inject(SshService$1)),
    __param(1, inject(StorageService$1)),
    __param(2, inject(LoggerService$1)),
    __param(3, inject(ProcessService$1)),
    __metadata("design:paramtypes", [SshService$1,
        StorageService$1,
        LoggerService$1,
        ProcessService$1])
], ReleaseService);
var ReleaseService$1 = ReleaseService;

let ServerService = class ServerService {
    osOperationsService;
    storage;
    logger;
    processService;
    releaseService;
    serverConfigs = {};
    constructor(osOperationsService, storage, logger, processService, releaseService) {
        this.osOperationsService = osOperationsService;
        this.storage = storage;
        this.logger = logger;
        this.processService = processService;
        this.releaseService = releaseService;
    }
    createBaseConfig(settings) {
        try {
            const cached = this.storage.getCommonConfig();
            return cached;
        }
        catch (e) { }
        const config = merge(this.getDefaultServerConfigValues(), settings);
        this.storage.setCommonConfig(config);
        return config;
    }
    createServerConfig(settings) {
        const baseConfig = this.storage.getCommonConfig();
        const serverConfig = merge(baseConfig, settings);
        if (!this.isServerConfiguration(serverConfig)) {
            return this.processService.errorExit(1);
        }
        this.serverConfigs[serverConfig.name] = serverConfig;
    }
    getServerConfig(name) {
        return this.serverConfigs[name];
    }
    getDefaultServerConfigValues() {
        const tempDirectory = this.osOperationsService.getRandomBuildDirectory();
        return {
            branch: 'master',
            tempDirectory,
            dirToCopy: this.osOperationsService.getPathRelativeToBuildDirectory(tempDirectory, 'dist'),
            releaseNameGetter: this.releaseService.getReleaseNameFromCurrentTime,
            releaseNameComparer: this.releaseService.releasesSorter,
            deployer: {
                keepReleases: 5,
                deleteOnRollback: true,
                releasesDirName: 'releases',
                currentReleaseSymlinkName: 'current',
                showCommandLogs: false,
            },
            meta: {},
        };
    }
    isServerConfiguration(value) {
        if (typeof value !== 'object' || value === null) {
            return false;
        }
        const requiredKeys = [
            'name',
            'repository',
            'branch',
            'deployPath',
            'dirToCopy',
            'tempDirectory',
            'releaseNameGetter',
            'ssh',
            'deployer',
        ];
        const missingKeys = [];
        for (const key of requiredKeys) {
            if (!(key in value) || value[key] === undefined) {
                missingKeys.push(key);
            }
        }
        missingKeys.length && this.logger.error('missing required keys in result server config:', missingKeys.join(', '));
        return missingKeys.length === 0;
    }
};
ServerService = __decorate([
    injectable(),
    __param(0, inject(OsOperationsService$1)),
    __param(1, inject(StorageService$1)),
    __param(2, inject(LoggerService$1)),
    __param(3, inject(ProcessService$1)),
    __param(4, inject(ReleaseService$1)),
    __metadata("design:paramtypes", [OsOperationsService$1,
        StorageService$1,
        LoggerService$1,
        ProcessService$1,
        ReleaseService$1])
], ServerService);
var ServerService$1 = ServerService;

let TaskService = class TaskService {
    serverService;
    logger;
    processService;
    osOperationsService;
    sshService;
    storage;
    tasks = [];
    constructor(serverService, logger, processService, osOperationsService, sshService, storage) {
        this.serverService = serverService;
        this.logger = logger;
        this.processService = processService;
        this.osOperationsService = osOperationsService;
        this.sshService = sshService;
        this.storage = storage;
    }
    addTask(name, executor, unshift = false) {
        if (this.tasks.some((task) => task.name === name)) {
            this.logger.warn(`Duplicate task name "${name}", new one is skipped`);
            return;
        }
        this.tasks[unshift ? 'unshift' : 'push'](this.createTask(name, executor));
    }
    getTask(taskName) {
        return this.tasks.find((task) => task.name === taskName);
    }
    async runTask(forServer, taskName) {
        const serverConfig = this.serverService.getServerConfig(forServer);
        const task = this.getTask(taskName);
        if (!task) {
            throw new ReferenceError(`Task ${taskName} not found`);
        }
        this.logger.info(`executing task "${taskName}"`);
        return task.executor(this.getTaskExecutorContext(serverConfig));
    }
    async runAllTasks(forServer) {
        for (const task of this.tasks) {
            try {
                await this.runTask(forServer, task.name);
            }
            catch (e) {
                this.logger.error(`task "${task.name}" failed`);
                this.logger.error(e);
                this.processService.errorExit(1);
            }
        }
        this.logger.info('All tasks finished');
    }
    createTask(name, executor) {
        return {
            name,
            executor,
        };
    }
    isTask(value) {
        if (typeof value !== 'object' || value === null) {
            return false;
        }
        return ('name' in value && typeof value.name === 'string' && 'executor' in value && typeof value.executor === 'function');
    }
    getTaskExecutorContext(serverConfig) {
        return {
            serverConfig,
            execLocal: this.osOperationsService.execute.bind(this.osOperationsService),
            execRemote: this.sshService.executeRemoteCommand.bind(this.sshService),
            logger: this.logger,
            action: this.storage.getDeployerAction(),
            releaseName: this.storage.getReleaseName(),
            releasePath: this.storage.getReleasePath(),
            meta: serverConfig.meta,
        };
    }
};
TaskService = __decorate([
    injectable(),
    __param(0, inject(ServerService$1)),
    __param(1, inject(LoggerService$1)),
    __param(2, inject(ProcessService$1)),
    __param(3, inject(OsOperationsService$1)),
    __param(4, inject(SshService$1)),
    __param(5, inject(StorageService$1)),
    __metadata("design:paramtypes", [ServerService$1,
        LoggerService$1,
        ProcessService$1,
        OsOperationsService$1,
        SshService$1,
        StorageService$1])
], TaskService);
var TaskService$1 = TaskService;

let GitService = class GitService {
    osOperationsService;
    logger;
    constructor(osOperationsService, logger) {
        this.osOperationsService = osOperationsService;
        this.logger = logger;
    }
    async cloneRepository(repo, cloneTo) {
        this.log(`repo url: ${repo}`);
        await this.osOperationsService.createDirectory(cloneTo);
        await this.runGitCommand(['clone', repo, '.'], cloneTo);
    }
    async changeBranch(repoPath, branch) {
        this.log(`use branch "${branch}"`);
        await this.runGitCommand(['checkout', branch], repoPath);
    }
    async pull(repoPath) {
        await this.runGitCommand(['pull'], repoPath);
    }
    log(...messages) {
        return this.logger.info('[GIT]', ...messages);
    }
    async runGitCommand(args, runIn) {
        return this.osOperationsService.execute('git', args, runIn);
    }
};
GitService = __decorate([
    injectable(),
    __param(0, inject(OsOperationsService$1)),
    __param(1, inject(LoggerService$1)),
    __metadata("design:paramtypes", [OsOperationsService$1,
        LoggerService$1])
], GitService);
var GitService$1 = GitService;

let CoreTasksService = class CoreTasksService {
    taskService;
    gitService;
    osOperationsService;
    releaseService;
    sshService;
    constructor(taskService, gitService, osOperationsService, releaseService, sshService) {
        this.taskService = taskService;
        this.gitService = gitService;
        this.osOperationsService = osOperationsService;
        this.releaseService = releaseService;
        this.sshService = sshService;
    }
    createGitTask() {
        this.taskService.addTask('git:clone-branch-pull', async ({ serverConfig: { repository, tempDirectory, branch }, logger }) => {
            if (!repository) {
                logger.info('"repository" key is undefined, skipping task');
                return;
            }
            await this.gitService.cloneRepository(repository, tempDirectory);
            await this.gitService.changeBranch(tempDirectory, branch);
            await this.gitService.pull(tempDirectory);
        }, true);
    }
    createCleanupTask() {
        this.taskService.addTask('cleanup', async ({ serverConfig: { tempDirectory } }) => {
            this.osOperationsService.removeDirectory(tempDirectory);
        });
    }
    createReleaseTask() {
        this.taskService.addTask('releases:create', async ({ serverConfig }) => {
            await this.releaseService.createRelease(serverConfig);
        });
    }
    createUploadReleaseTask() {
        this.taskService.addTask('releases:upload', async ({ serverConfig }) => {
            await this.releaseService.uploadRelease(serverConfig);
        });
    }
    createSshConnectTask() {
        this.taskService.addTask('ssh:connect', async ({ serverConfig }) => {
            await this.sshService.connect(serverConfig.ssh);
        });
    }
    createSshDisconnectTask() {
        this.taskService.addTask('ssh:disconnect', async () => {
            await this.sshService.disconnect();
        });
    }
    createCleanUpReleasesTask() {
        this.taskService.addTask('releases:cleanup', async ({ serverConfig }) => {
            await this.releaseService.cleanUpReleases(serverConfig);
        });
    }
    createUpdateSymlinkTask() {
        this.taskService.addTask('releases:update-symlink', async ({ serverConfig }) => {
            await this.releaseService.createSymlinkForCurrentRelease(serverConfig);
        });
    }
    createRollbackFindReleasesTask() {
        this.taskService.addTask('releases:rollback:find-releases', async ({ serverConfig }) => {
            await this.releaseService.findCurrentAndPreviousReleaseForRollback(serverConfig);
        });
    }
    createRemoveRollbackRelease() {
        this.taskService.addTask('releases:rollback:delete-if-need', async ({ serverConfig }) => {
            await this.releaseService.deleteReleaseForRollback(serverConfig);
        });
    }
};
CoreTasksService = __decorate([
    injectable(),
    __param(0, inject(TaskService$1)),
    __param(1, inject(GitService$1)),
    __param(2, inject(OsOperationsService$1)),
    __param(3, inject(ReleaseService$1)),
    __param(4, inject(SshService$1)),
    __metadata("design:paramtypes", [TaskService$1,
        GitService$1,
        OsOperationsService$1,
        ReleaseService$1,
        SshService$1])
], CoreTasksService);
var CoreTasksService$1 = CoreTasksService;

let HappyDeployer = class HappyDeployer {
    serverService;
    taskService;
    coreTasksService;
    logger;
    processService;
    storage;
    steps = {
        [RequiredSteps.BASE_CONFIG]: false,
        [RequiredSteps.AT_LEAST_ONE_SERVER]: false,
    };
    constructor(serverService, taskService, coreTasksService, logger, processService, storage) {
        this.serverService = serverService;
        this.taskService = taskService;
        this.coreTasksService = coreTasksService;
        this.logger = logger;
        this.processService = processService;
        this.storage = storage;
    }
    baseConfig(settings) {
        this.serverService.createBaseConfig(settings);
        this.changeStepStatus(RequiredSteps.BASE_CONFIG, true);
        return this;
    }
    addServer(settings) {
        this.serverService.createServerConfig(settings);
        this.changeStepStatus(RequiredSteps.AT_LEAST_ONE_SERVER, true);
        return this;
    }
    task(taskOrName, executor) {
        if (this.taskService.isTask(taskOrName)) {
            this.taskService.addTask(taskOrName.name, taskOrName.executor);
        }
        if (typeof taskOrName === 'string' && executor !== undefined) {
            this.taskService.addTask(taskOrName, executor);
        }
        return this;
    }
    async deploy(server) {
        this.storage.setDeployerAction('deploy');
        const config = this.serverService.getServerConfig(server);
        this.storage.setCurrentConfig(config);
        this.createInternalDeployTasks();
        this.checkRequiredSteps();
        this.logger.info('Start deploying');
        await this.taskService.runAllTasks(server);
        this.logger.success('Successfully deployed');
    }
    async rollback(server) {
        this.storage.setDeployerAction('rollback');
        const config = this.serverService.getServerConfig(server);
        this.storage.setCurrentConfig(config);
        this.createInternalRollbackTasks();
        this.checkRequiredSteps();
        this.logger.info('Start rollback');
        await this.taskService.runAllTasks(server);
        this.logger.success('Rollback was successful');
    }
    createInternalDeployTasks() {
        this.coreTasksService.createGitTask();
        this.coreTasksService.createSshConnectTask();
        this.coreTasksService.createReleaseTask();
        this.coreTasksService.createUploadReleaseTask();
        this.coreTasksService.createUpdateSymlinkTask();
        this.coreTasksService.createCleanUpReleasesTask();
        this.coreTasksService.createSshDisconnectTask();
        this.coreTasksService.createCleanupTask();
    }
    createInternalRollbackTasks() {
        this.coreTasksService.createSshConnectTask();
        this.coreTasksService.createRollbackFindReleasesTask();
        this.coreTasksService.createUpdateSymlinkTask();
        this.coreTasksService.createRemoveRollbackRelease();
        this.coreTasksService.createSshDisconnectTask();
    }
    changeStepStatus(step, status) {
        this.steps[step] = status;
    }
    checkRequiredSteps(steps = Object.keys(this.steps)) {
        for (const stepName of steps) {
            if (!this.steps[stepName]) {
                this.logger.error(`Missing required step "${stepName}"`);
                this.processService.errorExit(1);
            }
        }
    }
};
HappyDeployer = __decorate([
    injectable(),
    __param(0, inject(ServerService$1)),
    __param(1, inject(TaskService$1)),
    __param(2, inject(CoreTasksService$1)),
    __param(3, inject(LoggerService$1)),
    __param(4, inject(ProcessService$1)),
    __param(5, inject(StorageService$1)),
    __metadata("design:paramtypes", [ServerService$1,
        TaskService$1,
        CoreTasksService$1,
        LoggerService$1,
        ProcessService$1,
        StorageService$1])
], HappyDeployer);
var HappyDeployer$1 = HappyDeployer;

let container;
function createContainer() {
    container = new Container({ defaultScope: 'Singleton', autoBindInjectable: true });
    container.bind(CacheService$1).to(CacheService$1);
    container.bind(CoreTasksService$1).to(CoreTasksService$1);
    container.bind(GitService$1).to(GitService$1);
    container.bind(LoggerService$1).to(LoggerService$1);
    container.bind(OsOperationsService$1).to(OsOperationsService$1);
    container.bind(ServerService$1).to(ServerService$1);
    container.bind(TaskService$1).to(TaskService$1);
    container.bind(SshService$1).to(SshService$1);
    container.bind(ReleaseService$1).to(ReleaseService$1);
    container.bind(ProcessService$1).to(ProcessService$1);
    container.bind(StorageService$1).to(StorageService$1);
    return container;
}
function getService(serviceConstructor) {
    if (!container) {
        throw new Error('No DI container');
    }
    return container.get(serviceConstructor);
}

function createDeployer() {
    createContainer();
    return getService(HappyDeployer$1);
}
function buildTask(buildCommand = 'npm run build') {
    return getService(TaskService$1).createTask('app:build', async ({ execLocal, logger, action, serverConfig: { tempDirectory } }) => {
        if (action === 'rollback') {
            logger.info('skipping this task for rollback');
            return;
        }
        await execLocal(buildCommand, [], tempDirectory);
    });
}
function installDepsTask(installDepsCommand = 'npm install') {
    return getService(TaskService$1).createTask('app:install-deps', async ({ execLocal, logger, action, serverConfig: { tempDirectory } }) => {
        if (action === 'rollback') {
            logger.info('skipping this task for rollback');
            return;
        }
        await execLocal(installDepsCommand, [], tempDirectory);
    });
}

export { buildTask, createDeployer, installDepsTask };
