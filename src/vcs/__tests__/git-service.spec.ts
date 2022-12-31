import { describe, it, expect, vi } from 'vitest';
import GitService from '../git-service.js';
import fs from 'node:fs';
import child_process from 'node:child_process';
import { getService } from '../../container/index.js';

const childProcessSpy = vi.spyOn(child_process, 'exec');

describe('git-service', () => {
  const gitService = getService(GitService);

  it('executes command correctly', async () => {
    await gitService.fetchFiles('git@git.com/t/1', 'staging', '/home/repo');
    expect(fs.promises.mkdir).toHaveBeenCalledWith('/home/repo');
    const [firstCall] = childProcessSpy.mock.calls;

    expect(firstCall[0]).toEqual('git clone -b staging --single-branch git@git.com/t/1 .');
    expect(firstCall[1]).toEqual({ cwd: '/home/repo' });
  });
});
