import { unstable_cache } from "next/cache";
import { cache } from "react";
import { kvCache, getCacheKey } from "./kv";

// 内存缓存 - 单次请求内有效
const memoryCache = new Map<string, { data: unknown; expires: number }>();
// 进行中的请求 - 防止重复请求
const pendingRequests = new Map<string, Promise<unknown>>();

/**
 * CPU Time 诊断工具
 */
export function cpuTimer(label: string) {
  const start = performance.now();
  return {
    end: () => {
      const duration = performance.now() - start;
      console.log(`[CPU Time] ${label}: ${duration.toFixed(2)}ms`);
      return duration;
    },
    elapsed: () => performance.now() - start,
  };
}

/**
 * 检测是否在 Vercel 环境
 */
function isVercel(): boolean {
  return process.env.VERCEL === "1";
}

/**
 * 简化的多层缓存函数
 * 缓存层级: Memory (请求内) -> KV (Workers) / unstable_cache (Vercel)
 */
export function timedCache<T extends (...args: any[]) => Promise<any>>(
  callback: T,
  { cacheTime }: { cacheTime: number }
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
  const fnName = callback.name || "anonymous";

  // 核心缓存逻辑
  const withCache = async (
    ...args: Parameters<T>
  ): Promise<Awaited<ReturnType<T>>> => {
    const timer = cpuTimer(`${fnName}`);
    const cacheKey = getCacheKey(fnName, JSON.stringify(args));
    const now = Date.now();

    // 1. 检查内存缓存（最快，同一请求内有效）
    const memoryCached = memoryCache.get(cacheKey);
    if (memoryCached && memoryCached.expires > now) {
      console.log(`[Cache] Memory HIT: ${fnName}`);
      timer.end();
      return memoryCached.data as Awaited<ReturnType<T>>;
    }

    // 2. 检查 KV 缓存（Workers 环境会自动检测）
    const kvCached = await kvCache.get<Awaited<ReturnType<T>>>(cacheKey);
    if (kvCached) {
      // 回填内存缓存
      memoryCache.set(cacheKey, {
        data: kvCached,
        expires: now + cacheTime * 1000,
      });
      timer.end();
      return kvCached;
    }

    // 3. 检查是否有进行中的请求（请求合并）
    const pending = pendingRequests.get(cacheKey);
    if (pending) {
      console.log(`[Cache] Pending request: ${fnName}`);
      return pending as Promise<Awaited<ReturnType<T>>>;
    }

    // 4. 创建新请求
    console.log(`[Cache] Fetching: ${fnName}`);
    const fetchTimer = cpuTimer(`${fnName} - fetch`);

    const request = (async () => {
      try {
        const result = await callback(...args);
        fetchTimer.end();

        // 存入内存缓存
        memoryCache.set(cacheKey, {
          data: result,
          expires: now + cacheTime * 1000,
        });

        // 尝试存入 KV（异步，不阻塞返回）
        kvCache.set(cacheKey, result, cacheTime).catch((err) => {
          console.error(`[Cache] KV set error:`, err);
        });

        return result;
      } finally {
        pendingRequests.delete(cacheKey);
      }
    })();

    pendingRequests.set(cacheKey, request);
    const result = await request;
    timer.end();
    return result;
  };

  // Vercel 环境使用 Next.js unstable_cache + React cache
  if (isVercel()) {
    const withNextCache = unstable_cache(withCache, [fnName], {
      revalidate: cacheTime,
    });
    return cache(withNextCache);
  }

  // 其他环境（Workers/Local）使用 React cache 进行请求级去重
  return cache(withCache);
}

// 导出缓存键常量和工具函数
export { CacheKeys, getCacheKey } from "./kv";
