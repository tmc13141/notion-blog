import { getSiteData } from "@/lib/notion/getSiteData";
import FeaturePostList from "@/components/feature-post-list";
import { HeroSection } from "@/components/hero-section";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { WithContext, ItemList } from "schema-dts";

export default async function Home() {
  const { latestPosts, config: BlogConfig } = await getSiteData();

  // latestPosts 已经按 date 降序排列
  // Only show top 3 posts as features on homepage
  const featurePosts = latestPosts.slice(0, 3);

  const blog: WithContext<ItemList> = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: latestPosts.map((page, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "BlogPosting",
        author: {
          "@type": "Person",
          name: BlogConfig.AUTHOR,
          url: BlogConfig.SITE_URL,
        },
        headline: page.title,
        image: page.pageCover,
        url: `${BlogConfig.SITE_URL}/post/${encodeURIComponent(page.slug)}`,
        datePublished: new Date(page.date).toISOString(),
        dateModified: new Date(page.lastEditedTime).toISOString(),
      },
    })),
  };

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blog) }}
      />
      <HeroSection />

      <section className="w-full max-w-5xl mx-auto px-4 py-16 md:py-24 space-y-16">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              最新文章
            </h2>
            <p className="text-muted-foreground">
              分享关于技术、生活和思考的见解
            </p>
          </div>
          <Link href="/blog/1">
            <Button variant="outline" className="rounded-full group cursor-pointer">
              查看所有文章
              <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </div>

        <FeaturePostList posts={featurePosts} />
      </section>
    </main>
  );
}
