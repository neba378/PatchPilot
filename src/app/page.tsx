'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  CheckCircle,
  GitPullRequest,
  Clock,
  ArrowRight,
  RefreshCw,
  Zap,
  Filter,
  Terminal,
  Activity,
  ShieldAlert,
  Server,
  Search,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Cpu,
  Layers,
  Sparkles
} from 'lucide-react';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from '@/components/ui/table';

interface Incident {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'detected' | 'investigating' | 'awaiting_approval' | 'fixing' | 'validating' | 'pr_open' | 'verified_resolved' | 'abstained' | 'fix_failed';
  source: string;
  occurrences: number;
  commitSha?: string;
  environment?: string;
  detectedAt: string;
  fingerprint?: string;
}

interface DashboardMetrics {
  totalIncidents: number;
  awaitingReview: number;
  prsOpen: number;
  verifiedResolved: number;
  fixPassRate: number;
  meanTimeToResolveMinutes: number;
}

export default function DashboardPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalIncidents: 0,
    awaitingReview: 0,
    prsOpen: 0,
    verifiedResolved: 0,
    fixPassRate: 100,
    meanTimeToResolveMinutes: 3.4
  });
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [simulating, setSimulating] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      const [incRes, statsRes] = await Promise.all([
        fetch('/api/incidents'),
        fetch('/api/stats')
      ]);
      const incData = await incRes.json();
      const statsData = await statsRes.json();

      if (incData.incidents) setIncidents(incData.incidents);
      if (statsData.metrics) setMetrics(statsData.metrics);
    } catch (e) {
      console.error('Failed to fetch dashboard data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 3000);
    return () => clearInterval(interval);
  }, []);

  const triggerSimulation = async (type: 'sentry' | 'actions' | 'generic') => {
    setSimulating(type);
    try {
      await fetch(`/api/webhooks/${type === 'actions' ? 'github-actions' : type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          type === 'sentry'
            ? {
                event: {
                  event_id: `evt_${Date.now()}`,
                  title: "TypeError: Cannot read properties of undefined (reading 'billingDetails')",
                  metadata: { type: 'TypeError', value: "Cannot read properties of undefined (reading 'billingDetails')" },
                  environment: 'production',
                  release: 'checkout-service@a7b31e9',
                  entries: [
                    {
                      type: 'exception',
                      data: {
                        values: [{
                          type: 'TypeError',
                          value: "Cannot read properties of undefined (reading 'billingDetails')",
                          stacktrace: {
                            frames: [{ filename: 'src/controllers/paymentController.ts', lineno: 10, function: 'handleCheckout', in_app: true }]
                          }
                        }]
                      }
                    }
                  ]
                }
              }
            : type === 'actions'
            ? {
                workflow_run: {
                  id: Math.floor(1000 + Math.random() * 9000),
                  name: 'CI Test Suite',
                  head_branch: 'main',
                  head_sha: 'a7b31e9',
                  conclusion: 'failure',
                  display_title: 'feat: add customer metadata payload parsing in checkout'
                },
                repository: { full_name: 'nebiyu-org/checkout-api-service' },
                logExcerpt: "FAIL src/controllers/__tests__/checkout.test.ts\nTypeError: Cannot read properties of undefined (reading 'billingDetails')\n  at handleCheckout (src/controllers/paymentController.ts:10:33)"
              }
            : {
                title: 'High memory saturation in cache worker',
                type: 'MemoryThresholdException',
                file: 'src/sessionCache.ts',
                line: 14,
                environment: 'production'
              }
        )
      });
      await fetchDashboardData();
    } catch (e) {
      console.error('Simulation error:', e);
    } finally {
      setTimeout(() => setSimulating(null), 800);
    }
  };

  const filteredIncidents = useMemo(() => {
    return incidents.filter(inc => {
      // Filter by category
      if (activeFilter === 'AWAITING' && inc.status !== 'awaiting_approval') return false;
      if (activeFilter === 'FIXING' && inc.status !== 'fixing' && inc.status !== 'validating') return false;
      if (activeFilter === 'PR_OPEN' && inc.status !== 'pr_open') return false;
      if (activeFilter === 'RESOLVED' && inc.status !== 'verified_resolved') return false;
      if (activeFilter === 'ABSTAINED' && inc.status !== 'abstained') return false;

      // Filter by search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = inc.title.toLowerCase().includes(query);
        const matchesId = inc.id.toLowerCase().includes(query);
        const matchesSource = inc.source.toLowerCase().includes(query);
        const matchesCommit = inc.commitSha?.toLowerCase().includes(query);
        return matchesTitle || matchesId || matchesSource || matchesCommit;
      }

      return true;
    });
  }, [incidents, activeFilter, searchQuery]);

  const filterCounts = useMemo(() => {
    return {
      ALL: incidents.length,
      AWAITING: incidents.filter(i => i.status === 'awaiting_approval').length,
      FIXING: incidents.filter(i => i.status === 'fixing' || i.status === 'validating').length,
      PR_OPEN: incidents.filter(i => i.status === 'pr_open').length,
      RESOLVED: incidents.filter(i => i.status === 'verified_resolved').length,
      ABSTAINED: incidents.filter(i => i.status === 'abstained').length,
    };
  }, [incidents]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'awaiting_approval':
        return (
          <Badge variant="info" className="gap-1.5 font-medium">
            <span className="size-1.5 rounded-full bg-blue-400 animate-pulse" />
            Awaiting Review
          </Badge>
        );
      case 'fixing':
      case 'validating':
        return (
          <Badge variant="warning" className="gap-1.5 font-medium">
            <span className="size-1.5 rounded-full bg-amber-400 animate-pulse" />
            Sandbox Fixing
          </Badge>
        );
      case 'pr_open':
        return (
          <Badge variant="default" className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 gap-1.5 font-medium">
            <GitPullRequest className="size-3" />
            Draft PR Open
          </Badge>
        );
      case 'verified_resolved':
        return (
          <Badge variant="success" className="gap-1.5 font-medium">
            <CheckCircle2 className="size-3 text-emerald-400" />
            Verified Resolved
          </Badge>
        );
      case 'abstained':
        return (
          <Badge variant="purple" className="gap-1.5 font-medium">
            Abstained (Policy)
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="destructive" className="uppercase text-[10px] tracking-wider font-bold">Critical</Badge>;
      case 'high':
        return <Badge variant="warning" className="uppercase text-[10px] tracking-wider font-bold">High</Badge>;
      default:
        return <Badge variant="secondary" className="uppercase text-[10px] tracking-wider font-bold">{severity}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions Block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl border border-border/80 bg-card p-5 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              Incident Operations Center
            </h1>
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-[10px] font-mono">
              Real-time Ingestion
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Adversarial root cause falsification, mutation test validation in isolated Docker sandbox, and automated draft PRs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => triggerSimulation('sentry')}
            disabled={Boolean(simulating)}
            className="text-xs border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 hover:text-rose-200"
          >
            <ShieldAlert className="size-3.5 mr-1.5 text-rose-400" />
            {simulating === 'sentry' ? 'Ingesting...' : 'Simulate Sentry (500)'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => triggerSimulation('actions')}
            disabled={Boolean(simulating)}
            className="text-xs border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 hover:text-amber-200"
          >
            <Server className="size-3.5 mr-1.5 text-amber-400" />
            {simulating === 'actions' ? 'Triggering...' : 'Simulate CI Failure'}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={fetchDashboardData}
            title="Refresh incident telemetry"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* KPI Stats Cards Block */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Detected */}
        <Card className="hover:border-border transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Total Detected
            </CardTitle>
            <div className="p-1.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <AlertTriangle className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
              {metrics.totalIncidents}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <Layers className="size-3 text-primary" />
              Cross-tool correlated telemetry
            </p>
          </CardContent>
        </Card>

        {/* Awaiting Review */}
        <Card className="hover:border-border transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Awaiting Approval
            </CardTitle>
            <div className="p-1.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Clock className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-blue-400">
              {metrics.awaitingReview}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-blue-400" />
              Human-in-the-loop review gate
            </p>
          </CardContent>
        </Card>

        {/* Draft PRs Proven */}
        <Card className="hover:border-border transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Draft PRs Proven
            </CardTitle>
            <div className="p-1.5 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <GitPullRequest className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-cyan-400">
              {metrics.prsOpen}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <CheckCircle2 className="size-3 text-emerald-400" />
              Mutation test verified in sandbox
            </p>
          </CardContent>
        </Card>

        {/* Mean Time To Fix */}
        <Card className="hover:border-border transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Mean Time to Fix
            </CardTitle>
            <div className="p-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <CheckCircle className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-emerald-400">
              {metrics.meanTimeToResolveMinutes}m
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <span className="text-emerald-400 font-medium font-mono">-99.8%</span>
              <span>vs 18.4d industry avg</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Incident Data Table Block */}
      <Card className="border border-border/80">
        <CardHeader className="p-4 sm:p-5 border-b border-border/60">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search incidents, commit, source..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs bg-muted/40"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              {[
                { key: 'ALL', label: 'All Incidents' },
                { key: 'AWAITING', label: 'Awaiting Review' },
                { key: 'FIXING', label: 'Sandbox Fixing' },
                { key: 'PR_OPEN', label: 'Draft PR Open' },
                { key: 'RESOLVED', label: 'Resolved' },
                { key: 'ABSTAINED', label: 'Abstained' },
              ].map((f) => {
                const count = filterCounts[f.key as keyof typeof filterCounts] || 0;
                const isSelected = activeFilter === f.key;
                return (
                  <Button
                    key={f.key}
                    variant={isSelected ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setActiveFilter(f.key)}
                    className={`h-8 text-xs font-medium rounded-lg px-2.5 ${
                      isSelected
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    }`}
                  >
                    <span>{f.label}</span>
                    <span className={`ml-1.5 rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                      isSelected ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}>
                      {count}
                    </span>
                  </Button>
                );
              })}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="py-20 text-center font-mono text-xs text-muted-foreground">
              Ingesting real-time incident feed...
            </div>
          ) : filteredIncidents.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="mx-auto size-12 rounded-full bg-muted/50 border border-border flex items-center justify-center text-muted-foreground">
                <Filter className="size-5" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">No incidents match your filter</p>
                <p className="text-xs text-muted-foreground">
                  Try clearing the search query or trigger a live simulation using the buttons above.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setActiveFilter('ALL'); setSearchQuery(''); }}
                className="text-xs"
              >
                Reset Filters
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[110px]">Incident ID</TableHead>
                  <TableHead className="min-w-[280px]">Summary & Root Cause</TableHead>
                  <TableHead className="w-[140px]">Source & Telemetry</TableHead>
                  <TableHead className="w-[140px]">Environment / Ref</TableHead>
                  <TableHead className="w-[150px]">Current State</TableHead>
                  <TableHead className="w-[120px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIncidents.map((inc) => (
                  <TableRow key={inc.id} className="group hover:bg-muted/30">
                    {/* ID & Severity */}
                    <TableCell className="font-mono text-xs font-semibold">
                      <div className="space-y-1">
                        <span className="text-foreground">{inc.id}</span>
                        <div>{getSeverityBadge(inc.severity)}</div>
                      </div>
                    </TableCell>

                    {/* Summary */}
                    <TableCell>
                      <div className="space-y-1">
                        <Link
                          href={`/incidents/${inc.id}`}
                          className="font-semibold text-sm text-foreground hover:text-primary transition-colors flex items-center gap-1.5"
                        >
                          <span className="line-clamp-1">{inc.title}</span>
                          <ArrowRight className="size-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-primary shrink-0" />
                        </Link>
                        {inc.fingerprint && (
                          <p className="text-[11px] font-mono text-muted-foreground truncate max-w-md">
                            fp: {inc.fingerprint.slice(0, 24)}...
                          </p>
                        )}
                      </div>
                    </TableCell>

                    {/* Source & Correlated Count */}
                    <TableCell>
                      <div className="flex flex-col gap-1 text-xs">
                        <Badge variant="outline" className="font-mono text-[10px] w-fit border-border bg-muted/40">
                          {inc.source}
                        </Badge>
                        {inc.occurrences > 1 && (
                          <span className="text-[10px] font-mono text-primary font-semibold">
                            {inc.occurrences}x correlated
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Environment & Commit */}
                    <TableCell>
                      <div className="space-y-0.5 text-xs font-mono">
                        <div className="text-muted-foreground">
                          Commit: <span className="text-foreground">{inc.commitSha ? inc.commitSha.slice(0, 7) : 'HEAD'}</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {inc.environment || 'production'}
                        </div>
                        <div className="text-[10px] text-muted-foreground/70">
                          {new Date(inc.detectedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                      </div>
                    </TableCell>

                    {/* Status Badge */}
                    <TableCell>
                      {getStatusBadge(inc.status)}
                    </TableCell>

                    {/* Action Button */}
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant={inc.status === 'awaiting_approval' ? "default" : "outline"} className="h-8 text-xs font-medium">
                        <Link href={`/incidents/${inc.id}`}>
                          <span>{inc.status === 'awaiting_approval' ? 'Review & Fix' : 'Inspect'}</span>
                          <ChevronRight className="size-3.5 ml-1" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>

        <CardFooter className="p-3 sm:p-4 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
          <span>Showing {filteredIncidents.length} of {incidents.length} recorded incidents</span>
          <span className="font-mono text-[11px]">Auto-refresh: 3s active</span>
        </CardFooter>
      </Card>
    </div>
  );
}
