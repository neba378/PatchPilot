'use client';

import * as React from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"
import { Palette, Check } from "lucide-react"
import { UserNav } from "@/app/components/UserNav"

const themes = [
  { id: 'obsidian', name: 'Cobalt Slate', color: '#3B82F6' },
  { id: 'zinc', name: 'Zinc Indigo', color: '#6366F1' },
  { id: 'emerald', name: 'Cyber Emerald', color: '#10B981' },
  { id: 'graphite', name: 'Graphite Amber', color: '#F59E0B' }
];

export function AppHeader() {
  const pathname = usePathname()
  const [activeTheme, setActiveTheme] = React.useState('obsidian')

  React.useEffect(() => {
    const saved = localStorage.getItem('patchpilot:theme') || 'obsidian'
    setActiveTheme(saved)
    document.documentElement.setAttribute('data-theme', saved)
  }, [])

  const setTheme = (themeId: string) => {
    setActiveTheme(themeId)
    document.documentElement.setAttribute('data-theme', themeId)
    localStorage.setItem('patchpilot:theme', themeId)
  }

  const getPageTitle = () => {
    if (pathname === "/") return "Incidents"
    if (pathname.startsWith("/incidents/")) return "Incident Details"
    if (pathname === "/wizard") return "Integrations"
    if (pathname === "/eval") return "Benchmarks"
    if (pathname === "/settings") return "Settings"
    if (pathname === "/design-system") return "Design System"
    return "Operations"
  }

  const title = getPageTitle()

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border/70 bg-card/60 px-4 backdrop-blur supports-[backdrop-filter]:bg-card/40 sticky top-0 z-20">
      <div className="flex items-center gap-2.5">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="h-4 bg-border/60" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/" className="text-xs text-muted-foreground hover:text-foreground">
                  PatchPilot
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="text-muted-foreground/40" />
            <BreadcrumbItem>
              <BreadcrumbPage className="text-xs font-semibold text-foreground">
                {title}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="flex items-center gap-2.5">
        {/* Watchdog status pill */}
        <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] text-emerald-400 font-medium">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          <span>Active</span>
        </div>

        {/* Theme Switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
              <Palette className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase font-semibold">
              Color Theme
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {themes.map((t) => (
              <DropdownMenuItem
                key={t.id}
                onClick={() => setTheme(t.id)}
                className="flex items-center justify-between text-xs py-1.5 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <div className="size-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                  <span>{t.name}</span>
                </div>
                {activeTheme === t.id && <Check className="size-3 text-primary" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Navigation / Profile */}
        <UserNav />
      </div>
    </header>
  )
}
