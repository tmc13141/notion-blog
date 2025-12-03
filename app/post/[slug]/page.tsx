import { getPostPageInfo } from "@/lib/notion/getPostPageInfo";
import { getPostBlocks } from "@/lib/notion/getPostBlocks";
import {
  getPostList,
  getSiteConfig,
  getPostBySlug,
} from "@/lib/notion/getSiteData";
import { formatDate, isUUID } from "@/utils";
import { getPageTableOfContents } from "@/lib/notion/getTableOfContents";
import { NotionPage } from "@/components/notion/notion-page";
import TableOfContent from "@/components/table-of-content";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import ArticleHero from "@/components/article-hero";
import { WithContext, BlogPosting } from "schema-dts";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);

  // 使用 getPostBySlug 替代 getPostList，更高效
  const [post, config] = await Promise.all([
    getPostBySlug(decodedSlug),
    getSiteConfig(),
  ]);

  if (!post) {
    return {
      title: "Post Not Found",
    };
  }

  return {
    title: post.title,
    description: post?.summary || "",
    openGraph: {
      title: post.title,
      description: post?.summary || "",
      type: "article",
      publishedTime: new Date(post.date).toISOString(),
      authors: [config.AUTHOR],
      tags: post.tags,
      images: [
        {
          url: post.pageCover,
        },
      ],
      url: `${config.SITE_URL}/post/${encodeURIComponent(post.slug)}`,
    },
  };
}

export async function generateStaticParams() {
  // Build 时获取所有文章来生成静态路径
  const { posts } = await getPostList();

  // 预热搜索索引，确保部署后首次搜索也很快
  const { prewarmSearchIndex } = await import("@/lib/notion/searchIndex");
  await prewarmSearchIndex(posts);

  return posts.map((post) => ({
    slug: encodeURIComponent(post.slug),
  }));
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);

  // 使用 getPostBySlug 替代 getPostList，只加载一篇文章
  const [post, config] = await Promise.all([
    getPostBySlug(decodedSlug),
    getSiteConfig(),
  ]);

  // 如果通过 slug 找不到，尝试用 UUID 查找（兼容旧链接）
  let finalPost = post;
  if (!finalPost && isUUID(decodedSlug)) {
    const pageInfo = await getPostPageInfo(decodedSlug);
    if (pageInfo) {
      finalPost = pageInfo;
    }
  }

  if (!finalPost) return notFound();

  // 获取文章内容
  if (!finalPost.blockMap) {
    finalPost.blockMap = await getPostBlocks(finalPost.id);
  }
  finalPost.toc = getPageTableOfContents(finalPost, finalPost.blockMap);

  const article: WithContext<BlogPosting> = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: finalPost.title,
    image: finalPost.pageCover,
    url: `${config.SITE_URL}/post/${encodeURIComponent(finalPost.slug)}`,
    datePublished: new Date(finalPost.date).toISOString(),
    dateModified: new Date(finalPost.lastEditedTime).toISOString(),
    author: {
      "@type": "Person",
      name: config.AUTHOR,
      url: config.SITE_URL,
    },
  };

  return (
    <article className="min-h-[calc(100vh-10rem)] pt-32 pb-12 md:pt-40 md:pb-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(article) }}
      />

      <div className="w-full max-w-5xl mx-auto px-4">
        <ArticleHero
          title={finalPost.title}
          tags={finalPost.tags}
          coverImage={finalPost.pageCover}
          publishedAt={formatDate(new Date(finalPost.date))}
          lastEditedTime={formatDate(new Date(finalPost.lastEditedTime))}
        />

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_200px] mt-12">
          <div className="min-w-0 max-w-none prose dark:prose-invert prose-lg prose-headings:scroll-mt-24 prose-img:rounded-xl animate-fade-in-up delay-300">
            <NotionPage post={finalPost} />
          </div>

          {finalPost.toc.length > 0 && (
            <div className="hidden lg:block">
              <aside className="sticky top-32 animate-fade-in-up delay-500">
                <h3 className="text-sm font-semibold text-muted-foreground mb-4 tracking-wider uppercase">
                  目录
                </h3>
                <TableOfContent toc={finalPost.toc} />
              </aside>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
