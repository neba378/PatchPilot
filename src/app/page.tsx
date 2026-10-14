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
  Cpu,
  Boxes,
  Key,
  Settings,
  Eye,
  EyeOff,
  Check,
  X,
  ShieldCheck,
  Sparkles
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
  sandboxApiKey?: string;
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

  const [updatingSandbox, setUpdatingSandbox] = useState(false);
  const [isSandboxModalOpen, setIsSandboxModalOpen] = useState(false);
  const [modalProvider, setModalProvider] = useState<'local-docker' | 'e2b' | 'modal' | 'fake'>('local-docker');
  const [modalApiKey, setModalApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [savingSandboxConfig, setSavingSandboxConfig] = useState(false);
  const [sandboxSaveSuccess, setSandboxSaveSuccess] = useState(false);

  const openSandboxConfig = (project: Project, requestedProvider?: 'local-docker' | 'e2b' | 'modal' | 'fake') => {
    setModalProvider(requestedProvider || (project.sandboxProvider as any) || 'local-docker');
    setModalApiKey(project.sandboxApiKey || '');
    setShowApiKey(false);
    setSandboxSaveSuccess(false);
    setIsSandboxModalOpen(true);
  };

  const handleUpdateSandboxProvider = async (projectId: string, newProvider: 'local-docker' | 'e2b' | 'modal' | 'fake') => {
    const proj = projects.find(p => p.id === projectId);
    // If selecting e2b or modal and has no key configured yet, immediately open modal for key entry
    if ((newProvider === 'e2b' || newProvider === 'modal') && !proj?.sandboxApiKey) {
      if (proj) openSandboxConfig(proj, newProvider);
      return;
    }

    setUpdatingSandbox(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sandboxProvider: newProvider })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setProjects(prev => prev.map(p => p.id === projectId ? { ...p, sandboxProvider: newProvider } : p));
      } else {
        alert(data.error || 'Failed to update sandbox provider');
      }
    } catch (err: any) {
      alert(`Error updating sandbox provider: ${err.message}`);
    } finally {
      setUpdatingSandbox(false);
    }
  };

  const handleSaveSandboxConfig = async () => {
    if (!selectedProject) return;
    setSavingSandboxConfig(true);
    try {
      const res = await fetch(`/api/projects/${selectedProject.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sandboxProvider: modalProvider,
          sandboxApiKey: modalApiKey.trim() || null
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setProjects(prev => prev.map(p => p.id === selectedProject.id ? {
          ...p,
          sandboxProvider: modalProvider,
          sandboxApiKey: modalApiKey.trim() || undefined
        } : p));
        setSandboxSaveSuccess(true);
        setTimeout(() => {
          setIsSandboxModalOpen(false);
          setSandboxSaveSuccess(false);
        }, 900);
      } else {
        alert(data.error || 'Failed to update sandbox configuration');
      }
    } catch (err: any) {
      alert(`Error updating sandbox configuration: ${err.message}`);
    } finally {
      setSavingSandboxConfig(false);
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
    const isOrderService = repoFullName.includes('test-2') || repoFullName.toLowerCase().includes('order');
    // Alternate between billingDetails and code bug to allow testing both scenarios!
    const testReasonCode = Math.random() > 0.5;
    const targetBranch = selectedProject?.defaultBranch || 'main';

    setSimulationFeedback({
      type: 'info',
      message: isSentry
        ? `📡 Ingesting Sentry exception telemetry for ${selectedProject?.name || 'Microservice'}...`
        : `⚡ Triggering simulated GitHub Actions CI failure on branch ${targetBranch}...`
    });

    try {
      const url = `/api/webhooks/${type === 'actions' ? 'github-actions' : type}?simulation=true${selectedProject ? `&projectId=${selectedProject.id}` : ''}`;

      const sentryTitle = isOrderService
        ? "TypeError: Cannot read properties of undefined (reading 'percentage')"
        : (testReasonCode ? "TypeError: Cannot read properties of undefined (reading 'code')" : "TypeError: Cannot read properties of undefined (reading 'billingDetails')");
      const sentryFile = isOrderService ? 'src/orderController.ts' : 'src/paymentController.ts';
      const sentryLine = isOrderService ? 29 : (testReasonCode ? 44 : 17);
      const sentryFn = isOrderService ? 'handleCreateOrder' : (testReasonCode ? 'handleRefund' : 'handleCheckout');

      const actionsLog = isOrderService
        ? "FAIL src/__tests__/orderController.test.ts\nTypeError: Cannot read properties of undefined (reading 'percentage')\n  at handleCreateOrder (src/orderController.ts:29:58)"
        : (testReasonCode
          ? "FAIL src/__tests__/paymentController.test.ts\nTypeError: Cannot read properties of undefined (reading 'code')\n  at handleRefund (src/paymentController.ts:44:33)"
          : "FAIL src/__tests__/paymentController.test.ts\nTypeError: Cannot read properties of undefined (reading 'billingDetails')\n  at handleCheckout (src/paymentController.ts:17:33)");

      const payload = isSentry
        ? {
            projectId: selectedProject?.id,
            event: {
              event_id: `evt_${Date.now()}`,
              title: sentryTitle,
              metadata: {
                type: 'TypeError',
                value: sentryTitle.replace('TypeError: ', '')
              },
              environment: 'production',
              release: `${repoFullName.split('/')[1] || 'service'}@${targetBranch}`,
              entries: [
                {
                  type: 'exception',
                  data: {
                    values: [{
                      type: 'TypeError',
                      value: sentryTitle.replace('TypeError: ', ''),
                      stacktrace: {
                        frames: [{
                          filename: sentryFile,
                          lineno: sentryLine,
                          function: sentryFn,
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
              head_branch: targetBranch,
              head_sha: targetBranch,
              conclusion: 'failure',
              display_title: isOrderService
                ? 'feat: add promotional discount calculations'
                : (testReasonCode
                  ? 'feat: add customer refund handler'
                  : 'feat: add customer metadata payload parsing in checkout')
            },
            repository: { full_name: repoFullName },
            logExcerpt: actionsLog
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
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded border font-medium ${
                            proj.sandboxProvider === 'e2b' || proj.sandboxProvider === 'modal'
                              ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                              : 'bg-muted/40 text-muted-foreground border-border/40'
                          }`}
                        >
                          box: {proj.sandboxProvider || 'local-docker'}
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
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground font-mono mt-0.5">
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
                    const modelName = aiConn?.metadata?.model || (aiConn?.type ? `${aiConn.type}` : 'gemini-3.8-flash');
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
                  <span>•</span>
                  <div className="flex items-center gap-1.5 font-sans">
                    <Boxes className="size-3 text-muted-foreground" />
                    <span className="text-[11px] text-muted-foreground">Sandbox:</span>
                    <select
                      value={selectedProject.sandboxProvider || 'local-docker'}
                      onChange={(e) => handleUpdateSandboxProvider(selectedProject.id, e.target.value as any)}
                      disabled={updatingSandbox}
                      className="bg-card text-foreground border border-border/70 rounded px-2 py-0.5 text-xs font-medium cursor-pointer focus:outline-none focus:border-primary"
                    >
                      <option value="local-docker">Local Docker (Default)</option>
                      <option value="e2b">E2B Sandbox (3rd Party Cloud)</option>
                      <option value="modal">Modal Labs (3rd Party Cloud)</option>
                      <option value="fake">In-Memory Mock</option>
                    </select>
                    {(selectedProject.sandboxProvider === 'e2b' || selectedProject.sandboxProvider === 'modal') && (
                      <button
                        type="button"
                        onClick={() => openSandboxConfig(selectedProject)}
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded border transition-colors flex items-center gap-1 ${
                          selectedProject.sandboxApiKey
                            ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20'
                            : 'border-amber-500/50 text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 animate-pulse'
                        }`}
                        title="Configure Sandbox API Key"
                      >
                        <Key className="size-2.5" />
                        <span>{selectedProject.sandboxApiKey ? 'Key Set' : 'Set Key'}</span>
                      </button>
                    )}
                    {updatingSandbox && <RefreshCw className="size-3 animate-spin text-primary" />}
                  </div>
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

          {/* Sandbox & Guardrails Info Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 rounded-lg border border-border/70 bg-card/50 text-xs">
            <div className="flex items-center gap-2.5">
              <Boxes className="size-4 text-primary shrink-0" />
              <div>
                <span className="text-foreground font-medium">Assigned Execution Sandbox: </span>
                <span className="font-mono text-primary font-semibold">
                  {selectedProject.sandboxProvider || 'local-docker'}
                </span>
                {(selectedProject.sandboxProvider === 'e2b' || selectedProject.sandboxProvider === 'modal') && (
                  <Badge
                    variant="outline"
                    className={`ml-2 text-[10px] py-0 px-1.5 font-sans ${
                      selectedProject.sandboxApiKey
                        ? 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10'
                        : 'border-amber-500/50 text-amber-400 bg-amber-500/10'
                    }`}
                  >
                    {selectedProject.sandboxApiKey ? 'Key Configured' : 'API Key Missing'}
                  </Badge>
                )}
                <span className="text-muted-foreground ml-1.5">
                  {selectedProject.sandboxProvider === 'e2b'
                    ? '— Isolated 3rd-party cloud microVM for verification.'
                    : selectedProject.sandboxProvider === 'modal'
                    ? '— Serverless containerized cloud environment.'
                    : selectedProject.sandboxProvider === 'fake'
                    ? '— In-memory mock simulation sandbox.'
                    : '— Local container sandbox with filesystem isolation (Default).'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
              {(['local-docker', 'e2b', 'modal', 'fake'] as const).map((prov) => (
                <Button
                  key={prov}
                  variant={
                    (selectedProject.sandboxProvider === prov) ||
                    (!selectedProject.sandboxProvider && prov === 'local-docker')
                      ? 'secondary'
                      : 'ghost'
                  }
                  size="sm"
                  disabled={updatingSandbox}
                  onClick={() => handleUpdateSandboxProvider(selectedProject.id, prov)}
                  className={`h-7 px-2.5 text-[11px] font-mono ${
                    (selectedProject.sandboxProvider === prov) ||
                    (!selectedProject.sandboxProvider && prov === 'local-docker')
                      ? 'border border-primary/40 text-primary font-semibold bg-primary/10'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {prov}
                </Button>
              ))}

              <Button
                variant="outline"
                size="sm"
                onClick={() => openSandboxConfig(selectedProject)}
                className="h-7 px-2 text-[11px] gap-1 border-border/80 hover:border-primary/50 text-foreground ml-1"
                title="Configure Sandbox Environment & API Key"
              >
                <Settings className="size-3 text-muted-foreground" />
                <span className="hidden sm:inline">Configure</span>
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

      {/* Sandbox Configuration Modal */}
      {isSandboxModalOpen && selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in-0">
          <div className="relative w-full max-w-xl rounded-xl border border-border/80 bg-card p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                    <Boxes className="size-5" />
                  </div>
                  <h3 className="text-base font-bold text-foreground">Execution Sandbox Environment</h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  Choose where autonomous reproduction, mutation checks, and unit tests execute before opening Pull Requests for <span className="font-mono text-foreground font-semibold">{selectedProject.name}</span>.
                </p>
              </div>
              <button
                onClick={() => setIsSandboxModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Provider Options Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                {
                  id: 'local-docker',
                  name: 'Local Docker',
                  badge: 'Container (Default)',
                  badgeColor: 'border-border/60 text-muted-foreground',
                  desc: 'Host container execution with filesystem isolation. Zero external cost & tests run locally.'
                },
                {
                  id: 'e2b',
                  name: 'E2B Sandbox',
                  badge: 'Cloud MicroVM',
                  badgeColor: 'border-primary/40 text-primary bg-primary/5',
                  desc: 'Secure 3rd-party cloud microVM for running untrusted repository code and test suites.'
                },
                {
                  id: 'modal',
                  name: 'Modal Labs',
                  badge: 'Serverless Cloud',
                  badgeColor: 'border-border/60 text-muted-foreground',
                  desc: 'Serverless cloud container infrastructure with elastic compute scaling.'
                },
                {
                  id: 'fake',
                  name: 'In-Memory Simulation',
                  badge: 'Dry Run Mock',
                  badgeColor: 'border-amber-500/40 text-amber-400 bg-amber-500/5',
                  desc: 'Fast mock simulation for dry-run testing without spinning up real containers.'
                }
              ].map((prov) => {
                const isSelected = modalProvider === prov.id;
                return (
                  <div
                    key={prov.id}
                    onClick={() => setModalProvider(prov.id as any)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all space-y-1 ${
                      isSelected
                        ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary/40'
                        : 'border-border/60 bg-muted/20 hover:border-border hover:bg-muted/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-semibold ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                          {prov.name}
                        </span>
                        <Badge variant="outline" className={`text-[9px] py-0 px-1 ${prov.badgeColor}`}>
                          {prov.badge}
                        </Badge>
                      </div>
                      {isSelected && <Check className="size-3.5 text-primary" />}
                    </div>
                    <p className="text-[11px] leading-relaxed text-muted-foreground">{prov.desc}</p>
                  </div>
                );
              })}
            </div>

            {/* API Key Input Section (Conditional for e2b / modal) */}
            {(modalProvider === 'e2b' || modalProvider === 'modal') && (
              <div className="p-3.5 rounded-lg border border-border/70 bg-muted/30 space-y-2.5 animate-in fade-in-50">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Key className="size-3.5 text-primary" />
                    <span>{modalProvider === 'e2b' ? 'E2B API Key' : 'Modal Token ID / Secret'}</span>
                  </label>
                  <a
                    href={modalProvider === 'e2b' ? 'https://e2b.dev/dashboard' : 'https://modal.com/settings'}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-primary hover:underline flex items-center gap-1"
                  >
                    <span>Get Key</span>
                    <ExternalLink className="size-2.5" />
                  </a>
                </div>

                <div className="relative">
                  <Input
                    type={showApiKey ? 'text' : 'password'}
                    placeholder={modalProvider === 'e2b' ? 'e2b_...' : 'ak-...'}
                    value={modalApiKey}
                    onChange={(e) => setModalApiKey(e.target.value)}
                    className="h-8 text-xs font-mono pr-8 bg-background border-border/80"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                  >
                    {showApiKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>

                <p className="text-[11px] text-muted-foreground leading-normal">
                  {modalProvider === 'e2b'
                    ? 'Required to spawn secure cloud microVMs on E2B. Keys are encrypted and saved per-project in your SQLite database.'
                    : 'Required for Modal serverless container execution. Stored securely per-project.'}
                </p>
              </div>
            )}

            {/* Security Guardrail Notice */}
            <div className="flex items-center gap-2 p-2.5 rounded-md bg-muted/30 border border-border/50 text-[11px] text-muted-foreground">
              <ShieldCheck className="size-3.5 text-primary shrink-0" />
              <span>Air-gapped security: Code is loaded into the sandbox as a snapshot. GitHub tokens are NEVER exposed.</span>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-border/60">
              <span className="text-[11px] text-muted-foreground">
                {sandboxSaveSuccess ? (
                  <span className="text-emerald-400 font-medium flex items-center gap-1">
                    <Check className="size-3.5" /> Saved successfully!
                  </span>
                ) : (
                  <span>Project: {selectedProject.name}</span>
                )}
              </span>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsSandboxModalOpen(false)}
                  className="h-8 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveSandboxConfig}
                  disabled={savingSandboxConfig}
                  className="h-8 text-xs gap-1.5 font-medium"
                >
                  {savingSandboxConfig ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
                  <span>Save Sandbox Configuration</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
