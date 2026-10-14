import './globals.css';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { AppHeader } from '@/components/app-header';

export const metadata = {
  title: 'PatchPilot — Autonomous AI On-Call SRE & Remediation',
  description: 'Adversarial falsification investigation, sandbox-verified remediation, and draft PR automation platform.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary/20 selection:text-primary">
        <SidebarProvider defaultOpen={true}>
          <AppSidebar />
          <SidebarInset>
            <AppHeader />
            <div className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
              {children}
            </div>
            <footer className="border-t border-border/40 py-4 px-6 text-xs text-muted-foreground mt-auto bg-background/50">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <p>PatchPilot © 2026 Nebiyu Musbah — AI Automation Assignment for Brain3 AI</p>
                <div className="flex items-center gap-4 text-[11px]">
                  <span className="text-muted-foreground">Hard Invariant: Human-in-the-Loop Enforced</span>
                  <span className="text-primary font-mono font-medium">Multi-Model AI Engine (Gemini · OpenAI · Claude)</span>
                </div>
              </div>
            </footer>
          </SidebarInset>
        </SidebarProvider>
      </body>
    </html>
  );
}
