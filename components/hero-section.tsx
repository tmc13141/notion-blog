import { getSiteConfig } from "@/lib/notion/getSiteData";
import { ChevronDown, ArrowRight } from "lucide-react";
import Link from "next/link";

export async function HeroSection() {
  const BlogConfig = await getSiteConfig();
  const greeting = `你好，我是`;
  const description = BlogConfig.HERO_WORDS1;
  const subDescription = BlogConfig.HERO_WORDS2;

  return (
    <section className="relative min-h-[calc(100vh-4rem)] flex flex-col justify-center overflow-hidden pt-32 pb-12 md:py-0">
      {/* Background Elements - Subtle Gradients */}
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-primary/5 blur-[100px] -z-10 animate-pulse" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-secondary/20 blur-[80px] -z-10" />

      <div className="w-full max-w-5xl mx-auto px-4">
        <div className="flex flex-col-reverse md:flex-row items-center gap-8 md:gap-24">
          {/* Text Content */}
          <div className="flex-1 space-y-6 md:space-y-8 text-center md:text-left">
            <div className="space-y-4">
              <h1
                className="text-3xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-tight animate-fade-in-up"
                style={{ animationDelay: "200ms" }}
              >
                <span className="text-foreground">{greeting}</span>
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
                  {BlogConfig.AUTHOR}
                </span>
                <br />
                <span className="text-muted-foreground text-xl md:text-5xl font-medium mt-2 block">
                  {description}
                </span>
              </h1>

              <p
                className="text-base md:text-xl text-muted-foreground max-w-2xl mx-auto md:mx-0 animate-fade-in-up leading-relaxed"
                style={{ animationDelay: "400ms" }}
              >
                {subDescription}
              </p>
            </div>

            <div
              className="flex flex-col sm:flex-row items-center gap-4 justify-center md:justify-start animate-fade-in-up"
              style={{ animationDelay: "600ms" }}
            >
              <Link
                href="/blog/1"
                className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-all hover:bg-primary/90 hover:scale-105 active:scale-95 w-full sm:w-auto group"
              >
                阅读文章
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/about"
                className="inline-flex h-12 items-center justify-center rounded-full border border-input bg-background px-8 text-sm font-medium shadow-sm transition-all hover:bg-accent hover:text-accent-foreground hover:scale-105 active:scale-95 w-full sm:w-auto"
              >
                关于我
              </Link>
            </div>
          </div>

          {/* Image Content */}
          <div
            className="relative flex-shrink-0 animate-fade-in-up"
            style={{ animationDelay: "200ms" }}
          >
            <div className="relative w-[240px] h-[240px] sm:w-[280px] md:w-[400px] md:h-[400px]">
              {/* Decorative rings */}
              <div className="absolute inset-0 rounded-full border-2 border-primary/10 scale-110 animate-[spin_20s_linear_infinite]" />
              <div className="absolute inset-0 rounded-full border-2 border-dashed border-primary/10 scale-125 animate-[spin_15s_linear_infinite_reverse]" />

              <div className="relative w-full h-full rounded-full overflow-hidden border-4 border-background shadow-2xl">
                <img
                  src={BlogConfig.HERO_IMAGE || "/images/avatar.png"}
                  alt={BlogConfig.AUTHOR}
                  className="absolute inset-0 w-full h-full object-cover hover:scale-105 transition-transform duration-700 ease-in-out"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="hidden md:block absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce opacity-50 hover:opacity-100 transition-opacity cursor-pointer">
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs text-muted-foreground uppercase tracking-widest">
            Scroll
          </span>
          <ChevronDown className="size-4 text-muted-foreground" />
        </div>
      </div>
    </section>
  );
}
