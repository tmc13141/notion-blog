"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { createPortal } from "react-dom";

const navigationItems = [
  {
    label: "主页",
    href: "/",
  },
  {
    label: "文章",
    href: "/blog/1",
  },
  {
    label: "标签",
    href: "/tag",
  },
  {
    label: "关于",
    href: "/about",
  },
  {
    label: "友链",
    href: "/friends",
  },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1">
      {navigationItems.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/" && pathname.startsWith(item.href));

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 relative group",
              isActive
                ? "text-foreground bg-secondary/50"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileNavigation({
  search,
}: {
  children?: React.ReactNode;
  search?: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isMounted) return null;

  const menu = (
    <div
      className={cn(
        "fixed inset-0 z-[49] bg-background/95 backdrop-blur-xl transition-all duration-500 ease-in-out origin-top md:hidden flex flex-col",
        isOpen
          ? "opacity-100 visible translate-y-0"
          : "opacity-0 invisible -translate-y-4"
      )}
    >
      {/* Header Area within Menu - Spacer for top bar items */}
      <div className="h-[72px] w-full shrink-0" />

      <div className="px-6 py-2">
        {/* Search Bar Area - Prominent */}
        <div className="w-full" onClick={() => setIsOpen(false)}>
          {search}
        </div>
      </div>

      <nav className="flex flex-col gap-2 items-center text-center mt-8 flex-1">
        {navigationItems.map((item, index) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <div
              key={item.href}
              className={cn(
                "transform transition-all duration-500 ease-out w-full",
                isOpen ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
              )}
              style={{ transitionDelay: `${index * 50 + 100}ms` }}
            >
              <Link
                href={item.href}
                className={cn(
                  "text-xl font-medium transition-all duration-300 block py-3 rounded-xl",
                  isActive
                    ? "text-foreground bg-secondary/50"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"
                )}
                onClick={() => setIsOpen(false)}
              >
                {item.label}
              </Link>
            </div>
          );
        })}
      </nav>

      {/* Footer Area */}
      <div className="p-8 pb-24 text-center text-muted-foreground text-sm opacity-50">
        {/* Extra footer content if needed */}
      </div>
    </div>
  );

  return (
    <div className="md:hidden flex items-center justify-center">
      <Button
        variant="ghost"
        size="icon"
        className="relative z-50 hover:bg-transparent flex items-center justify-center"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="relative size-6">
          <X
            className={cn(
              "absolute inset-0 transition-all duration-300 ease-in-out m-auto",
              isOpen
                ? "rotate-0 opacity-100 scale-100"
                : "-rotate-90 opacity-0 scale-0"
            )}
          />
          <Menu
            className={cn(
              "absolute inset-0 transition-all duration-300 ease-in-out m-auto",
              isOpen
                ? "rotate-90 opacity-0 scale-0"
                : "rotate-0 opacity-100 scale-100"
            )}
          />
        </div>
      </Button>
      {createPortal(menu, document.body)}
    </div>
  );
}
