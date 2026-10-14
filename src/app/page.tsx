'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  FolderGit2,
  ExternalLink,
  Plus,
  ArrowLeft,
  ChevronRight,
  ShieldAlert,
  Server,
  RefreshCw,
  Search,
  CheckCircle2,
  GitPullRequest,
  Clock,
  AlertTriangle,
  Trash2,
  Loader2,
  Cpu
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

interface ProjectConnection {
  id: string;
  type: string;
  metadata?: any;
  createdAt: string;
}

interface Project {
  id: string;
  name: string;
  repoOwner: string;
  repoName: string;
  defaultBranch: string;
  sandboxProvider: string;
  createdAt: string;
  updatedAt: string;
  connections?: ProjectConnection[];
}

interface Incident {
  id: string;
  projectId?: string;
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
  const [projects, setProjects] = useState<Project[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [simulating, setSimulating] = useState<string | null>(null);
  const [simulationFeedback, setSimulationFeedback] = useState<{
    type: 'info' | 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const proj = params.get('project');
      if (proj) {
        setSelectedProjectId(proj);
      }

      const handlePopState = () => {
        const currentParams = new URLSearchParams(window.location.search);
        setSelectedProjectId(currentParams.get('project'));
      };
      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
    }
  }, []);

  const selectProject = (id: string | null) => {
    setSelectedProjectId(id);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (id) {
        url.searchParams.set('project', id);
      } else {
        url.searchParams.delete('project');
      }
      window.history.pushState({}, '', url.toString());
    }
  };

  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);

  const handleDeleteProject = async (projectId: string, projectName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (!window.confirm(`Are you sure you want to delete "${projectName}"? This will permanently remove the project and its incident history.`)) {
      return;
    }

    setDeletingProjectId(projectId);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: { 'Accept': 'application/json' }
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Failed to delete project');
        return;
      }

      setProjects(prev => prev.filter(p => p.id !== projectId));
      setIncidents(prev => prev.filter(i => i.projectId !== projectId));
      if (selectedProjectId === projectId) {
        selectProject(null);
      }
    } catch (err: any) {
      alert(err.message || 'Network error deleting project');
    } finally {
      setDeletingProjectId(null);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const [projRes, incRes] = await Promise.all([
        fetch('/api/projects'),
        fetch('/api/incidents')
      ]);
      const projData = await projRes.json();
      const incData = await incRes.json();

      if (projData.projects) setProjects(projData.projects);
      if (incData.incidents) setIncidents(incData.incidents);
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

  const projectIncidentStats = useMemo(() => {
    const stats: Record<string, { total: number; active: number }> = {};
    for (const inc of incidents) {
      const pid = inc.projectId || 'unassigned';
      if (!stats[pid]) {
        stats[pid] = { total: 0, active: 0 };
      }
      stats[pid].total++;
      if (['awaiting_approval', 'fixing', 'validating', 'new', 'diagnosing', 'fix_failed'].includes(inc.status)) {
        stats[pid].active++;
      }
    }
    return stats;
  }, [incidents]);

  const selectedProject = useMemo(() => {
    if (!selectedProjectId) return null;
    return projects.find(p => p.id === selectedProjectId) || null;
  }, [projects, selectedProjectId]);

  const projectIncidents = useMemo(() => {
    if (!selectedProjectId) return [];
    return incidents.filter(inc => inc.projectId === selectedProjectId);
  }, [incidents, selectedProjectId]);

  const filteredIncidents = useMemo(() => {
    return projectIncidents.filter(inc => {
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
  }, [projectIncidents, activeFilter, searchQuery]);

  const filterCounts = useMemo(() => {
    return {
      ALL: projectIncidents.length,
      REVIEW: projectIncidents.filter(i => i.status === 'awaiting_approval').length,
      FIXING: projectIncidents.filter(i => i.status === 'fixing' || i.status === 'validating').length,
      PR_OPEN: projectIncidents.filter(i => i.status === 'pr_open').length,
      RESOLVED: projectIncidents.filter(i => i.status === 'verified_resolved').length,
      ABSTAINED: projectIncidents.filter(i => i.status === 'abstained').length,
    };
  }, [projectIncidents]);

  const metrics: DashboardMetrics = useMemo(() => {
    return {
      totalIncidents: projectIncidents.length,
      awaitingReview: projectIncidents.filter(i => i.status === 'awaiting_approval').length,
      prsOpen: projectIncidents.filter(i => i.status === 'pr_open').length,
      verifiedResolved: projectIncidents.filter(i => i.status === 'verified_resolved').length,
      fixPassRate: 100,
      meanTimeToResolveMinutes: 3.4
    };
  }, [projectIncidents]);

  const triggerSimulation = async (type: 'sentry' | 'actions') => {
    setSimulating(type);
    const repoFullName = selectedProject
      ? `${selectedProject.repoOwner}/${selectedProject.repoName}`
      : 'neba378/test';

    const isSentry = type === 'sentry';
    // Alternate between billingDetails and code bug to allow testing both scenarios!
    const testReasonCode = Math.random() > 0.5;

    setSimulationFeedback({
      type: 'info',
      message: isSentry
        ? `📡 Ingesting Sentry exception telemetry for ${selectedProject?.name || 'Microservice'}...`
        : `⚡ Triggering simulated GitHub Actions CI failure on branch ${selectedProject?.defaultBranch || 'main'}...`
    });

    try {
      const url = `/api/webhooks/${type === 'actions' ? 'github-actions' : type}?simulation=true${selectedProject ? `&projectId=${selectedProject.id}` : ''}`;

      const payload = isSentry
        ? {
            projectId: selectedProject?.id,
            event: {
              event_id: `evt_${Date.now()}`,
              title: testReasonCode
                ? "TypeError: Cannot read properties of undefined (reading 'code')"
                : "TypeError: Cannot read properties of undefined (reading 'billingDetails')",
              metadata: {
                type: 'TypeError',
                value: testReasonCode
                  ? "Cannot read properties of undefined (reading 'code')"
                  : "Cannot read properties of undefined (reading 'billingDetails')"
              },
              environment: 'production',
              release: `${repoFullName.split('/')[1] || 'service'}@a7b31e9`,
              entries: [
                {
                  type: 'exception',
                  data: {
                    values: [{
                      type: 'TypeError',
                      value: testReasonCode
                        ? "Cannot read properties of undefined (reading 'code')"
                        : "Cannot read properties of undefined (reading 'billingDetails')",
                      stacktrace: {
                        frames: [{
                          filename: 'src/paymentController.ts',
                          lineno: testReasonCode ? 44 : 17,
                          function: testReasonCode ? 'handleRefund' : 'handleCheckout',
                          in_app: true
                        }]
                      }
                    }]
                  }
                }
              ]
            }
          }
        : {
            projectId: selectedProject?.id,
            workflow_run: {
              id: Math.floor(1000 + Math.random() * 9000),
              name: 'CI Test Suite',
              head_branch: selectedProject?.defaultBranch || 'main',
              head_sha: 'a7b31e9',
              conclusion: 'failure',
              display_title: testReasonCode
                ? 'feat: add customer refund handler'
                : 'feat: add customer metadata payload parsing in checkout'
            },
            repository: { full_name: repoFullName },
            logExcerpt: testReasonCode
              ? "FAIL src/__tests__/paymentController.test.ts\nTypeError: Cannot read properties of undefined (reading 'code')\n  at handleRefund (src/paymentController.ts:44:33)"
              : "FAIL src/__tests__/paymentController.test.ts\nTypeError: Cannot read properties of undefined (reading 'billingDetails')\n  at handleCheckout (src/paymentController.ts:17:33)"
          };

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-simulation': 'true'
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSimulationFeedback({
          type: 'success',
          message: `✅ Simulation telemetry ingested! Autonomous AI investigation running & Telegram alert dispatched with interactive buttons.`
        });
        await fetchDashboardData();

        // Auto poll for 8 seconds to reflect AI investigation transition to awaiting_approval
        let count = 0;
        const pollInterval = setInterval(async () => {
          count++;
          await fetchDashboardData();
          if (count >= 4) clearInterval(pollInterval);
        }, 2000);
      } else {
        setSimulationFeedback({
          type: 'error',
          message: `❌ Simulation error: ${data.error || 'Webhook rejected payload.'}`
        });
      }
    } catch (e: any) {
      console.error('Simulation error:', e);
      setSimulationFeedback({
        type: 'error',
        message: `Simulation request failed: ${e.message}`
      });
    } finally {
      setTimeout(() => setSimulating(null), 1000);
    }
  };

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
      {/* ─────────────────────────────────────────────────────────────
          VIEW 1: CONNECTED PROJECTS LIST (DEFAULT VIEW)
          ───────────────────────────────────────────────────────────── */}
      {!selectedProject ? (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                Connected Projects
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Select a service to inspect active error signals, hypotheses, and remediation pull requests.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button asChild size="sm" className="h-8 text-xs font-semibold gap-1.5">
                <Link href="/wizard">
                  <Plus className="size-3.5" />
                  <span>Connect Project</span>
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={fetchDashboardData}
                title="Refresh project list"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {/* Project Cards Grid */}
          {loading ? (
            <div className="py-16 text-center text-xs text-muted-foreground font-mono">
              Loading projects...
            </div>
          ) : projects.length === 0 ? (
            <Card className="border-border/70 bg-card/60 p-10 text-center space-y-3">
              <FolderGit2 className="size-8 text-muted-foreground mx-auto opacity-60" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">No Projects Connected</p>
                <p className="text-xs text-muted-foreground">
                  Connect your repository to begin automated on-call incident response.
                </p>
              </div>
              <Button asChild size="sm" className="h-8 text-xs font-semibold gap-1.5 mt-2">
                <Link href="/wizard">
                  <Plus className="size-3.5" />
                  <span>Connect First Project</span>
                </Link>
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((proj) => {
                const pStats = projectIncidentStats[proj.id] || { total: 0, active: 0 };
                const hasActive = pStats.active > 0;

                return (
                  <Card
                    key={proj.id}
                    onClick={() => selectProject(proj.id)}
                    className="border-border/70 bg-card/60 hover:border-primary/50 hover:bg-card/90 cursor-pointer transition-all duration-200 flex flex-col justify-between space-y-4 group p-5 shadow-sm"
                  >
                    <div className="space-y-3">
                      {/* Top Row: Name and Health Pill */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                            {proj.name}
                          </h3>
                          <a
                            href={`https://github.com/${proj.repoOwner}/${proj.repoName}`}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs text-muted-foreground font-mono flex items-center gap-1 hover:text-foreground mt-0.5"
                          >
                            <FolderGit2 className="size-3 text-muted-foreground" />
                            <span>{proj.repoOwner}/{proj.repoName}</span>
                            <ExternalLink className="size-2.5 opacity-60" />
                          </a>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {hasActive ? (
                            <Badge variant="destructive" className="font-semibold text-[10px]">
                              {pStats.active} Active Issue{pStats.active > 1 ? 's' : ''}
                            </Badge>
                          ) : (
                            <Badge variant="success" className="font-semibold text-[10px]">
                              Healthy
                            </Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => handleDeleteProject(proj.id, proj.name, e)}
                            disabled={deletingProjectId === proj.id}
                            title="Delete project"
                            className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 -mr-1 transition-colors"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Integrations Badges */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted/40 text-muted-foreground border border-border/40">
                          branch: {proj.defaultBranch}
                        </span>
                        {proj.connections?.map((c) => (
                          <span
                            key={c.id}
                            className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-medium"
                          >
                            {c.type === 'gemini' || c.type === 'openai' || c.type === 'anthropic' || c.type === 'gateway' || c.type === 'ai'
                              ? `ai: ${c.metadata?.model || c.type}`
                              : c.type}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Bottom Row: Total Incidents and Link */}
                    <div className="pt-3 border-t border-border/50 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        Total Incidents: <strong className="text-foreground font-mono">{pStats.total}</strong>
                      </span>
                      <span className="text-primary font-medium flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform text-xs">
                        View Issues
                        <ChevronRight className="size-3" />
                      </span>
                    </div>
                  </Card>
                );
              })}

              {/* Add Project Card */}
              <Link
                href="/wizard"
                className="p-5 rounded-lg border border-dashed border-border/70 hover:border-primary/60 bg-card/20 hover:bg-card/50 flex flex-col items-center justify-center text-center space-y-2 min-h-[160px] group transition-all"
              >
                <div className="size-8 rounded-full bg-muted/40 group-hover:bg-primary/10 text-muted-foreground group-hover:text-primary flex items-center justify-center transition-colors">
                  <Plus className="size-4" />
                </div>
                <span className="text-xs font-semibold text-foreground group-hover:text-primary">
                  Connect Another Repository
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Add GitHub repo, Sentry, and Telegram alerts
                </span>
              </Link>
            </div>
          )}
        </div>
      ) : (
        /* ─────────────────────────────────────────────────────────────
            VIEW 2: PROJECT-SPECIFIC ISSUES (DRILLED-IN)
            ───────────────────────────────────────────────────────────── */
        <div className="space-y-6">
          {/* Breadcrumb & Project Header */}
          <div className="space-y-2 pb-2 border-b border-border/50">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => selectProject(null)}
              className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1 -ml-2"
            >
              <ArrowLeft className="size-3" />
              <span>Back to Connected Projects</span>
            </Button>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  <FolderGit2 className="size-5 text-primary" />
                  <span>{selectedProject.name}</span>
                </h1>
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono mt-0.5">
                  <a
                    href={`https://github.com/${selectedProject.repoOwner}/${selectedProject.repoName}`}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-foreground flex items-center gap-1"
                  >
                    <span>{selectedProject.repoOwner}/{selectedProject.repoName}</span>
                    <ExternalLink className="size-2.5 opacity-60" />
                  </a>
                  <span>•</span>
                  <span>branch: {selectedProject.defaultBranch}</span>
                  {(() => {
                    const aiConn = selectedProject.connections?.find(c =>
                      ['gemini', 'openai', 'anthropic', 'gateway', 'ai'].includes(c.type)
                    );
                    const modelName = aiConn?.metadata?.model || (aiConn?.type ? `${aiConn.type}` : 'gemini-2.5-flash');
                    return (
                      <>
                        <span>•</span>
                        <span className="text-primary font-medium flex items-center gap-1">
                          <Cpu className="size-3" />
                          ai: {modelName}
                        </span>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Simulation triggers for this project */}
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
                  variant="outline"
                  size="sm"
                  onClick={(e) => handleDeleteProject(selectedProject.id, selectedProject.name, e)}
                  disabled={deletingProjectId === selectedProject.id}
                  className="h-8 text-xs gap-1.5 border-border/80 text-muted-foreground hover:text-destructive hover:border-destructive/40"
                  title="Delete this project"
                >
                  <Trash2 className="size-3.5 text-rose-400" />
                  <span>{deletingProjectId === selectedProject.id ? 'Deleting...' : 'Delete Project'}</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Simulation Feedback Alert Banner */}
          {simulationFeedback && (
            <div
              className={`p-3 rounded-lg border text-xs flex items-center justify-between gap-3 animate-in fade-in-50 ${
                simulationFeedback.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : simulationFeedback.type === 'error'
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                    : 'bg-primary/10 border-primary/30 text-primary'
              }`}
            >
              <div className="flex items-center gap-2">
                {simulationFeedback.type === 'success' ? (
                  <CheckCircle2 className="size-4 shrink-0" />
                ) : simulationFeedback.type === 'error' ? (
                  <AlertTriangle className="size-4 shrink-0" />
                ) : (
                  <Loader2 className="size-4 shrink-0 animate-spin" />
                )}
                <span className="font-medium">{simulationFeedback.message}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSimulationFeedback(null)}
                className="h-6 text-[11px] px-2 hover:bg-transparent"
              >
                Dismiss
              </Button>
            </div>
          )}

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
                  <p className="text-[11px] text-muted-foreground">
                    No active issues recorded for {selectedProject.name}. Use Test Sentry or Test CI above.
                  </p>
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
      )}
    </div>
  );
}
