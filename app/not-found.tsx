"use client";

import Link from "next/link";
import { ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="relative min-h-[80vh] flex flex-col items-center justify-center overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[100px] -z-10 animate-pulse" />

      <div className="container flex flex-col items-center justify-center text-center px-4 animate-fade-in-up">
        {/* Large 404 Text with Gradient */}
        <h1 className="text-9xl md:text-[12rem] font-bold tracking-tighter leading-none select-none">
          <span className="bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/20">
            404
          </span>
        </h1>

        <div className="space-y-4 mt-8 max-w-lg mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
            页面未找到
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            抱歉，您访问的页面可能已被移动、删除或从未存在过。
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mt-12 flex flex-col sm:flex-row items-center gap-4">
          <Button
            asChild
            size="lg"
            className="rounded-full px-8 shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
          >
            <Link href="/">
              <Home className="mr-2 size-4" />
              回到主页
            </Link>
          </Button>

          <Button
            variant="outline"
            asChild
            size="lg"
            className="rounded-full px-8 hover:bg-secondary/80"
          >
            <Link href="#" onClick={() => window.history.back()}>
              <ArrowLeft className="mr-2 size-4" />
              返回上一页
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
