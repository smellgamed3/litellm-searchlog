"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Search, Settings, Database, ExternalLink } from "lucide-react";

const navItems = [
  { href: "/search", label: "Log Search", icon: Search },
  { href: "/instances", label: "Instances", icon: Settings },
];

interface NavBarProps {
  /** 应用的公开访问 URL（由 APP_URL 环境变量配置），可选。
   *  格式示例：https://example.com/logs
   *  配置后将在导航栏右侧显示为可点击链接。
   */
  appUrl?: string;
}

export function NavBar({ appUrl }: NavBarProps) {
  const pathname = usePathname();

  return (
    <nav className="border-b bg-white shadow-sm">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex h-16 items-center gap-8">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg text-primary">
            <Database className="h-5 w-5" />
            <span>LiteLLM SearchLog</span>
          </Link>
          <div className="flex items-center gap-1">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  pathname === href || pathname.startsWith(href + "/")
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </div>
          {appUrl && (
            <div className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
              <ExternalLink className="h-3.5 w-3.5" />
              <a
                href={appUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                {appUrl}
              </a>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
