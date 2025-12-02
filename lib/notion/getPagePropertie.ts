import {
  BlockMap,
  CollectionPropertySchemaMap,
  Decoration,
  Page,
  PageType,
} from "@/types/notion";
import { getDateValue, getTextContent } from "notion-utils";
import { mapImgUrl } from "@/utils/imgProcessing";

/**
 * 限制 slug 长度以避免文件名过长的问题
 * Linux 文件名限制为 255 字节，URL 编码后中文字符会变成 9 字节
 * 为了安全，限制编码后的长度不超过 200 字节
 */
const MAX_ENCODED_SLUG_LENGTH = 200;

function normalizeSlug(slug: string, pageId: string): string {
  if (!slug) return pageId;

  // 检查 URL 编码后的长度
  const encodedLength = encodeURIComponent(slug).length;

  if (encodedLength <= MAX_ENCODED_SLUG_LENGTH) {
    return slug;
  }

  // 如果太长，逐字符截取直到满足长度限制
  let result = "";
  for (const char of slug) {
    const testSlug = result + char;
    if (encodeURIComponent(testSlug).length > MAX_ENCODED_SLUG_LENGTH) {
      break;
    }
    result = testSlug;
  }

  // 如果截取后太短（少于 10 个字符），使用 pageId
  if (result.length < 10) {
    return pageId;
  }

  // 添加 pageId 的前 8 位作为唯一标识，避免冲突
  const shortId = pageId.replace(/-/g, "").slice(0, 8);
  return `${result}-${shortId}`;
}

export async function getPageProperties(
  id: string,
  blockMap: BlockMap,
  schemaMap: CollectionPropertySchemaMap
) {
  const pageInfo: Partial<Page> & { [key: string]: any } = {};
  const block = blockMap[id].value;

  // 处理不同类型的属性
  const schemaActions: Record<
    string,
    (value: Decoration[], name: string) => void
  > = {
    date: (value, name) => {
      const formatDate = getDateValue(value);
      if (formatDate?.type === "datetime") {
        pageInfo[name] = new Date(
          `${formatDate.start_date} ${formatDate.start_time}`
        ).getTime();
      } else if (formatDate?.type === "date") {
        pageInfo[name] = new Date(formatDate.start_date).getTime();
      }
    },

    // 处理Tag等属性
    multi_select: (value, name) => {
      pageInfo[name] = getTextContent(value).split(",");
    },

    default: (value, name) => {
      pageInfo[name] = getTextContent(value);
    },
  };

  Object.entries<Decoration[]>(block.properties).forEach(
    async ([key, value]) => {
      // Notion数据库API更新不及时，导致有些属性明明已经删除了，但是还是存在
      if (!schemaMap[key]) {
        console.warn(`Schema not found for key: ${key} : ${value}`);
        return;
      }
      const { name, type } = schemaMap[key];
      const action = schemaActions[type] || schemaActions.default;
      action(value, name);
    }
  );

  pageInfo.id = id;
  pageInfo.type = pageInfo?.type || null;
  pageInfo.title = pageInfo?.title || "";
  pageInfo.status = pageInfo?.status || null;
  pageInfo.date = pageInfo?.date || new Date(block.created_time).getTime();
  pageInfo.lastEditedTime =
    pageInfo?.lastEditedTime || new Date(block.last_edited_time).getTime();
  pageInfo.pageCover = mapImgUrl(block?.format?.page_cover, block);
  pageInfo.pageCoverThumbnail = mapImgUrl(
    block?.format?.page_cover_thumbnail,
    block
  );
  pageInfo.tags = pageInfo?.tags || [];

  // 处理slug，并限制长度以避免文件名过长
  if (pageInfo.type === PageType.Post) {
    pageInfo.slug = normalizeSlug(pageInfo?.slug || "", pageInfo.id);
  } else if (pageInfo.type === PageType.Page) {
    pageInfo.slug = normalizeSlug(pageInfo.slug ?? "", pageInfo.id);
    if (pageInfo.childrenIds && pageInfo.childrenIds.length > 0) {
      pageInfo.slug = "#";
    }
  }
  if (
    pageInfo.childrenIds &&
    pageInfo.childrenIds.length > 0 &&
    pageInfo.type !== PageType.HeadMenu
  ) {
    pageInfo.type = PageType.Menu;
    pageInfo.slug = "#";
  }

  return pageInfo as Page;
}
