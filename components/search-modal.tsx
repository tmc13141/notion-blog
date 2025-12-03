"use client";

import { Page } from "@/types/notion";
import {
  ArrowRight,
  Calendar,
  FileText,
  Loader2,
  Search,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import useSWR from "swr";

export default function SearchModal({
  suggestedPosts,
  searchByKeywordAction,
}: {
  suggestedPosts: Page[];
  searchByKeywordAction: (keyword: string) => Promise<Page[]>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetcher = (keyword: string) =>
    searchByKeywordAction(keyword).then((result) => result);

  const { data: results, isLoading } = useSWR(keyword, fetcher, {
    fallbackData: [],
    keepPreviousData: true,
  });

  // Displayed items logic
  const displayedItems = useMemo(() => {
    return keyword ? results || [] : suggestedPosts.slice(0, 5);
  }, [keyword, results, suggestedPosts]);

  // Reset selection when items change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [displayedItems.length, keyword]);

  // 防抖
  const handleOnChange = debounce((e: React.ChangeEvent<HTMLInputElement>) => {
    setKeyword(e.target.value);
  }, 300);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    setKeyword("");
    setSelectedIndex(-1);
  }, []);

  const openModal = useCallback(() => {
    setIsOpen(true);
  }, []);

  const navigateToPost = useCallback(
    (post: Page) => {
      router.push(`/post/${encodeURIComponent(post.slug)}`);
      closeModal();
    },
    [router, closeModal]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle modal
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (isOpen) closeModal();
        else openModal();
        return;
      }

      if (!isOpen) return;

      switch (e.key) {
        case "Escape":
          e.preventDefault();
          closeModal();
          break;
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < displayedItems.length - 1 ? prev + 1 : 0
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : displayedItems.length - 1
          );
          break;
        case "Enter":
          e.preventDefault();
          if (selectedIndex >= 0 && selectedIndex < displayedItems.length) {
            navigateToPost(displayedItems[selectedIndex]);
          }
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [
    isOpen,
    closeModal,
    openModal,
    selectedIndex,
    displayedItems,
    navigateToPost,
  ]);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && listRef.current) {
      // +1 to account for the sticky header div inside listRef
      const selectedElement = listRef.current.children[
        selectedIndex + 1
      ] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: "nearest",
          behavior: "smooth",
        });
      }
    }
  }, [selectedIndex]);

  // Focus input on open
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Lock body scroll
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

  // Click outside to close
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeModal();
    }
  };

  const highlightText = (text: string, keyword: string) => {
    if (!keyword || !text) return text;

    // 转义正则特殊字符
    const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escapedKeyword})`, "gi");
    const parts = text.split(regex);

    return parts.map((part, index) =>
      part.toLowerCase() === keyword.toLowerCase() ? (
        <mark
          key={index}
          className="bg-yellow-400/40 dark:bg-yellow-500/30 text-yellow-700 dark:text-yellow-300 rounded-sm px-0.5 font-semibold"
        >
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const modalContent = isOpen ? (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-16 sm:pt-[20vh]"
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200" />

      {/* Modal Content */}
      <div
        ref={modalRef}
        className="relative w-full max-w-2xl bg-background/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-border/50 overflow-hidden animate-in zoom-in-95 slide-in-from-top-2 duration-200 flex flex-col max-h-[85vh] sm:max-h-[70vh]"
      >
        {/* Header */}
        <div className="flex items-center border-b border-border/50 px-4 py-3 gap-3 shrink-0">
          <Search className="size-5 text-muted-foreground/50 hidden sm:block" />
          <input
            ref={inputRef}
            onChange={handleOnChange}
            placeholder="搜索文章..."
            className="flex-1 bg-transparent border-none outline-none text-lg placeholder:text-muted-foreground/50 h-10 min-w-0"
          />
          <div className="flex items-center gap-2 shrink-0">
            <kbd className="hidden sm:inline-flex items-center gap-1 h-5 px-1.5 rounded border bg-muted/50 text-[10px] font-medium text-muted-foreground">
              <span className="text-xs">⌘</span>K
            </kbd>
            <button
              onClick={closeModal}
              className="p-2 hover:bg-muted rounded-md transition-colors -mr-2"
            >
              <X className="size-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div
          className="overflow-y-auto custom-scrollbar p-2 scroll-smooth"
          ref={listRef}
        >
          {/* Loading */}
          {isLoading && keyword && (
            <div className="py-8 flex justify-center items-center text-muted-foreground">
              <Loader2 className="size-6 animate-spin mr-2" />
              <span>搜索中...</span>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && keyword && results && results.length === 0 && (
            <div className="py-12 text-center">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted/50 mb-4">
                <Search className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-foreground font-medium">
                未找到 &quot;{keyword}&quot;
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                换个关键词试试看？
              </p>
            </div>
          )}

          {/* Results */}
          {!isLoading && displayedItems.length > 0 ? (
            <>
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground/50 uppercase tracking-wider sticky top-0 bg-background/95 backdrop-blur-sm z-10">
                {keyword ? "搜索结果" : "最新推荐"}
              </div>

              {displayedItems.map((post, index) => {
                const isSelected = index === selectedIndex;
                return (
                  <Link
                    key={post.id}
                    href={`/post/${encodeURIComponent(post.slug)}`}
                    onClick={closeModal}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`group flex items-start gap-3 rounded-xl p-3 transition-all border border-transparent ${
                      isSelected
                        ? "bg-secondary/50 border-border/50"
                        : "hover:bg-secondary/50 hover:border-border/50"
                    }`}
                  >
                    <div className="relative h-14 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-muted border border-border/50 hidden sm:block">
                      {post.pageCover ? (
                        <img
                          src={post.pageCover}
                          alt={post.title}
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-secondary">
                          <FileText className="h-6 w-6 text-muted-foreground/20" />
                        </div>
                      )}
                    </div>

                    <div className="flex flex-1 flex-col justify-center gap-1 overflow-hidden min-h-[3.5rem]">
                      <h4 className="line-clamp-1 text-sm font-medium text-foreground">
                        {highlightText(post.title, keyword)}
                      </h4>

                      {/* 显示匹配的内容片段 */}
                      {keyword &&
                        post.searchResults &&
                        post.searchResults.length > 0 && (
                          <p className="line-clamp-2 text-xs text-muted-foreground/80 leading-relaxed">
                            {highlightText(post.searchResults[0], keyword)}
                          </p>
                        )}

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1 bg-muted/50 px-1.5 py-0.5 rounded text-[10px]">
                          <Calendar className="size-3" />
                          {new Date(post.date).toLocaleDateString()}
                        </span>
                        {post.tags?.[0] && (
                          <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[10px]">
                            #{highlightText(post.tags[0], keyword)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div
                      className={`flex items-center self-center transition-all ${
                        isSelected
                          ? "opacity-100 translate-x-0"
                          : "opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0"
                      }`}
                    >
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Link>
                );
              })}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="bg-muted/30 border-t border-border/50 px-4 py-2 hidden sm:flex items-center justify-between text-[10px] text-muted-foreground shrink-0">
          <span>
            {keyword
              ? `找到 ${results?.length || 0} 个结果`
              : "输入关键词开始搜索"}
          </span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="bg-background border rounded px-1 min-w-[1.2em] text-center">
                ↑
              </kbd>
              <kbd className="bg-background border rounded px-1 min-w-[1.2em] text-center">
                ↓
              </kbd>
              <span>选择</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="bg-background border rounded px-1">↵</kbd>
              <span>打开</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={openModal}
        className="relative flex items-center justify-center w-10 h-10 rounded-full text-muted-foreground hover:bg-secondary/80 hover:text-foreground transition-colors md:w-10 md:h-10 w-full h-12 bg-secondary/30 md:bg-transparent rounded-xl md:rounded-full"
        aria-label="Search"
      >
        <Search className="size-5" />
        <span className="ml-2 text-sm font-medium md:hidden">搜索文章...</span>
      </button>

      {/* Portal */}
      {isMounted && createPortal(modalContent, document.body)}
    </>
  );
}

function debounce(fn: (...args: any[]) => void, delay: number) {
  let timer: NodeJS.Timeout;
  return function (...args: any[]) {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
