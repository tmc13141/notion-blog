import Link from "next/link";

import ThemeController from "@/components/theme-controller";
import SearchModal from "@/components/search-modal";
import { getSearchResults } from "@/lib/notion/getSearchResults";
import { getPostList, getSiteConfig } from "@/lib/notion/getSiteData";
import { Navigation, MobileNavigation } from "@/components/navigation";
import HeaderBackground from "@/components/header-background";

export default async function Header() {
  const [{ posts }, BlogConfig] = await Promise.all([
    getPostList(),
    getSiteConfig(),
  ]);

  // posts 已按日期降序排列
  const latestPosts = posts.slice(0, 6);

  const searchByKeyword = getSearchResults.bind(null, posts);

  return (
    <HeaderBackground>
      <div className="flex items-center justify-between w-full">
        {/* Left: Logo */}
        <div className="flex items-center flex-shrink-0">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="relative rounded-full overflow-hidden transition-transform duration-300 group-hover:scale-110">
              <img
                src={
                  BlogConfig.HEADER_ICON || BlogConfig.FAVICON || "/favicon.svg"
                }
                alt="Logo"
                width={32}
                height={32}
                className="object-cover"
              />
            </div>
            <span className="text-lg font-bold tracking-tight transition-colors group-hover:text-primary/80">
              {BlogConfig.BLOG_TITLE}
            </span>
          </Link>
        </div>

        {/* Center: Desktop Navigation */}
        <div className="hidden md:flex absolute left-1/2 -translate-x-1/2">
          <Navigation />
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-1">
            <SearchModal
              suggestedPosts={latestPosts}
              searchByKeywordAction={searchByKeyword}
            />
            <ThemeController />
          </div>

          {/* Mobile Menu Trigger */}
          <div className="md:hidden flex items-center gap-1">
            <ThemeController />
            <MobileNavigation
              search={
                <SearchModal
                  suggestedPosts={latestPosts}
                  searchByKeywordAction={searchByKeyword}
                />
              }
            />
          </div>
        </div>
      </div>
    </HeaderBackground>
  );
}
