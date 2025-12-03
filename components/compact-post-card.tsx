"use client";

import { Page } from "@/types/notion";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function CompactPostCard({ post }: { post: Page }) {
  const [formattedDate, setFormattedDate] = useState("");

  useEffect(() => {
    setFormattedDate(new Date(post.date).toLocaleDateString());
  }, [post.date]);

  return (
    <Link
      href={`/post/${encodeURIComponent(post.slug)}`}
      className="group flex items-start gap-4 p-4 -mx-4 rounded-2xl transition-colors hover:bg-secondary/50"
    >
      <div className="flex-1 space-y-3 min-w-0">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <time dateTime={formattedDate} className="font-medium">
            {formattedDate}
          </time>
          {post.tags.length > 0 && (
            <>
              <span className="w-0.5 h-0.5 rounded-full bg-muted-foreground" />
              <span className="text-primary">{post.tags[0]}</span>
            </>
          )}
        </div>

        <h3 className="text-xl font-bold tracking-tight group-hover:text-primary transition-colors break-words">
          {post.title}
          <ArrowUpRight className="inline-block ml-2 size-4 opacity-0 -translate-y-1 translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-y-0 group-hover:translate-x-0 text-muted-foreground align-text-bottom" />
        </h3>

        <p className="text-muted-foreground text-sm line-clamp-2 leading-relaxed break-words">
          {post.summary}
        </p>
      </div>

      <div className="relative w-24 h-24 sm:w-32 sm:h-24 flex-shrink-0 overflow-hidden rounded-xl bg-muted">
        <img
          src={post.pageCover || "/images/placeholder.svg"}
          alt={post.title}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
    </Link>
  );
}
