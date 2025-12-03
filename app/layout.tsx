import { Inter, Noto_Sans_SC } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import Header from "@/components/header";
import Footer from "@/components/footer";
import MetaHead from "@/components/metahead";
import GoToTop from "@/components/go-to-top";
import { getSiteConfig } from "@/lib/notion/getSiteData";
import { Blog, WithContext } from "schema-dts";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const noto_sans_sc = Noto_Sans_SC({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  variable: "--font-noto-sans-sc",
});

export async function generateMetadata() {
  const BlogConfig = await getSiteConfig();

  // 动态 favicon 配置
  const icons = BlogConfig.FAVICON
    ? {
        icon: BlogConfig.FAVICON,
        apple: BlogConfig.FAVICON,
      }
    : undefined;

  return {
    title: {
      default: BlogConfig.BLOG_TITLE,
      template: "%s | " + BlogConfig.BLOG_TITLE,
    },
    description: BlogConfig.BLOG_DESCRIPTION,
    keywords: BlogConfig.BLOG_KEYWORDS,
    icons,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const BlogConfig = await getSiteConfig();

  const blog: WithContext<Blog> = {
    "@context": "https://schema.org",
    "@type": "Blog",
    url: BlogConfig.SITE_URL,
    name: BlogConfig.BLOG_TITLE,
    description: BlogConfig.BLOG_DESCRIPTION,
    author: {
      "@type": "Person",
      name: BlogConfig.AUTHOR,
      url: BlogConfig.SITE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: BlogConfig.AUTHOR,
      url: BlogConfig.SITE_URL,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": BlogConfig.SITE_URL,
      keywords: BlogConfig.BLOG_KEYWORDS.split(","),
    },
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <MetaHead />
      <body
        className={`${noto_sans_sc.className} ${inter.className} antialiased`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(blog) }}
        />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="flex flex-col min-h-screen">
            <Header />
            <div className="flex-1">{children}</div>
            <Footer />
            <GoToTop />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
