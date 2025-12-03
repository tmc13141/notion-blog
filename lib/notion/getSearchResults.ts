import { Page } from "@/types/notion";
import { searchWithIndex } from "@/lib/notion/searchIndex";

/**
 * 搜索文章
 *
 * 使用预构建的搜索索引进行全文搜索
 * - 索引包含：标题、标签、摘要、内容片段
 * - 索引缓存在 KV (Workers) 或 unstable_cache (Vercel)
 * - 新文章会自动回退到 metadata 搜索
 */
export async function getSearchResults(posts: Page[], keyword: string) {
  "use server";
  return searchWithIndex(posts, keyword);
}
