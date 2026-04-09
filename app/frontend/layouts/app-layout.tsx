import type { ReactNode } from "react"

import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

interface AppLayoutProps {
  children: ReactNode
  /** Optional header content rendered in the top bar */
  header?: ReactNode
}

export default function AppLayout({ children, header }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {header && (
          <header className="flex items-center h-11 px-5 border-b border-border shrink-0">
            {header}
          </header>
        )}
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
