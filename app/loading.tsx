import { Spinner } from "@/components/ui/spinner";

export default function Loading() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[100px] -z-10 animate-pulse" />

      <div className="flex flex-col items-center gap-6 animate-fade-in-up">
        <div className="relative">
          {/* Glow effect behind spinner */}
          <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
          <Spinner className="relative size-12 text-muted-foreground/20 fill-primary" />
        </div>

        <div className="flex flex-col items-center gap-2">
          <h2 className="text-xl font-medium tracking-tight text-foreground">
            加载中
          </h2>
          <p className="text-sm text-muted-foreground animate-pulse">
            正在准备精彩内容...
          </p>
        </div>
      </div>
    </div>
  );
}
