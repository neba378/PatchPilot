'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  CheckCircle,
  GitPullRequest,
  Clock,
  RefreshCw,
  Search,
  CheckCircle2,
  ChevronRight,
  ShieldAlert,
  Server
} from 'lucide-react';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
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

function timeAgo(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diff / (1000 * 60));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
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

  const triggerSimulation = async (type: 'sentry' | 'actions') => {
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
            : {
                workflow_run: {
                  id: Math.floor(1000 + Math.random() * 9000),
                  name: 'CI Test Suite',
                  head_branch: 'main',
                  head_sha: 'a7b31e9',
                  conclusion: 'failure',
                  display_title: 'feat: add customer metadata payload parsing in checkout'
                },
                repository: { full_name: 'nebiyu-org/checkout-api-service' },
                logExcerpt: "FAIL src/controllers/__tests__/checkout.test.ts\nTypeError: Cannot read properties of undefined (reading 'billingDetails')"
              }
        )
      });
      await fetchDashboardData();
    } catch (e) {
      console.error('Simulation error:', e);
    } finally {
      setTimeout(() => setSimulating(null), 600);
    }
  };

  const filteredIncidents = useMemo(() => {
    return incidents.filter(inc => {
      if (activeFilter === 'REVIEW' && inc.status !== 'awaiting_approval') return false;
      if (activeFilter === 'FIXING' && inc.status !== 'fixing' && inc.status !== 'validating') return false;
      if (activeFilter === 'PR_OPEN' && inc.status !== 'pr_open') return false;
      if (activeFilter === 'RESOLVED' && inc.status !== 'verified_resolved') return false;
      if (activeFilter === 'ABSTAINED' && inc.status !== 'abstained') return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          inc.title.toLowerCase().includes(query) ||
          inc.id.toLowerCase().includes(query) ||
          inc.source.toLowerCase().includes(query) ||
          inc.commitSha?.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [incidents, activeFilter, searchQuery]);

  const filterCounts = useMemo(() => {
    return {
      ALL: incidents.length,
      REVIEW: incidents.filter(i => i.status === 'awaiting_approval').length,
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
          <span className="inline-flex items-center gap-1.5 text-xs text-amber-400 font-medium">
            <span className="size-1.5 rounded-full bg-amber-400" />
            Needs Review
          </span>
        );
      case 'fixing':
      case 'validating':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs text-blue-400 font-medium">
            <span className="size-1.5 rounded-full bg-blue-400 animate-pulse" />
            Remediating
          </span>
        );
      case 'pr_open':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs text-sky-400 font-medium">
            <GitPullRequest className="size-3" />
            Draft PR
          </span>
        );
      case 'verified_resolved':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
            <CheckCircle2 className="size-3" />
            Resolved
          </span>
        );
      case 'abstained':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
            Abstained
          </span>
        );
      default:
        return <span className="text-xs text-muted-foreground">{status}</span>;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="destructive" className="uppercase text-[10px] px-1.5 py-0 font-bold">Critical</Badge>;
      case 'high':
        return <Badge variant="warning" className="uppercase text-[10px] px-1.5 py-0 font-bold">High</Badge>;
      default:
        return <Badge variant="secondary" className="uppercase text-[10px] px-1.5 py-0 font-medium">{severity}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Simulation Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Incidents</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Automated triage, root cause analysis, and draft PRs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => triggerSimulation('sentry')}
            disabled={Boolean(simulating)}
            className="h-8 text-xs gap-1.5 border-border/80 text-muted-foreground hover:text-foreground"
          >
            <ShieldAlert className="size-3.5 text-rose-400" />
            <span>{simulating === 'sentry' ? 'Ingesting...' : 'Test Sentry'}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => triggerSimulation('actions')}
            disabled={Boolean(simulating)}
            className="h-8 text-xs gap-1.5 border-border/80 text-muted-foreground hover:text-foreground"
          >
            <Server className="size-3.5 text-blue-400" />
            <span>{simulating === 'actions' ? 'Triggering...' : 'Test CI'}</span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={fetchDashboardData}
            title="Refresh"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-border/70 bg-card/60">
          <CardHeader className="p-4 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Incidents</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-bold font-mono text-foreground">{metrics.totalIncidents}</div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/60">
          <CardHeader className="p-4 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Needs Review</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-bold font-mono text-amber-400">{metrics.awaitingReview}</div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/60">
          <CardHeader className="p-4 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Draft PRs</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-bold font-mono text-foreground">{metrics.prsOpen}</div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/60">
          <CardHeader className="p-4 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Avg Resolution</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-bold font-mono text-emerald-400">{metrics.meanTimeToResolveMinutes}m</div>
          </CardContent>
        </Card>
      </div>

      {/* Incident List Table */}
      <Card className="border-border/70 bg-card/60">
        <div className="p-3 sm:p-4 border-b border-border/60 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Filter incidents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs bg-muted/20 border-border/60"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto">
            {[
              { key: 'ALL', label: 'All', count: filterCounts.ALL },
              { key: 'REVIEW', label: 'Needs Review', count: filterCounts.REVIEW },
              { key: 'PR_OPEN', label: 'Draft PRs', count: filterCounts.PR_OPEN },
              { key: 'RESOLVED', label: 'Resolved', count: filterCounts.RESOLVED },
              { key: 'ABSTAINED', label: 'Abstained', count: filterCounts.ABSTAINED },
            ].map((f) => {
              const isSelected = activeFilter === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => setActiveFilter(f.key)}
                  className={`h-7 px-2.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-secondary text-foreground font-semibold shadow-sm border border-border/80'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                  }`}
                >
                  <span>{f.label}</span>
                  <span className="text-[10px] font-mono text-muted-foreground">({f.count})</span>
                </button>
              );
            })}
          </div>
        </div>

        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 text-center text-xs text-muted-foreground font-mono">
              Loading incidents...
            </div>
          ) : filteredIncidents.length === 0 ? (
            <div className="py-14 text-center space-y-1">
              <p className="text-xs font-medium text-foreground">No incidents found</p>
              <p className="text-[11px] text-muted-foreground">Adjust filters or trigger a test signal above.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/60 hover:bg-transparent">
                  <TableHead className="w-[100px]">ID</TableHead>
                  <TableHead className="min-w-[280px]">Summary</TableHead>
                  <TableHead className="w-[120px]">Source</TableHead>
                  <TableHead className="w-[140px]">Environment</TableHead>
                  <TableHead className="w-[140px]">Status</TableHead>
                  <TableHead className="w-[90px] text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIncidents.map((inc) => (
                  <TableRow key={inc.id} className="group border-border/50 hover:bg-muted/20">
                    <TableCell className="font-mono text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-foreground">{inc.id}</span>
                        {getSeverityBadge(inc.severity)}
                      </div>
                    </TableCell>

                    <TableCell>
                      <Link
                        href={`/incidents/${inc.id}`}
                        className="font-medium text-xs text-foreground hover:text-primary transition-colors line-clamp-1 block"
                      >
                        {inc.title}
                      </Link>
                    </TableCell>

                    <TableCell className="text-xs text-muted-foreground font-mono">
                      <span>{inc.source}</span>
                      {inc.occurrences > 1 && (
                        <span className="ml-1 text-[10px] text-muted-foreground/70 font-sans">
                          ({inc.occurrences}x)
                        </span>
                      )}
                    </TableCell>

                    <TableCell className="text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5 font-mono text-[11px]">
                        <span>{inc.environment || 'production'}</span>
                        <span className="text-muted-foreground/40">•</span>
                        <span>{timeAgo(inc.detectedAt)}</span>
                      </div>
                    </TableCell>

                    <TableCell>
                      {getStatusBadge(inc.status)}
                    </TableCell>

                    <TableCell className="text-right">
                      <Button asChild size="sm" variant={inc.status === 'awaiting_approval' ? "default" : "ghost"} className="h-7 px-2.5 text-xs">
                        <Link href={`/incidents/${inc.id}`}>
                          <span>{inc.status === 'awaiting_approval' ? 'Review' : 'View'}</span>
                          <ChevronRight className="size-3 ml-0.5" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
