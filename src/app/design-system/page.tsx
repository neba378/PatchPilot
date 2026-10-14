'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Palette,
  Check,
  CheckCircle2,
  FileCode,
  ArrowRight,
  Sparkles,
  Type
} from 'lucide-react';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

interface PaletteOption {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  bgHex: string;
  cardHex: string;
  primaryHex: string;
  accentHex: string;
  borderHex: string;
}

const palettes: PaletteOption[] = [
  {
    id: 'obsidian',
    name: 'Cobalt Slate (Default)',
    subtitle: 'High-contrast engineering console',
    description: 'Deep navy-slate canvas with electric cobalt accents. Optimized for long sessions and rapid scanability.',
    bgHex: '#0a0d14',
    cardHex: '#111622',
    primaryHex: '#3b82f6',
    accentHex: '#60a5fa',
    borderHex: '#202738'
  },
  {
    id: 'zinc',
    name: 'Zinc Indigo',
    subtitle: 'Minimalist developer tooling',
    description: 'Neutral monochrome surfaces with refined indigo accents. Inspired by modern developer platforms.',
    bgHex: '#09090b',
    cardHex: '#141416',
    primaryHex: '#6366f1',
    accentHex: '#818cf8',
    borderHex: '#27272a'
  },
  {
    id: 'emerald',
    name: 'Cyber Emerald',
    subtitle: 'Classic observability matrix',
    description: 'Deep carbon background with phosphor emerald accents. Crisp contrast for telemetry and logs.',
    bgHex: '#050d09',
    cardHex: '#0d1913',
    primaryHex: '#10b981',
    accentHex: '#34d399',
    borderHex: '#162a20'
  },
  {
    id: 'graphite',
    name: 'Graphite Amber',
    subtitle: 'Incident command & governance',
    description: 'Slate-graphite canvas with amber highlights, designed for high-salience alert awareness.',
    bgHex: '#0b0f19',
    cardHex: '#111827',
    primaryHex: '#f59e0b',
    accentHex: '#fbbf24',
    borderHex: '#222e42'
  }
];

