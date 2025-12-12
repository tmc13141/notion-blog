import { unstable_cache } from "next/cache";
import { cache } from "react";
import { kvCache, getCacheKey } from "./kv";

// 内存缓存 - 进程内跨请求有效
const memoryCache = new Map<string, { data: unknown; expires: number }>();
// 进行中的请求 - 防止重复请求
const pendingRequests = new Map<string, Promise<unknown>>();

/**
 * 检测是否在 Cloudflare Workers 环境
 * Workers 使用 KV 缓存，其他环境使用 Next.js unstable_cache
 */
function isCloudflareWorkers(): boolean {
  // OpenNext 在 Workers 环境设置这个
  return (
    process.env.NEXT_RUNTIME === "edge" ||
    !!process.env.__OPENNEXT_KV_BINDING_NAME
  );
}

/**
 * 简化的多层缓存函数
 *
 * 缓存策略：
 * - Cloudflare Workers: Memory → KV
 * - Vercel / VPS / Docker: Memory → Next.js unstable_cache（文件系统缓存）
 */
export function timedCache<T extends (...args: any[]) => Promise<any>>(
  callback: T,
  { cacheTime }: { cacheTime: number }
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
  const fnName = callback.name || "anonymous";

  // Workers 环境的缓存逻辑（使用 KV）
  const withKVCache = async (
    ...args: Parameters<T>
  ): Promise<Awaited<ReturnType<T>>> => {
    const cacheKey = getCacheKey(fnName, JSON.stringify(args));
    const now = Date.now();

    // 1. 检查内存缓存
    const memoryCached = memoryCache.get(cacheKey);
    if (memoryCached && memoryCached.expires > now) {
      console.log(`[Cache] Memory HIT: ${fnName}`);
      return memoryCached.data as Awaited<ReturnType<T>>;
    }

    // 2. 检查 KV 缓存
    const kvCached = await kvCache.get<Awaited<ReturnType<T>>>(
      cacheKey,
      cacheTime
    );
    if (kvCached) {
      memoryCache.set(cacheKey, {
        data: kvCached,
        expires: now + cacheTime * 1000,
      });
      return kvCached;
    }

    // 3. 请求合并
    const pending = pendingRequests.get(cacheKey);
    if (pending) {
      console.log(`[Cache] Pending request: ${fnName}`);
      return pending as Promise<Awaited<ReturnType<T>>>;
    }

    // 4. 执行请求
    console.log(`[Cache] Fetching: ${fnName}`);
    const request = (async () => {
      try {
        const result = await callback(...args);
        memoryCache.set(cacheKey, {
          data: result,
          expires: now + cacheTime * 1000,
        });
        kvCache.set(cacheKey, result, cacheTime).catch(console.error);
        return result;
      } finally {
        pendingRequests.delete(cacheKey);
      }
    })();

    pendingRequests.set(cacheKey, request);
    return await request;
  };

  // 非 Workers 环境的缓存逻辑（使用 Next.js unstable_cache）
  const withNextCache = async (
    ...args: Parameters<T>
  ): Promise<Awaited<ReturnType<T>>> => {
    const cacheKey = getCacheKey(fnName, JSON.stringify(args));
    const now = Date.now();

    // 1. 检查内存缓存（最快）
    const memoryCached = memoryCache.get(cacheKey);
    if (memoryCached && memoryCached.expires > now) {
      console.log(`[Cache] Memory HIT: ${fnName}`);
      return memoryCached.data as Awaited<ReturnType<T>>;
    }

    // 2. 请求合并
    const pending = pendingRequests.get(cacheKey);
    if (pending) {
      console.log(`[Cache] Pending request: ${fnName}`);
      return pending as Promise<Awaited<ReturnType<T>>>;
    }

    // 3. 执行请求
    console.log(`[Cache] Fetching: ${fnName}`);
    const request = (async () => {
      try {
        const result = await callback(...args);
        memoryCache.set(cacheKey, {
          data: result,
          expires: now + cacheTime * 1000,
        });
        return result;
      } finally {
        pendingRequests.delete(cacheKey);
      }
    })();

    pendingRequests.set(cacheKey, request);
    return await request;
  };

  // Workers 环境：使用 KV 缓存
  if (isCloudflareWorkers()) {
    return cache(withKVCache);
  }

  // Vercel / VPS / Docker：使用 Next.js unstable_cache（持久化到文件系统）
  const cachedFn = unstable_cache(withNextCache, [fnName], {
    revalidate: cacheTime,
  });
  return cache(cachedFn);
}

// 导出缓存键工具函数
export { getCacheKey } from "./kv";
