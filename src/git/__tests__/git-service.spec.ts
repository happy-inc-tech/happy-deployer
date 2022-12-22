import { describe, it, expect, vi } from 'vitest';
import GitService from '../git-service.js';
import fs from 'node:fs';
import child_process from 'node:child_process';
import { getLastCallArgs } from '../../test-utils/getLastCallArgs.js';
import { getService } from '../../container/index.js';

const childProcessSpy = vi.spyOn(child_process, 'exec');

describe('git-service', () => {
  const gitService = getService(GitService);

  it('executes command to clone repository', async () => {
    await gitService.cloneRepository('git@git.com/t/1', '/home/repo');
    expect(fs.promises.mkdir).toHaveBeenCalledWith('/home/repo');
    const lastCall = getLastCallArgs(childProcessSpy);
    expect(lastCall).toBeDefined();
    expect(lastCall[0]).toEqual('git clone git@git.com/t/1 .');
    expect(lastCall[1]).toEqual({ cwd: '/home/repo' });
  });

  it('executes command to change branch', async () => {
    await gitService.changeBranch('/home/repo', 'test');
    const lastCall = getLastCallArgs(childProcessSpy);
    expect(lastCall[0]).toEqual('git checkout test');
    expect(lastCall[1]).toEqual({ cwd: '/home/repo' });
  });

  it('executes pull command', async () => {
    await gitService.pull('/home/repo');
    const lastCall = getLastCallArgs(childProcessSpy);
    expect(lastCall[0]).toEqual('git pull');
    expect(lastCall[1]).toEqual({ cwd: '/home/repo' });
  });
});
