import { describe, it, expect } from 'vitest';
import { getServiceForTests } from '../../test-utils/setup.js';
import CacheService from '../cache-service.js';

const getCacheService = () => getServiceForTests(CacheService);

describe('cache-service', function () {
  it('caches', () => {
    getCacheService().cache('key', 'value');
    expect(getCacheService().getCached('key')).toEqual('value');
  });

  it('does not throw an error if there is no cached value', () => {
    expect(() => getCacheService().getCached('second')).not.toThrowError();
    expect(getCacheService().getCached('second')).toEqual(null);
  });
});
