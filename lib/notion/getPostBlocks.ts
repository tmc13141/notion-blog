import { type ExtendedRecordMap } from "@/types/notion";
import { wait } from "@/utils";
import { notionAPI } from "@/lib/notion/notionAPI";
import { timedCache, cpuTimer } from "@/lib/cache";
import blogConfig from "@/blog.config";

/**
 * 获取文章内容
 * @param id 页面ID
 * @param slice 获取的block数量（可选）
 */
export async function getPostBlocks(
  id: string,
  slice?: number
): Promise<ExtendedRecordMap> {
  const timer = cpuTimer(`getPostBlocks:${id.slice(0, 8)}`);

  const pageData = await timedCache(getPageWithRetry, {
    cacheTime: blogConfig.NEXT_REVALIDATE_SECONDS,
  })(id);

  if (!pageData) {
    console.error("获取文章内容失败", `page_id: ${id}`);
    throw new Error("获取文章内容失败");
  }

  const result = filterPostBlockMap(id, pageData, slice);
  timer.end();
  return result;
}

/**
 * 调用接口，失败会重试
 */
export async function getPageWithRetry(
  id: string,
  retryAttempts: number = 3
): Promise<ExtendedRecordMap> {
  if (retryAttempts && retryAttempts > 0) {
    console.log(
      "[API请求]",
      `page_id: ${id}`,
      retryAttempts < 3 ? `剩余重试次数: ${retryAttempts}` : ""
    );

    try {
      const pageData = await notionAPI.getPage(id);
      return pageData;
    } catch (err) {
      console.warn("[API响应异常]", err);
      await wait(1000);
      return getPageWithRetry(id, retryAttempts - 1);
    }
  }

  console.error("[API请求失败]", `page_id: ${id}`);
  throw new Error("API请求失败");
}

/**
 * 代码语言映射表
 */
const LANGUAGE_MAP: Record<string, string> = {
  "C++": "cpp",
  "C#": "csharp",
  Assembly: "asm6502",
};

/**
 * 过滤和处理 blockMap
 * 优化版本：避免 structuredClone，使用浅拷贝 + 按需深拷贝
 */
function filterPostBlockMap(
  id: string,
  blockMap: ExtendedRecordMap,
  slice?: number
): ExtendedRecordMap {
  const timer = cpuTimer("filterPostBlockMap");

  // 浅拷贝顶层对象
  const result: ExtendedRecordMap = {
    ...blockMap,
    block: {}, // 只重建 block 部分
  };

  let count = 0;
  const entries = Object.entries(blockMap.block);

  for (const [key, block] of entries) {
    // 如果设置了 slice 且超过数量，跳过
    if (slice && slice > 0 && count > slice) {
      continue;
    }

    // 主页面 block - 移除敏感信息
    if (block.value?.id === id) {
      // 浅拷贝 block，深拷贝 value（移除 properties）
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { properties: _removed, ...valueWithoutProps } = block.value;
      result.block[key] = {
        ...block,
        value: valueWithoutProps,
      } as typeof block;
      continue;
    }

    count++;

    // 检查是否需要修改此 block
    const needsModification = checkNeedsModification(block);

    if (needsModification) {
      // 只对需要修改的 block 进行深拷贝
      result.block[key] = processBlock(block);
    } else {
      // 不需要修改的直接引用原对象
      result.block[key] = block;
    }
  }

  timer.end();
  return result;
}

/**
 * 检查 block 是否需要修改
 */
function checkNeedsModification(block: any): boolean {
  const type = block?.value?.type;

  // 代码块需要检查语言映射
  if (type === "code") {
    const lang = block?.value?.properties?.language?.[0]?.[0];
    if (lang && LANGUAGE_MAP[lang]) {
      return true;
    }
  }

  // 文件类型需要检查 URL 转换
  if (type === "file" || type === "pdf" || type === "video" || type === "audio") {
    const source = block?.value?.properties?.source?.[0]?.[0];
    if (source && source.includes("amazonaws.com")) {
      return true;
    }
  }

  return false;
}

/**
 * 处理需要修改的 block
 * 只深拷贝必要的部分
 */
function processBlock(block: any): any {
  const type = block?.value?.type;

  // 创建新的 block 对象
  const newBlock = {
    ...block,
    value: {
      ...block.value,
      properties: block.value?.properties
        ? { ...block.value.properties }
        : undefined,
    },
  };

  // 处理代码语言映射
  if (type === "code" && newBlock.value?.properties?.language) {
    const lang = newBlock.value.properties.language[0]?.[0];
    if (lang && LANGUAGE_MAP[lang]) {
      // 深拷贝 language 数组
      newBlock.value.properties.language = [
        [LANGUAGE_MAP[lang]],
        ...newBlock.value.properties.language.slice(1),
      ];
    }
  }

  // 处理文件 URL 转换
  if (
    (type === "file" || type === "pdf" || type === "video" || type === "audio") &&
    newBlock.value?.properties?.source
  ) {
    const source = newBlock.value.properties.source[0]?.[0];
    if (source && source.includes("amazonaws.com")) {
      const newURL = `https://notion.so/signed/${encodeURIComponent(source)}?table=block&id=${newBlock.value.id}`;
      // 深拷贝 source 数组
      newBlock.value.properties.source = [
        [newURL],
        ...newBlock.value.properties.source.slice(1),
      ];
    }
  }

  return newBlock;
}
