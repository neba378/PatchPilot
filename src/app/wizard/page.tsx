// src/app/wizard/page.tsx
'use client';

import { useState } from 'react';
import { Shield, CheckCircle, Github, MessageSquare, Terminal, Sliders, Play, Copy, Check } from 'lucide-react';

export default function SetupWizardPage() {
  const [step, setStep] = useState(1);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [testSent, setTestSent] = useState(false);

  const webhookBaseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

  const copyWebhookUrl = (path: string) => {
    navigator.clipboard.writeText(`${webhookBaseUrl}${path}`);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const sendTestIncident = async () => {
    setTestSent(true);
    try {
      await fetch('/api/webhooks/sentry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: {
            event_id: `test_${Date.now()}`,
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
        })
      });
      alert('Test incident dispatched successfully! Check the Live Incidents feed.');
    } catch (e) {
      alert('Failed to send test incident');
    } finally {
      setTestSent(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          PatchPilot Project Setup Wizard
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Connect your repository, configure telemetry log sources, and bind your on-call chat channel in 4 steps.
        </p>
      </div>

      {/* Steps Progress Bar */}
      <div className="grid grid-cols-4 gap-2 border-b border-slate-800 pb-4 text-xs font-semibold">
        {[
          { num: 1, title: 'GitHub Host' },
          { num: 2, title: 'Log Sources' },
          { num: 3, title: 'Telegram Channel' },
          { num: 4, title: 'Policy & Test' }
        ].map(s => (
          <button
            key={s.num}
            onClick={() => setStep(s.num)}
            className={`p-2.5 rounded-lg text-left transition-colors flex items-center gap-2 ${
              step === s.num
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
              step === s.num ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
            }`}>
              {s.num}
            </span>
            <span>{s.title}</span>
          </button>
        ))}
      </div>

      {/* Step 1: GitHub */}
      {step === 1 && (
        <div className="glass-panel p-6 rounded-xl border border-slate-800 space-y-4">
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <Github className="w-5 h-5 text-blue-400" />
            Connect GitHub Repository
          </h3>
          <p className="text-xs text-slate-400">
            PatchPilot uses Octokit with fine-grained tokens to read suspect commits and author draft pull requests.
          </p>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-300 mb-1 font-medium">Repository (owner/repo):</label>
              <input
                type="text"
                defaultValue="nebiyu-org/checkout-api-service"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-300 mb-1 font-medium">GitHub Personal Access Token (PAT):</label>
              <input
                type="password"
                placeholder="ghp_************************************"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 font-mono"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Leave blank to operate in local demo/fixture mode (zero credit card, zero credentials needed).
              </span>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              onClick={() => setStep(2)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold"
            >
              Continue to Log Sources →
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Log Sources */}
      {step === 2 && (
        <div className="glass-panel p-6 rounded-xl border border-slate-800 space-y-4">
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <Terminal className="w-5 h-5 text-cyan-400" />
            Configure Ingest Webhooks
          </h3>
          <p className="text-xs text-slate-400">
            Paste these endpoints into your monitoring tools. Incoming errors are automatically normalized and deduplicated.
          </p>

          <div className="space-y-4 text-xs">
            <div className="p-4 bg-slate-900/60 rounded-lg border border-slate-800 space-y-2">
              <span className="font-semibold text-slate-200 block">Sentry Webhook URL:</span>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-slate-950 rounded text-cyan-400 font-mono text-[11px] truncate">
                  {webhookBaseUrl}/api/webhooks/sentry
                </code>
                <button
                  onClick={() => copyWebhookUrl('/api/webhooks/sentry')}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs flex items-center gap-1"
                >
                  {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  Copy
                </button>
              </div>
            </div>

            <div className="p-4 bg-slate-900/60 rounded-lg border border-slate-800 space-y-2">
              <span className="font-semibold text-slate-200 block">GitHub Actions Webhook URL:</span>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-slate-950 rounded text-cyan-400 font-mono text-[11px] truncate">
                  {webhookBaseUrl}/api/webhooks/github-actions
                </code>
                <button
                  onClick={() => copyWebhookUrl('/api/webhooks/github-actions')}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs flex items-center gap-1"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-between">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs"
            >
              ← Back
            </button>
            <button
              onClick={() => setStep(3)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold"
            >
              Continue to Telegram →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Telegram */}
      {step === 3 && (
        <div className="glass-panel p-6 rounded-xl border border-slate-800 space-y-4">
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-emerald-400" />
            Connect Telegram Channel
          </h3>
          <p className="text-xs text-slate-400">
            Receive rich incident alert cards on Telegram with inline approval buttons: View Details, Accept & Patch, Reject, Snooze.
          </p>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-300 mb-1 font-medium">Telegram Bot Token (from @BotFather):</label>
              <input
                type="password"
                placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 font-mono"
              />
            </div>
            <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 text-slate-400">
              <span className="text-slate-300 font-semibold block mb-1">One-Time Link Token:</span>
              <p>Send <code className="text-emerald-400 font-bold">/start link_tok_99182a</code> to your bot to bind your chat group to this project.</p>
            </div>
          </div>

          <div className="pt-4 flex justify-between">
            <button
              onClick={() => setStep(2)}
              className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs"
            >
              ← Back
            </button>
            <button
              onClick={() => setStep(4)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold"
            >
              Continue to Policy & Test →
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Policy & Send Test Incident */}
      {step === 4 && (
        <div className="glass-panel p-6 rounded-xl border border-slate-800 space-y-5">
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-purple-400" />
            Governance Policy & Test Verification
          </h3>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-300 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>Hard Invariant Active: No PR will ever merge or deploy without explicit human approval.</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                <span className="text-slate-400 font-medium block">Autonomy Mode:</span>
                <span className="text-white font-bold block mt-1">DRAFT_PR (Safe Mode)</span>
              </div>
              <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                <span className="text-slate-400 font-medium block">Sandbox Engine:</span>
                <span className="text-white font-bold block mt-1">Isolated Sandbox (Snapshot Mode)</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <button
              onClick={() => setStep(3)}
              className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs"
            >
              ← Back
            </button>

            <button
              onClick={sendTestIncident}
              disabled={testSent}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {testSent ? 'Sending Test Event...' : 'Send Test Incident & Complete'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
