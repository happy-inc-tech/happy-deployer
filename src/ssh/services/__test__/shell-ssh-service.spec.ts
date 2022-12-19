import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { getServiceForTests } from '../../../test-utils/setup.js';
import OsOperationsService from '../../../os-operations/os-operations-service.js';
import ShellSshService from '../shell-ssh-service.js';

const osOpsService = getServiceForTests(OsOperationsService);
const shellSshService = getServiceForTests(ShellSshService);

vi.mock('../../../os-operations/os-operations-service.js', async () => {
  const { default: OsOps } = await import('../../../os-operations/os-operations-service.js');

  return {
    default: class extends OsOps {
      public execute = vi.fn();
    },
  };
});

describe('shell-ssh-service', () => {
  beforeEach(() => {
    shellSshService.connect({ username: 'test', host: 'ssh.com', port: 33 });
  });

  it('execute remote command works correctly', async () => {
    await shellSshService.executeRemoteCommand('ls -la');
    expect(osOpsService.execute).lastCalledWith("ssh test@ssh.com -p 33 'ls -la'");
  });

  it('upload directory', async () => {
    await shellSshService.uploadDirectory('/local', '/remote');
    expect(osOpsService.execute).lastCalledWith('scp -r -P 33 /local/* test@ssh.com:/remote');
  });

  it('get directories list command', async () => {
    (osOpsService.execute as Mock).mockImplementationOnce(() => '');
    await shellSshService.getDirectoriesList('/remote');
    expect(osOpsService.execute).lastCalledWith("ssh test@ssh.com -p 33 'cd /remote && ls -FlA'");
  });

  it('correctly parses ls -FlA result', async () => {
    (osOpsService.execute as Mock).mockImplementationOnce(
      vi.fn(
        () =>
          'total N\n' +
          'drwxr-xr-x    4 user  staff        128 20 янв  2022 temp/\n' +
          '-rw-r--r--@   1 user  staff         82  1 сен 10:39 test.html',
      ),
    );
    const result = await shellSshService.getDirectoriesList('/remote');
    expect(result).toStrictEqual(['temp']);
  });

  it('correctly reads remote symlink', async () => {
    (osOpsService.execute as Mock).mockImplementationOnce(() => '');
    const linkResult = await shellSshService.readRemoteSymlink('/remote/symlink');
    expect(osOpsService.execute).lastCalledWith(`ssh test@ssh.com -p 33 'readlink /remote/symlink'`);
  });
});
