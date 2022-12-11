import type { Config } from 'node-ssh';
import type { DeepPartial } from '../types.js';

export type SshCredentials = Config;

export type DeployerBehavior = {
  keepReleases: number; // How many releases should be kept on remote server (default 5)
  deleteOnRollback: boolean; // Remove release when performing rollback (default true)
  releasesDirName: string; // Name for releases directory (default "releases")
  currentReleaseSymlinkName: string; // Name for current release symlink (default "current")
  showCommandLogs: boolean; // Show logs for commands (git, npm, custom; default false)
};

export type ServerConfiguration<MetaType extends Record<string, unknown> = Record<string, unknown>> = {
  name: string; // Server configuration name
  repository?: string; // Git repo url, if undefined - Git task will be skipped
  branch: string; // Git branch name
  deployPath: string; // Path on remote host
  dirToCopy: string; // Directory from repo path to copy on serve (default "dist")
  tempDirectory: string; // Path to temp directory on local machine where repo is cloned
  releaseNameGetter: () => string; // Function to get current release directory name
  releaseNameComparer: (a: string, b: string) => number; // Custom release names sorter for custom releaseNameGetter
  ssh: SshCredentials; // Everything you need to perform SSH connection to your server
  deployer: DeployerBehavior; // Customize deployer behavior
  meta: MetaType; // Mutable "meta" object to store any data
};

export type DefaultServerConfigValues = Pick<
  ServerConfiguration,
  'branch' | 'dirToCopy' | 'tempDirectory' | 'releaseNameGetter' | 'deployer' | 'releaseNameComparer' | 'meta'
>;

export type ServerConfigurationParameters = DeepPartial<ServerConfiguration> & Pick<ServerConfiguration, 'name'>;

export type ServerConfigurationParametersWithoutName = Omit<ServerConfigurationParameters, 'name'>;

export type BaseConfig = ServerConfigurationParametersWithoutName & DefaultServerConfigValues;
