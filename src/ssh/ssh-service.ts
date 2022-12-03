import {inject, injectable} from "inversify";
import {RemoteCommandCredentials} from "./types.js";
import { NodeSSH } from 'node-ssh'
import LoggerService from "../logger/logger-service.js";

@injectable()
export default class SshService {
    private sshClient = new NodeSSH()
    private connected = false

    constructor(
        @inject(LoggerService) protected logger: LoggerService
    ) {
    }

    public async executeRemoteCommand(command: string, credentials: RemoteCommandCredentials) {
        const { stdout, stderr, code } = await this.sshClient.execCommand(command)
        stdout && this.logger.info('[SSH]', stdout)
        stderr && this.logger.error('[SSH]', stderr)
        if (code !== 0) {
            this.logger.error('[SSH]', `remote command "${command}" failed`)
            process.exit(1)
        }
        // this.sshClient.dispose()
    }

    public async uploadDirectory(localPath: string, remotePath: string, credentials: RemoteCommandCredentials) {
        const status = await this.sshClient.putDirectory(localPath, remotePath, {
            recursive: true,
            concurrency: 5,
            tick: (localFile, remoteFile, error) => {
                if (error) {
                    this.logger.error('[SSH]', 'failed upload file', localFile)
                }
            }
        })

        if (!status) {
            this.logger.error('[SSH]', 'directory upload failed')
        }
        // this.sshClient.dispose()
    }

    public async connect(credentials: RemoteCommandCredentials) {
        await this.sshClient.connect(credentials)
        this.connected = true
    }

    public async disconnect() {
        this.sshClient.dispose()
    }
}