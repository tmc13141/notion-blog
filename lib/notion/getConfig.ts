import { getTextContent } from "notion-utils";

import defaultConfig from "@/blog.config";
import { getPostBlocks } from "@/lib/notion/getPostBlocks";
import { getPageIdsInCollection } from "@/lib/notion/getPageIds";
import { mapImgUrl } from "@/utils/imgProcessing";
import { Decoration } from "@/types/notion";
import { BlogConfig } from "@/types/config";

/**
 * 从 Notion 属性中提取文件/图片 URL
 */
function getFileValue(property: unknown): string {
  if (!property || !Array.isArray(property)) {
    return "";
  }
  // 文件属性格式可能是: [[url]] 或 [[filename, [[a, url]]]]
  const firstItem = property[0];
  if (Array.isArray(firstItem)) {
    // 检查是否有嵌套的链接
    if (firstItem[1] && Array.isArray(firstItem[1])) {
      const link = firstItem[1].find(
        (item: unknown) => Array.isArray(item) && item[0] === "a"
      );
      if (link && link[1]) {
        return link[1];
      }
    }
    return firstItem[0] || "";
  }
  return "";
}

/**
 * 检查 schema 是否包含 config 数据库必需的列 (name, value, type)
 */
function isConfigSchema(
  schema: Record<string, { name?: string; type?: string }>
): boolean {
  const columnNames = Object.values(schema).map((col) => col.name);
  return (
    columnNames.includes("name") &&
    columnNames.includes("value") &&
    columnNames.includes("type")
  );
}

interface GetConfigResult {
  config: BlogConfig;
  configPageId: string | null;
}

/**
 * 从多个候选页面中找到包含配置数据库的页面并解析配置
 * @param configPageIds Config 视图中所有页面的 ID
 */
export async function getConfig(
  configPageIds: string[]
): Promise<GetConfigResult> {
  if (!configPageIds || configPageIds.length === 0) {
    return { config: defaultConfig, configPageId: null };
  }

  // 遍历所有候选页面，找到包含 name/value/type 列的配置数据库
  for (const configPageId of configPageIds) {
    const result = await tryGetConfigFromPage(configPageId);
    if (result) {
      return { config: result.config, configPageId };
    }
  }

  // 未找到配置数据库，使用默认配置
  return { config: defaultConfig, configPageId: null };
}

/**
 * 尝试从单个页面中获取配置
 * 如果页面包含有效的配置数据库，返回解析后的配置；否则返回 null
 */
async function tryGetConfigFromPage(
  configPageId: string
): Promise<{ config: BlogConfig } | null> {
  // 获取配置页面内容，里面应该有一个Table View的Database
  const configRecordMap = await getPostBlocks(configPageId);
  if (!configRecordMap) return null;

  const configBlockMap = configRecordMap.block;
  const pageBlock = configBlockMap[configPageId]?.value;
  if (!pageBlock) return null;

  const { content } = pageBlock;
  if (!content) return null;

  // 获取所有 collection_view 类型的 block
  const collectionViewIds = content.filter((contentId) => {
    const block = configBlockMap[contentId]?.value;
    return (
      block?.type === "collection_view" ||
      block?.type === "collection_view_page"
    );
  });

  if (collectionViewIds.length === 0) return null;

  // 找到包含 name, value, type 列的配置数据库
  let configTableId: string | null = null;
  let schema: Record<string, { name?: string; type?: string }> | null = null;
  let collectionId: string | null = null;

  for (const tableId of collectionViewIds) {
    const block = configBlockMap[tableId].value as {
      collection_id?: string;
      view_ids?: string[];
    };
    const colId = block.collection_id;
    if (!colId) continue;

    const collection = configRecordMap.collection[colId];
    if (!collection?.value?.schema) continue;

    const tableSchema = collection.value.schema;
    if (isConfigSchema(tableSchema)) {
      configTableId = tableId;
      collectionId = colId;
      schema = tableSchema;
      break;
    }
  }

  if (!configTableId || !schema || !collectionId) {
    // 该页面没有配置数据库
    return null;
  }

  // 获取配置表格内容
  const configBlock = configBlockMap[configTableId].value as {
    view_ids?: string[];
  };

  // 获取所有配置项的ID
  const configIds = getPageIdsInCollection(
    collectionId,
    configRecordMap.collection_query,
    configRecordMap.collection_view,
    configBlock.view_ids || []
  );

  const config: Partial<BlogConfig> = {};

  // 找到 file 类型列的 schema key
  let fileColumnKey: string | null = null;
  for (const [key, schemaItem] of Object.entries(schema)) {
    if ((schemaItem as { type?: string }).type === "file") {
      fileColumnKey = key;
      break;
    }
  }

  // 遍历所有配置项，获取配置项的值
  configIds.forEach((id) => {
    const block = configBlockMap[id].value;
    const { properties } = block;

    const tempConfigItem: {
      name: string;
      value: string;
      type: string;
      fileValue: string;
    } = {
      name: "",
      value: "",
      type: "",
      fileValue: "",
    };

    /**
     * Decoration 富文本
     * type Decoration = BaseDecoration | AdditionalDecoration;
     *
     * type BaseDecoration = [string]; // 例如：["纯文本"]
     *
     * type AdditionalDecoration = [string, SubDecoration[]]; // 例如：["文本", [格式1, 格式2]]
     *
     * ["This is plain text"] 基础文本
     * ["Bold & Italic", [['b'], ['i']]] 带格式文本
     * ["Visit Notion", [['a', 'https://notion.so'], ['h', 'blue']]] 带链接和颜色的文本
     */
    Object.entries<Decoration[]>(properties).forEach(([key, value]) => {
      if (!schema![key]) return;
      // 配置项名称
      const { name } = schema![key];
      // 获取未格式化的文本内容
      const content = getTextContent(value);

      // 如果配置项名称是name、value、type(这里是写死的)，则直接赋值
      if (name === "name" || name === "value" || name === "type") {
        tempConfigItem[name] = content;
      }

      // 如果是 file 类型列，提取文件 URL
      if (key === fileColumnKey) {
        tempConfigItem.fileValue = getFileValue(value);
      }
    });

    const { name, value: rawValue, type, fileValue } = tempConfigItem;

    let value;

    switch (type) {
      case "String":
        value = rawValue;
        break;

      case "Boolean":
        value = rawValue.toLowerCase() === "true";
        break;

      case "Number":
        value = parseFloat(rawValue);
        if (isNaN(value)) {
          console.warn(`配置项${name}的值${rawValue}不是一个数字`);
        }
        break;

      case "JSON":
        try {
          value = JSON.parse(rawValue);
        } catch (error) {
          console.error(`配置项${name}的值${rawValue}JSON解析失败, ${error}`);
        }
        break;

      case "File":
        // 从 file 类型列获取图片 URL，使用 mapImgUrl 转换
        if (fileValue) {
          value = mapImgUrl(fileValue, block, "block", false);
        }
        break;

      default:
        console.warn(`配置项${name}的类型${type}不支持`);
        break;
    }

    config[name as keyof BlogConfig] = value;
  });

  // 合并默认配置和获取的配置
  return {
    config: {
      ...defaultConfig,
      ...config,
    },
  };
}
