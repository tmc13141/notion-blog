import { Calendar, Clock, Tag as TagIcon } from "lucide-react";
import Link from "next/link";

type ArticleHeroProps = {
  title: string;
  tags: string[];
  coverImage: string;
  publishedAt: string;
  lastEditedTime: string;
};

export default function ArticleHero({
  title,
  tags,
  coverImage,
  publishedAt,
  lastEditedTime,
}: ArticleHeroProps) {
  return (
    <div className="flex flex-col gap-8 py-12 md:py-16">
      <div className="space-y-6 text-center md:text-left animate-fade-in-up">
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground justify-center md:justify-start">
          <div className="flex items-center gap-1.5">
            <Calendar className="size-4" />
            <time dateTime={publishedAt}>{publishedAt}</time>
          </div>
          <span className="text-border">|</span>
          <div className="flex items-center gap-1.5">
            <Clock className="size-4" />
            <span>更新于 {lastEditedTime}</span>
          </div>
        </div>

        <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight break-words hyphens-auto">
          {title}
        </h1>

        <div className="flex flex-wrap gap-2 justify-center md:justify-start">
          {tags.map((tag) => (
            <Link
              key={tag}
              href={`/tag/${encodeURIComponent(tag)}`}
              className="inline-flex items-center rounded-full bg-secondary/50 px-3 py-1 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary hover:text-primary"
            >
              <TagIcon className="mr-1.5 size-3.5" />
              {tag}
            </Link>
          ))}
        </div>
      </div>

      <div className="relative w-full aspect-video md:aspect-[21/9] overflow-hidden rounded-2xl shadow-lg animate-fade-in-up delay-200">
        <img
          src={coverImage || "/images/placeholder.svg"}
          alt={title}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 hover:scale-105"
        />
      </div>
    </div>
  );
}
