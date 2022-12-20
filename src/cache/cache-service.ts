import { injectable } from 'inversify';

@injectable()
export default class CacheService {
  protected readonly _cache = new Map<string, unknown>();

  public cache(key: string, value: unknown): void {
    this._cache.set(key, value);
  }

  public getCached<T = unknown>(key: string): T | null {
    return (this._cache.get(key) as T) ?? null;
  }

  public reset() {
    this._cache.clear();
  }
}
