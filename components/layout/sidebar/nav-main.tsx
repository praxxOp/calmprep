"use client";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from "@/components/ui/sidebar";
import {
  BookHeartIcon,
  ChartPieIcon,
  MessageSquareHeartIcon,
  SmilePlusIcon,
  type LucideIcon
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

export const navItems: NavGroup[] = [
  {
    title: "Wellness",
    items: [
      { title: "AI Companion", href: "/dashboard/companion", icon: MessageSquareHeartIcon },
      { title: "Insights", href: "/dashboard/insights", icon: ChartPieIcon },
      { title: "Journal", href: "/dashboard/journal", icon: BookHeartIcon },
      { title: "Mood Check-in", href: "/dashboard/mood", icon: SmilePlusIcon }
    ]
  }
];

export function NavMain() {
  const pathname = usePathname();

  return (
    <>
      {navItems.map((nav) => (
        <SidebarGroup key={nav.title}>
          <SidebarGroupLabel>{nav.title}</SidebarGroupLabel>
          <SidebarGroupContent className="flex flex-col gap-2">
            <SidebarMenu>
              {nav.items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    className="hover:text-foreground active:text-foreground hover:bg-[var(--primary)]/10 active:bg-[var(--primary)]/10"
                    isActive={pathname === item.href}
                    tooltip={item.title}
                    asChild>
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  );
}
