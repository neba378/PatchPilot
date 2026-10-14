'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Palette,
  Check,
  CheckCircle2,
  AlertTriangle,
  GitPullRequest,
  Shield,
  FileCode,
  ArrowRight,
  Terminal,
  Layers,
  Sparkles,
  ExternalLink,
  Sliders,
  Type
} from 'lucide-react';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

interface PaletteOption {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  badge: string;
  bgHex: string;
  cardHex: string;
  primaryHex: string;
  accentHex: string;
  successHex: string;
  warningHex: string;
  destructiveHex: string;
  borderHex: string;
  characteristics: string[];
}

const palettes: PaletteOption[] = [
  {
    id: 'obsidian',
    name: 'Obsidian & Electric Cobalt',
    subtitle: 'High-Tech SRE Cockpit (Default)',
    description: 'Deep navy-obsidian canvas paired with electric cobalt and vibrant cyan accents. Calming dark mode with ultra-crisp telemetry contrast.',
    badge: 'Recommended',
    bgHex: '#080D1A',
    cardHex: '#0D1527',
    primaryHex: '#3B82F6',
    accentHex: '#06B6D4',
    successHex: '#10B981',
    warningHex: '#F59E0B',
    destructiveHex: '#EF4444',
    borderHex: '#1E293B',
    characteristics: ['WCAG AAA Contrast', 'Datadog / Cloudflare Aesthetic', 'Glanceable Status Cues']
  },
  {
    id: 'zinc',
    name: 'Zinc & Indigo Linear',
    subtitle: 'Modern Minimalist Developer Tooling',
    description: 'Neutral deep zinc canvas with refined indigo and violet accents, mirroring high-end modern developer tools like Linear and Raycast.',
    badge: 'Modernist',
    bgHex: '#09090B',
    cardHex: '#121215',
    primaryHex: '#6366F1',
    accentHex: '#8B5CF6',
    successHex: '#22C55E',
    warningHex: '#EAB308',
    destructiveHex: '#F43F5E',
    borderHex: '#27272A',
    characteristics: ['Clean Monochrome Surfaces', 'Linear / Vercel Vibe', 'Subtle Indigo Focus']
  },
  {
    id: 'emerald',
    name: 'Cyber Emerald & Mission Control',
    subtitle: 'Classic Observability & SRE Terminal',
    description: 'Deep carbon background with phosphor emerald, teal, and mint highlights, inspired by high-reliability NOC displays and matrix terminals.',
    badge: 'NOC / Cyber',
    bgHex: '#040D09',
    cardHex: '#081710',
    primaryHex: '#10B981',
    accentHex: '#14B8A6',
    successHex: '#059669',
    warningHex: '#F59E0B',
    destructiveHex: '#E11D48',
    borderHex: '#133022',
    characteristics: ['Phosphor Green Terminals', 'High-Alert SRE Signals', 'Low Eye Fatigue']
  },
  {
    id: 'graphite',
    name: 'Graphite & Safety Amber',
    subtitle: 'Industrial Reliability & Incident Command',
    description: 'Warm slate-graphite surfaces with safety amber and high-visibility status cues, emphasizing human-in-the-loop safety and governance.',
    badge: 'Industrial SRE',
    bgHex: '#0F172A',
    cardHex: '#1E293B',
    primaryHex: '#F59E0B',
    accentHex: '#38BDF8',
    successHex: '#34D399',
    warningHex: '#FB923C',
    destructiveHex: '#F87171',
    borderHex: '#334155',
    characteristics: ['High-Visibility Amber', 'War-Room Incident Command', 'Maximum Warning Salience']
  }
];

