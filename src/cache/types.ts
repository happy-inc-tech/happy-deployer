export interface DataCachingInterface {
  save(key: string, value: unknown): void;
  get<T = unknown>(key: string): T | null;
  reset(): void;
}
