import { idToUuid, getTextContent } from "notion-utils";

import blogConfig from "@/blog.config";
import { BlogConfig } from "@/types/config";
import {
  PageStatus,
  PageType,
  Page,
  ExtendedRecordMap,
  CollectionPropertySchemaMap,
  BlockMap,
  Decoration,
} from "@/types/notion";
import { getPostBlocks } from "@/lib/notion/getPostBlocks";
import {
  getConfigPageIds,
  getPageIdsInCollection,
} from "@/lib/notion/getPageIds";
import { getConfig } from "@/lib/notion/getConfig";
import { getPageProperties } from "@/lib/notion/getPagePropertie";
import { getTags } from "@/lib/notion/getTags";
import { timedCache, cpuTimer } from "@/lib/cache";

// ============================================================================
// 基础数据获取（共享缓存）
// ============================================================================

interface BaseData {
  pageRecordMap: ExtendedRecordMap;
  blockMap: BlockMap;
  schemaMap: CollectionPropertySchemaMap;
  pageIds: string[];
  configPageIds: string[];
}

/**
 * 获取基础数据 - 所有其他函数的数据源
 * 这是唯一会调用 Notion API 的地方（获取主数据库）
 */
async function getBaseData(sitePageId: string): Promise<BaseData> {
  const timer = cpuTimer("getBaseData");

  const pageRecordMap = await getPostBlocks(sitePageId);

  if (!pageRecordMap) {
    throw new Error(`获取页面数据失败, page_id: ${sitePageId}`);
  }

  const blockMap = pageRecordMap.block;
  const block = blockMap[sitePageId].value;

  if (
    block.type !== "collection_view_page" &&
    block.type !== "collection_view"
  ) {
    throw new Error(`page_id: ${sitePageId} 不是一个数据库`);
  }

  const collection = Object.values(pageRecordMap.collection)[0].value;
  const schemaMap = collection.schema;

  const pageIds = getPageIdsInCollection(
    block.collection_id || null,
    pageRecordMap.collection_query,
    pageRecordMap.collection_view,
    block.view_ids
  );

  const configPageIds = getConfigPageIds(
    block.collection_id || null,
    pageRecordMap.collection_query,
    pageRecordMap.collection_view
  );

  timer.end();

  return {
    pageRecordMap,
    blockMap,
    schemaMap,
    pageIds,
    configPageIds,
  };
}

// 缓存的基础数据获取函数
const getCachedBaseData = timedCache(getBaseData, {
  cacheTime: blogConfig.NEXT_REVALIDATE_SECONDS,
});

// ============================================================================
// Slug 索引（用于快速查找文章）
// ============================================================================

interface SlugIndexEntry {
  pageId: string;
  type: string;
  status: string;
}

/**
 * 从 block 中快速提取 slug、type、status（不解析全部属性）
 */
function extractSlugInfo(
  pageId: string,
  blockMap: BlockMap,
  schemaMap: CollectionPropertySchemaMap
): { slug: string; type: string; status: string } | null {
  try {
    const block = blockMap[pageId]?.value;
    if (!block?.properties) return null;

    // 找到 slug、type、status 对应的 schema key
    let slugKey: string | null = null;
    let typeKey: string | null = null;
    let statusKey: string | null = null;

    for (const [key, schema] of Object.entries(schemaMap)) {
      if (schema.name === "slug") slugKey = key;
      if (schema.name === "type") typeKey = key;
      if (schema.name === "status") statusKey = key;
    }

    const slug = slugKey
      ? getTextContent(block.properties[slugKey] as Decoration[])
      : "";
    const type = typeKey
      ? getTextContent(block.properties[typeKey] as Decoration[])
      : "";
    const status = statusKey
      ? getTextContent(block.properties[statusKey] as Decoration[])
      : "";

    // 如果没有 slug，使用 pageId
    const finalSlug = normalizeSlugForIndex(slug || pageId, pageId);

    return { slug: finalSlug, type, status };
  } catch {
    return null;
  }
}

/**
 * 限制 slug 长度（与 getPagePropertie.ts 中的逻辑一致）
 */
const MAX_ENCODED_SLUG_LENGTH = 200;

function normalizeSlugForIndex(slug: string, pageId: string): string {
  if (!slug) return pageId;

  const encodedLength = encodeURIComponent(slug).length;
  if (encodedLength <= MAX_ENCODED_SLUG_LENGTH) {
    return slug;
  }

  let result = "";
  for (const char of slug) {
    const testSlug = result + char;
    if (encodeURIComponent(testSlug).length > MAX_ENCODED_SLUG_LENGTH) {
      break;
    }
    result = testSlug;
  }

  if (result.length < 10) {
    return pageId;
  }

  const shortId = pageId.replace(/-/g, "").slice(0, 8);
  return `${result}-${shortId}`;
}

/**
 * 构建 Slug 索引
 */
async function buildSlugIndex(
  sitePageId: string
): Promise<Record<string, SlugIndexEntry>> {
  const timer = cpuTimer("buildSlugIndex");

  const { blockMap, schemaMap, pageIds, configPageIds } =
    await getCachedBaseData(sitePageId);

  // 获取配置页面 ID 以排除
  const configResult = await getConfig(configPageIds);
  const actualConfigPageId = configResult.configPageId;

  const index: Record<string, SlugIndexEntry> = {};

  for (const pageId of pageIds) {
    if (actualConfigPageId && pageId === actualConfigPageId) continue;

    const info = extractSlugInfo(pageId, blockMap, schemaMap);
    if (info && info.slug) {
      index[info.slug] = {
        pageId,
        type: info.type,
        status: info.status,
      };
    }
  }

  timer.end();
  console.log(`[Slug Index] Built with ${Object.keys(index).length} entries`);

  return index;
}

