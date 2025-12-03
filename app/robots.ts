import type { MetadataRoute } from "next";
import { getSiteConfig } from "@/lib/notion/getSiteData";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const BlogConfig = await getSiteConfig();
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/"],
        disallow: [],
      },
    ],
    sitemap: `${BlogConfig.SITE_URL}/sitemap.xml`,
  };
}
