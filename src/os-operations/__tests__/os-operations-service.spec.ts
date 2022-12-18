import { describe, expect, it, vi } from 'vitest';
import { getServiceForTests } from '../../test-utils/setup.js';
import OsOperationsService from '../os-operations-service.js';
import child_process from 'node:child_process';
import { getLastCallArgs } from '../../test-utils/getLastCallArgs.js';
import fs from 'node:fs';

const service = getServiceForTests(OsOperationsService);

vi.mock('node:fs', () => {
  return {
    default: {
      promises: {
        mkdir: vi.fn(),
      },
      rmSync: vi.fn(),
    },
  };
});
vi.mock('node:child_process', () => {
  return {
    default: {
      exec: vi.fn((cmd, opts, callback) => {
        callback && callback(null, 'out', 'err');
      }),
    },
  };
});
const childProcessSpy = vi.spyOn(child_process, 'exec');

describe('os-operations-service', () => {
  it('executes process', async () => {
    await service.execute('ls -la', '~/');
    const [command, cwd] = getLastCallArgs(childProcessSpy);
    expect(command).toEqual('ls -la');
    expect(cwd).toEqual({ cwd: '~/' });
  });

  it('creates directory', async () => {
    await service.createDirectory('~/test');
    expect(fs.promises.mkdir).toHaveBeenCalledWith('~/test');
  });

  it('removes directory', () => {
    service.removeDirectory('~/test');
    expect(fs.rmSync).toHaveBeenCalledWith('~/test', { recursive: true });
  });
});
