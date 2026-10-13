// src/app/settings/page.tsx
'use client';

import { useState } from 'react';
import { Shield, Lock, Sliders, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';

export default function SettingsPage() {
  const [autonomyLevel, setAutonomyLevel] = useState('draft_pr');
  const [circuitTripped, setCircuitTripped] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          Governance & Safety Policy Settings
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Configure security invariants, protected paths, blast radius limits, and circuit breaker tripwires.
        </p>
      </div>

      {/* Hard Invariant Banner */}
      <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 space-y-1">
        <span className="font-bold uppercase tracking-wider flex items-center gap-1.5 text-blue-200">
          <Shield className="w-4 h-4 text-blue-400" />
          Enforced Hard Invariant
        </span>
        <p className="text-slate-300">
          PatchPilot is structurally prohibited from executing <code className="text-blue-300 font-bold">git merge</code> or deploying code to any environment. All automated remediation strictly terminates at a <code className="text-blue-300 font-bold">DRAFT Pull Request</code>.
        </p>
      </div>

      {/* Autonomy Level */}
      <div className="glass-panel p-6 rounded-xl border border-slate-800 space-y-4">
        <h3 className="text-base font-semibold text-white flex items-center gap-2">
          <Sliders className="w-5 h-5 text-cyan-400" />
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
                  ? 'border-blue-500 bg-blue-500/10 text-white'
                  : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-sm text-slate-200">{opt.title}</span>
                {autonomyLevel === opt.id && <CheckCircle className="w-4 h-4 text-blue-400" />}
              </div>
              <p className="text-[11px] leading-relaxed text-slate-400">{opt.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Protected Paths Blacklist */}
      <div className="glass-panel p-6 rounded-xl border border-slate-800 space-y-4">
        <h3 className="text-base font-semibold text-white flex items-center gap-2">
          <Lock className="w-5 h-5 text-purple-400" />
          Protected Repository Paths (Blacklist)
        </h3>
        <p className="text-xs text-slate-400">
          The agent is forbidden from reading or mutating any files matching these glob patterns.
        </p>

        <div className="space-y-2 font-mono text-xs">
          {['migrations/**', 'infra/**', '.github/workflows/**', 'security/**', '.env', 'config/secrets'].map((p, i) => (
            <div key={i} className="flex items-center justify-between p-2.5 bg-slate-900 rounded-lg border border-slate-800 text-slate-300">
              <span>{p}</span>
              <span className="text-[10px] uppercase font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                Protected
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Blast Radius & Budget Limits */}
      <div className="glass-panel p-6 rounded-xl border border-slate-800 space-y-4">
        <h3 className="text-base font-semibold text-white">Blast Radius & Resource Budgets</h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
          <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
            <span className="text-slate-500 block text-[11px]">Max Changed Files:</span>
            <span className="text-slate-200 text-base font-bold">3 Files</span>
          </div>
          <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
            <span className="text-slate-500 block text-[11px]">Max Changed Lines:</span>
            <span className="text-slate-200 text-base font-bold">60 Lines</span>
          </div>
          <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
            <span className="text-slate-500 block text-[11px]">Max Retries / Fix:</span>
            <span className="text-slate-200 text-base font-bold">2 Retries</span>
          </div>
          <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
            <span className="text-slate-500 block text-[11px]">Free Tier RPM:</span>
            <span className="text-slate-200 text-base font-bold">10 RPM</span>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-colors shadow-lg shadow-blue-500/20"
        >
          {saved ? 'Policy Saved Successfully!' : 'Save Policy Changes'}
        </button>
      </div>
    </div>
  );
}
