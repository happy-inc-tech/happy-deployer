import { describe, it, expect } from 'vitest';
import MemoryCacheService from '../memory-cache-service.js';
import { getService } from '../../container/index.js';

describe('memory-cache-service', function () {
  const cacheService = getService(MemoryCacheService);

  it('caches', () => {
    cacheService.save('key', 'value');
    expect(cacheService.get('key')).toEqual('value');
  });

  it('does not throw an error if there is no cached value', () => {
    expect(() => cacheService.get('second')).not.toThrowError();
    expect(cacheService.get('second')).toEqual(null);
  });
});
