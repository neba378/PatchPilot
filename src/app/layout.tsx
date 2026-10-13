// src/app/layout.tsx
import './globals.css';
import Link from 'next/link';
import { Shield, Activity, Terminal, Settings, CheckCircle2, Sliders, ExternalLink } from 'lucide-react';

export const metadata = {
  title: 'PatchPilot — AI On-Call DevOps & Remediation Agent',
  description: 'Autonomous incident response, falsification investigation, and sandbox-verified remediation platform.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col">
        {/* Top Navigation */}
        <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <Link href="/" className="flex items-center space-x-3 group">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-bold text-lg tracking-tight text-white flex items-center gap-1.5">
                    PatchPilot
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      AI On-Call SRE
                    </span>
                  </span>
                  <p className="text-[11px] text-slate-400">Autonomous Remediation Platform</p>
                </div>
              </Link>

              <nav className="hidden md:flex items-center space-x-1 pl-4 border-l border-slate-800">
                <Link
                  href="/"
                  className="px-3 py-1.5 rounded-md text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/50 flex items-center gap-2 transition-colors"
                >
                  <Activity className="w-4 h-4 text-blue-400" />
                  Live Incidents
                </Link>
                <Link
                  href="/wizard"
                  className="px-3 py-1.5 rounded-md text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/50 flex items-center gap-2 transition-colors"
                >
                  <Sliders className="w-4 h-4 text-cyan-400" />
                  Setup Wizard
                </Link>
                <Link
                  href="/eval"
                  className="px-3 py-1.5 rounded-md text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/50 flex items-center gap-2 transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Evaluation Benchmark
                </Link>
                <Link
                  href="/settings"
                  className="px-3 py-1.5 rounded-md text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/50 flex items-center gap-2 transition-colors"
                >
                  <Settings className="w-4 h-4 text-purple-400" />
                  Governance Policy
                </Link>
              </nav>
            </div>

            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Proactive Watchdog Active</span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-800/60 py-6 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p>PatchPilot © 2026 Nebiyu Musbah — AI Automation Assignment for Brain3 AI</p>
            <div className="flex items-center gap-4">
              <span className="text-slate-400">Hard Invariant: Human-in-the-Loop Enforced</span>
              <span className="text-blue-400 font-mono">Gemini 2.5 Flash Free Tier</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
