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
import { ShieldCheck, Activity, Terminal, Palette, Check } from "lucide-react"

const themes = [
  { id: 'obsidian', name: 'Obsidian Cobalt', color: '#3B82F6' },
  { id: 'zinc', name: 'Zinc Indigo', color: '#6366F1' },
  { id: 'emerald', name: 'Cyber Emerald', color: '#10B981' },
  { id: 'graphite', name: 'Graphite Amber', color: '#F59E0B' }
];

export function AppHeader() {
  const pathname = usePathname()
  const [activeTheme, setActiveTheme] = React.useState('obsidian')

  React.useEffect(() => {
    const urlTheme = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('theme') : null
    const saved = urlTheme || (typeof window !== 'undefined' ? localStorage.getItem('patchpilot:theme') : null) || 'obsidian'
    setActiveTheme(saved)
    document.documentElement.setAttribute('data-theme', saved)
    if (urlTheme && typeof window !== 'undefined') {
      localStorage.setItem('patchpilot:theme', urlTheme)
    }
  }, [])

  const setTheme = (themeId: string) => {
    setActiveTheme(themeId)
    document.documentElement.setAttribute('data-theme', themeId)
    localStorage.setItem('patchpilot:theme', themeId)
  }

  const getPageTitle = () => {
    if (pathname === "/") return { title: "Incident Operations Center", category: "Incidents" }
    if (pathname.startsWith("/incidents/")) return { title: "Incident Remediation Proof", category: "Incidents" }
    if (pathname === "/wizard") return { title: "Project Creation & Resource Connector", category: "Setup" }
    if (pathname === "/eval") return { title: "Evaluation Harness & Benchmark", category: "Benchmark" }
    if (pathname === "/settings") return { title: "Governance & Safety Policy", category: "Settings" }
    if (pathname === "/design-system") return { title: "Design System & Palette Selector", category: "Style Guide" }
    return { title: "Operations", category: "Platform" }
  }

  const { title, category } = getPageTitle()

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border/60 bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden sm:block">
              <BreadcrumbLink asChild>
                <Link href="/" className="text-muted-foreground hover:text-foreground">
                  PatchPilot
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden sm:block" />
            <BreadcrumbItem className="hidden md:block">
              <span className="text-muted-foreground">{category}</span>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage className="font-semibold text-foreground">
                {title}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="flex items-center gap-2.5">
        {/* Watchdog status badge */}
        <div className="hidden sm:flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-400 font-medium">
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Proactive Watchdog Active</span>
        </div>

        {/* Quick Palette Switcher Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs border-border/80 bg-card">
              <Palette className="size-3.5 text-primary" />
              <span className="hidden md:inline capitalize">{activeTheme}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="text-[11px] font-semibold text-muted-foreground uppercase">
              Select Palette
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {themes.map((t) => (
              <DropdownMenuItem
                key={t.id}
                onClick={() => setTheme(t.id)}
                className="flex items-center justify-between text-xs py-2 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <div className="size-3 rounded-full" style={{ backgroundColor: t.color }} />
                  <span>{t.name}</span>
                </div>
                {activeTheme === t.id && <Check className="size-3.5 text-primary" />}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="text-xs text-primary font-medium cursor-pointer">
              <Link href="/design-system" className="flex items-center gap-1.5">
                Full Design System Spec →
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Security badge */}
        <Badge variant="outline" className="hidden lg:flex items-center gap-1.5 border-primary/20 bg-primary/5 text-primary text-[11px]">
          <ShieldCheck className="size-3 text-primary" />
          <span>HITL Enforced</span>
        </Badge>
      </div>
    </header>
  )
}
