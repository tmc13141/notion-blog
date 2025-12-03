/**
 * KV 缓存适配器
 * 使用 OpenNext 的 getCloudflareContext() 访问 Cloudflare Bindings
 * @see https://opennext.js.org/cloudflare/bindings
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * KV TTL 乘数
 * KV 缓存时间 = ISR revalidate 时间 × KV_TTL_MULTIPLIER
 *
 * 为什么需要这个？
 * - ISR 页面缓存 60 秒后过期，触发后台重新生成
 * - 如果 KV 也是 60 秒，重新生成时 KV 也过期了 → 必须调用 Notion API
 * - 设置 KV TTL 为 3 倍，这样 ISR 重新生成时 KV 还有效 → KV HIT，省掉 API 调用
 *
 * 示例：ISR=60s, KV_TTL_MULTIPLIER=3
 * - 0-60s: 两个缓存都有效
 * - 60s: ISR 过期，重新生成，KV 还有效 → KV HIT ✅
 * - 120s: ISR 过期，重新生成，KV 还有效 → KV HIT ✅
 * - 180s: ISR 过期，KV 也过期 → 调用 Notion API
 */
export const KV_TTL_MULTIPLIER = 3;

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
   */
  async get<T>(key: string): Promise<T | null> {
    const startTime = performance.now();

    try {
      const kv = await getKV();
      if (!kv) return null;

      const value = await kv.get(key, "json");
      if (value) {
        const entry = value as CacheEntry<T>;
        // 检查是否过期
        if (Date.now() - entry.timestamp < entry.ttl * 1000) {
          console.log(
            `[KV Cache HIT] ${key} (${(performance.now() - startTime).toFixed(
              2
            )}ms)`
          );
          return entry.data;
        }
        console.log(`[KV Cache EXPIRED] ${key}`);
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
   * @param ttl - ISR revalidate 时间（秒），KV 实际 TTL = ttl × KV_TTL_MULTIPLIER
   */
  async set<T>(key: string, data: T, ttl: number): Promise<boolean> {
    const startTime = performance.now();

    try {
      const kv = await getKV();
      if (!kv) return false;

      // KV TTL = ISR revalidate × 乘数，确保 ISR 重新生成时 KV 还有效
      const actualTtl = ttl * KV_TTL_MULTIPLIER;

      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl: actualTtl,
      };
      // KV 的 expirationTtl 必须至少 60 秒
      const kvTtl = Math.max(actualTtl, 60);
      await kv.put(key, JSON.stringify(entry), {
        expirationTtl: kvTtl,
      });
      console.log(
        `[KV Cache SET] ${key} ttl=${actualTtl}s (${(
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
