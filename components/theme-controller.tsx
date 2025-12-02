"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

export default function ThemeController() {
  const { setTheme, theme } = useTheme();
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  // 判断是否支持 View Transitions API
  const supportsViewTransition =
    typeof document !== "undefined" &&
    "startViewTransition" in document &&
    typeof (document as any).startViewTransition === "function";

  const handleThemeChange = async (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    const newTheme = theme === "dark" ? "light" : "dark";

    // 如果不支持 View Transition，直接切换，依赖 CSS transition
    if (!supportsViewTransition) {
      setTheme(newTheme);
      return;
    }

    // 获取点击坐标，用于遮罩动画中心点
    const x = event.clientX;
    const y = event.clientY;

    // 计算最大半径，确保覆盖全屏
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    try {
      // 现代浏览器使用 View Transition API
      const transition = (document as any).startViewTransition(() => {
        setTheme(newTheme);
      });

      transition.ready.then(() => {
        // 在伪元素上执行动画
        document.documentElement.animate(
          {
            clipPath: [
              `circle(0px at ${x}px ${y}px)`,
              `circle(${endRadius}px at ${x}px ${y}px)`,
            ],
          },
          {
            duration: 500,
            easing: "ease-in-out",
            // 指定动画作用于新的视图快照（即切换后的主题层）
            pseudoElement: "::view-transition-new(root)",
          }
        );
      });
    } catch (e) {
      // 即使出错也确保能切换主题
      console.error("Theme transition failed:", e);
      setTheme(newTheme);
    }
  };

  return (
    <Button
      ref={buttonRef}
      variant="ghost"
      size="icon"
      className="cursor-pointer relative flex items-center justify-center"
      onClick={handleThemeChange}
    >
      <Sun className="size-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute size-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
