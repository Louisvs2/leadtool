import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, Users, Microscope, Megaphone, Mail, MessageSquare, BarChart3, Settings } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/research", label: "Research", icon: Microscope },
  { href: "/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/messages", label: "Messages", icon: Mail },
  { href: "/replies", label: "Replies", icon: MessageSquare },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];
