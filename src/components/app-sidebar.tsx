'use client';

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Activity,
  Sliders,
  CheckCircle2,
  Settings,
  Shield,
  Terminal,
  Cpu,
  GitBranch,
  FolderGit2,
  ExternalLink,
  ChevronDown,
  Layers,
  Sparkles
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

const navItems = [
  {
    title: "Incident Operations",
    url: "/",
    icon: Activity,
    badge: "Live",
    badgeVariant: "success" as const,
  },
  {
    title: "Resource Wizard",
    url: "/wizard",
    icon: Sliders,
    badge: null,
  },
  {
    title: "Evaluation Suite",
    url: "/eval",
    icon: CheckCircle2,
    badge: "100%",
    badgeVariant: "info" as const,
  },
  {
    title: "Safety & Governance",
    url: "/settings",
    icon: Settings,
    badge: null,
  },
]

const externalLinks = [
  {
    title: "GitHub Repository",
    url: "https://github.com/nebiyu-org/checkout-api-service",
    icon: FolderGit2,
  },
  {
    title: "SRE Runbooks",
    url: "/settings",
    icon: Layers,
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"

  return (
    <Sidebar collapsible="icon">
      {/* Sidebar Header with Workspace / Logo */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 text-white shadow-md shadow-blue-500/20">
                <Shield className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold tracking-tight text-foreground flex items-center gap-1.5">
                  PatchPilot
                  <span className="text-[9px] font-mono uppercase px-1 py-0.2 rounded bg-primary/10 text-primary border border-primary/20">
                    SRE
                  </span>
                </span>
                <span className="truncate text-xs text-muted-foreground">Autonomous On-Call</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Sidebar Content */}
      <SidebarContent>
        {/* Main Platform Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Platform</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = pathname === item.url || (item.url !== "/" && pathname.startsWith(item.url))
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                      <Link href={item.url}>
                        <item.icon className="size-4 text-muted-foreground group-hover/menu-item:text-foreground" />
                        <span>{item.title}</span>
                        {item.badge && (
                          <SidebarMenuBadge>
                            <span className="text-[10px] font-mono font-medium text-emerald-400">
                              {item.badge}
                            </span>
                          </SidebarMenuBadge>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* System & Architecture */}
        <SidebarGroup className="mt-2">
          <SidebarGroupLabel>System Telemetry</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <div className="px-2 py-2 text-xs rounded-lg bg-secondary/50 border border-border/40 text-muted-foreground space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-medium text-foreground">
                    <span className="flex items-center gap-1.5">
                      <Cpu className="size-3.5 text-blue-400" />
                      Inference Engine
                    </span>
                    <span className="font-mono text-[10px] text-primary">Gemini 2.5 Flash</span>
                  </div>
                  {!isCollapsed && (
                    <>
                      <div className="flex items-center justify-between text-[10px]">
                        <span>Invariant Gate</span>
                        <span className="text-emerald-400 font-medium">Enforced</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span>Sandbox</span>
                        <span className="text-cyan-400 font-medium">Isolated / Docker</span>
                      </div>
                    </>
                  )}
                </div>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Resources & External Links */}
        <SidebarGroup className="mt-auto">
          <SidebarGroupLabel>Connected Resources</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {externalLinks.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <a href={item.url} target={item.url.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">
                      <item.icon className="size-4 text-muted-foreground" />
                      <span>{item.title}</span>
                      {item.url.startsWith("http") && <ExternalLink className="size-3 ml-auto opacity-50" />}
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Sidebar Footer with Operator profile */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="hover:bg-sidebar-accent">
              <Avatar className="h-8 w-8 rounded-lg border border-border/80">
                <AvatarFallback className="rounded-lg bg-primary/20 text-primary text-xs font-bold">
                  NM
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium text-foreground">Nebiyu Musbah</span>
                <span className="truncate text-[11px] text-muted-foreground flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Operator On-Call
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