// 缓存的 Slug 索引
const getCachedSlugIndex = timedCache(buildSlugIndex, {
  cacheTime: blogConfig.NEXT_REVALIDATE_SECONDS,
});

/**
 * 通过 slug 获取单篇文章
 * 比 getPostList() 更高效，只解析一篇文章
 *
 * 策略：
 * 1. 快速路径：从缓存索引查找 (0.1ms)
 * 2. 兜底路径：索引中没有时，回退到全量搜索（处理新增文章场景）
 */
export async function getPostBySlug(slug: string): Promise<Page | null> {
  const timer = cpuTimer(`getPostBySlug:${slug.slice(0, 20)}`);
  const sitePageId = idToUuid(blogConfig.NOTION_PAGE_ID);

  // 1. 快速路径：从缓存索引查找
  const slugIndex = await getCachedSlugIndex(sitePageId);
  const entry = slugIndex[slug];

  if (entry) {
    // 检查是否是已发布的文章
    if (entry.type === PageType.Post && entry.status === PageStatus.Published) {
      // 只解析这一篇文章的完整属性
      const { blockMap, schemaMap } = await getCachedBaseData(sitePageId);
      const page = await getPageProperties(entry.pageId, blockMap, schemaMap);
      timer.end();
      return page;
    }
    // 索引中有但不是已发布文章
    timer.end();
    return null;
  }

  // 2. 兜底路径：索引中没有，可能是新增的文章
  // 回退到全量搜索（较慢，但能处理新文章）
  console.log(
    `[getPostBySlug] Fallback: slug "${slug}" not in index, searching...`
  );

  const { blockMap, schemaMap, pageIds, configPageIds } =
    await getCachedBaseData(sitePageId);

  const configResult = await getConfig(configPageIds);
  const actualConfigPageId = configResult.configPageId;

  // 遍历所有页面查找匹配的 slug
  for (const pageId of pageIds) {
    if (actualConfigPageId && pageId === actualConfigPageId) continue;

    try {
      const page = await getPageProperties(pageId, blockMap, schemaMap);

      if (
        page &&
        page.slug === slug &&
        page.type === PageType.Post &&
        page.status === PageStatus.Published
      ) {
        console.log(`[getPostBySlug] Fallback found: ${slug} → ${pageId}`);
        timer.end();
        return page;
      }
    } catch {
      // 忽略单个页面的解析错误
    }
  }

  timer.end();
  return null;
}

// ============================================================================
// 独立的数据获取函数
// ============================================================================

/**
 * 获取站点配置
 * 只加载配置数据，不加载文章列表
 */
export async function getSiteConfig(): Promise<BlogConfig> {
  const timer = cpuTimer("getSiteConfig");
  const sitePageId = idToUuid(blogConfig.NOTION_PAGE_ID);

  const { configPageIds } = await getCachedBaseData(sitePageId);

  const result = await getConfig(configPageIds);
  timer.end();

  return result.config;
}

/**
 * 获取文章列表（仅元数据，不含文章内容）
 */
export async function getPostList(): Promise<{
  posts: Page[];
  tagOptions: ReturnType<typeof getTags>;
}> {
  const timer = cpuTimer("getPostList");
  const sitePageId = idToUuid(blogConfig.NOTION_PAGE_ID);

  const { blockMap, schemaMap, pageIds, configPageIds } =
    await getCachedBaseData(sitePageId);

  // 获取配置以排除配置页面
  const configResult = await getConfig(configPageIds);
  const actualConfigPageId = configResult.configPageId;

  const posts: Page[] = [];

  // 顺序处理页面属性（避免 Promise.all 的 CPU 峰值）
  for (const pageId of pageIds) {
    if (actualConfigPageId && pageId === actualConfigPageId) continue;

    try {
      const page = await getPageProperties(pageId, blockMap, schemaMap);

      if (
        page &&
        page.type === PageType.Post &&
        page.status === PageStatus.Published
      ) {
        posts.push(page);
      }
    } catch (error) {
      console.error(`获取页面属性失败，page_id: ${pageId}:`, error);
    }
  }

  // 按日期排序
  posts.sort((a, b) => b.date - a.date);

  timer.end();

  return {
    posts,
    tagOptions: getTags(posts, schemaMap),
  };
}

/**
 * 获取导航页面列表
 */
export async function getNavPages(): Promise<Page[]> {
  const timer = cpuTimer("getNavPages");
  const sitePageId = idToUuid(blogConfig.NOTION_PAGE_ID);

  const { blockMap, schemaMap, pageIds, configPageIds } =
    await getCachedBaseData(sitePageId);

  const configResult = await getConfig(configPageIds);
  const actualConfigPageId = configResult.configPageId;

  const navPages: Page[] = [];

  for (const pageId of pageIds) {
    if (actualConfigPageId && pageId === actualConfigPageId) continue;

    try {
      const page = await getPageProperties(pageId, blockMap, schemaMap);

      if (page && page.status === PageStatus.Published) {
        if (
          page.type === PageType.Page ||
          page.type === PageType.HeadMenu ||
          page.type === PageType.Menu ||
          page.type === PageType.Link
        ) {
          navPages.push(page);
        }
      }
    } catch (error) {
      console.error(`获取页面属性失败，page_id: ${pageId}:`, error);
    }
  }

  timer.end();

  return navPages.filter((p) => p.type === PageType.Page);
}
