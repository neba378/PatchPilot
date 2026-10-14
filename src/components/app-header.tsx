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
import { ShieldCheck, Activity, Terminal } from "lucide-react"

export function AppHeader() {
  const pathname = usePathname()

  const getPageTitle = () => {
    if (pathname === "/") return { title: "Incident Operations Center", category: "Incidents" }
    if (pathname.startsWith("/incidents/")) return { title: "Incident Remediation Proof", category: "Incidents" }
    if (pathname === "/wizard") return { title: "Project Creation & Resource Connector", category: "Setup" }
    if (pathname === "/eval") return { title: "Evaluation Harness & Benchmark", category: "Benchmark" }
    if (pathname === "/settings") return { title: "Governance & Safety Policy", category: "Settings" }
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

      <div className="flex items-center gap-3">
        {/* Watchdog status badge */}
        <div className="hidden sm:flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-400 font-medium">
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Proactive Watchdog Active</span>
        </div>

        {/* Security badge */}
        <Badge variant="outline" className="hidden lg:flex items-center gap-1.5 border-primary/20 bg-primary/5 text-primary text-[11px]">
          <ShieldCheck className="size-3 text-primary" />
          <span>HITL Enforced</span>
        </Badge>
      </div>
    </header>
  )
}
