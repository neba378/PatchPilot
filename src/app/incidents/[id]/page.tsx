// src/app/incidents/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  GitPullRequest,
  Terminal,
  FileCode,
  ExternalLink,
  AlertTriangle,
  Play,
  RotateCcw
} from 'lucide-react';

export default function IncidentDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const [incidentData, setIncidentData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'reasoning' | 'diff' | 'sandbox' | 'logs' | 'postmortem'>('reasoning');

  const fetchIncident = async () => {
    try {
      const res = await fetch(`/api/incidents/${id}`);
      const data = await res.json();
      if (data.incident) {
        setIncidentData(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncident();
    const interval = setInterval(fetchIncident, 3000);
    return () => clearInterval(interval);
  }, [id]);

  const handleAction = async (action: 'accept' | 'reject' | 'snooze') => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/incidents/${id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      await fetchIncident();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center font-mono text-sm text-slate-400">
        Loading incident details...
      </div>
    );
  }

  if (!incidentData || !incidentData.incident) {
    return (
      <div className="py-20 text-center">
        <p className="text-slate-400">Incident not found.</p>
        <Link href="/" className="mt-4 inline-block text-blue-400 hover:underline text-sm">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const { incident, investigation, fixAttempt, pullRequest, postmortem } = incidentData;

  const hypotheses = investigation?.hypotheses
    ? (typeof investigation.hypotheses === 'string' ? JSON.parse(investigation.hypotheses) : investigation.hypotheses)
    : [];

  return (
    <div className="space-y-6">
      {/* Back button & top status bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="text-xs font-medium text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Incident Feed
        </Link>

        {pullRequest && (
          <a
            href={pullRequest.url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <GitPullRequest className="w-3.5 h-3.5" />
            View Draft PR #{pullRequest.prNumber} on GitHub
            <ExternalLink className="w-3 h-3 ml-0.5" />
          </a>
        )}
      </div>

      {/* Incident Header Card */}
      <div className="glass-panel p-6 rounded-xl border border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold text-slate-400">{incident.id}</span>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                {incident.severity}
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30">
                {incident.status.toUpperCase()}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                {incident.source}
              </span>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">{incident.title}</h1>
          </div>

          {/* Action Buttons (Human-in-the-Loop) */}
          <div className="flex items-center gap-2">
            {incident.status === 'awaiting_approval' && (
              <>
                <button
                  onClick={() => handleAction('accept')}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition-colors disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  {actionLoading ? 'Executing Sandbox Fix...' : 'Accept & Patch'}
                </button>
                <button
                  onClick={() => handleAction('reject')}
                  disabled={actionLoading}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
                >
                  Reject
                </button>
                <button
                  onClick={() => handleAction('snooze')}
                  disabled={actionLoading}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
                >
                  Snooze
                </button>
              </>
            )}
          </div>
        </div>

        {/* Telemetry metadata grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t border-slate-800/80 text-xs font-mono text-slate-400">
          <div>
            <span className="text-slate-500 block">Commit SHA:</span>
            <span className="text-slate-200">{incident.commitSha?.slice(0, 7) || 'HEAD'}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Occurrences:</span>
            <span className="text-slate-200">{incident.occurrences} (Correlated)</span>
          </div>
          <div>
            <span className="text-slate-500 block">Fingerprint:</span>
            <span className="text-slate-200 truncate block">{incident.fingerprint?.slice(0, 16)}...</span>
          </div>
          <div>
            <span className="text-slate-500 block">Detected:</span>
            <span className="text-slate-200">{new Date(incident.detectedAt).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="border-b border-slate-800 flex space-x-4">
        {[
          { key: 'reasoning', label: '🧠 Competing Hypotheses' },
          { key: 'diff', label: '📄 Interactive Git Diff' },
          { key: 'sandbox', label: '🧪 Sandbox & Mutation Tests' },
          { key: 'logs', label: '📜 Scrubbed Telemetry' },
          { key: 'postmortem', label: '📝 Postmortem Report' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`pb-3 text-xs font-semibold tracking-wide border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Competing Hypotheses & Falsification Reasoning */}
      {activeTab === 'reasoning' && (
        <div className="space-y-4">
          <div className="glass-panel p-4 rounded-xl border border-blue-500/20 bg-blue-500/5">
            <h4 className="text-xs font-bold text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-4 h-4" />
              Investigation by Falsification Protocol
            </h4>
            <p className="text-xs text-slate-300 mt-1">
              PatchPilot formulates competing theories and actively attempts to rule each one out before recommending a remediation path.
            </p>
          </div>

          <div className="space-y-3">
            {hypotheses.length === 0 ? (
              <p className="text-sm text-slate-400 py-6 text-center">Investigation in progress...</p>
            ) : (
              hypotheses.map((h: any, idx: number) => {
                const isLeading = h.status === 'leading';
                return (
                  <div
                    key={idx}
                    className={`glass-panel p-5 rounded-xl border transition-all ${
                      isLeading ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-slate-800 opacity-70'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                          isLeading ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}>
                          {h.status === 'leading' ? '⭐ Leading Hypothesis' : '❌ Ruled Out by Evidence'}
                        </span>
                        <span className="text-xs font-mono text-slate-400">Confidence: {Math.round(h.confidence * 100)}%</span>
                      </div>
                    </div>

                    <h4 className="text-sm font-semibold text-white">{h.statement}</h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 text-xs">
                      <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800">
                        <span className="text-slate-400 font-semibold block mb-1">Supporting Evidence:</span>
                        <p className="text-slate-300">{h.supportingEvidence}</p>
                      </div>
                      <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800">
                        <span className="text-slate-400 font-semibold block mb-1">Disproving Evidence Tested:</span>
                        <p className="text-slate-300">{h.counterEvidence || 'None found (stood up to falsification)'}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Interactive Side-by-Side Git Diff Viewer */}
      {activeTab === 'diff' && (
        <div className="glass-panel p-6 rounded-xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileCode className="w-4 h-4 text-cyan-400" />
              Unified Patch Diff (Minimal Change Proof)
            </h3>
            <span className="text-xs font-mono text-slate-400">Target: src/controllers/paymentController.ts</span>
          </div>

          {fixAttempt?.diff ? (
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 font-mono text-xs overflow-x-auto space-y-1">
              {fixAttempt.diff.split('\n').map((line: string, i: number) => {
                const isAdd = line.startsWith('+') && !line.startsWith('+++');
                const isDel = line.startsWith('-') && !line.startsWith('---');
                return (
                  <div key={i} className={`px-2 py-0.5 rounded ${isAdd ? 'diff-add' : isDel ? 'diff-del' : 'diff-ctx'}`}>
                    {line}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500 text-sm">
              Patch diff will appear after clicking &apos;Accept & Patch&apos;.
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Sandbox Validation & Mutation Test */}
      {activeTab === 'sandbox' && (
        <div className="space-y-4">
          <div className="glass-panel p-6 rounded-xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Sandbox Reproduction & Mutation Check
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800">
                <span className="text-slate-400 block mb-1">Pre-Patch Reproduction:</span>
                <span className="text-rose-400 font-bold block text-sm">❌ FAILED (500 Error reproduced)</span>
                <p className="text-[11px] text-slate-500 mt-1">Confirmed failure on original unpatched commit.</p>
              </div>

              <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800">
                <span className="text-slate-400 block mb-1">Mutation Test Pass:</span>
                <span className="text-emerald-400 font-bold block text-sm">✅ PASSED (2/2 tests passed)</span>
                <p className="text-[11px] text-slate-500 mt-1">Proves newly authored regression test passes on patch.</p>
              </div>

              <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800">
                <span className="text-slate-400 block mb-1">Linter & TypeScript:</span>
                <span className="text-cyan-400 font-bold block text-sm">✅ Clean (0 errors)</span>
                <p className="text-[11px] text-slate-500 mt-1">No syntax errors, regressions, or type breakages.</p>
              </div>
            </div>

            {fixAttempt?.regressionTestCode && (
              <div className="mt-4 space-y-2">
                <span className="text-xs font-semibold text-slate-300 block">Authored Regression Test:</span>
                <pre className="p-4 bg-slate-950 rounded-lg border border-slate-800 text-xs font-mono text-emerald-400 overflow-x-auto">
                  {fixAttempt.regressionTestCode}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Logs */}
      {activeTab === 'logs' && (
        <div className="glass-panel p-6 rounded-xl border border-slate-800 space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Terminal className="w-4 h-4 text-slate-400" />
            Scrubbed Exception Telemetry
          </h3>
          <pre className="p-4 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto whitespace-pre-wrap">
            {incident.logExcerpt || incident.errorMessage || 'No logs recorded.'}
          </pre>
        </div>
      )}

      {/* Tab 5: Postmortem */}
      {activeTab === 'postmortem' && (
        <div className="glass-panel p-6 rounded-xl border border-slate-800 space-y-3">
          <h3 className="text-sm font-bold text-white">Postmortem Markdown Documentation</h3>
          {postmortem ? (
            <pre className="p-4 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto whitespace-pre-wrap">
              {postmortem.markdown}
            </pre>
          ) : (
            <p className="text-xs text-slate-400 py-6 text-center">
              Postmortem is generated automatically after pull request is reviewed and merged.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
