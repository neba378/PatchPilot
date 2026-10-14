'use client';

import { useState } from 'react';
import { Shield, Lock, Sliders, CheckCircle, AlertTriangle, RefreshCw, Zap, Save, Check } from 'lucide-react';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export default function SettingsPage() {
  const [autonomyLevel, setAutonomyLevel] = useState('draft_pr');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          Governance & Safety Policy Settings
        </h1>
        <p className="text-xs text-muted-foreground">
          Configure security invariants, protected paths, blast radius limits, and circuit breaker tripwires.
        </p>
      </div>

      {/* Hard Invariant Alert Block */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2">
            <Shield className="size-4 text-primary" />
            Enforced Structural Hard Invariant
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-1 text-xs text-muted-foreground space-y-1">
          <p>
            PatchPilot is structurally prohibited from executing <code className="text-primary font-mono font-bold bg-primary/10 px-1 py-0.5 rounded">git merge</code> or deploying code to any production environment. All automated remediation strictly terminates at a <code className="text-primary font-mono font-bold bg-primary/10 px-1 py-0.5 rounded">DRAFT Pull Request</code>.
          </p>
        </CardContent>
      </Card>

      {/* Autonomy Level Block */}
      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sliders className="size-4 text-primary" />
            Agent Autonomy Level
          </CardTitle>
          <CardDescription>
            Choose how much authority the autonomous agent has when reacting to incoming alerts.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            {[
              {
                id: 'notify',
                title: 'Notify Only',
                desc: 'Investigate root cause and alert team on Telegram. Do not provision sandbox.'
              },
              {
                id: 'suggest',
                title: 'Suggest Fix',
                desc: 'Investigate, formulate hypotheses, and propose patch text without opening PRs.'
              },
              {
                id: 'draft_pr',
                title: 'DRAFT PR (Recommended)',
                desc: 'Reproduce in sandbox, run mutation checks, author regression test, and open DRAFT PR with proof.'
              }
            ].map((opt) => (
              <div
                key={opt.id}
                onClick={() => setAutonomyLevel(opt.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all space-y-2 ${
                  autonomyLevel === opt.id
                    ? 'border-primary bg-primary/10 shadow-sm'
                    : 'border-border/60 bg-muted/20 hover:border-border hover:bg-muted/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`font-semibold text-sm ${autonomyLevel === opt.id ? 'text-primary' : 'text-foreground'}`}>
                    {opt.title}
                  </span>
                  {autonomyLevel === opt.id && <CheckCircle className="size-4 text-primary" />}
                </div>
                <p className="text-[11px] leading-relaxed text-muted-foreground">{opt.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Protected Paths Blacklist Block */}
      <Card className="border-border/80">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Lock className="size-4 text-purple-400" />
              Protected Repository Paths (Blacklist)
            </CardTitle>
            <Badge variant="destructive" className="font-mono text-[10px]">
              Access Blocked
            </Badge>
          </div>
          <CardDescription>
            The agent is strictly forbidden from reading or mutating any files matching these glob patterns.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="space-y-2 font-mono text-xs">
            {['migrations/**', 'infra/**', '.github/workflows/**', 'security/**', '.env', 'config/secrets'].map((p, i) => (
              <div key={i} className="flex items-center justify-between p-2.5 bg-muted/30 rounded-lg border border-border/50 text-foreground">
                <span className="font-mono text-[11px]">{p}</span>
                <Badge variant="destructive" className="text-[9px] uppercase font-bold px-2 py-0.2">
                  Protected
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Blast Radius & Resource Budgets Block */}
      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="size-4 text-amber-400" />
            Blast Radius & Resource Budgets
          </CardTitle>
          <CardDescription>
            Strict upper bounds preventing run-away loops or expansive edits.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-3 bg-muted/30 rounded-lg border border-border/60">
              <span className="text-muted-foreground block text-[11px]">Max Changed Files:</span>
              <span className="text-foreground text-base font-bold">3 Files</span>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg border border-border/60">
              <span className="text-muted-foreground block text-[11px]">Max Changed Lines:</span>
              <span className="text-foreground text-base font-bold">60 Lines</span>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg border border-border/60">
              <span className="text-muted-foreground block text-[11px]">Max Retries / Fix:</span>
              <span className="text-foreground text-base font-bold">2 Retries</span>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg border border-border/60">
              <span className="text-muted-foreground block text-[11px]">Free Tier RPM:</span>
              <span className="text-primary text-base font-bold">10 RPM</span>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex justify-end border-t border-border/60 pt-4">
          <Button onClick={handleSave} size="sm" className="gap-1.5 font-semibold text-xs">
            {saved ? <Check className="size-3.5 text-emerald-400" /> : <Save className="size-3.5" />}
            {saved ? 'Policy Saved Successfully!' : 'Save Policy Changes'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
