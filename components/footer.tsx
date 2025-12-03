import Link from "next/link";
import { Github, Mail } from "lucide-react";
import { getSiteConfig } from "@/lib/notion/getSiteData";

export default async function Footer() {
  const BlogConfig = await getSiteConfig();

  return (
    <footer className="w-full border-t bg-background mt-auto">
      <div className="w-full max-w-5xl mx-auto flex flex-col items-center justify-between gap-4 px-4 py-10 md:h-24 md:flex-row md:py-0">
        <div className="flex flex-col items-center gap-4 md:flex-row md:gap-2">
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            © {new Date().getFullYear()} {BlogConfig.BLOG_TITLE}. All rights
            reserved.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Link href={BlogConfig.GITHUB} target="_blank" rel="noreferrer">
            <Github className="h-5 w-5" />
            <span className="sr-only">GitHub</span>
          </Link>
          <Link
            href={`mailto:${BlogConfig.EMAIL}`}
            target="_blank"
            rel="noreferrer"
          >
            <Mail className="h-5 w-5" />
            <span className="sr-only">Email</span>
          </Link>
        </div>
      </div>
    </footer>
  );
}
