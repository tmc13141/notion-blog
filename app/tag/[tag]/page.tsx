import { notFound } from "next/navigation";
import { getPostList, getSiteConfig } from "@/lib/notion/getSiteData";
import PostPagination from "@/components/post-pagination";
import BlogList from "@/components/blog-list";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag } = await params;

  return {
    title: `${tag}`,
    description: `Browse all blog posts with the tag ${tag}`,
  };
}

export async function generateStaticParams() {
  const { tagOptions } = await getPostList();
  return tagOptions.map((tag) => ({ tag: encodeURIComponent(tag.name) }));
}

export default async function TagPage({
  params,
  searchParams,
}: {
  params: Promise<{ tag: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { tag } = await params;
  const { page } = await searchParams;
  const pageNumber = page ? parseInt(page) : 1;

  if (isNaN(pageNumber)) {
    return notFound();
  }

  const [{ posts: publishedPosts }, config] = await Promise.all([
    getPostList(),
    getSiteConfig(),
  ]);

  // publishedPosts 已经按 date 降序排列
  const filteredPosts = publishedPosts.filter((post) =>
    post.tags.includes(decodeURIComponent(tag))
  );
  const totalPages = Math.ceil(filteredPosts.length / config.POSTS_PER_PAGE);

  if (pageNumber < 1 || pageNumber > totalPages) {
    return notFound();
  }

  const posts = filteredPosts.slice(
    (pageNumber - 1) * config.POSTS_PER_PAGE,
    pageNumber * config.POSTS_PER_PAGE
  );

  return (
    <div
      className="w-full max-w-5xl mx-auto px-4 pt-32 pb-12 md:pt-40 md:pb-24 min-h-screen flex flex-col gap-8"
    >
      <div className="space-y-2">
        <h1 className="text-4xl font-bold animate-fade-in-up duration-500">
          {`#${decodeURIComponent(tag)}`}
        </h1>
        <p className="text-muted-foreground animate-fade-in-up delay-100">
           {filteredPosts.length} 篇文章
        </p>
      </div>
      
      <BlogList posts={posts} />
      
      {totalPages > 1 && (
         <div className="pt-8 border-t">
            <PostPagination totalPages={totalPages} currentPage={pageNumber} />
         </div>
      )}
    </div>
  );
}
