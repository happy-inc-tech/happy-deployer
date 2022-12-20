# Happy Deployer
Simple deployer for JS apps

## Features
- [Shipit](https://github.com/shipitjs/shipit)-style settings with more clear flow
- Deploy and Rollback operations
- For CJS & ESM, strongly typed

## Documentation

### Getting started 
```shell
npm i -D happy-deployer
```
Then create file (f.e. `deploy.js`) in your project:
```javascript
const { createDeployer } = require('happy-deployer');
// ESM syntax is also supported:
import { createDeployer } from 'happy-deployer';
```

### Adding servers
The main data blocks of a deployer are servers, remote 
destinations for your files. Each server has its own set 
of settings.
If you have multiple possible servers that share common 
settings, you can provide a basic configuration. `baseConfig`
will be merged into all servers configurations.

```javascript
const { createDeployer } = require('happy-deployer');

createDeployer()
  .baseConfig({
    repository: 'ssh://git@myhost:22/my-repo.git',
    ssh: {
      username: 'my_user',
      port: 22
    },
  })
  .addServer({
    name: 'production',
    branch: 'main'
  })
```

These options can be passed in the configuration to 
`baseConfig` and `addServer`:

```typescript
export type ServerConfiguration<MetaType extends Record<string, unknown> = Record<string, unknown>> = {
  name: string; // Server configuration name
  repository?: string; // Git repo url, if undefined - Git task will be skipped
  branch: string; // Git branch name
  deployPath: string; // Path on remote host
  dirToCopy: string; // Directory from repo path to copy on serve (default "dist")
  tempDirectory: string; // Path to temp directory on local machine where repo is cloned (default - system temp dir)
  releaseNameGetter: () => string; // Function to get current release directory name (default generates f.e. "20210101130000")
  releaseNameComparer: (a: string, b: string) => number; // Custom release names sorter for custom releaseNameGetter
  ssh: SshCredentials; // Everything you need to perform SSH connection to your server
  deployer: DeployerBehavior; // Customize deployer behavior (see below)
  meta: MetaType; // Mutable "meta" object to store any data
};

export type DeployerBehavior = {
  keepReleases: number; // How many releases should be kept on remote server (default 5)
  deleteOnRollback: boolean; // Remove release when performing rollback (default true)
  releasesDirName: string; // Name for releases directory (default "releases")
  currentReleaseSymlinkName: string; // Name for current release symlink (default "current")
  showCommandLogs: boolean; // Show logs for commands (git, npm, custom; default false)
};
```
`SshCredentials` type is similar to `ssh2` node module. 

## Tasks

### Default tasks

When the servers are configured, you can configure the tasks that the deployer will perform. By default (if you don't add anything) the following will be done:
1. Git task - clone your repository (if repo url is present)
2. Ssh connect - check connection to remote server
3. Create release - mkdir on remote server with new release name
4. Upload release - upload `dirToCopy` to directory which was created in previous step
5. Update symlinks - switch `current` symlink on remote server to a new release
6. Clean up releases - delete old releases on remote server (see `keepReleases` in DeployerBehavior)
7. Ssh disconnect
8. Clean up local directory where repo was cloned. 

### Custom tasks

You can add custom task to this flow like this: 
```javascript
const { createDeployer } = require('happy-deployer');

createDeployer()
  .baseConfig({
    repository: 'ssh://git@myhost:22/my-repo.git',
    ssh: {
      username: 'my_user',
      port: 22
    },
  })
  .addServer({
    name: 'production',
    branch: 'main'
  })
  .task('my-task', async (context) => {
    await context.execRemote('ls -la')
  })
```

First argument is a task name, second - the job itself.
Here is what you have in task context: 

```typescript
export type TaskExecutorContext<MetaType extends Record<string, unknown> = Record<string, unknown>> = {
  serverConfig: ServerConfiguration; // full server configuration
  logger: LoggerService; // logger service for print logs in style of deployer
  execLocal: (command: string, runIn?: string) => Promise<string>; // async method for executing local commands (second arg is pwd)
  execRemote: (command: string) => Promise<string>; // async method for executing remote commands
  action: DeployerAction; // what is currently going on ("deploy" or "rollback")
  releaseName: string; // new release name
  releasePath: string; // new release full path on remote server
  meta: MetaType; // "meta" object from server configuration
};
```

For logger API see [LoggerService](src/logger/logger-service.ts).

This context gives you all the features for your tasks. 

### Prefab tasks
There are two tasks that you can import from happy-deployer: install dependencies and build:
```javascript
const { createDeployer, buildTask, installDepsTask } = require('happy-deployer');

createDeployer()
  .baseConfig({ /* ... */ })
  .addServer({ /* ... */ })
  // Call imported functions inside .task method
  .task(installDepsTask())
  .task(buildTask())
```
You can customize the commands they execute in two ways:
just pass a string or use callback with TaskExecutorContext (f.e. if you want to use meta section)
```javascript
createDeployer()
  .task(installDepsTask('yarn')) // default "npm install" will be replaced with "yarn"
  .task(
    // default "npm run build" will be replaced with string 
    // returned from this callback
    buildTask((context) => `npm run build -- --mode=${context.meta.buildMode}`)
  )
```

### Tasks order
By default all the task added via `deployer.task` method are added 
**before** SSH connect and **after** git task. If you want to add new task
to a custom position, you have these options:

```typescript
export const taskPositions = {
  // Task goes before SSH tasks
  ORDER: 'order',
  // Task goes first. If there were other task with FIRST earlier, it will become second
  FIRST: 'first',
  // Task goes after release is uploaded, but before updating symlink
  AFTER_RELEASE_UPLOAD: 'after-release-upload',
} as const;
```

Just pass a position 3rd argument to `.task` method like this: 
```javascript
const { createDeployer } = require('happy-deployer');

createDeployer()
  .baseConfig({/* ... */})
  .addServer({/* ... */})
  .task('my-task', async (context) => {
    await context.execRemote('ls -la')
  // right here
  }, 'after-release-upload')
```

## Deploy and rollback

To start a process just call a specific method:
```javascript
const { createDeployer } = require('happy-deployer');

const deployer = createDeployer()
  .baseConfig({/* ... */})
  .addServer({
    name: 'production',
    /* ... */
  })
  .task('my-task', async (context) => {
    await context.execRemote('ls -la')
  // right here
  }, 'after-release-upload')

deployer.deploy('production')
// or
deployer.rollback('production')
```

The only argument is a server name. Then just start `node ./deploy.js`.

## TODO
- [ ] Plugin system
