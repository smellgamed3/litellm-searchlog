"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Search, Settings, Database } from "lucide-react";

const navItems = [
  { href: "/search", label: "Log Search", icon: Search },
  { href: "/instances", label: "Instances", icon: Settings },
];

export function NavBar() {
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
        </div>
      </div>
    </nav>
  );
}
