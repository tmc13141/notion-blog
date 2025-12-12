import { getTextContent } from "notion-utils";
import { ExtendedRecordMap, FriendLink } from "@/types/notion";
import { getPageIdsInCollection } from "@/lib/notion/getPageIds";
import { mapImgUrl } from "@/utils/imgProcessing";

export interface FriendLinksResult {
  friendLinks: FriendLink[];
  collectionBlockIds: string[]; // 需要隐藏的 collection 相关 block IDs
}

/**
 * 从 blockMap 中提取内嵌数据库的友链数据
 * @param blockMap 页面的 blockMap
 * @returns 友链数组和需要隐藏的 block IDs
 */
export function getFriendLinks(blockMap: ExtendedRecordMap): FriendLinksResult {
  const friendLinks: FriendLink[] = [];
  const collectionBlockIds: string[] = [];

  // 1. 遍历 blockMap 找到 collection_view 类型的 block
  const collectionViewBlock = Object.entries(blockMap.block).find(
    ([, block]) => block.value?.type === "collection_view"
  );

  if (!collectionViewBlock) {
    return { friendLinks, collectionBlockIds };
  }

  const [collectionViewBlockId, collectionViewBlockData] = collectionViewBlock;
  collectionBlockIds.push(collectionViewBlockId);

  const blockValue = collectionViewBlockData.value;
  if (!blockValue) {
    return { friendLinks, collectionBlockIds };
  }

  // 2. 获取 collectionId 和 view_ids
  const collectionId = (blockValue as { collection_id?: string }).collection_id;
  const viewIds = (blockValue as { view_ids?: string[] }).view_ids || [];

  if (!collectionId || viewIds.length === 0) {
    return { friendLinks, collectionBlockIds };
  }

  // 3. 从 recordMap.collection[collectionId] 获取 schema（字段定义）
  const collection = blockMap.collection?.[collectionId]?.value;
  if (!collection) {
    return { friendLinks, collectionBlockIds };
  }

  const schema = collection.schema;
  if (!schema) {
    return { friendLinks, collectionBlockIds };
  }

  // 找到各字段的 schema key
  const schemaKeys: {
    name?: string;
    url?: string;
    description?: string;
    avatar?: string;
  } = {};

  for (const [key, value] of Object.entries(schema)) {
    const schemaValue = value as { name?: string; type?: string };
    const fieldName = schemaValue.name?.toLowerCase();
    const fieldType = schemaValue.type;

    // 名称字段
    if (
      fieldName === "name" ||
      fieldName === "名称" ||
      fieldName === "title" ||
      fieldType === "title"
    ) {
      schemaKeys.name = key;
    }
    // URL 字段
    else if (
      fieldName === "url" ||
      fieldName === "网址" ||
      fieldName === "链接" ||
      fieldName === "link" ||
      fieldType === "url"
    ) {
      schemaKeys.url = key;
    }
    // 描述字段
    else if (
      fieldName === "description" ||
      fieldName === "描述" ||
      fieldName === "desc"
    ) {
      schemaKeys.description = key;
    }
    // 头像/图标字段
    else if (
      fieldName === "avatar" ||
      fieldName === "头像" ||
      fieldName === "icon" ||
      fieldName === "图标" ||
      fieldName?.includes("图标") ||
      fieldType === "file"
    ) {
      schemaKeys.avatar = key;
    }
  }

  // 4. 使用 getPageIdsInCollection 获取行 ID 列表
  const rowIds = getPageIdsInCollection(
    collectionId,
    blockMap.collection_query as Parameters<typeof getPageIdsInCollection>[1],
    blockMap.collection_view,
    viewIds
  );

  // 5. 遍历行，根据 schema 解析 properties 提取 name/url/description/avatar
  for (const rowId of rowIds) {
    const block = blockMap.block[rowId]?.value;
    if (!block || !block.properties) {
      continue;
    }

    const properties = block.properties;

    // 提取各字段值
    const name = schemaKeys.name
      ? getTextContent(properties[schemaKeys.name])
      : "";
    const url = schemaKeys.url
      ? getTextContent(properties[schemaKeys.url])
      : "";

    // 必须有 name 和 url
    if (!name || !url) {
      continue;
    }

    // 确保 URL 有协议前缀
    const normalizedUrl = normalizeUrl(url);

    const friendLink: FriendLink = {
      id: rowId,
      name,
      url: normalizedUrl,
    };

    if (schemaKeys.description) {
      const description = getTextContent(properties[schemaKeys.description]);
      if (description) {
        friendLink.description = description;
      }
    }

    // 获取头像：优先使用上传的图标，否则使用 favicon.im 服务
    let avatar = "";
    if (schemaKeys.avatar && properties[schemaKeys.avatar]) {
      const rawAvatar = getFileValue(properties[schemaKeys.avatar]);
      if (rawAvatar) {
        // 使用 mapImgUrl 转换 Notion attachment URL
        avatar = mapImgUrl(rawAvatar, block, "block", false);
      }
    }

    // 如果没有上传头像，使用 Google Favicon 服务作为 fallback，并请求较大尺寸
    if (!avatar && normalizedUrl) {
      try {
        const domain = new URL(normalizedUrl).hostname;
        avatar = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
      } catch {
        // URL 解析失败，忽略
      }
    }

    if (avatar) {
      friendLink.avatar = avatar;
    }

    friendLinks.push(friendLink);
  }

  return { friendLinks, collectionBlockIds };
}

/**
 * 确保 URL 有协议前缀
 */
function normalizeUrl(url: string): string {
  if (!url) return url;
  // 如果已经有协议前缀，直接返回
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  // 默认添加 https://
  return `https://${url}`;
}

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
