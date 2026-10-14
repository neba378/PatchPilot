'use client';

import { useState } from 'react';
import { Shield, Check, Save } from 'lucide-react';

import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function SettingsPage() {
  const [autonomyLevel, setAutonomyLevel] = useState('draft_pr');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Settings</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Automation guardrails, protected paths, and resource limits.
          </p>
        </div>

        <Button onClick={handleSave} size="sm" className="h-8 text-xs font-semibold gap-1.5 self-start sm:self-auto">
          {saved ? <Check className="size-3.5 text-emerald-400" /> : <Save className="size-3.5" />}
          {saved ? 'Saved' : 'Save Changes'}
        </Button>
      </div>

      {/* Invariant Banner */}
      <div className="flex items-center gap-2.5 px-4 py-3 rounded-lg border border-border/70 bg-card/60 text-xs text-muted-foreground">
        <Shield className="size-4 text-primary shrink-0" />
        <span>
          <strong className="text-foreground">Policy Guardrail:</strong> PatchPilot strictly creates Draft Pull Requests. Direct merges and production deployments are permanently disabled.
        </span>
      </div>

      {/* Autonomy Level */}
      <Card className="border-border/70 bg-card/60">
        <CardHeader className="p-4 sm:p-5 pb-3">
          <CardTitle className="text-sm font-semibold text-foreground">Autonomy</CardTitle>
          <p className="text-xs text-muted-foreground">Level of authority granted to automated workflows.</p>
        </CardHeader>

        <CardContent className="p-4 sm:p-5 pt-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              {
                id: 'notify',
                title: 'Notify Only',
                desc: 'Investigate root cause and alert team. No sandboxes provisioned.'
              },
              {
                id: 'suggest',
                title: 'Suggest Fix',
                desc: 'Investigate and generate patch diffs for review without opening PRs.'
              },
              {
                id: 'draft_pr',
                title: 'Draft PR (Default)',
                desc: 'Reproduce in sandbox, run mutation checks, and open draft pull request.'
              }
            ].map((opt) => (
              <div
                key={opt.id}
                onClick={() => setAutonomyLevel(opt.id)}
                className={`p-3.5 rounded-lg border cursor-pointer transition-colors space-y-1.5 ${
                  autonomyLevel === opt.id
                    ? 'border-primary bg-primary/10'
                    : 'border-border/60 bg-muted/20 hover:border-border hover:bg-muted/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold ${autonomyLevel === opt.id ? 'text-primary' : 'text-foreground'}`}>
                    {opt.title}
                  </span>
                  {autonomyLevel === opt.id && <Check className="size-3.5 text-primary" />}
                </div>
                <p className="text-[11px] leading-relaxed text-muted-foreground">{opt.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Protected Paths */}
      <Card className="border-border/70 bg-card/60">
        <CardHeader className="p-4 sm:p-5 pb-3">
          <CardTitle className="text-sm font-semibold text-foreground">Protected Paths</CardTitle>
          <p className="text-xs text-muted-foreground">Files matching these patterns cannot be read or modified by the agent.</p>
        </CardHeader>

        <CardContent className="p-4 sm:p-5 pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              'migrations/**',
              'infra/**',
              '.github/workflows/**',
              'security/**',
              '.env*',
              'config/secrets'
            ].map((path) => (
              <div key={path} className="flex items-center justify-between px-3 py-2 rounded border border-border/50 bg-muted/20 text-xs font-mono">
                <span className="text-foreground">{path}</span>
                <span className="text-[10px] text-muted-foreground">Blocked</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Resource Limits */}
      <Card className="border-border/70 bg-card/60">
        <CardHeader className="p-4 sm:p-5 pb-3">
          <CardTitle className="text-sm font-semibold text-foreground">Resource Limits</CardTitle>
          <p className="text-xs text-muted-foreground">Execution bounds to prevent runaway loops or oversized diffs.</p>
        </CardHeader>

        <CardContent className="p-4 sm:p-5 pt-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-muted/20 rounded-lg border border-border/50">
              <span className="text-muted-foreground text-[11px] block">Max Changed Files</span>
              <span className="text-foreground text-sm font-bold font-mono">3 files</span>
            </div>
            <div className="p-3 bg-muted/20 rounded-lg border border-border/50">
              <span className="text-muted-foreground text-[11px] block">Max Changed Lines</span>
              <span className="text-foreground text-sm font-bold font-mono">60 lines</span>
            </div>
            <div className="p-3 bg-muted/20 rounded-lg border border-border/50">
              <span className="text-muted-foreground text-[11px] block">Max Retries / Fix</span>
              <span className="text-foreground text-sm font-bold font-mono">2 retries</span>
            </div>
            <div className="p-3 bg-muted/20 rounded-lg border border-border/50">
              <span className="text-muted-foreground text-[11px] block">Rate Limit</span>
              <span className="text-foreground text-sm font-bold font-mono">10 RPM</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