export default function DesignSystemPage() {
  const [activeTheme, setActiveTheme] = useState<string>('obsidian');

  useEffect(() => {
    const saved = localStorage.getItem('patchpilot:theme') || 'obsidian';
    setActiveTheme(saved);
    document.documentElement.setAttribute('data-theme', saved);
  }, []);

  const handleSelectTheme = (themeId: string) => {
    setActiveTheme(themeId);
    document.documentElement.setAttribute('data-theme', themeId);
    localStorage.setItem('patchpilot:theme', themeId);
  };

  const currentPalette = palettes.find(p => p.id === activeTheme) || palettes[0];

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl border border-border/80 bg-card p-6 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Palette className="size-6 text-primary" />
              Design System & Palette Selector
            </h1>
            <Badge variant="outline" className="font-mono text-[10px] text-primary border-primary/30">
              Interactive Preview
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Research-curated color palettes and typography scales fit for autonomous SRE operations. Click any palette to apply it live across the entire application.
          </p>
        </div>

        <Button asChild size="sm" variant="outline" className="text-xs gap-1.5 self-start md:self-auto">
          <Link href="/">
            <ArrowRight className="size-3.5" />
            Inspect on Live Dashboard
          </Link>
        </Button>
      </div>

      {/* 4 Palette Selection Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Layers className="size-4" />
            1. Select Color Palette to Preview Live
          </h2>
          <span className="text-xs font-mono text-primary font-medium">
            Active Theme: <span className="underline uppercase font-bold">{currentPalette.name}</span>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {palettes.map((p) => {
            const isSelected = activeTheme === p.id;
            return (
              <Card
                key={p.id}
                onClick={() => handleSelectTheme(p.id)}
                className={`cursor-pointer transition-all border-2 relative overflow-hidden ${
                  isSelected
                    ? 'border-primary bg-card shadow-lg ring-1 ring-primary/40'
                    : 'border-border/60 hover:border-border hover:bg-muted/20'
                }`}
              >
                {/* Top Swatch Stripe */}
                <div className="h-2.5 w-full flex">
                  <div className="flex-1" style={{ backgroundColor: p.bgHex }} />
                  <div className="flex-1" style={{ backgroundColor: p.cardHex }} />
                  <div className="flex-1" style={{ backgroundColor: p.primaryHex }} />
                  <div className="flex-1" style={{ backgroundColor: p.accentHex }} />
                  <div className="flex-1" style={{ backgroundColor: p.successHex }} />
                  <div className="flex-1" style={{ backgroundColor: p.warningHex }} />
                  <div className="flex-1" style={{ backgroundColor: p.destructiveHex }} />
                </div>

                <CardHeader className="p-5 pb-3">
                  <div className="flex items-center justify-between">
                    <Badge variant={isSelected ? "default" : "outline"} className="text-[10px] font-mono">
                      {p.badge}
                    </Badge>
                    <div
                      className={`size-5 rounded-full flex items-center justify-center border transition-all ${
                        isSelected
                          ? 'bg-primary border-primary text-primary-foreground'
                          : 'border-border/60 bg-muted/40'
                      }`}
                    >
                      {isSelected && <Check className="size-3 stroke-[3]" />}
                    </div>
                  </div>

                  <CardTitle className="text-base text-foreground mt-2">{p.name}</CardTitle>
                  <CardDescription className="text-xs font-medium text-muted-foreground">
                    {p.subtitle}
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-5 pt-0 space-y-3">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {p.description}
                  </p>

                  {/* Swatches Visualizer */}
                  <div className="flex items-center gap-1.5 pt-2">
                    {[
                      { label: 'BG', hex: p.bgHex },
                      { label: 'Card', hex: p.cardHex },
                      { label: 'Primary', hex: p.primaryHex },
                      { label: 'Accent', hex: p.accentHex },
                      { label: 'Success', hex: p.successHex },
                      { label: 'Warn', hex: p.warningHex },
                      { label: 'Alert', hex: p.destructiveHex }
                    ].map((s) => (
                      <div key={s.label} className="flex-1 text-center group">
                        <div
                          className="h-7 w-full rounded border border-border/40 shadow-inner transition-transform group-hover:scale-105"
                          style={{ backgroundColor: s.hex }}
                          title={`${s.label}: ${s.hex}`}
                        />
                        <span className="text-[9px] font-mono text-muted-foreground block mt-1">
                          {s.label}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {p.characteristics.map((c) => (
                      <span key={c} className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted/40 text-muted-foreground border border-border/40">
                        {c}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Live Component Testing Sandbox */}
      <div className="space-y-4 pt-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Sparkles className="size-4 text-primary" />
          2. Live Component Verification in Active Theme
        </h2>

        {/* Live Preview Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Sample KPI Card */}
          <Card className="border-border/80">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Mean Time to Remediate
              </CardTitle>
              <div className="p-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <CheckCircle2 className="size-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono text-emerald-400">3.4m</div>
              <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                <span className="text-emerald-400 font-semibold font-mono">-99.8%</span>
                <span>vs 18.4d industry avg</span>
              </p>
            </CardContent>
          </Card>

          {/* Sample Interactive Buttons */}
          <Card className="border-border/80 p-5 space-y-3 flex flex-col justify-center">
            <span className="text-xs font-semibold text-muted-foreground block">Button Styles</span>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" className="text-xs font-medium">Primary CTA</Button>
              <Button size="sm" variant="outline" className="text-xs font-medium">Secondary Outline</Button>
              <Button size="sm" variant="destructive" className="text-xs font-medium">Critical Action</Button>
            </div>
          </Card>

          {/* Sample Status Badges */}
          <Card className="border-border/80 p-5 space-y-3 flex flex-col justify-center">
            <span className="text-xs font-semibold text-muted-foreground block">Semantic Status Badges</span>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="destructive" className="text-[10px] uppercase font-bold">Critical</Badge>
              <Badge variant="info" className="gap-1 font-medium">
                <span className="size-1.5 rounded-full bg-blue-400 animate-pulse" />
                Awaiting Review
              </Badge>
              <Badge variant="success" className="gap-1 font-medium">
                <CheckCircle2 className="size-3" />
                Sandbox Proven
              </Badge>
            </div>
          </Card>
        </div>

        {/* Sample Code Diff Viewer */}
        <Card className="border-border/80">
          <CardHeader className="p-4 border-b border-border/60 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-semibold flex items-center gap-2">
              <FileCode className="size-4 text-cyan-400" />
              Unified Patch Diff Contrast Check
            </CardTitle>
            <span className="text-[11px] font-mono text-muted-foreground">src/controllers/paymentController.ts</span>
          </CardHeader>
          <CardContent className="p-4">
            <div className="bg-black/80 rounded-lg p-3 border border-border/60 font-mono text-xs space-y-0.5">
              <div className="diff-ctx px-2 py-0.5 rounded">@@ -7,7 +7,7 @@ export async function handleCheckout(req, res) &#123;</div>
              <div className="diff-del px-2 py-0.5 rounded">-   const billingZip = metadata.billingDetails.postalCode;</div>
              <div className="diff-add px-2 py-0.5 rounded">+   const billingZip = metadata?.billingDetails?.postalCode || null;</div>
              <div className="diff-ctx px-2 py-0.5 rounded">    return res.json(&#123; success: true, billingZip &#125;);</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Typography & Spacing Specimen Block */}
      <div className="space-y-4 pt-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Type className="size-4" />
          3. Typography & Spacing Hierarchy
        </h2>

        <Card className="border-border/80">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[140px]">Scale</TableHead>
                  <TableHead className="w-[140px]">Size / Weight</TableHead>
                  <TableHead>Sample Rendering</TableHead>
                  <TableHead className="w-[140px] text-right">WCAG AAA</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-mono text-xs font-bold text-primary">Page Title</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">24px / Bold (700)</TableCell>
                  <TableCell className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
                    Incident Operations Center
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="success" className="text-[10px]">14.2:1 PASS</Badge>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-xs font-bold text-primary">KPI Metric</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">24px / Mono Bold</TableCell>
                  <TableCell className="text-2xl font-bold font-mono text-foreground">
                    3.4m MTTR <span className="text-xs text-emerald-400 font-normal">(-99.8%)</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="success" className="text-[10px]">13.8:1 PASS</Badge>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-xs font-bold text-primary">Body Medium</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">14px / Medium (500)</TableCell>
                  <TableCell className="text-sm font-medium text-foreground">
                    Adversarial root cause falsification and mutation testing in isolated Docker sandbox.
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="success" className="text-[10px]">12.5:1 PASS</Badge>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-xs font-bold text-primary">Telemetry Mono</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">12px / Monospace</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    commit: <span className="text-foreground">a7b31e9</span> | fp: paymentcontroller.ts:handlecheckout:typeerror
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="success" className="text-[10px]">8.9:1 PASS</Badge>
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
