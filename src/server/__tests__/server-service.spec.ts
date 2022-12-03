import {describe, it, expect, vi} from "vitest";
import {getService} from "../../test-utils/setup.js";
import ServerService from "../server-service.js";
import CacheService from "../../cache/cache-service.js";
import {COMMON_CONFIG_KEY} from "../../cache/const.js";
import OsOperationsService from "../../os-operations/os-operations-service.js";

const serverService = getService(ServerService)
const cacheService = getService(CacheService)
const osOpsService = getService(OsOperationsService)

const osOpsSpy = vi.spyOn(osOpsService, 'getRandomBuildDirectory')

describe('server-service', () => {
    it('creates and caches common config', () => {
        serverService.createCommonConfig({
            repository: 'git@git.com/1/2',
        })

        expect(cacheService.getCached(COMMON_CONFIG_KEY)).toEqual({
            repository: 'git@git.com/1/2',
            deleteOnRollback: true,
            releaseNameGetter: osOpsService.getReleaseNameFromCurrentTime,
            tempDirectory: osOpsSpy.mock.results[0].value
        })
    })

    it('creates and retrieves server config', () => {
        serverService.createServerConfig({
            name: 'prod',
            host: '127.0.0.1',
            port: 22,
            username: 'alexey',
            deployPath: '/var/www/release',
            branch: 'main'
        })

        const serverConfig = serverService.getServerConfig('prod')
        expect(serverConfig).toBeDefined()

        expect(serverConfig).toEqual({
            repository: 'git@git.com/1/2',
            deleteOnRollback: true,
            releaseNameGetter: osOpsService.getReleaseNameFromCurrentTime,
            tempDirectory: osOpsSpy.mock.results[0].value,
            name: 'prod',
            host: '127.0.0.1',
            port: 22,
            username: 'alexey',
            deployPath: '/var/www/release',
            branch: 'main',
            dirToCopy: osOpsSpy.mock.results[0].value + '/dist'
        })
    })
})