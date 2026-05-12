import { Link, usePage } from "@inertiajs/react"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import type { NavItem } from "@/types"

// Picks the single most-specific matching item so /settings/credentials
// highlights "Credentials" only, not "Credentials" + "Settings". Falls back
// to a simple startsWith match when no other item is a longer prefix.
function pickActive(items: NavItem[], url: string): string | null {
  const matches = items
    .filter((i) => url === i.href || url.startsWith(i.href + "/") || url.startsWith(i.href + "?") || url === i.href)
    .sort((a, b) => b.href.length - a.href.length)
  return matches[0]?.href ?? null
}

export function NavSecondary({
  items,
  ...props
}: { items: NavItem[] } & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  const { url } = usePage()
  const activeHref = pickActive(items, url)

  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild isActive={activeHref === item.href} tooltip={item.title}>
                <Link href={item.href}>
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