export default function DesignSystemPage() {
  const [activeTheme, setActiveTheme] = useState<string>('obsidian');

  useEffect(() => {
    const urlTheme = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('theme') : null;
    const saved = urlTheme || (typeof window !== 'undefined' ? localStorage.getItem('patchpilot:theme') : null) || 'obsidian';
    setActiveTheme(saved);
    document.documentElement.setAttribute('data-theme', saved);
    if (urlTheme && typeof window !== 'undefined') {
      localStorage.setItem('patchpilot:theme', urlTheme);
    }
  }, []);

  const handleSelectTheme = (themeId: string) => {
    setActiveTheme(themeId);
    document.documentElement.setAttribute('data-theme', themeId);
    localStorage.setItem('patchpilot:theme', themeId);
  };

  const currentPalette = palettes.find(p => p.id === activeTheme) || palettes[0];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Design System</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Typography, spacing tokens, and color themes.
          </p>
        </div>

        <Button asChild size="sm" variant="outline" className="h-8 text-xs gap-1.5 self-start sm:self-auto">
          <Link href="/">
            <span>Dashboard</span>
            <ArrowRight className="size-3" />
          </Link>
        </Button>
      </div>

      {/* Palette Selection Grid */}
      <div className="space-y-3">
        <span className="text-xs font-semibold text-foreground">Theme Selection</span>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {palettes.map((p) => {
            const isSelected = activeTheme === p.id;
            return (
              <Card
                key={p.id}
                onClick={() => handleSelectTheme(p.id)}
                className={`cursor-pointer transition-all border ${
                  isSelected
                    ? 'border-primary bg-card/80 shadow-sm'
                    : 'border-border/60 bg-card/40 hover:border-border hover:bg-muted/20'
                }`}
              >
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-semibold text-foreground">{p.name}</CardTitle>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{p.subtitle}</p>
                    </div>
                    <div
                      className={`size-4 rounded-full flex items-center justify-center border transition-all ${
                        isSelected
                          ? 'bg-primary border-primary text-primary-foreground'
                          : 'border-border/60 bg-muted/40'
                      }`}
                    >
                      {isSelected && <Check className="size-2.5 stroke-[3]" />}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-4 pt-1 space-y-2.5">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {p.description}
                  </p>

                  <div className="flex items-center gap-1.5 pt-1">
                    {[
                      { label: 'BG', hex: p.bgHex },
                      { label: 'Card', hex: p.cardHex },
                      { label: 'Accent', hex: p.primaryHex },
                      { label: 'Border', hex: p.borderHex }
                    ].map((s) => (
                      <div key={s.label} className="flex-1 text-center">
                        <div
                          className="h-6 w-full rounded border border-border/40 shadow-inner"
                          style={{ backgroundColor: s.hex }}
                        />
                        <span className="text-[10px] font-mono text-muted-foreground block mt-1">
                          {s.hex}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Component Verification */}
      <div className="space-y-3 pt-2">
        <span className="text-xs font-semibold text-foreground">Components Preview</span>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Card */}
          <Card className="border-border/70 bg-card/60 p-4 space-y-2">
            <span className="text-xs font-medium text-muted-foreground block">Metric Card</span>
            <div className="text-2xl font-bold font-mono text-foreground">3.4m</div>
            <p className="text-[11px] text-muted-foreground">Average mean time to fix</p>
          </Card>

          {/* Buttons */}
          <Card className="border-border/70 bg-card/60 p-4 space-y-2 flex flex-col justify-center">
            <span className="text-xs font-medium text-muted-foreground block">Buttons</span>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" className="h-7 text-xs">Primary</Button>
              <Button size="sm" variant="outline" className="h-7 text-xs">Secondary</Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs">Ghost</Button>
            </div>
          </Card>

          {/* Badges */}
          <Card className="border-border/70 bg-card/60 p-4 space-y-2 flex flex-col justify-center">
            <span className="text-xs font-medium text-muted-foreground block">Status Indicators</span>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="success">Resolved</Badge>
              <Badge variant="warning">Needs Review</Badge>
              <Badge variant="destructive">Critical</Badge>
              <Badge variant="secondary">Abstained</Badge>
            </div>
          </Card>
        </div>

        {/* Diff Preview */}
        <Card className="border-border/70 bg-card/60">
          <div className="p-3 border-b border-border/60 flex items-center justify-between text-xs font-mono">
            <span className="text-foreground">src/controllers/paymentController.ts</span>
            <span className="text-muted-foreground">+1 -1</span>
          </div>
          <CardContent className="p-3">
            <div className="bg-black/60 rounded p-2.5 font-mono text-xs space-y-0.5">
              <div className="diff-ctx px-2 py-0.5 rounded">@@ -7,7 +7,7 @@ export async function handleCheckout(req, res) &#123;</div>
              <div className="diff-del px-2 py-0.5 rounded">-   const billingZip = metadata.billingDetails.postalCode;</div>
              <div className="diff-add px-2 py-0.5 rounded">+   const billingZip = metadata?.billingDetails?.postalCode || null;</div>
              <div className="diff-ctx px-2 py-0.5 rounded">    return res.json(&#123; success: true, billingZip &#125;);</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Typography Scale */}
      <div className="space-y-3 pt-2">
        <span className="text-xs font-semibold text-foreground">Typography Scale</span>

        <Card className="border-border/70 bg-card/60">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border/60 hover:bg-transparent">
                  <TableHead className="w-[120px]">Role</TableHead>
                  <TableHead className="w-[140px]">Size / Weight</TableHead>
                  <TableHead>Sample</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="border-border/50">
                  <TableCell className="font-mono text-xs text-primary font-medium">Page Title</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">20px / Bold (700)</TableCell>
                  <TableCell className="text-xl font-bold tracking-tight text-foreground">
                    Incidents
                  </TableCell>
                </TableRow>
                <TableRow className="border-border/50">
                  <TableCell className="font-mono text-xs text-primary font-medium">Metric</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">24px / Mono Bold</TableCell>
                  <TableCell className="text-2xl font-bold font-mono text-foreground">
                    100% Pass Rate
                  </TableCell>
                </TableRow>
                <TableRow className="border-border/50">
                  <TableCell className="font-mono text-xs text-primary font-medium">Body</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">13px / Regular (400)</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    Automated triage, root cause analysis, and draft PRs.
                  </TableCell>
                </TableRow>
                <TableRow className="border-border/50">
                  <TableCell className="font-mono text-xs text-primary font-medium">Telemetry</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">11px / Monospace</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    src/controllers/paymentController.ts:10
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
