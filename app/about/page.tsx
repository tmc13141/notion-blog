import { getPostBlocks } from "@/lib/notion/getPostBlocks";
import { getNavPages, getSiteConfig } from "@/lib/notion/getSiteData";
import { NotionPage } from "@/components/notion/notion-page";
import { notFound } from "next/navigation";
import { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const [pages, config] = await Promise.all([
    getNavPages(),
    getSiteConfig(),
  ]);
  const aboutPage = pages.find((page) => page.slug === "about");

  if (!aboutPage) {
    return {
      title: "About",
    };
  }

  return {
    title: aboutPage.title,
    description: aboutPage.summary || `关于 ${config.AUTHOR}`,
    openGraph: {
      title: aboutPage.title,
      description: aboutPage.summary || `关于 ${config.AUTHOR}`,
      type: "website",
      url: `${config.SITE_URL}/about`,
    },
  };
}

export default async function AboutPage() {
  const pages = await getNavPages();
  const aboutPage = pages.find((page) => page.slug === "about");

  if (!aboutPage) return notFound();

  // 获取页面内容
  if (!aboutPage.blockMap) {
    aboutPage.blockMap = await getPostBlocks(aboutPage.id);
  }

  return (
    <article className="min-h-[calc(100vh-10rem)] w-full max-w-5xl mx-auto px-4 pt-32 pb-12 md:pt-40 md:pb-24">
      <header className="mb-12 md:mb-16 space-y-4 text-center animate-fade-in-down">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
          {aboutPage.title}
        </h1>
        {aboutPage.summary && (
           <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
             {aboutPage.summary}
           </p>
        )}
      </header>
      
      <div className="max-w-3xl mx-auto prose dark:prose-invert lg:prose-xl animate-fade-in-up delay-200">
        <NotionPage post={aboutPage} />
      </div>
    </article>
  );
}
