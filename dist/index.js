import 'reflect-metadata';
import { injectable, inject, Container } from 'inversify';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import child_process from 'node:child_process';
import fs from 'node:fs';
import format from 'date-fns/format/index.js';
import parse from 'date-fns/parse/index.js';
import isBefore from 'date-fns/isBefore/index.js';
import { NodeSSH } from 'node-ssh';
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
    reset() {
        this._cache.clear();
    }
};
CacheService = __decorate([
    injectable()
], CacheService);
var CacheService$1 = CacheService;

const COMMON_CONFIG_KEY = 'COMMON_CONFIG';
const RELEASE_NAME_KEY = 'RELEASE_NAME';
const RELEASE_PATH_KEY = 'RELEASE_PATH';
const CURRENT_SERVER_CONFIG_KEY = 'CURRENT_SERVER_CONFIG';
const PREVIOUS_RELEASE_NAME_KEY = 'PREVIOUS_RELEASE_NAME';
const DEPLOYER_ACTION_KEY = 'DEPLOYER_ACTION';
const SERVER_CONFIGS_KEY = 'SERVER_CONFIGS';

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
    addServerConfig(config) {
        try {
            const configs = this.safelyGetFromCache(SERVER_CONFIGS_KEY);
            configs[config.name] = config;
            this.cacheService.cache(SERVER_CONFIGS_KEY, configs);
        }
        catch (e) {
            this.cacheService.cache(SERVER_CONFIGS_KEY, {
                [config.name]: config,
            });
        }
    }
    getServerConfigs() {
        return this.safelyGetFromCache(SERVER_CONFIGS_KEY);
    }
    safelyGetFromCache(key) {
        const value = this.cacheService.getCached(key);
        if (value === null) {
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
    getHomeDirectoryPath() {
        return os.homedir();
    }
    getRandomBuildDirectory() {
        return path.resolve(this.getTempDirectoryPath(), crypto.randomUUID());
    }
    getPathRelativeToBuildDirectory(buildDir, ...pathParts) {
        return path.resolve(buildDir, ...pathParts);
    }
    execute(command, runIn) {
        return new Promise((resolve, reject) => {
            child_process.exec(command, {
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
                    resolve(stdout);
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
    async getDirectoryContents(path) {
        const contents = await fs.promises.readdir(path, { withFileTypes: true });
        return contents.map((entry) => {
            let type = 'file';
            if (entry.isDirectory()) {
                type = 'directory';
            }
            return {
                name: entry.name,
                type,
            };
        });
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

const TIME_FORMAT = 'yyyyMMddHHmmss';

let Ssh2SshService = class Ssh2SshService {
    logger;
    processService;
    osOperationsService;
    serviceName = 'SSH2 (node-ssh) service';
    sshClient = new NodeSSH();
    connected = false;
    constructor(logger, processService, osOperationsService) {
        this.logger = logger;
        this.processService = processService;
        this.osOperationsService = osOperationsService;
    }
    async executeRemoteCommand(command) {
        const { stdout, stderr, code } = await this.sshClient.execCommand(command);
        stdout && this.logger.info('[SSH]', stdout);
        stderr && this.logger.error('[SSH]', stderr);
        if (code !== 0) {
            this.logger.error('[SSH]', `remote command "${command}" failed`);
            this.processService.errorExit(1);
        }
        return stdout;
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
        if (!credentials.password && !credentials.privateKey && !credentials.privateKeyPath) {
            return this.connectWithEnumerationOfSshKeys(credentials);
        }
        await this.sshClient.connect(credentials);
        this.connected = true;
    }
    async disconnect() {
        this.sshClient.dispose();
    }
    async readRemoteSymlink(path) {
        const sftp = await this.sshClient.requestSFTP();
        return new Promise((resolve, reject) => {
            sftp.readlink(path, (err, target) => {
                if (err) {
                    reject(err);
                    return;
                }
                this.log(`Symlink value is "${target}"`);
                resolve(target.trim());
            });
        });
    }
    async connectWithEnumerationOfSshKeys(credentials) {
        const homeDir = this.osOperationsService.getHomeDirectoryPath();
        const sshDir = path.join(homeDir, '.ssh');
        const sshDirContents = await this.osOperationsService.getDirectoryContents(sshDir);
        const FORBIDDEN_VALUES = ['known_hosts', 'authorized_keys'];
        const sshPrivateKeysPaths = sshDirContents.reduce((total, entry) => {
            if (entry.type === 'file' && !FORBIDDEN_VALUES.includes(entry.name) && !entry.name.endsWith('.pub')) {
                total.push(path.join(sshDir, entry.name));
            }
            return total;
        }, []);
        for (const keyPath of sshPrivateKeysPaths) {
            try {
                this.log(`trying to connect with ${keyPath}`, 'verbose');
                await this.sshClient.connect({
                    ...credentials,
                    privateKeyPath: keyPath,
                });
                this.connected = true;
                return;
            }
            catch (e) {
                this.log(`failed to connect with ${keyPath}`, 'verbose');
            }
        }
        throw new Error('All SSH keys failed to connect');
    }
    log(message, level = 'info') {
        this.logger[level]('[SSH]', message);
    }
};
Ssh2SshService = __decorate([
    injectable(),
    __param(0, inject(LoggerService$1)),
    __param(1, inject(ProcessService$1)),
    __param(2, inject(OsOperationsService$1)),
    __metadata("design:paramtypes", [LoggerService$1,
        ProcessService$1,
        OsOperationsService$1])
], Ssh2SshService);
var Ssh2SshService$1 = Ssh2SshService;

let ShellSshService = class ShellSshService {
    osOperationsService;
    logger;
    processService;
    serviceName = 'System ssh service';
    credentials = null;
    constructor(osOperationsService, logger, processService) {
        this.osOperationsService = osOperationsService;
        this.logger = logger;
        this.processService = processService;
    }
    async connect(credentials) {
        this.log('it seems like node.js ssh failed to connect to remote server', 'warn');
        this.log('using your system\'s SSH: "password" setting is ignored', 'warn');
        this.log('trying to connect and immediately exit', 'verbose');
        this.credentials = credentials;
        const sshCommand = this.createSshRemoteCommandString('exit');
        await this.osOperationsService.execute(sshCommand);
    }
    disconnect() {
        this.log('no need to disconnect in shell mode', 'verbose');
        return undefined;
    }
    async executeRemoteCommand(command) {
        const sshCommand = this.createSshRemoteCommandString(command);
        return this.osOperationsService.execute(sshCommand);
    }
    async getDirectoriesList(remotePath) {
        const sshCommand = this.createSshRemoteCommandString(`cd ${remotePath} && ls -FlA`);
        const commandResult = await this.osOperationsService.execute(sshCommand);
        return this.getDirectoriesFromLsFlaResult(commandResult);
    }
    async uploadDirectory(localPath, remotePath) {
        if (!this.credentials || !this.credentials.username || !this.credentials.host) {
            this.log('no required SSH credentials found in ShellSshService');
            this.processService.errorExit();
            throw new Error();
        }
        const { username, host, port = 22 } = this.credentials;
        const command = `scp -r -P ${port} ${localPath}/* ${username}@${host}:${remotePath}`;
        await this.osOperationsService.execute(command);
    }
    async readRemoteSymlink(path) {
        const sshCommand = this.createSshRemoteCommandString(`readlink ${path}`);
        const target = await this.osOperationsService.execute(sshCommand);
        this.log(`Symlink value is "${target}"`);
        return target.trim();
    }
    getDirectoriesFromLsFlaResult(commandResult) {
        const lines = commandResult.split('\n');
        const directories = [];
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (!line) {
                continue;
            }
            const split = line.split(/\s+/);
            const name = split[split.length - 1];
            if (!name.endsWith('/')) {
                continue;
            }
            directories.push(name.trim().slice(0, -1));
        }
        return directories;
    }
    createSshRemoteCommandString(command) {
        if (!this.credentials || !this.credentials.username || !this.credentials.host) {
            this.log('no required SSH credentials found in ShellSshService');
            this.processService.errorExit();
            throw new Error();
        }
        const { username, host, port = 22 } = this.credentials;
        return `ssh ${username}@${host} -p ${port} '${command}'`;
    }
    log(message, level = 'info') {
        this.logger[level]('[SSH-SHELL]', message);
    }
};
ShellSshService = __decorate([
    injectable(),
    __param(0, inject(OsOperationsService$1)),
    __param(1, inject(LoggerService$1)),
    __param(2, inject(ProcessService$1)),
    __metadata("design:paramtypes", [OsOperationsService$1,
        LoggerService$1,
        ProcessService$1])
], ShellSshService);
var ShellSshService$1 = ShellSshService;

let SshManager = class SshManager {
    ssh2SshService;
    shellSshService;
    logger;
    processService;
    serviceName = 'SshManager';
    services = [];
    service = null;
    constructor(ssh2SshService, shellSshService, logger, processService) {
        this.ssh2SshService = ssh2SshService;
        this.shellSshService = shellSshService;
        this.logger = logger;
        this.processService = processService;
        this.services = [this.ssh2SshService, this.shellSshService];
    }
    async connect(credentials) {
        for (const service of this.services) {
            try {
                await service.connect(credentials);
                this.logger.verbose('ssh manager: using', service.serviceName);
                this.service = service;
                return;
            }
            catch (e) {
                this.logger.verbose(service.serviceName, 'failed to connect');
            }
        }
        this.logger.error('SSH connection with all services failed');
        this.processService.errorExit();
    }
    async disconnect() {
        return this.service.disconnect();
    }
    async executeRemoteCommand(command) {
        return this.service.executeRemoteCommand(command);
    }
    async getDirectoriesList(remotePath) {
        return this.service.getDirectoriesList(remotePath);
    }
    async uploadDirectory(localPath, remotePath) {
        return this.service.uploadDirectory(localPath, remotePath);
    }
    async readRemoteSymlink(path) {
        return this.service.readRemoteSymlink(path);
    }
};
SshManager = __decorate([
    injectable(),
    __param(0, inject(Ssh2SshService$1)),
    __param(1, inject(ShellSshService$1)),
    __param(2, inject(LoggerService$1)),
    __param(3, inject(ProcessService$1)),
    __metadata("design:paramtypes", [Ssh2SshService$1,
        ShellSshService$1,
        LoggerService$1,
        ProcessService$1])
], SshManager);
var SshManager$1 = SshManager;

let ReleaseService = class ReleaseService {
    sshManager;
    storage;
    logger;
    process;
    constructor(sshManager, storage, logger, process) {
        this.sshManager = sshManager;
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
    createReleaseNameAndPath(serverConfig) {
        const settings = serverConfig.deployer;
        const releaseName = serverConfig.releaseNameGetter();
        const releasePath = path.join(serverConfig.deployPath, settings.releasesDirName, releaseName);
        this.storage.setReleaseName(releaseName);
        this.storage.setReleasePath(releasePath);
    }
    async createRelease() {
        await this.sshManager.executeRemoteCommand(`mkdir -p ${this.storage.getReleasePath()}`);
    }
    async uploadRelease(serverConfig) {
        const releasePath = this.getCurrentReleasePath();
        const dirToUpload = path.resolve(serverConfig.tempDirectory, serverConfig.dirToCopy);
        await this.sshManager.uploadDirectory(dirToUpload, releasePath);
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
        const currentRelease = await this.getReleaseFromCurrentSymlinkOnRemote(serverConfig);
        const idx = sorted.indexOf(currentRelease);
        if (idx === -1) {
            this.logger.error('cannot perform rollback: current release not found in releases dir');
            this.process.errorExit();
            return;
        }
        if (idx === sorted.length - 1) {
            this.logger.error(`cannot perform rollback: current release "${currentRelease}" is last`);
            this.process.errorExit(1);
            return;
        }
        this.storage.setReleaseName(sorted[idx + 1]);
        this.storage.setPreviousReleaseName(currentRelease);
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
        await this.sshManager.executeRemoteCommand(`cd ${serverConfig.deployPath} && rm -f ./${settings.currentReleaseSymlinkName} && ln -s ./${settings.releasesDirName}/${currentRelease} ./${settings.currentReleaseSymlinkName}`);
    }
    async getAllOtherReleases(serverConfig) {
        const settings = serverConfig.deployer;
        return this.sshManager.getDirectoriesList(path.join(serverConfig.deployPath, settings.releasesDirName));
    }
    async deleteRelease(serverConfig, releaseName) {
        this.logger.info(`deleting release ${releaseName}`);
        const releasePath = path.join(serverConfig.deployPath, serverConfig.deployer.releasesDirName, releaseName);
        await this.sshManager.executeRemoteCommand(`rm -rf ${releasePath}`);
    }
    async getReleaseFromCurrentSymlinkOnRemote(serverConfig) {
        const currentSymlinkFullPath = path.join(serverConfig.deployPath, serverConfig.deployer.currentReleaseSymlinkName);
        const releasePath = await this.sshManager.readRemoteSymlink(currentSymlinkFullPath);
        return path.basename(releasePath);
    }
};
ReleaseService = __decorate([
    injectable(),
    __param(0, inject(SshManager$1)),
    __param(1, inject(StorageService$1)),
    __param(2, inject(LoggerService$1)),
    __param(3, inject(ProcessService$1)),
    __metadata("design:paramtypes", [Object, StorageService$1,
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
    constructor(osOperationsService, storage, logger, processService, releaseService) {
        this.osOperationsService = osOperationsService;
        this.storage = storage;
        this.logger = logger;
        this.processService = processService;
        this.releaseService = releaseService;
    }
    createBaseConfig(settings) {
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
        this.storage.addServerConfig(serverConfig);
    }
    getServerConfig(name) {
        return this.storage.getServerConfigs()[name];
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

const taskPositions = {
    // Task goes before SSH tasks
    ORDER: 'order',
    // Task goes first. If there were other task with FIRST earlier, it will be moved
    FIRST: 'first',
    // Task goes after release is uploaded, but before updating symlink
    AFTER_RELEASE_UPLOAD: 'after-release-upload',
    // Add directly to tasks array
    DIRECT: 'direct',
};
const DEFAULT_TASK_POSITION = taskPositions.ORDER;

const GIT_CORE_TASK_NAME = 'git:clone-branch-pull';
const CLEANUP_CORE_TASK_NAME = 'cleanup';
const RELEASES_CREATE_DIR_CORE_TASK_NAME = 'releases:create:directory';
const RELEASES_UPLOAD_CORE_TASK_NAME = 'releases:upload';
const SSH_CONNECT_CORE_TASK_NAME = 'ssh:connect';
const SSH_DISCONNECT_CORE_TASK_NAME = 'ssh:disconnect';
const RELEASES_CLEANUP_CORE_TASK_NAME = 'releases:cleanup';
const RELEASES_UPDATE_SYMLINK_CORE_TASK_NAME = 'releases:update-symlink';
const RELEASES_ROLLBACK_FIND_RELEASES_CORE_TASK_NAME = 'releases:rollback:find-releases';
const RELEASES_ROLLBACK_DELETE_IF_NEED_CORE_TASK_NAME = 'releases:rollback:delete-if-need';

let TaskService = class TaskService {
    serverService;
    logger;
    processService;
    osOperationsService;
    sshManager;
    storage;
    tasks = [];
    taskGroups = {
        [taskPositions.FIRST]: null,
        [taskPositions.ORDER]: [],
        [taskPositions.AFTER_RELEASE_UPLOAD]: [],
    };
    constructor(serverService, logger, processService, osOperationsService, sshManager, storage) {
        this.serverService = serverService;
        this.logger = logger;
        this.processService = processService;
        this.osOperationsService = osOperationsService;
        this.sshManager = sshManager;
        this.storage = storage;
    }
    assembleTasksArray() {
        const { first, [taskPositions.AFTER_RELEASE_UPLOAD]: afterRelease, order } = this.taskGroups;
        this.tasks.unshift(...order);
        first && this.tasks.unshift(first);
        if (!afterRelease.length)
            return;
        const releaseTaskPos = this.tasks.findIndex((task) => task.name === RELEASES_UPLOAD_CORE_TASK_NAME);
        this.tasks.splice(releaseTaskPos + 1, 0, ...afterRelease);
    }
    addTask(name, executor, position = DEFAULT_TASK_POSITION) {
        const newTask = this.createTask(name, executor);
        if (position === taskPositions.DIRECT) {
            if (this.tasks.some((task) => task.name === name)) {
                this.logger.warn(`Duplicate task name "${name}", new one is skipped`);
                return;
            }
            this.tasks.push(newTask);
            return;
        }
        if (this.taskGroups[taskPositions.FIRST]?.name === name ||
            this.taskGroups[taskPositions.ORDER].some((task) => task.name === name) ||
            this.taskGroups[taskPositions.AFTER_RELEASE_UPLOAD].some((task) => task.name === name)) {
            this.logger.warn(`Duplicate task name "${name}", new one is skipped`);
            return;
        }
        if (position === taskPositions.FIRST) {
            if (this.taskGroups.first && !this.taskGroups.order.some((task) => task.name === name)) {
                this.taskGroups.order.unshift(this.taskGroups.first);
            }
            this.taskGroups.first = newTask;
            return;
        }
        this.taskGroups[position].push(newTask);
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
    getAssembledTasks() {
        return this.tasks;
    }
    clearAssembledTasks() {
        this.tasks = [];
    }
    clearTasksGroups() {
        this.taskGroups = {
            [taskPositions.FIRST]: null,
            [taskPositions.ORDER]: [],
            [taskPositions.AFTER_RELEASE_UPLOAD]: [],
        };
    }
    getTaskExecutorContext(serverConfig) {
        return {
            serverConfig,
            execLocal: this.osOperationsService.execute.bind(this.osOperationsService),
            execRemote: this.sshManager.executeRemoteCommand.bind(this.sshManager),
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
    __param(4, inject(SshManager$1)),
    __param(5, inject(StorageService$1)),
    __metadata("design:paramtypes", [ServerService$1,
        LoggerService$1,
        ProcessService$1,
        OsOperationsService$1, Object, StorageService$1])
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
        await this.osOperationsService.execute(['git', ...args].join(' '), runIn);
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
    sshManager;
    constructor(taskService, gitService, osOperationsService, releaseService, sshManager) {
        this.taskService = taskService;
        this.gitService = gitService;
        this.osOperationsService = osOperationsService;
        this.releaseService = releaseService;
        this.sshManager = sshManager;
    }
    createGitTask() {
        this.taskService.addTask(GIT_CORE_TASK_NAME, async ({ serverConfig: { repository, tempDirectory, branch }, logger }) => {
            if (!repository) {
                logger.info('"repository" key is undefined, skipping task');
                return;
            }
            await this.gitService.cloneRepository(repository, tempDirectory);
            await this.gitService.changeBranch(tempDirectory, branch);
            await this.gitService.pull(tempDirectory);
        }, taskPositions.FIRST);
    }
    createCleanupTask() {
        this.taskService.addTask(CLEANUP_CORE_TASK_NAME, async ({ serverConfig: { tempDirectory } }) => {
            this.osOperationsService.removeDirectory(tempDirectory);
        }, taskPositions.DIRECT);
    }
    createReleaseTask() {
        this.taskService.addTask(RELEASES_CREATE_DIR_CORE_TASK_NAME, async () => {
            await this.releaseService.createRelease();
        }, taskPositions.DIRECT);
    }
    createUploadReleaseTask() {
        this.taskService.addTask(RELEASES_UPLOAD_CORE_TASK_NAME, async ({ serverConfig }) => {
            await this.releaseService.uploadRelease(serverConfig);
        }, taskPositions.DIRECT);
    }
    createSshConnectTask() {
        this.taskService.addTask(SSH_CONNECT_CORE_TASK_NAME, async ({ serverConfig }) => {
            await this.sshManager.connect(serverConfig.ssh);
        }, taskPositions.DIRECT);
    }
    createSshDisconnectTask() {
        this.taskService.addTask(SSH_DISCONNECT_CORE_TASK_NAME, async () => {
            await this.sshManager.disconnect();
        }, taskPositions.DIRECT);
    }
    createCleanUpReleasesTask() {
        this.taskService.addTask(RELEASES_CLEANUP_CORE_TASK_NAME, async ({ serverConfig }) => {
            await this.releaseService.cleanUpReleases(serverConfig);
        }, taskPositions.DIRECT);
    }
    createUpdateSymlinkTask() {
        this.taskService.addTask(RELEASES_UPDATE_SYMLINK_CORE_TASK_NAME, async ({ serverConfig }) => {
            await this.releaseService.createSymlinkForCurrentRelease(serverConfig);
        }, taskPositions.DIRECT);
    }
    createRollbackFindReleasesTask() {
        this.taskService.addTask(RELEASES_ROLLBACK_FIND_RELEASES_CORE_TASK_NAME, async ({ serverConfig }) => {
            await this.releaseService.findCurrentAndPreviousReleaseForRollback(serverConfig);
        }, taskPositions.DIRECT);
    }
    createRemoveRollbackRelease() {
        this.taskService.addTask(RELEASES_ROLLBACK_DELETE_IF_NEED_CORE_TASK_NAME, async ({ serverConfig }) => {
            await this.releaseService.deleteReleaseForRollback(serverConfig);
        }, taskPositions.DIRECT);
    }
};
CoreTasksService = __decorate([
    injectable(),
    __param(0, inject(TaskService$1)),
    __param(1, inject(GitService$1)),
    __param(2, inject(OsOperationsService$1)),
    __param(3, inject(ReleaseService$1)),
    __param(4, inject(SshManager$1)),
    __metadata("design:paramtypes", [TaskService$1,
        GitService$1,
        OsOperationsService$1,
        ReleaseService$1, Object])
], CoreTasksService);
var CoreTasksService$1 = CoreTasksService;

let HappyDeployer = class HappyDeployer {
    serverService;
    taskService;
    coreTasksService;
    logger;
    processService;
    storage;
    releaseService;
    steps = {
        [RequiredSteps.BASE_CONFIG]: false,
        [RequiredSteps.AT_LEAST_ONE_SERVER]: false,
    };
    constructor(serverService, taskService, coreTasksService, logger, processService, storage, releaseService) {
        this.serverService = serverService;
        this.taskService = taskService;
        this.coreTasksService = coreTasksService;
        this.logger = logger;
        this.processService = processService;
        this.storage = storage;
        this.releaseService = releaseService;
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
    task(taskOrName, executorOrPosition, position) {
        if (this.taskService.isTask(taskOrName)) {
            this.taskService.addTask(taskOrName.name, taskOrName.executor, position);
        }
        if (typeof taskOrName === 'string' && executorOrPosition !== undefined) {
            this.taskService.addTask(taskOrName, executorOrPosition, position);
        }
        return this;
    }
    async deploy(server) {
        this.storage.setDeployerAction('deploy');
        const config = this.serverService.getServerConfig(server);
        this.storage.setCurrentConfig(config);
        this.releaseService.createReleaseNameAndPath(config);
        this.createInternalDeployTasks();
        this.taskService.assembleTasksArray();
        this.checkRequiredSteps();
        this.logger.info(`Start deploying for config "${config.name}"`);
        await this.taskService.runAllTasks(server);
        this.logger.success('Successfully deployed');
    }
    async rollback(server) {
        this.storage.setDeployerAction('rollback');
        // Stubbing releaseName and releasePath for correct work
        this.storage.setReleaseName('');
        this.storage.setReleasePath('');
        const config = this.serverService.getServerConfig(server);
        this.storage.setCurrentConfig(config);
        this.releaseService.createReleaseNameAndPath(config);
        this.createInternalRollbackTasks();
        this.checkRequiredSteps();
        this.logger.info(`Start rollback for config "${config.name}"`);
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
    __param(6, inject(ReleaseService$1)),
    __metadata("design:paramtypes", [ServerService$1,
        TaskService$1,
        CoreTasksService$1,
        LoggerService$1,
        ProcessService$1,
        StorageService$1,
        ReleaseService$1])
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
    container.bind(Ssh2SshService$1).to(Ssh2SshService$1);
    container.bind(ShellSshService$1).to(ShellSshService$1);
    container.bind(SshManager$1).to(SshManager$1);
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

const createLocalCommandPrefabTask = (name, defaultCommand, execIf) => {
    return (commandOrFactory) => {
        return getService(TaskService$1).createTask(name, async (context) => {
            let command = defaultCommand;
            if (typeof commandOrFactory === 'string') {
                command = commandOrFactory;
            }
            if (typeof commandOrFactory === 'function') {
                command = commandOrFactory(context);
            }
            if (execIf && !execIf(context)) {
                context.logger.info('skipping task', name);
                return;
            }
            context.logger.verbose(`running command "${command}"`);
            await context.execLocal(command, context.serverConfig.tempDirectory);
        });
    };
};
const installDepsTask = createLocalCommandPrefabTask('app:install-deps', 'npm install', ({ action }) => action === 'deploy');
const buildTask = createLocalCommandPrefabTask('app:build', 'npm run build', ({ action }) => action === 'deploy');

function createDeployer() {
    createContainer();
    return getService(HappyDeployer$1);
}

export { buildTask, createDeployer, installDepsTask };
