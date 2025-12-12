import { Page, ExtendedRecordMap, PageType, PageStatus } from "@/types/notion";
import { getPostBlocks } from "@/lib/notion/getPostBlocks";
import blogConfig from "@/blog.config";

/**
 * 搜索索引条目
 * 预先提取的可搜索内容，避免运行时调用 Notion API
 */
export interface SearchIndexEntry {
  id: string;
  title: string;
  slug: string;
  tags: string[];
  summary: string;
  // 内容片段：从文章内容中提取的关键文本
  contentExcerpts: string[];
  date: number;
}

/**
 * 从 blockMap 中提取可搜索的文本内容
 * 支持：文本段落、代码块、列表、标题、引用等
 */
function extractContentFromBlockMap(blockMap: ExtendedRecordMap): string[] {
  const contentList: string[] = [];

  if (!blockMap?.block) return contentList;

  // 可搜索的 block 类型
  const searchableTypes = new Set([
    "text",
    "bulleted_list",
    "numbered_list",
    "to_do",
    "toggle",
    "header",
    "sub_header",
    "sub_sub_header",
    "quote",
    "callout",
    "code", // 代码块
    "column",
    "column_list",
  ]);

  Object.values(blockMap.block).forEach((block) => {
    const blockType = block.value?.type;
    const properties = block.value?.properties;

    // 只处理可搜索的 block 类型
    if (!blockType || !searchableTypes.has(blockType)) return;

    // 提取 title（文本内容）
    if (properties?.title) {
      const text = extractNestedText(properties.title);
      if (text && text !== "Untitled" && text.length > 3) {
        contentList.push(text);
      }
    }

    // 提取代码块的语言标识（可能包含关键词如 "typescript", "json" 等）
    if (blockType === "code" && properties?.language) {
      const lang = extractNestedText(properties.language);
      if (lang) {
        contentList.push(lang);
      }
    }

    // 提取 caption（图片说明等）
    if (properties?.caption) {
      const caption = extractNestedText(properties.caption);
      if (caption && caption.length > 3) {
        contentList.push(caption);
      }
    }
  });

  // 限制内容片段数量，避免索引过大
  // 增加到 50 条以覆盖更多内容
  return contentList.slice(0, 50);
}

function extractNestedText(input: any): string {
  if (Array.isArray(input)) {
    return input.reduce((acc, item) => acc + extractNestedText(item), "");
  }
  return typeof input === "string" ? input : "";
}

/**
 * 为单篇文章构建搜索索引条目
 */
async function buildEntryForPost(post: Page): Promise<SearchIndexEntry> {
  let contentExcerpts: string[] = [];

  try {
    // 获取文章内容
    const blockMap = await getPostBlocks(post.id);
    if (blockMap) {
      contentExcerpts = extractContentFromBlockMap(blockMap);
    }
  } catch (error) {
    console.warn(`[SearchIndex] Failed to get content for ${post.id}:`, error);
  }

  return {
    id: post.id,
    title: post.title || "",
    slug: post.slug || "",
    tags: post.tags || [],
    summary: post.summary || "",
    contentExcerpts,
    date: post.date,
  };
}

/**
 * 构建完整的搜索索引
 * 遍历所有已发布文章，提取可搜索内容
 */
async function buildSearchIndex(
  posts: Page[]
): Promise<Record<string, SearchIndexEntry>> {
  const index: Record<string, SearchIndexEntry> = {};

  // 过滤只保留已发布的文章
  const publishedPosts = posts.filter(
    (p) => p.type === PageType.Post && p.status === PageStatus.Published
  );

  console.log(
    `[SearchIndex] Building index for ${publishedPosts.length} posts...`
  );

  // 并行构建索引（限制并发数避免过多 API 调用）
  const BATCH_SIZE = 5;
  for (let i = 0; i < publishedPosts.length; i += BATCH_SIZE) {
    const batch = publishedPosts.slice(i, i + BATCH_SIZE);
    const entries = await Promise.all(batch.map(buildEntryForPost));

    for (const entry of entries) {
      index[entry.id] = entry;
    }
  }

  console.log(
    `[SearchIndex] Built index with ${Object.keys(index).length} entries`
  );

  return index;
}

// 搜索索引的内存缓存
// 不使用 timedCache 因为它的 cache key 基于 posts 数组（不稳定）
// 改用简单的内存缓存 + 稳定的 key
let cachedIndex: {
  data: Record<string, SearchIndexEntry> | null;
  expires: number;
  postIds: string; // 用于检测 posts 是否变化
} = {
  data: null,
  expires: 0,
  postIds: "",
};

