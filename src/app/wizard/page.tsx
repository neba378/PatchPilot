// src/app/wizard/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield,
  CheckCircle,
  Github,
  MessageSquare,
  Terminal,
  Sliders,
  Play,
  Copy,
  Check,
  Cpu,
  Key,
  FolderGit2,
  ExternalLink
} from 'lucide-react';

export default function SetupWizardPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [createdProject, setCreatedProject] = useState<any>(null);

  // Form State
  const [projectName, setProjectName] = useState('Checkout Payment Service');
  const [repoOwner, setRepoOwner] = useState('nebiyu-org');
  const [repoName, setRepoName] = useState('checkout-api-service');
  const [defaultBranch, setDefaultBranch] = useState('main');

  const [githubToken, setGithubToken] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [sentrySecret, setSentrySecret] = useState('');
  const [telegramToken, setTelegramToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');

  const webhookBaseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(id);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const handleCreateProject = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: projectName,
          repoOwner,
          repoName,
          defaultBranch,
          githubToken,
          geminiApiKey,
          sentrySecret,
          telegramToken,
          telegramChatId
        })
      });

      const data = await res.json();
      if (data.success) {
        setCreatedProject(data);
        setStep(5); // Completion step
      } else {
        alert(data.error || 'Failed to create project');
      }
    } catch (e: any) {
      alert(`Error creating project: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          Project Creation & Resource Connector
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Create a project entity in the SQLite database and connect your GitHub repo, Gemini AI key, Sentry webhooks, and Telegram alerts.
        </p>
      </div>

      {/* Progress Steps Header */}
      <div className="grid grid-cols-4 gap-2 border-b border-slate-800 pb-4 text-xs font-semibold">
        {[
          { num: 1, title: '1. Repository Host' },
          { num: 2, title: '2. Gemini AI Key' },
          { num: 3, title: '3. Log Sources (Sentry)' },
          { num: 4, title: '4. Telegram Alerts' }
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
            <span className="truncate">{s.title}</span>
          </button>
        ))}
      </div>

      {/* Step 1: Repository Host (GitHub / GitLab) */}
      {step === 1 && (
        <div className="glass-panel p-6 rounded-xl border border-slate-800 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <FolderGit2 className="w-5 h-5 text-blue-400" />
              Step 1: Project Details & Code Repository
            </h3>
            <span className="text-[11px] font-mono text-slate-500">Persisted to `projects` table</span>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 mb-1 font-semibold">Project Name:</label>
              <input
                type="text"
                value={projectName}
                onChange={e => setProjectName(e.target.value)}
                placeholder="e.g. Core Billing Microservice"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 font-medium focus:border-blue-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Repo Owner (User or Org):</label>
                <input
                  type="text"
                  value={repoOwner}
                  onChange={e => setRepoOwner(e.target.value)}
                  placeholder="e.g. nebiyu-org"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Repository Name:</label>
                <input
                  type="text"
                  value={repoName}
                  onChange={e => setRepoName(e.target.value)}
                  placeholder="e.g. checkout-api-service"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Default Branch:</label>
                <input
                  type="text"
                  value={defaultBranch}
                  onChange={e => setDefaultBranch(e.target.value)}
                  placeholder="main"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-semibold">
                GitHub Personal Access Token (PAT):
              </label>
              <input
                type="password"
                value={githubToken}
                onChange={e => setGithubToken(e.target.value)}
                placeholder="ghp_************************************ (requires 'repo' scope)"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 font-mono focus:border-blue-500 outline-none"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Used by Octokit to create fix branches and open DRAFT pull requests. Stored encrypted in the database.
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end">
            <button
              onClick={() => setStep(2)}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold"
            >
              Next: Connect Gemini AI →
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Gemini AI Key */}
      {step === 2 && (
        <div className="glass-panel p-6 rounded-xl border border-slate-800 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Cpu className="w-5 h-5 text-purple-400" />
              Step 2: Connect Google Gemini API
            </h3>
            <span className="text-[11px] font-mono text-purple-400">Gemini 2.5 Flash Free Tier</span>
          </div>

          <p className="text-xs text-slate-400">
            PatchPilot uses Google Gemini 2.5 Flash (free tier from Google AI Studio) to perform adversarial falsification analysis, diagnose root causes, and author regression tests.
          </p>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 mb-1 font-semibold">
                Google Gemini API Key:
              </label>
              <input
                type="password"
                value={geminiApiKey}
                onChange={e => setGeminiApiKey(e.target.value)}
                placeholder="AIzaSy***********************************"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 font-mono focus:border-purple-500 outline-none"
              />
              <span className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1">
                Don&apos;t have one? Generate for free without credit card at
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline inline-flex items-center gap-0.5"
                >
                  aistudio.google.com <ExternalLink className="w-3 h-3" />
                </a>
              </span>
            </div>

            <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg text-purple-300 space-y-1">
              <span className="font-bold block">Free Tier Rate Limiter Guard:</span>
              <p className="text-[11px] text-slate-300">
                The engine enforces a token-bucket rate limiter of 10 requests per minute and 250 requests per day, ensuring 100% compliance with Google AI Studio free limits.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-between">
            <button onClick={() => setStep(1)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs">
              ← Back
            </button>
            <button
              onClick={() => setStep(3)}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold"
            >
              Next: Connect Sentry Webhooks →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Log Sources (Sentry / Actions / Generic) */}
      {step === 3 && (
        <div className="glass-panel p-6 rounded-xl border border-slate-800 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Terminal className="w-5 h-5 text-cyan-400" />
              Step 3: Connect Telemetry & Error Logging (Sentry)
            </h3>
            <span className="text-[11px] font-mono text-cyan-400">Vendor-Neutral Ingest</span>
          </div>

          <p className="text-xs text-slate-400">
            Configure Sentry integration and error webhooks. Incoming production errors are normalized and correlated with active git commits.
          </p>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 mb-1 font-semibold">
                Sentry Webhook Secret (HMAC SHA-256 verification):
              </label>
              <input
                type="password"
                value={sentrySecret}
                onChange={e => setSentrySecret(e.target.value)}
                placeholder="sentry-webhook-secret-token"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 font-mono focus:border-cyan-500 outline-none"
              />
            </div>

            <div className="p-4 bg-slate-900/60 rounded-lg border border-slate-800 space-y-2">
              <span className="font-semibold text-slate-200 block">Your Sentry Ingest URL:</span>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-slate-950 rounded text-cyan-400 font-mono text-[11px] truncate">
                  {webhookBaseUrl}/api/webhooks/sentry
                </code>
                <button
                  onClick={() => copyToClipboard(`${webhookBaseUrl}/api/webhooks/sentry`, 'sentry')}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs flex items-center gap-1"
                >
                  {copiedUrl === 'sentry' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  Copy
                </button>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-between">
            <button onClick={() => setStep(2)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs">
              ← Back
            </button>
            <button
              onClick={() => setStep(4)}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold"
            >
              Next: Connect Telegram Channel →
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Telegram Channel */}
      {step === 4 && (
        <div className="glass-panel p-6 rounded-xl border border-slate-800 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-emerald-400" />
              Step 4: Connect Telegram Alerts & Action Buttons
            </h3>
            <span className="text-[11px] font-mono text-emerald-400">Chat SDK / Telegram Bot</span>
          </div>

          <p className="text-xs text-slate-400">
            Receive live incident alert cards on Telegram with 4 interactive buttons: View Details, Accept & Patch, Reject, Snooze.
          </p>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 mb-1 font-semibold">
                Telegram Bot Token (created via @BotFather on Telegram):
              </label>
              <input
                type="password"
                value={telegramToken}
                onChange={e => setTelegramToken(e.target.value)}
                placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 font-mono focus:border-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-semibold">
                Your Telegram Chat ID:
              </label>
              <input
                type="text"
                value={telegramChatId}
                onChange={e => setTelegramChatId(e.target.value)}
                placeholder="e.g. 123456789 or group ID -100123456789"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 font-mono focus:border-emerald-500 outline-none"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Tip: Send a message to your bot or message @userinfobot on Telegram to get your Chat ID.
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
            <button onClick={() => setStep(3)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs">
              ← Back
            </button>
            <button
              onClick={handleCreateProject}
              disabled={saving}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-lg text-xs font-bold shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center gap-2"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {saving ? 'Creating & Connecting...' : 'Save & Create Project in Database'}
            </button>
          </div>
        </div>
      )}

      {/* Step 5: Success & Generated Webhook Endpoints */}
      {step === 5 && createdProject && (
        <div className="glass-panel p-8 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Project Created & Resources Connected!</h2>
              <p className="text-xs text-slate-300 mt-0.5 font-mono">
                Project ID: <span className="text-emerald-400">{createdProject.projectId}</span> | Repo: {createdProject.project.repo}
              </p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <span className="text-slate-300 font-semibold block">Generated Webhook Endpoints for this Project:</span>

            <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-slate-400 text-[11px] block">Sentry Ingest URL:</span>
                <code className="text-cyan-400 font-mono text-[11px]">{webhookBaseUrl}{createdProject.webhookUrls.sentry}</code>
              </div>
              <button
                onClick={() => copyToClipboard(`${webhookBaseUrl}${createdProject.webhookUrls.sentry}`, 'sentry_final')}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs flex items-center gap-1"
              >
                {copiedUrl === 'sentry_final' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                Copy
              </button>
            </div>

            <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-slate-400 text-[11px] block">GitHub Actions Ingest URL:</span>
                <code className="text-cyan-400 font-mono text-[11px]">{webhookBaseUrl}{createdProject.webhookUrls.githubActions}</code>
              </div>
              <button
                onClick={() => copyToClipboard(`${webhookBaseUrl}${createdProject.webhookUrls.githubActions}`, 'gha_final')}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs flex items-center gap-1"
              >
                {copiedUrl === 'gha_final' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                Copy
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <button
              onClick={() => router.push('/')}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold"
            >
              Go to Live Incidents Cockpit →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
