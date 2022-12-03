import {inject, injectable} from "inversify";
import SshService from "../ssh/ssh-service.js";
import ServerService from "../server/server-service.js";
import CacheService from "../cache/cache-service.js";
import {RELEASE_NAME_KEY, RELEASE_PATH_KEY} from "../cache/const.js";
import OsOperationsService from "../os-operations/os-operations-service.js";
import path from "node:path";
import {ServerConfig} from "../server/types.js";
import {RemoteCommandCredentials} from "../ssh/types.js";

@injectable()
export default class ReleaseService {
    constructor(
        @inject(SshService) protected readonly sshService: SshService,
        @inject(ServerService) protected readonly serverService: ServerService,
        @inject(CacheService) protected readonly cacheService: CacheService,
        @inject(OsOperationsService) protected readonly osOperationsService: OsOperationsService
    ) {}

    public async createRelease(forServer: string) {
        const serverConfig = this.serverService.getServerConfig(forServer)
        const releaseName = serverConfig.releaseNameGetter()
        this.cacheService.cache(RELEASE_NAME_KEY, releaseName)
        const releasePath = path.join(serverConfig.deployPath, 'releases', releaseName)
        this.cacheService.cache(RELEASE_PATH_KEY, releasePath)

        await this.sshService.executeRemoteCommand(`mkdir -p ${releasePath}`, this.serverConfigToSshCredentials(serverConfig))
    }

    public async uploadRelease(forServer: string) {
        const serverConfig = this.serverService.getServerConfig(forServer)
        const releasePath = this.getCurrentReleasePath()
        const dirToUpload = path.resolve(serverConfig.tempDirectory, serverConfig.dirToCopy)

        await this.sshService.uploadDirectory(dirToUpload, releasePath, this.serverConfigToSshCredentials(serverConfig))
    }

    public getCurrentReleaseName(): string {
        const releaseName = this.cacheService.getCached<string>(RELEASE_NAME_KEY)
        if (!releaseName) {
            throw  new Error('Release name not created')
        }

        return releaseName
    }

    public getCurrentReleasePath(): string {
        const releasePath = this.cacheService.getCached<string>(RELEASE_PATH_KEY)
        if (!releasePath) {
            throw  new Error('Release path not created')
        }

        return releasePath
    }

    public serverConfigToSshCredentials(config: ServerConfig): RemoteCommandCredentials {
        return {
            username: config.username,
            password: (config as any).password,
            port: config.port,
            host: config.host
        }
    }
}