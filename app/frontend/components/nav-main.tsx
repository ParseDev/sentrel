import { Link, usePage } from "@inertiajs/react"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import type { NavItem } from "@/types"

function isActive(currentUrl: string, href: string) {
  if (href === "/") return currentUrl === "/"
  return currentUrl.startsWith(href)
}

export function NavMain({ items }: { items: NavItem[] }) {
  const { url } = usePage()

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-1">
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild isActive={isActive(url, item.href)} tooltip={item.title}>
                <Link href={item.href} prefetch>
                  <item.icon className="size-4" />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
