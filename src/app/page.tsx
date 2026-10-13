// src/app/page.tsx
'use client';

import { useState, useEffect } from 'react';
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
  Server
} from 'lucide-react';

export default function DashboardPage() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>({
    totalIncidents: 0,
    awaitingReview: 0,
    prsOpen: 0,
    verifiedResolved: 0,
    fixPassRate: 100,
    meanTimeToResolveMinutes: 3.4
  });
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('ALL');
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
    const interval = setInterval(fetchDashboardData, 3000); // 3-second live refresh
    return () => clearInterval(interval);
  }, []);

  const triggerSimulation = async (type: 'sentry' | 'actions' | 'generic') => {
    setSimulating(type);
    try {
      const res = await fetch(`/api/webhooks/${type === 'actions' ? 'github-actions' : type}`, {
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

  const filteredIncidents = incidents.filter(inc => {
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'AWAITING') return inc.status === 'awaiting_approval';
    if (activeFilter === 'FIXING') return inc.status === 'fixing' || inc.status === 'validating';
    if (activeFilter === 'PR_OPEN') return inc.status === 'pr_open';
    if (activeFilter === 'RESOLVED') return inc.status === 'verified_resolved';
    if (activeFilter === 'ABSTAINED') return inc.status === 'abstained';
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Top Header & Simulation Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 rounded-xl p-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Incident Operations Center
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time telemetry ingestion, adversarial root cause investigation, and sandbox-proven hotfixes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => triggerSimulation('sentry')}
            disabled={Boolean(simulating)}
            className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            {simulating === 'sentry' ? 'Simulating...' : 'Simulate Sentry (500)'}
          </button>
          <button
            onClick={() => triggerSimulation('actions')}
            disabled={Boolean(simulating)}
            className="px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <Server className="w-3.5 h-3.5" />
            {simulating === 'actions' ? 'Simulating...' : 'Simulate CI Failure'}
          </button>
          <button
            onClick={fetchDashboardData}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
            title="Refresh feed"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Detected</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2 font-mono">{metrics.totalIncidents}</p>
          <span className="text-[11px] text-slate-500 mt-1 block">Cross-tool correlated</span>
        </div>

        <div className="glass-panel p-5 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Awaiting Approval</span>
            <Clock className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-blue-400 mt-2 font-mono">{metrics.awaitingReview}</p>
          <span className="text-[11px] text-slate-500 mt-1 block">Human review gate</span>
        </div>

        <div className="glass-panel p-5 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Draft PRs Proven</span>
            <GitPullRequest className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-bold text-cyan-400 mt-2 font-mono">{metrics.prsOpen}</p>
          <span className="text-[11px] text-slate-500 mt-1 block">Mutation test verified</span>
        </div>

        <div className="glass-panel p-5 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Mean Time To Fix</span>
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400 mt-2 font-mono">{metrics.meanTimeToResolveMinutes}m</p>
          <span className="text-[11px] text-slate-500 mt-1 block">Down from 18.4 days</span>
        </div>
      </div>

      {/* Incident Feed Controls */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-semibold text-slate-200">Filter Incidents:</span>
          </div>

          <div className="flex items-center space-x-1.5 bg-slate-900/80 p-1 rounded-lg border border-slate-800 text-xs">
            {['ALL', 'AWAITING', 'FIXING', 'PR_OPEN', 'RESOLVED', 'ABSTAINED'].map(filterKey => (
              <button
                key={filterKey}
                onClick={() => setActiveFilter(filterKey)}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  activeFilter === filterKey
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {filterKey.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Incident List */}
        {loading ? (
          <div className="text-center py-16 text-slate-500 font-mono text-sm">
            Loading telemetry feed...
          </div>
        ) : filteredIncidents.length === 0 ? (
          <div className="text-center py-16 glass-panel rounded-xl border border-slate-800">
            <p className="text-slate-400 text-sm">No incidents match the selected filter.</p>
            <p className="text-xs text-slate-500 mt-1">Use the simulation buttons above to trigger a live failure.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredIncidents.map(inc => {
              const statusPill =
                inc.status === 'awaiting_approval' ? { bg: 'bg-blue-500/10 text-blue-400 border-blue-500/30', label: 'Awaiting Review' } :
                inc.status === 'fixing' || inc.status === 'validating' ? { bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30', label: 'Sandbox Fixing' } :
                inc.status === 'pr_open' ? { bg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30', label: 'DRAFT PR Open' } :
                inc.status === 'verified_resolved' ? { bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', label: 'Verified Resolved' } :
                inc.status === 'abstained' ? { bg: 'bg-purple-500/10 text-purple-400 border-purple-500/30', label: 'Abstained (Policy)' } :
                { bg: 'bg-slate-500/10 text-slate-400 border-slate-500/30', label: inc.status };

              const severityPill =
                inc.severity === 'critical' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' :
                inc.severity === 'high' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';

              return (
                <div
                  key={inc.id}
                  className="glass-panel p-5 rounded-xl border border-slate-800/80 hover:border-blue-500/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-slate-400">{inc.id}</span>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${severityPill}`}>
                        {inc.severity}
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${statusPill.bg}`}>
                        {statusPill.label}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800/80 text-slate-400 border border-slate-700">
                        {inc.source}
                      </span>
                      {inc.occurrences > 1 && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                          {inc.occurrences}x correlated
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-semibold text-white tracking-tight">
                      {inc.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 font-mono">
                      <span>Commit: <span className="text-slate-300">{inc.commitSha ? inc.commitSha.slice(0, 7) : 'HEAD'}</span></span>
                      <span>Env: <span className="text-slate-300">{inc.environment}</span></span>
                      <span>Detected: <span className="text-slate-300">{new Date(inc.detectedAt).toLocaleTimeString()}</span></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Link
                      href={`/incidents/${inc.id}`}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
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
  );
}
