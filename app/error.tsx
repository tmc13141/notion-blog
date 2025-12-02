"use client";

import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="relative min-h-[80vh] flex flex-col items-center justify-center overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-destructive/5 blur-[100px] -z-10 animate-pulse" />

      <div className="container flex flex-col items-center justify-center text-center px-4 animate-fade-in-up">
        {/* Error Icon */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-destructive/20 blur-2xl rounded-full animate-pulse" />
          <AlertTriangle className="relative size-24 text-destructive animate-bounce" />
        </div>

        <h1 className="text-4xl md:text-6xl font-bold tracking-tighter mb-6">
          哎呀，出错了
        </h1>

        <div className="space-y-4 max-w-lg mx-auto mb-12">
          <p className="text-muted-foreground text-lg leading-relaxed">
            抱歉，我们在处理您的请求时遇到了意外错误。
          </p>

          {/* Error details (only in development) */}
          {process.env.NODE_ENV === "development" && (
            <div className="my-6 rounded-xl bg-destructive/10 border border-destructive/20 p-6 text-left overflow-x-auto">
              <p className="font-mono text-sm text-destructive font-medium">
                {error.message}
              </p>
              {error.digest && (
                <p className="mt-2 text-xs text-muted-foreground font-mono opacity-70">
                  Error ID: {error.digest}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Button
            onClick={reset}
            size="lg"
            className="rounded-full px-8 shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
          >
            <RefreshCw className="mr-2 size-4" />
            重试一下
          </Button>

          <Button
            variant="outline"
            asChild
            size="lg"
            className="rounded-full px-8 hover:bg-secondary/80"
          >
            <Link href="/">
              <Home className="mr-2 size-4" />
              回到主页
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
