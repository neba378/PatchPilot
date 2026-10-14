// src/app/settings/page.tsx
'use client';

import { useState } from 'react';
import { Shield, Lock, Sliders, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';

export default function SettingsPage() {
  const [autonomyLevel, setAutonomyLevel] = useState('draft_pr');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
          Governance & Safety Policy Settings
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure security invariants, protected paths, blast radius limits, and circuit breaker tripwires.
        </p>
      </div>

      {/* Hard Invariant Banner */}
      <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/80 text-xs text-blue-900 space-y-1">
        <span className="font-bold uppercase tracking-wider flex items-center gap-1.5 text-blue-700">
          <Shield className="w-4 h-4 text-blue-600" />
          Enforced Hard Invariant
        </span>
        <p className="text-slate-600">
          PatchPilot is structurally prohibited from executing <code className="text-blue-700 font-bold bg-white px-1.5 py-0.5 rounded border border-blue-200">git merge</code> or deploying code to any environment. All automated remediation strictly terminates at a <code className="text-blue-700 font-bold bg-white px-1.5 py-0.5 rounded border border-blue-200">DRAFT Pull Request</code>.
        </p>
      </div>

      {/* Autonomy Level */}
      <div className="kanban-card p-6 rounded-2xl bg-white border border-slate-200/90 space-y-4 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-blue-600" />
          Agent Autonomy Mode
        </h3>

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
          ].map(opt => (
            <div
              key={opt.id}
              onClick={() => setAutonomyLevel(opt.id)}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                autonomyLevel === opt.id
                  ? 'border-blue-600 bg-blue-50/60 text-slate-900 shadow-sm'
                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-xs text-slate-800">{opt.title}</span>
                {autonomyLevel === opt.id && <CheckCircle className="w-4 h-4 text-blue-600" />}
              </div>
              <p className="text-[11px] leading-relaxed text-slate-500">{opt.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Protected Paths Blacklist */}
      <div className="kanban-card p-6 rounded-2xl bg-white border border-slate-200/90 space-y-4 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Lock className="w-4 h-4 text-purple-600" />
          Protected Repository Paths (Blacklist)
        </h3>
        <p className="text-xs text-slate-500">
          The agent is forbidden from reading or mutating any files matching these glob patterns.
        </p>

        <div className="space-y-2 font-mono text-xs">
          {['migrations/**', 'infra/**', '.github/workflows/**', 'security/**', '.env', 'config/secrets'].map((p, i) => (
            <div key={i} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-700">
              <span>{p}</span>
              <span className="text-[10px] uppercase font-bold text-[#c62828] bg-[#ffebee] px-2 py-0.5 rounded-full border border-[#ffcdd2]">
                Protected
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Blast Radius & Budget Limits */}
      <div className="kanban-card p-6 rounded-2xl bg-white border border-slate-200/90 space-y-4 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800">Blast Radius & Resource Budgets</h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-400 block text-[11px]">Max Changed Files:</span>
            <span className="text-slate-800 text-sm font-bold">3 Files</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-400 block text-[11px]">Max Changed Lines:</span>
            <span className="text-slate-800 text-sm font-bold">60 Lines</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-400 block text-[11px]">Max Retries / Fix:</span>
            <span className="text-slate-800 text-sm font-bold">2 Retries</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-400 block text-[11px]">Free Tier RPM:</span>
            <span className="text-slate-800 text-sm font-bold">10 RPM</span>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="px-6 py-2.5 bg-[#1d61f2] hover:bg-[#1554d8] text-white rounded-full text-xs font-bold transition-all shadow-sm"
        >
          {saved ? 'Policy Saved Successfully!' : 'Save Policy Changes'}
        </button>
      </div>
    </div>
  );
}
