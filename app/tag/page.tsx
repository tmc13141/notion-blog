import { getPostList } from "@/lib/notion/getSiteData";
import { Metadata } from "next";
import { TagCloud } from "@/components/tag-cloud";

export const metadata: Metadata = {
  title: "Tags",
  description: "Browse all blog post tags",
};

export default async function TagPage() {
  const { tagOptions } = await getPostList();

  return (
    <div className="w-full max-w-5xl mx-auto px-4 pt-32 pb-12 md:pt-40 md:pb-24 min-h-screen flex flex-col justify-center items-center gap-12">
      <div className="text-center space-y-4 animate-fade-in-down">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
          标签云
        </h1>
        <p className="text-muted-foreground text-lg">
          探索 {tagOptions.length} 个不同的话题
        </p>
      </div>

      <div
        className="w-full animate-fade-in-up"
        style={{ animationDelay: "200ms" }}
      >
        <TagCloud tags={tagOptions} />
      </div>
    </div>
  );
}
