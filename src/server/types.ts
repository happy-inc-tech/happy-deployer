import { PropertiesToOptional } from '../types.js';

export interface CommonConfig {
  repository: string;
  deleteOnRollback: boolean;
  releaseNameGetter: (...args: any[]) => string;
  tempDirectory: string;
}
type CommonConfigSettingsOptionalFields = 'deleteOnRollback' | 'releaseNameGetter' | 'tempDirectory';
export type CommonConfigSettings = PropertiesToOptional<CommonConfig, CommonConfigSettingsOptionalFields>;

export interface ServerConfig extends CommonConfig {
  name: string;
  host: string;
  port: number;
  username: string;
  deployPath: string;
  dirToCopy: string;
  branch: string;
}
type ServerConfigSettingsOptionalFields = CommonConfigSettingsOptionalFields | 'branch' | 'repository' | 'dirToCopy';
export type ServerConfigSettings = PropertiesToOptional<ServerConfig, ServerConfigSettingsOptionalFields>;
