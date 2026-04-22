import { Link, usePage } from "@inertiajs/react"
import { ChevronDown, Moon, Sun } from "lucide-react"
import { useEffect, useState } from "react"

import AppLogo from "@/components/app-logo"
import { useTheme } from "@/hooks/use-theme"
import { dashboardPath, newUserRegistrationPath } from "@/routes"
import type { SharedProps } from "@/types"

const LINKS: { label: string; href: string; menu?: boolean }[] = [
  { label: "Platform", href: "#platform", menu: true },
  { label: "Agents", href: "#demo", menu: true },
  { label: "Toolkits", href: "#integrations" },
  { label: "Blog", href: "#blog" },
  { label: "Docs", href: "#docs" },
]

export function LandingNav() {
  const { auth } = usePage<SharedProps>().props
  const signedIn = !!auth?.user
  const ctaHref = signedIn ? dashboardPath() : newUserRegistrationPath()
  const ctaLabel = signedIn ? "Dashboard" : "Get started"

  const [scrolled, setScrolled] = useState(false)
  const { theme, setTheme } = useTheme()
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-color-scheme: dark)").matches)

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8)
    }
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 w-full">
      <div className="pointer-events-auto relative mx-auto w-full max-w-5xl px-3 pt-3 md:px-5 md:pt-4">
        <div
          className={`relative flex h-14 items-center overflow-hidden rounded-lg border transition-[border-color,box-shadow,background-color] duration-300 ${
            scrolled
              ? "border-[var(--border-strong)] bg-foreground shadow-[0_12px_32px_-12px_rgba(0,0,0,0.4)]"
              : "border-foreground/20 bg-foreground"
          }`}
        >
          {/* Ambient cyan/indigo glow inside the pill */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              background:
                "radial-gradient(80% 200% at 10% 50%, var(--indigo-glow) 0%, transparent 55%), radial-gradient(60% 200% at 90% 50%, var(--cyan-glow) 0%, transparent 55%)",
            }}
          />

          {/* Logo — white on dark fill */}
          <Link
            href="/"
            className="relative flex items-center gap-2 pl-5 pr-4 text-background transition-opacity hover:opacity-80"
          >
            <span className="font-display text-base font-semibold tracking-[-0.03em] text-background">
              Alchemy<span className="text-[var(--cyan)]">.</span>
            </span>
          </Link>

          {/* Links */}
          <nav className="relative ml-auto hidden items-center md:flex">
            {LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="group relative flex items-center gap-1 px-4 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-background/75 transition-colors hover:text-background"
              >
                <span>{link.label}</span>
                {link.menu && (
                  <ChevronDown className="size-3 opacity-60 transition-transform group-hover:translate-y-0.5" />
                )}
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-x-4 bottom-1 h-px origin-left scale-x-0 bg-gradient-to-r from-[var(--color-indigo)] to-[var(--cyan)] transition-transform duration-300 group-hover:scale-x-100"
                />
              </a>
            ))}
          </nav>

          {/* Theme toggle — matches the dark pill's chrome */}
          <button
            type="button"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            className="relative ml-2 flex size-8 items-center justify-center rounded-md border border-background/15 bg-transparent text-background/70 transition-all hover:border-background/35 hover:bg-background/10 hover:text-background"
          >
            {isDark ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
          </button>

          {/* CTA — white button flush to right edge of the pill */}
          <Link
            href={ctaHref}
            className="group relative ml-3 flex h-full items-center overflow-hidden border-l border-background/20 bg-background px-6 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground transition-colors hover:bg-background/90"
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-[var(--color-indigo)]/20 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full"
            />
            <span className="relative">{ctaLabel}</span>
          </Link>
        </div>
      </div>
    </header>
  )
}
