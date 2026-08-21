"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/components/layout/nav-items";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r bg-background lg:flex">
      <div className="flex h-16 items-center px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded bg-primary text-[11px] font-bold text-primary-foreground">
            C20
          </div>
          <span className="text-[13px] font-semibold tracking-[0.16em] text-muted-foreground">OUTBOUND</span>
        </Link>
      </div>
      <nav className="flex-1 space-y-0.5 px-3 py-2">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
              )}
            >
              <Icon className="size-4" strokeWidth={1.75} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-4 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">CultTwenty GmbH</p>
        <p>Creative Production Company</p>
      </div>
    </aside>
  );
}
