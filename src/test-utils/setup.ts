import 'reflect-metadata';
import createContainer from '../container/index.js';
import { beforeEach, vi } from 'vitest';

createContainer();

beforeEach(() => {
  vi.stubGlobal('process', {
    exit: vi.fn(),
  });
});
