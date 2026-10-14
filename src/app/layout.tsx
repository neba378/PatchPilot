// src/app/layout.tsx
import './globals.css';
import AppShell from '@/components/AppShell';

export const metadata = {
  title: 'PatchPilot — AI On-Call DevOps & Remediation Agent',
  description: 'Autonomous incident response, falsification investigation, and sandbox-verified remediation platform.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#f1f3f9] text-slate-800">
        <AppShell>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