async function getCachedSearchIndex(
  posts: Page[]
): Promise<Record<string, SearchIndexEntry>> {
  const now = Date.now();
  // 生成稳定的 key：只用 post IDs
  const postIds = posts
    .filter(
      (p) => p.type === PageType.Post && p.status === PageStatus.Published
    )
    .map((p) => p.id)
    .sort()
    .join(",");

  // 检查缓存是否有效
  if (
    cachedIndex.data &&
    cachedIndex.expires > now &&
    cachedIndex.postIds === postIds
  ) {
    console.log("[SearchIndex] Cache HIT");
    return cachedIndex.data;
  }

  // 缓存未命中或过期，重新构建
  console.log("[SearchIndex] Cache MISS, building...");
  const index = await buildSearchIndex(posts);

  // 更新缓存
  cachedIndex = {
    data: index,
    expires: now + blogConfig.NEXT_REVALIDATE_SECONDS * 1000,
    postIds,
  };

  return index;
}

/**
 * Build 时预热搜索索引
 * 在 generateStaticParams 中调用，确保部署后索引已存在
 */
export async function prewarmSearchIndex(posts: Page[]): Promise<void> {
  console.log("[SearchIndex] Pre-warming search index during build...");
  await getCachedSearchIndex(posts);
  console.log("[SearchIndex] Pre-warm complete!");
}

/**
 * 使用搜索索引进行搜索
 *
 * 策略：
 * 1. 从缓存索引中搜索（快速路径）
 * 2. 对于索引中没有的新文章，回退到 metadata 搜索
 */
export async function searchWithIndex(
  posts: Page[],
  keyword: string
): Promise<Page[]> {
  "use server";

  if (!keyword) return [];

  const lowerKeyword = keyword.toLowerCase().trim();

  // 获取缓存的搜索索引
  const searchIndex = await getCachedSearchIndex(posts);

  const results: Page[] = [];

  // 搜索所有已发布文章
  for (const post of posts) {
    if (post.type !== PageType.Post || post.status !== PageStatus.Published) {
      continue;
    }

    const searchResults: string[] = [];
    const entry = searchIndex[post.id];

    if (entry) {
      // 快速路径：使用预构建的索引
      // 搜索标题
      if (entry.title.toLowerCase().includes(lowerKeyword)) {
        searchResults.push(entry.title);
      }

      // 搜索标签
      for (const tag of entry.tags) {
        if (tag.toLowerCase().includes(lowerKeyword)) {
          searchResults.push(`标签: ${tag}`);
          break;
        }
      }

      // 搜索摘要
      if (entry.summary.toLowerCase().includes(lowerKeyword)) {
        const index = entry.summary.toLowerCase().indexOf(lowerKeyword);
        const start = Math.max(0, index - 30);
        const end = Math.min(
          entry.summary.length,
          index + lowerKeyword.length + 50
        );
        const excerpt =
          (start > 0 ? "..." : "") +
          entry.summary.slice(start, end) +
          (end < entry.summary.length ? "..." : "");
        searchResults.push(excerpt);
      }

      // 搜索内容片段
      for (const content of entry.contentExcerpts) {
        if (
          content.toLowerCase().includes(lowerKeyword) &&
          searchResults.length < 3
        ) {
          // 截取匹配位置前后的内容
          const index = content.toLowerCase().indexOf(lowerKeyword);
          const start = Math.max(0, index - 20);
          const end = Math.min(
            content.length,
            index + lowerKeyword.length + 40
          );
          const excerpt =
            (start > 0 ? "..." : "") +
            content.slice(start, end) +
            (end < content.length ? "..." : "");
          searchResults.push(excerpt);
        }
      }
    } else {
      // 兜底路径：新文章不在索引中，只搜索 metadata
      console.log(`[SearchIndex] Fallback for new post: ${post.id}`);

      if (post.title?.toLowerCase().includes(lowerKeyword)) {
        searchResults.push(post.title);
      }

      const tagContent = post.tags?.join(" ") || "";
      if (tagContent.toLowerCase().includes(lowerKeyword)) {
        const matchedTag = post.tags?.find((t) =>
          t.toLowerCase().includes(lowerKeyword)
        );
        if (matchedTag) {
          searchResults.push(`标签: ${matchedTag}`);
        }
      }

      if (post.summary?.toLowerCase().includes(lowerKeyword)) {
        searchResults.push(post.summary.slice(0, 80) + "...");
      }
    }

    if (searchResults.length > 0) {
      results.push({
        ...post,
        searchResults: searchResults.slice(0, 3),
      });
    }
  }

  return results;
}

/**
 * 强制重建搜索索引
 * 可用于手动触发索引更新
 */
export async function rebuildSearchIndex(posts: Page[]) {
  console.log("[SearchIndex] Force rebuilding...");
  return buildSearchIndex(posts);
}
