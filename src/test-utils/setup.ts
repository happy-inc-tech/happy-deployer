import 'reflect-metadata';
import createContainer from '../container/index.js';
import { beforeEach, vi } from 'vitest';

createContainer();

beforeEach(() => {
  vi.stubGlobal('process', {
    exit: vi.fn(),
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

  vi.mock('node:fs', () => {
    return {
      default: {
        promises: {
          mkdir: vi
            .fn()
            .mockImplementation((...args: any[]) =>
              console.log('mkdir called', args.map((arg) => JSON.stringify(arg)).join(',')),
            ),
        },
        rmSync: vi
          .fn()
          .mockImplementation((...args: any[]) =>
            console.log('rmSync called', args.map((arg) => JSON.stringify(arg)).join(',')),
          ),
      },
    };
  });
});
