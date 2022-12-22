import { describe, it, expect } from 'vitest';
import CacheService from '../cache-service.js';
import { getService } from '../../container/index.js';

describe('cache-service', function () {
  const cacheService = getService(CacheService);

  it('caches', () => {
    cacheService.cache('key', 'value');
    expect(cacheService.getCached('key')).toEqual('value');
  });

  it('does not throw an error if there is no cached value', () => {
    expect(() => cacheService.getCached('second')).not.toThrowError();
    expect(cacheService.getCached('second')).toEqual(null);
  });
});
