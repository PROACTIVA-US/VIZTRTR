/**
 * Cache Service for Performance Optimization
 *
 * Caches vision analysis results to avoid redundant API calls for similar screenshots
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export interface CacheConfig {
  enabled: boolean;
  ttl?: number; // Time to live in seconds (default: 3600 = 1 hour)
  maxSize?: number; // Max cache entries (default: 100)
  cacheDir?: string; // Cache directory (default: ./.cache)
}

export interface CacheEntry<T> {
  key: string;
  value: T;
  timestamp: number;
  expiresAt: number;
}

export class CacheService<T = any> {
  private config: Required<CacheConfig>;
  private memoryCache: Map<string, CacheEntry<T>> = new Map();
  private cacheDir: string;

  constructor(config: CacheConfig) {
    this.config = {
      enabled: config.enabled,
      ttl: config.ttl ?? 3600,
      maxSize: config.maxSize ?? 100,
      cacheDir: config.cacheDir ?? './.cache',
    };

    this.cacheDir = path.resolve(this.config.cacheDir);

    if (this.config.enabled) {
      this.ensureCacheDir();
      this.loadFromDisk();
      this.startCleanupTimer();
    }
  }

  /**
   * Get value from cache by key
   */
  get(key: string): T | null {
    if (!this.config.enabled) {
      return null;
    }

    const entry = this.memoryCache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.memoryCache.delete(key);
      this.deleteFromDisk(key);
      return null;
    }

    return entry.value;
  }

  /**
   * Set value in cache
   */
  set(key: string, value: T): void {
    if (!this.config.enabled) {
      return;
    }

    const entry: CacheEntry<T> = {
      key,
      value,
      timestamp: Date.now(),
      expiresAt: Date.now() + this.config.ttl * 1000,
    };

    // Evict oldest entry if cache is full
    if (this.memoryCache.size >= this.config.maxSize) {
      const oldestKey = this.getOldestKey();
      if (oldestKey) {
        this.memoryCache.delete(oldestKey);
        this.deleteFromDisk(oldestKey);
      }
    }

    this.memoryCache.set(key, entry);
    this.saveToDisk(entry);
  }

  /**
   * Generate cache key from screenshot data
   */
  generateKey(data: string, prefix: string = 'vision'): string {
    const hash = crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
    return `${prefix}-${hash}`;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.memoryCache.clear();
    if (fs.existsSync(this.cacheDir)) {
      const files = fs.readdirSync(this.cacheDir);
      for (const file of files) {
        fs.unlinkSync(path.join(this.cacheDir, file));
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    oldestEntry: number;
    newestEntry: number;
  } {
    const entries = Array.from(this.memoryCache.values());
    const timestamps = entries.map(e => e.timestamp);

    return {
      size: this.memoryCache.size,
      maxSize: this.config.maxSize,
      hitRate: 0, // Would need to track hits/misses
      oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : 0,
      newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : 0,
    };
  }

  // Private methods

  private ensureCacheDir(): void {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  private loadFromDisk(): void {
    if (!fs.existsSync(this.cacheDir)) {
      return;
    }

    const files = fs.readdirSync(this.cacheDir);
    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      try {
        const filePath = path.join(this.cacheDir, file);
        const data = fs.readFileSync(filePath, 'utf-8');
        const entry: CacheEntry<T> = JSON.parse(data);

        // Skip expired entries
        if (Date.now() > entry.expiresAt) {
          fs.unlinkSync(filePath);
          continue;
        }

        this.memoryCache.set(entry.key, entry);
      } catch (error) {
        // Skip invalid cache files
        console.warn(`Failed to load cache file ${file}:`, error);
      }
    }
  }

  private saveToDisk(entry: CacheEntry<T>): void {
    try {
      const filePath = path.join(this.cacheDir, `${entry.key}.json`);
      fs.writeFileSync(filePath, JSON.stringify(entry), 'utf-8');
    } catch (error) {
      console.warn('Failed to save cache to disk:', error);
    }
  }

  private deleteFromDisk(key: string): void {
    try {
      const filePath = path.join(this.cacheDir, `${key}.json`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.warn('Failed to delete cache file:', error);
    }
  }

  private getOldestKey(): string | null {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  private startCleanupTimer(): void {
    // Clean up expired entries every 5 minutes
    setInterval(
      () => {
        const now = Date.now();
        for (const [key, entry] of this.memoryCache.entries()) {
          if (now > entry.expiresAt) {
            this.memoryCache.delete(key);
            this.deleteFromDisk(key);
          }
        }
      },
      5 * 60 * 1000
    );
  }
}

/**
 * Global cache instances for different purposes
 */
export class CacheManager {
  private static instances: Map<string, CacheService> = new Map();

  static getVisionCache(config: CacheConfig): CacheService {
    if (!this.instances.has('vision')) {
      const cacheConfig = {
        ...config,
        cacheDir: path.join(config.cacheDir || './.cache', 'vision'),
      };
      this.instances.set('vision', new CacheService(cacheConfig));
    }
    return this.instances.get('vision')!;
  }

  static getMetricsCache(config: CacheConfig): CacheService {
    if (!this.instances.has('metrics')) {
      const cacheConfig = {
        ...config,
        cacheDir: path.join(config.cacheDir || './.cache', 'metrics'),
      };
      this.instances.set('metrics', new CacheService(cacheConfig));
    }
    return this.instances.get('metrics')!;
  }

  static clearAll(): void {
    for (const cache of this.instances.values()) {
      cache.clear();
    }
    this.instances.clear();
  }
}
