"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Menu, LogOut, Plus } from "lucide-react";
import { NAV_ITEMS } from "@/components/layout/nav-items";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/utils";

export function Topbar({ userName, userEmail }: { userName?: string | null; userEmail?: string | null }) {
  const pathname = usePathname();
  const current = NAV_ITEMS.find((item) => (item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)));

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur sm:px-6">
      <div className="flex lg:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            {NAV_ITEMS.map((item) => (
              <DropdownMenuItem key={item.href} asChild>
                <Link href={item.href} className="flex items-center gap-2">
                  <item.icon className="size-4" /> {item.label}
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <span className="text-sm font-medium lg:hidden">{current?.label ?? "CultTwenty Outbound"}</span>

      <div className="ml-auto flex items-center gap-2">
        <Button asChild size="sm" variant="outline" className="hidden sm:inline-flex">
          <Link href="/campaigns/new">
            <Plus /> Build Outbound Campaign
          </Link>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
              <Avatar>
                <AvatarFallback>{initials(userName ?? userEmail)}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{userName ?? "Admin"}</p>
              <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
            </div>
            <DropdownMenuItem onSelect={() => signOut({ callbackUrl: "/login" })} variant="destructive">
              <LogOut /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
