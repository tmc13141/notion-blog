import type { MetadataRoute } from "next";
import { getPostList, getSiteConfig, getNavPages } from "@/lib/notion/getSiteData";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 并行获取需要的数据
  const [{ posts, tagOptions }, config, pages] = await Promise.all([
    getPostList(),
    getSiteConfig(),
    getNavPages(),
  ]);

  const friendsPage = pages.find((page) => page.slug === "friends");
  const aboutPage = pages.find((page) => page.slug === "about");

  const blogPostsSitemap = posts.map((post) => ({
    url: `${config.SITE_URL}/post/${encodeURIComponent(post.slug)}`,
    lastModified: new Date(post.lastEditedTime),
    changeFrequency: "daily" as const,
    priority: 1,
  }));

  const tagSitemap = tagOptions.map((tag) => ({
    url: `${config.SITE_URL}/tag/${encodeURIComponent(tag.name)}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: 0.8,
  }));

  return [
    {
      url: config.SITE_URL,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 1,
    },
    {
      url: `${config.SITE_URL}/tag`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.8,
    },
    {
      url: `${config.SITE_URL}/friends`,
      lastModified: friendsPage
        ? new Date(friendsPage.lastEditedTime)
        : new Date(),
      changeFrequency: "daily" as const,
      priority: 0.8,
    },
    {
      url: `${config.SITE_URL}/about`,
      lastModified: aboutPage ? new Date(aboutPage.lastEditedTime) : new Date(),
      changeFrequency: "daily" as const,
      priority: 0.8,
    },
    ...blogPostsSitemap,
    ...tagSitemap,
  ];
}
