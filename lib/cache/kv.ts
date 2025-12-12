/**
 * KV 缓存适配器
 * 使用 OpenNext 的 getCloudflareContext() 访问 Cloudflare Bindings
 * @see https://opennext.js.org/cloudflare/bindings
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * KV 存储乘数
 * KV 存储时间 = ISR revalidate 时间 × KV_STORAGE_MULTIPLIER
 *
 * 这个乘数只影响 KV 的物理存储时间，不影响数据的"新鲜度"判断
 * 目的是防止 KV 在我们判断数据是否过期之前就把数据删掉了
 */
const KV_STORAGE_MULTIPLIER = 2;

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * 检测当前运行环境
 */
export function getEnvironment(): "workers" | "vercel" | "local" {
  // Vercel 环境检测
  if (process.env.VERCEL === "1") {
    return "vercel";
  }
  // 在 Workers 运行时，getCloudflareContext 会返回有效的 env
  // 但我们需要在运行时检测，所以先返回 local，实际使用时再检测
  return "local";
}

/**
 * 获取 KV 命名空间（如果可用）
 */
async function getKV(): Promise<KVNamespace | null> {
  try {
    const { env } = await getCloudflareContext();
    return env.BLOG_CACHE || null;
  } catch {
    // 不在 Cloudflare Workers 环境中
    return null;
  }
}

/**
 * KV 缓存操作封装
 */
export const kvCache = {
  /**
   * 从 KV 获取数据
   * @param key - 缓存键
   * @param expectedTtl - 期望的数据新鲜度（秒），超过这个时间的数据视为过期
   */
  async get<T>(key: string, expectedTtl?: number): Promise<T | null> {
    const startTime = performance.now();

    try {
      const kv = await getKV();
      if (!kv) return null;

      const value = await kv.get(key, "json");
      if (value) {
        const entry = value as CacheEntry<T>;
        const age = Date.now() - entry.timestamp;
        // 使用传入的 expectedTtl 或存储的 ttl 来判断新鲜度
        const maxAge = (expectedTtl || entry.ttl) * 1000;

        if (age < maxAge) {
          console.log(
            `[KV Cache HIT] ${key} age=${Math.round(age / 1000)}s/${Math.round(
              maxAge / 1000
            )}s (${(performance.now() - startTime).toFixed(2)}ms)`
          );
          return entry.data;
        }
        console.log(
          `[KV Cache STALE] ${key} age=${Math.round(
            age / 1000
          )}s > ${Math.round(maxAge / 1000)}s`
        );
      }
    } catch (error) {
      console.error(`[KV Cache ERROR] get ${key}:`, error);
    }

    console.log(
      `[KV Cache MISS] ${key} (${(performance.now() - startTime).toFixed(2)}ms)`
    );
    return null;
  },

  /**
   * 写入数据到 KV
   * @param ttl - 数据新鲜度时间（秒），KV 存储时间会稍长以防止过早删除
   */
  async set<T>(key: string, data: T, ttl: number): Promise<boolean> {
    const startTime = performance.now();

    try {
      const kv = await getKV();
      if (!kv) return false;

      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl: ttl, // 存储原始 TTL 用于新鲜度判断
      };

      // KV 物理存储时间比新鲜度时间长，防止数据被过早删除
      // KV 的 expirationTtl 必须至少 60 秒
      const storageTtl = Math.max(ttl * KV_STORAGE_MULTIPLIER, 60);

      await kv.put(key, JSON.stringify(entry), {
        expirationTtl: storageTtl,
      });

      console.log(
        `[KV Cache SET] ${key} freshness=${ttl}s storage=${storageTtl}s (${(
          performance.now() - startTime
        ).toFixed(2)}ms)`
      );
      return true;
    } catch (error) {
      console.error(`[KV Cache ERROR] set ${key}:`, error);
    }

    return false;
  },

  /**
   * 删除 KV 中的数据
   */
  async delete(key: string): Promise<boolean> {
    try {
      const kv = await getKV();
      if (!kv) return false;

      await kv.delete(key);
      console.log(`[KV Cache DELETE] ${key}`);
      return true;
    } catch (error) {
      console.error(`[KV Cache ERROR] delete ${key}:`, error);
    }

    return false;
  },

  /**
   * 列出所有缓存键（用于调试）
   */
  async list(prefix?: string): Promise<string[]> {
    try {
      const kv = await getKV();
      if (!kv) return [];

      const list = await kv.list({ prefix });
      return list.keys.map((k) => k.name);
    } catch (error) {
      console.error(`[KV Cache ERROR] list:`, error);
    }

    return [];
  },

  /**
   * 检查 KV 是否可用
   */
  async isAvailable(): Promise<boolean> {
    const kv = await getKV();
    return kv !== null;
  },
};

/**
 * 生成标准化的缓存键
 */
export function getCacheKey(namespace: string, ...parts: string[]): string {
  return `${namespace}:${parts.join(":")}`;
}

/**
 * 缓存键命名空间
 */
export const CacheKeys = {
  SITE_DATA: "site-data",
  POST_LIST: "post-list",
  POST_CONTENT: "post-content",
  SITE_CONFIG: "site-config",
  POST_BLOCKS: "post-blocks",
} as const;
