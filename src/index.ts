import 'reflect-metadata'
import HappyDeployer from "./deployer/deployer.js";
import CoreTasksService from "./core-tasks/core-tasks-service.js";
import LoggerService from "./logger/logger-service.js";
import ServerService from "./server/server-service.js";
import TaskService from "./task/task-service.js";
import createContainer from "./container/create-container.js";

export default function createDeployer(): HappyDeployer {
    const container = createContainer()

    return new HappyDeployer(
        container.get(ServerService),
        container.get(TaskService),
        container.get(CoreTasksService),
        container.get(LoggerService)
    )
}