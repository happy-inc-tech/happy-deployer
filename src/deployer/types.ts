export enum RequiredSteps {
  BASE_CONFIG = 'BASE_CONFIG',
  AT_LEAST_ONE_SERVER = 'AT_LEAST_ONE_SERVER',
}

export type DeployerAction = 'deploy' | 'rollback';
