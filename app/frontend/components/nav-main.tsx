import { Link, usePage } from "@inertiajs/react"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import type { NavItem } from "@/types"

// Picks the single most-specific matching item by longest-prefix so nested
// pages don't light up two sidebar entries simultaneously (e.g. /agents/new
// matches both "/" and "/agents" — only "/agents" should highlight).
function pickActive(items: NavItem[], url: string): string | null {
  const matches = items.filter((i) =>
    i.href === "/" ? url === "/" : url === i.href || url.startsWith(i.href + "/") || url.startsWith(i.href + "?"),
  )
  if (matches.length === 0) return null
  return matches.sort((a, b) => b.href.length - a.href.length)[0].href
}

export function NavMain({ items }: { items: NavItem[] }) {
  const { url } = usePage()
  const activeHref = pickActive(items, url)

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-1">
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild isActive={activeHref === item.href} tooltip={item.title}>
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
