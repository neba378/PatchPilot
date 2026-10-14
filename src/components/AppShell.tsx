// src/components/AppShell.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  FolderGit2,
  Activity,
  Sliders,
  CheckCircle2,
  Settings,
  Bell,
  Search,
  Plus,
  Star,
  RefreshCw,
  Clock,
  BarChart2,
  Boxes,
  Layers,
  ChevronDown,
  Shield,
  Filter,
  Check,
  Folder
} from 'lucide-react';

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [activeScope, setActiveScope] = useState<'my' | 'all'>('my');
  const [projects, setProjects] = useState<any[]>([]);
  const [filterActive, setFilterActive] = useState(true);

  useEffect(() => {
    fetch('/api/projects')
      .then(res => res.json())
      .then(data => {
        if (data.projects) setProjects(data.projects);
      })
      .catch(() => {});
  }, [pathname]);

  const getPageTitle = () => {
    if (pathname === '/') return 'Projects & Incidents';
    if (pathname.startsWith('/incidents/')) return 'Incident Remediation';
    if (pathname === '/wizard') return 'Project Setup Wizard';
    if (pathname === '/eval') return 'Evaluation Benchmark';
    if (pathname === '/settings') return 'Governance Policy';
    return 'PatchPilot Console';
  };

  return (
    <div className="min-h-screen bg-[#f1f3f9] text-slate-800 flex flex-col md:flex-row antialiased">
      {/* ─────────────────────────────────────────────────────────────
          LEFT SIDEBAR (MATCHING USER SCREENSHOT)
          ───────────────────────────────────────────────────────────── */}
      <aside className="w-full md:w-64 bg-[#f8f9fc] border-r border-slate-200/90 flex flex-col shrink-0 min-h-screen justify-between p-4 space-y-6">
        <div className="space-y-5">
          {/* Brand Header */}
          <Link href="/" className="flex items-center gap-3 px-2 py-1 group">
            <div className="w-9 h-9 rounded-xl bg-slate-400 text-white font-extrabold flex items-center justify-center text-lg shadow-sm group-hover:bg-blue-600 transition-colors">
              P
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-1.5">
                PatchPilot
              </span>
              <span className="text-[10px] font-mono font-medium text-slate-400 uppercase tracking-wider block">
                AI On-Call SRE
              </span>
            </div>
          </Link>

          {/* Scope Switcher Pill ([My project] / [All projects]) */}
          <div className="bg-slate-200/70 p-1 rounded-xl flex items-center text-xs font-semibold text-slate-600">
            <button
              onClick={() => {
                setActiveScope('my');
                router.push('/');
              }}
              className={`flex-1 py-1.5 rounded-lg text-center transition-all ${
                activeScope === 'my'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              My project
            </button>
            <button
              onClick={() => {
                setActiveScope('all');
                router.push('/');
              }}
              className={`flex-1 py-1.5 rounded-lg text-center transition-all ${
                activeScope === 'all'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All projects
            </button>
          </div>

          {/* Core Navigation Items */}
          <div className="space-y-1 text-xs font-semibold">
            <Link
              href="/"
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-colors ${
                pathname === '/'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Activity className="w-4 h-4 text-blue-500" />
                <span>My items</span>
              </div>
              <span className="w-5 h-5 rounded-md bg-blue-600 text-white flex items-center justify-center text-[10px] shadow-sm">
                +
              </span>
            </Link>

            <div className="flex items-center justify-between px-3 py-2 rounded-xl text-slate-600 hover:bg-slate-200/50 hover:text-slate-900 cursor-pointer transition-colors">
              <div className="flex items-center gap-2.5">
                <Bell className="w-4 h-4 text-slate-400" />
                <span>Notifications</span>
              </div>
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            </div>

            <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-600 hover:bg-slate-200/50 hover:text-slate-900 cursor-pointer transition-colors">
              <Search className="w-4 h-4 text-slate-400" />
              <span>Search</span>
            </div>
          </div>

          {/* FAVORITES (Connected Projects Tree) */}
          <div className="space-y-2 pt-2 border-t border-slate-200/70">
            <div className="flex items-center justify-between px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <span>Favorites</span>
              <Link href="/wizard" title="Connect New Project" className="hover:text-blue-600">
                <Plus className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-1 text-xs">
              {projects.slice(0, 3).map(p => (
                <Link
                  key={p.id}
                  href={`/?project=${p.id}`}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-200/50 hover:text-slate-900 transition-colors truncate"
                >
                  <Folder className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{p.name}</span>
                </Link>
              ))}
              <Link
                href="/wizard"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-200/50 transition-colors"
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
                <span>New list</span>
              </Link>
            </div>
          </div>

          {/* ALL VIEWS (App Features) */}
          <div className="space-y-2 pt-2 border-t border-slate-200/70">
            <span className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              All Views
            </span>

            <div className="space-y-1 text-xs">
              <Link
                href="/"
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                  pathname === '/'
                    ? 'font-semibold text-blue-600 bg-blue-50/70'
                    : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900'
                }`}
              >
                <Folder className="w-3.5 h-3.5 text-slate-400" />
                <span>Strategy and Portfolio</span>
              </Link>

              <Link
                href="/wizard"
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                  pathname === '/wizard'
                    ? 'font-semibold text-blue-600 bg-blue-50/70'
                    : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900'
                }`}
              >
                <Sliders className="w-3.5 h-3.5 text-slate-400" />
                <span>Setup Wizard</span>
              </Link>

              <Link
                href="/eval"
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                  pathname === '/eval'
                    ? 'font-semibold text-blue-600 bg-blue-50/70'
                    : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Benchmark Harness</span>
              </Link>

              <Link
                href="/settings"
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                  pathname === '/settings'
                    ? 'font-semibold text-blue-600 bg-blue-50/70'
                    : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900'
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-slate-400" />
                <span>Governance Policy</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom Icon Dock (5 Circular Icons as shown in screenshot) */}
        <div className="pt-4 border-t border-slate-200/70">
          <div className="flex items-center justify-between px-1">
            <Link
              href="/"
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                pathname === '/'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50'
              }`}
              title="Dashboard"
            >
              <Layers className="w-4 h-4" />
            </Link>

            <Link
              href="/"
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors"
              title="Timeline"
            >
              <Clock className="w-4 h-4" />
            </Link>

            <Link
              href="/eval"
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                pathname === '/eval'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50'
              }`}
              title="Metrics & Benchmark"
            >
              <BarChart2 className="w-4 h-4" />
            </Link>

            <Link
              href="/wizard"
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                pathname === '/wizard'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50'
              }`}
              title="Connectors"
            >
              <Boxes className="w-4 h-4" />
            </Link>

            <Link
              href="/settings"
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                pathname === '/settings'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50'
              }`}
              title="Governance & Safety"
            >
              <Settings className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </aside>

      {/* ─────────────────────────────────────────────────────────────
          MAIN APP CANVAS (WHITE CONTAINER WITH HEADER & CONTENT)
          ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#ffffff] m-2 md:m-3 rounded-2xl md:rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Top Header Bar */}
        <header className="px-6 py-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Board Title & Refresh */}
          <div className="flex items-center gap-3">
            <h1 className="text-lg md:text-xl font-bold tracking-tight text-slate-800">
              {getPageTitle()}
            </h1>
            <button
              onClick={() => router.refresh()}
              className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100"
              title="Refresh Page"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Right Action Tools: Status Indicator, Blue CTA, Profile */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Live Status Pill */}
            <div className="px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200/80">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Watchdog Active</span>
            </div>

            {/* Solid Royal Blue Action Pill */}
            <Link
              href="/wizard"
              className="px-5 py-2 bg-[#1d61f2] hover:bg-[#1554d8] text-white text-xs font-bold rounded-full shadow-sm hover:shadow transition-all flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              Connect Project
            </Link>

            {/* User Profile Avatar Pill */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-rose-500 text-white font-bold text-xs flex items-center justify-center shadow-inner">
                NM
              </div>
              <span className="text-xs font-semibold text-slate-700 hidden sm:inline-block">
                Nebiyu Musbah
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>

        {/* Footer */}
        <footer className="px-6 py-3 border-t border-slate-100 text-[11px] text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2 bg-slate-50/50">
          <p>PatchPilot © 2026 Nebiyu Musbah — AI Automation Assignment for Brain3 AI</p>
          <div className="flex items-center gap-4">
            <span className="text-slate-500">Hard Invariant: Human-in-the-Loop Enforced</span>
            <span className="text-blue-600 font-mono font-medium">ai-sdk.dev Unified Multi-Provider</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
