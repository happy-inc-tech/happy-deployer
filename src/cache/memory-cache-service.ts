import { injectable } from 'inversify';
import type { DataCachingInterface } from './types.js';

@injectable()
export default class MemoryCacheService implements DataCachingInterface {
  protected readonly _cache = new Map<string, unknown>();

  public save(key: string, value: unknown): void {
    this._cache.set(key, value);
  }

  public get<T = unknown>(key: string): T | null {
    return (this._cache.get(key) as T) ?? null;
  }

  public reset() {
    this._cache.clear();
  }
}
