import type { MetadataRoute } from "next";
import { getSiteData } from "@/lib/notion/getSiteData";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteData = await getSiteData();

  const { publishedPosts, config: BlogConfig, tagOptions, pages } = siteData;

  const friendsPage = pages.find((page) => page.slug === "friends");
  const aboutPage = pages.find((page) => page.slug === "about");

  const blogPostsSitemap = publishedPosts.map((post) => ({
    url: `${BlogConfig.SITE_URL}/post/${encodeURIComponent(post.slug)}`,
    lastModified: new Date(post.lastEditedTime),
    changeFrequency: "daily" as const,
    priority: 1,
  }));

  const tagSitemap = tagOptions.map((tag) => ({
    url: `${BlogConfig.SITE_URL}/tag/${encodeURIComponent(tag.name)}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: 0.8,
  }));

  return [
    {
      url: BlogConfig.SITE_URL,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 1,
    },
    {
      url: `${BlogConfig.SITE_URL}/tag`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.8,
    },
    {
      url: `${BlogConfig.SITE_URL}/friends`,
      lastModified: friendsPage
        ? new Date(friendsPage.lastEditedTime)
        : new Date(),
      changeFrequency: "daily" as const,
      priority: 0.8,
    },
    {
      url: `${BlogConfig.SITE_URL}/about`,
      lastModified: aboutPage ? new Date(aboutPage.lastEditedTime) : new Date(),
      changeFrequency: "daily" as const,
      priority: 0.8,
    },
    ...blogPostsSitemap,
    ...tagSitemap,
  ];
}
