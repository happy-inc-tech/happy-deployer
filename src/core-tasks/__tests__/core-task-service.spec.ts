import { describe, it, expect } from "vitest";
import {getService} from "../../test-utils/setup.js";
import CoreTasksService from "../core-tasks-service.js";
import TaskService from "../../task/task-service.js";

const coreTaskService = getService(CoreTasksService)
const taskService = getService(TaskService)

describe('core-task-service', () => {
    it('create git tasks', () => {
        coreTaskService.createGitTask()
        expect(taskService.getTask('git:clone-branch-pull')).toBeDefined()
    })

    it('create install deps and build tasks', () => {
        coreTaskService.createBuildTask('cmd1', 'cmd2')
        expect(taskService.getTask('install-deps')).toBeDefined()
        expect(taskService.getTask('build')).toBeDefined()
    })

    it('create cleanup task', () => {
        coreTaskService.createCleanupTask()
        expect(taskService.getTask('cleanup')).toBeDefined()
    })
})