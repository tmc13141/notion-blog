import { getPostBlocks } from "@/lib/notion/getPostBlocks";
import { getNavPages, getSiteConfig } from "@/lib/notion/getSiteData";
import { getFriendLinks } from "@/lib/notion/getFriendLinks";
import { NotionPage } from "@/components/notion/notion-page";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export async function generateMetadata(): Promise<Metadata> {
  const [pages, config] = await Promise.all([getNavPages(), getSiteConfig()]);
  const friendsPage = pages.find((page) => page.slug === "friends");

  if (!friendsPage) {
    return {
      title: "友链",
    };
  }

  return {
    title: friendsPage.title,
    description: friendsPage.summary || "友情链接",
    openGraph: {
      title: friendsPage.title,
      description: friendsPage.summary || "友情链接",
      type: "website",
      url: `${config.SITE_URL}/friends`,
    },
  };
}

export default async function FriendsPage() {
  const pages = await getNavPages();
  const friendsPage = pages.find((page) => page.slug === "friends");

  if (!friendsPage) return notFound();

  // 获取页面内容
  if (!friendsPage.blockMap) {
    friendsPage.blockMap = await getPostBlocks(friendsPage.id);
  }

  // 从 blockMap 中提取友链数据
  const { friendLinks, collectionBlockIds } = getFriendLinks(
    friendsPage.blockMap
  );

  // 过滤掉 collection blocks，避免重复渲染
  const filteredBlockMap = { ...friendsPage.blockMap };
  if (collectionBlockIds.length > 0) {
    filteredBlockMap.block = { ...friendsPage.blockMap.block };
    for (const blockId of collectionBlockIds) {
      delete filteredBlockMap.block[blockId];
    }
    // 同时从页面的 content 中移除这些 block
    const pageBlock = Object.values(filteredBlockMap.block).find(
      (block) => block.value?.type === "page"
    );
    if (pageBlock?.value?.content) {
      pageBlock.value.content = pageBlock.value.content.filter(
        (id: string) => !collectionBlockIds.includes(id)
      );
    }
  }

  // 创建一个过滤后的 post 对象
  const filteredPost = {
    ...friendsPage,
    blockMap: filteredBlockMap,
  };

  return (
    <article className="min-h-[calc(100vh-10rem)] w-full max-w-5xl mx-auto px-4 pt-32 pb-12 md:pt-40 md:pb-24">
      <header className="mb-12 md:mb-16 space-y-4 text-center animate-fade-in-down">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
          {friendsPage.title}
        </h1>
        <p className="text-xl text-muted-foreground">
          {friendsPage.summary || "与我志同道合的朋友们"}
        </p>
      </header>

      {/* 友链卡片区域 */}
      {friendLinks.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-16 animate-fade-in-up delay-100">
          {friendLinks.map((friend) => (
            <Link
              key={friend.id}
              href={friend.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative flex items-start gap-4 p-6 rounded-2xl border bg-card/50 hover:bg-card hover:shadow-lg transition-all duration-300"
            >
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowUpRight className="size-4 text-muted-foreground" />
              </div>

              {friend.avatar ? (
                <img
                  src={friend.avatar}
                  alt={friend.name}
                  width={56}
                  height={56}
                  className="rounded-xl object-cover flex-shrink-0 transition-all"
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xl font-bold text-primary">
                    {friend.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0 space-y-1 pt-1">
                <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors truncate">
                  {friend.name}
                </h3>
                {friend.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                    {friend.description}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Notion 页面内容（如果有其他内容） */}
      <div className="max-w-3xl mx-auto prose dark:prose-invert lg:prose-xl animate-fade-in-up delay-200">
        <NotionPage post={filteredPost} />
      </div>
    </article>
  );
}
