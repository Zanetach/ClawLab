// 高性能内存缓存系统

type CacheEntry<T> = {
  data: T;
  timestamp: number;
  expiresAt: number;
};

class MemoryCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private inFlight = new Map<string, Promise<unknown>>();
  private readonly DEFAULT_TTL = 5000; // 5秒默认缓存

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  set<T>(key: string, data: T, ttl?: number): void {
    const expiresAt = Date.now() + (ttl ?? this.DEFAULT_TTL);
    this.cache.set(key, { data, timestamp: Date.now(), expiresAt });
  }

  // 获取或计算（缓存穿透保护）
  async getOrCompute<T>(
    key: string,
    compute: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) return cached;

    const pending = this.inFlight.get(key);
    if (pending) {
      return pending as Promise<T>;
    }

    const computation = compute()
      .then((data) => {
        this.set(key, data, ttl);
        return data;
      })
      .finally(() => {
        this.inFlight.delete(key);
      });

    this.inFlight.set(key, computation);
    return computation;
  }

  // 强制过期
  invalidate(key: string): void {
    this.cache.delete(key);
    this.inFlight.delete(key);
  }

  // 清除所有
  clear(): void {
    this.cache.clear();
    this.inFlight.clear();
  }
}

export const cache = new MemoryCache();
