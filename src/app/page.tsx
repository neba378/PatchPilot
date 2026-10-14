// src/app/page.tsx
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
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRight
} from 'lucide-react';

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

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState<string | null>(null);

  // Sync URL search params with selectedProjectId
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

  // Compute incident counts per project
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

  const triggerSimulation = async (type: 'sentry' | 'actions') => {
    setSimulating(type);
    try {
      const targetProjId = selectedProjectId || (projects[0]?.id ?? 'proj_main');
      const targetProj = selectedProject || projects[0];
      const repoFullName = targetProj ? `${targetProj.repoOwner}/${targetProj.repoName}` : 'neba378/test';

      await fetch(`/api/webhooks/${type === 'actions' ? 'github-actions' : type}?projectId=${targetProjId}`, {
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
                  release: `${targetProj?.repoName || 'app'}@a7b31e9`,
                  entries: [
                    {
                      type: 'exception',
                      data: {
                        values: [{
                          type: 'TypeError',
                          value: "Cannot read properties of undefined (reading 'billingDetails')",
                          stacktrace: {
                            frames: [{ filename: 'src/paymentController.ts', lineno: 17, function: 'handleCheckout', in_app: true }]
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
                  head_branch: targetProj?.defaultBranch || 'main',
                  head_sha: 'a7b31e9',
                  conclusion: 'failure',
                  display_title: 'feat: customer checkout payment flow'
                },
                repository: { full_name: repoFullName },
                logExcerpt: "FAIL src/controllers/__tests__/checkout.test.ts\nTypeError: Cannot read properties of undefined (reading 'billingDetails')"
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

  return (
    <div className="space-y-6">
      {/* ─────────────────────────────────────────────────────────────
          VIEW 1: CONNECTED PROJECTS LIST (DEFAULT VIEW)
          ───────────────────────────────────────────────────────────── */}
      {!selectedProject ? (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-800">
                Connected Projects
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Select a project to inspect its active error signals, investigation hypotheses, and remediation pull requests.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <Link
                href="/wizard"
                className="px-4 py-2 bg-[#1d61f2] hover:bg-[#1554d8] text-white rounded-full text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Connect Project
              </Link>
              <button
                onClick={fetchDashboardData}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full text-xs transition-colors"
                title="Refresh project list"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Project Cards Grid */}
          {loading ? (
            <div className="text-center py-16 text-slate-400 font-mono text-xs">
              Loading projects...
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-16 kanban-card rounded-2xl bg-white border border-slate-200 p-8 space-y-3">
              <FolderGit2 className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="text-sm font-bold text-slate-700">No Projects Connected</h3>
              <p className="text-xs text-slate-500">
                Connect your repository to begin automated on-call incident response.
              </p>
              <Link
                href="/wizard"
                className="inline-flex items-center gap-1.5 px-5 py-2 bg-[#1d61f2] text-white text-xs font-bold rounded-full mt-2"
              >
                <Plus className="w-3.5 h-3.5" />
                Connect First Project
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {projects.map(proj => {
                const pStats = projectIncidentStats[proj.id] || { total: 0, active: 0 };
                const hasActive = pStats.active > 0;

                return (
                  <div
                    key={proj.id}
                    onClick={() => selectProject(proj.id)}
                    className="kanban-card p-5 rounded-2xl bg-white border border-slate-200 hover:border-blue-500 cursor-pointer transition-all duration-200 flex flex-col justify-between space-y-4 group shadow-sm hover:shadow"
                  >
                    <div className="space-y-3">
                      {/* Top Row: Name and Health Pill */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                            {proj.name}
                          </h3>
                          <a
                            href={`https://github.com/${proj.repoOwner}/${proj.repoName}`}
                            target="_blank"
                            rel="noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="text-xs text-slate-500 font-mono flex items-center gap-1 hover:text-blue-600 mt-0.5"
                          >
                            <FolderGit2 className="w-3.5 h-3.5 text-slate-400" />
                            {proj.repoOwner}/{proj.repoName}
                            <ExternalLink className="w-3 h-3 text-slate-400" />
                          </a>
                        </div>

                        {hasActive ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#fee2e2] text-[#dc2626] border border-[#fecaca] shrink-0">
                            {pStats.active} Active Issue{pStats.active > 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#dcfce7] text-[#16a34a] border border-[#bbf7d0] shrink-0">
                            Healthy
                          </span>
                        )}
                      </div>

                      {/* Integrations Badges */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                          branch: {proj.defaultBranch}
                        </span>
                        {proj.connections?.map(c => (
                          <span
                            key={c.id}
                            className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100 font-semibold"
                          >
                            {c.type === 'gemini' || c.type === 'openai' || c.type === 'anthropic' || c.type === 'gateway'
                              ? `ai-sdk:${c.type}`
                              : c.type}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Bottom Row: Total Incidents and Link */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">
                        Total Incidents: <strong className="text-slate-800">{pStats.total}</strong>
                      </span>
                      <span className="text-blue-600 font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                        View Issues
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Add Project Card */}
              <Link
                href="/wizard"
                className="p-5 rounded-2xl border-2 border-dashed border-slate-200 hover:border-blue-400 bg-white/60 hover:bg-white flex flex-col items-center justify-center text-center space-y-2 min-h-[160px] group transition-all"
              >
                <div className="w-9 h-9 rounded-full bg-slate-100 group-hover:bg-blue-50 text-slate-500 group-hover:text-blue-600 flex items-center justify-center transition-colors">
                  <Plus className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-700 group-hover:text-blue-600">
                  Connect Another Repository
                </span>
                <span className="text-[11px] text-slate-400">
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
          <div className="pb-4 border-b border-slate-100 space-y-3">
            <button
              onClick={() => selectProject(null)}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Connected Projects
            </button>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
                  <FolderGit2 className="w-5 h-5 text-blue-600" />
                  {selectedProject.name}
                </h2>
                <div className="flex items-center gap-3 text-xs text-slate-500 font-mono mt-0.5">
                  <a
                    href={`https://github.com/${selectedProject.repoOwner}/${selectedProject.repoName}`}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-blue-600 flex items-center gap-1"
                  >
                    {selectedProject.repoOwner}/{selectedProject.repoName}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <span>•</span>
                  <span>branch: {selectedProject.defaultBranch}</span>
                </div>
              </div>

              {/* Simulation triggers for this project */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => triggerSimulation('sentry')}
                  disabled={Boolean(simulating)}
                  className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-full text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                  {simulating === 'sentry' ? 'Simulating...' : 'Simulate Sentry Error'}
                </button>
                <button
                  onClick={() => triggerSimulation('actions')}
                  disabled={Boolean(simulating)}
                  className="px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-full text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <Server className="w-3.5 h-3.5 text-amber-600" />
                  {simulating === 'actions' ? 'Simulating...' : 'Simulate CI Failure'}
                </button>
              </div>
            </div>
          </div>

          {/* Issues List for this Project */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800">
              Active Incidents & Issues ({projectIncidents.length})
            </h3>

            {projectIncidents.length === 0 ? (
              <div className="kanban-card p-10 rounded-2xl bg-white border border-slate-200 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <h4 className="text-sm font-bold text-slate-800">No active incidents for this project</h4>
                <p className="text-xs text-slate-500">
                  All systems operational. Click &ldquo;Simulate Sentry Error&rdquo; above to test incident ingest and auto-remediation.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {projectIncidents.map(inc => {
                  const isCritical = inc.severity === 'critical';
                  const isAwaiting = inc.status === 'awaiting_approval';
                  const isPrOpen = inc.status === 'pr_open';
                  const isResolved = inc.status === 'verified_resolved';

                  return (
                    <div
                      key={inc.id}
                      className="kanban-card p-5 rounded-2xl bg-white border border-slate-200 hover:border-blue-400 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all"
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-400">{inc.id}</span>
                          <span
                            className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                              isCritical
                                ? 'bg-[#fee2e2] text-[#dc2626] border-[#fecaca]'
                                : 'bg-[#fef3c7] text-[#d97706] border-[#fde68a]'
                            }`}
                          >
                            {inc.severity}
                          </span>
                          <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                            {inc.status}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100">
                            {inc.source}
                          </span>
                        </div>

                        <h4 className="text-sm font-bold text-slate-800 tracking-tight">
                          {inc.title}
                        </h4>

                        <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-500">
                          <span>Detected: {new Date(inc.detectedAt).toLocaleString()}</span>
                          {inc.occurrences > 1 && (
                            <span>Occurrences: {inc.occurrences}x</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <Link
                          href={`/incidents/${inc.id}`}
                          className="px-4 py-2 bg-[#1d61f2] hover:bg-[#1554d8] text-white rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                        >
                          Investigate & Fix
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
