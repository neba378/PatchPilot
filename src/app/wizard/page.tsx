// src/app/wizard/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield,
  CheckCircle,
  FolderGit2,
  Cpu,
  Terminal,
  MessageSquare,
  Play,
  Copy,
  Check,
  ChevronRight,
  ArrowLeft,
  Sparkles
} from 'lucide-react';

export default function SetupWizardPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [createdProject, setCreatedProject] = useState<any>(null);

  // Form State
  const [projectName, setProjectName] = useState('Checkout Payment Service');
  const [repoOwner, setRepoOwner] = useState('neba378');
  const [repoName, setRepoName] = useState('test');
  const [defaultBranch, setDefaultBranch] = useState('main');

  const [githubToken, setGithubToken] = useState('');
  const [aiProvider, setAiProvider] = useState<'gemini' | 'openai' | 'anthropic' | 'gateway'>('gemini');
  const [aiModel, setAiModel] = useState('gemini-flash-latest');
  const [aiApiKey, setAiApiKey] = useState('');
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
          aiProvider,
          aiModel,
          aiApiKey,
          sentrySecret,
          telegramToken,
          telegramChatId
        })
      });

      const data = await res.json();
      if (data.success) {
        setCreatedProject(data);
        setStep(5);
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
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
          Project Creation & Resource Connector
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Create a project entity and connect your GitHub repo, AI provider (OpenAI / Anthropic / Gemini / Gateway), Sentry webhooks, and Telegram alerts.
        </p>
      </div>

      {/* Progress Steps Header */}
      <div className="grid grid-cols-4 gap-2 border-b border-slate-200/80 pb-4 text-xs font-semibold">
        {[
          { num: 1, title: 'Repository' },
          { num: 2, title: 'AI Provider' },
          { num: 3, title: 'Log Sources' },
          { num: 4, title: 'Telegram Alerts' }
        ].map(s => (
          <button
            key={s.num}
            onClick={() => setStep(s.num)}
            className={`p-2.5 rounded-xl text-left transition-all flex items-center gap-2.5 ${
              step === s.num
                ? 'bg-blue-50 text-blue-700 border border-blue-200 font-bold'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
              step === s.num ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
            }`}>
              {s.num}
            </span>
            <span className="truncate">{s.title}</span>
          </button>
        ))}
      </div>

      {/* Step 1: Repository Host (GitHub / GitLab) */}
      {step === 1 && (
        <div className="kanban-card p-6 rounded-2xl bg-white border border-slate-200/90 space-y-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <FolderGit2 className="w-4 h-4 text-blue-600" />
              Step 1: Project Details & Code Repository
            </h3>
            <span className="text-[11px] font-mono text-slate-400">Persisted to projects table</span>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-700 mb-1 font-semibold">Project Name:</label>
              <input
                type="text"
                value={projectName}
                onChange={e => setProjectName(e.target.value)}
                placeholder="e.g. Core Billing Microservice"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:bg-white focus:border-blue-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-700 mb-1 font-semibold">Repo Owner (User or Org):</label>
                <input
                  type="text"
                  value={repoOwner}
                  onChange={e => setRepoOwner(e.target.value)}
                  placeholder="e.g. neba378"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono focus:bg-white focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-700 mb-1 font-semibold">Repository Name:</label>
                <input
                  type="text"
                  value={repoName}
                  onChange={e => setRepoName(e.target.value)}
                  placeholder="e.g. test"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono focus:bg-white focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-700 mb-1 font-semibold">Default Branch:</label>
                <input
                  type="text"
                  value={defaultBranch}
                  onChange={e => setDefaultBranch(e.target.value)}
                  placeholder="main"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono focus:bg-white focus:border-blue-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 mb-1 font-semibold">
                GitHub Personal Access Token (PAT):
              </label>
              <input
                type="password"
                value={githubToken}
                onChange={e => setGithubToken(e.target.value)}
                placeholder="ghp_************************************ (requires 'repo' scope)"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono focus:bg-white focus:border-blue-500 outline-none"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Used by Octokit to create fix branches and open DRAFT pull requests. Stored encrypted in the database.
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              onClick={() => setStep(2)}
              className="px-5 py-2.5 bg-[#1d61f2] hover:bg-[#1554d8] text-white rounded-full text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
            >
              Next: Choose AI Provider
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: AI SDK Provider Abstraction */}
      {step === 2 && (
        <div className="kanban-card p-6 rounded-2xl bg-white border border-slate-200/90 space-y-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-purple-600" />
              Step 2: Choose AI Provider (ai-sdk.dev Abstraction)
            </h3>
            <span className="text-[11px] font-mono text-purple-600 font-bold bg-purple-50 px-2 py-0.5 rounded-full">
              Vercel AI SDK
            </span>
          </div>

          <p className="text-xs text-slate-500">
            PatchPilot uses the unified <strong>ai-sdk.dev</strong> abstraction. You can use any model provider without installing vendor-specific SDKs. Simply pick your provider, specify your model, and paste your API key.
          </p>

          {/* Provider Selection Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { id: 'gemini', name: 'Google Gemini', defaultModel: 'gemini-flash-latest', desc: 'Free Tier / Fast Flash' },
              { id: 'openai', name: 'OpenAI', defaultModel: 'gpt-4o-mini', desc: 'GPT-4o, o3-mini' },
              { id: 'anthropic', name: 'Anthropic', defaultModel: 'claude-3-5-sonnet-20241022', desc: 'Claude 3.5 Sonnet' },
              { id: 'gateway', name: 'Vercel Gateway', defaultModel: 'google/gemini-2.5-flash', desc: 'All Models (Unified)' }
            ].map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setAiProvider(p.id as any);
                  setAiModel(p.defaultModel);
                }}
                className={`p-3.5 rounded-2xl text-left border transition-all ${
                  aiProvider === p.id
                    ? 'bg-purple-50/80 border-purple-500 text-purple-900 shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <div className="font-bold text-xs text-slate-800">{p.name}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{p.desc}</div>
              </button>
            ))}
          </div>

          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 mb-1 font-semibold">
                  Selected Model ID:
                </label>
                <input
                  type="text"
                  value={aiModel}
                  onChange={e => setAiModel(e.target.value)}
                  placeholder="e.g. gemini-flash-latest, gpt-4o, claude-3-5-sonnet-20241022"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono focus:bg-white focus:border-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-semibold">
                  {aiProvider === 'gemini' ? 'Google Gemini API Key:' :
                   aiProvider === 'openai' ? 'OpenAI API Key:' :
                   aiProvider === 'anthropic' ? 'Anthropic API Key:' : 'Vercel AI Gateway Key:'}
                </label>
                <input
                  type="password"
                  value={aiApiKey}
                  onChange={e => setAiApiKey(e.target.value)}
                  placeholder={
                    aiProvider === 'gemini' ? 'Paste your Google Gemini API key (AIzaSy...)' :
                    aiProvider === 'openai' ? 'Paste your OpenAI API key (sk-...)' :
                    aiProvider === 'anthropic' ? 'Paste your Anthropic API key (sk-ant-...)' :
                    'Paste your Vercel AI Gateway key (vck_...)'
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono focus:bg-white focus:border-purple-500 outline-none"
                />
              </div>
            </div>

            <div className="p-3 bg-purple-50 border border-purple-200/60 rounded-xl text-purple-900 space-y-1">
              <span className="font-bold block text-xs">Unified AI SDK Driver:</span>
              <p className="text-[11px] text-slate-600">
                PatchPilot calls <code>generateObject</code> via <code>ai-sdk.dev</code> without needing any vendor-specific client libraries. Swap providers at any time with zero code modifications!
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-between">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 bg-slate-100 text-slate-600 hover:text-slate-900 rounded-full text-xs font-semibold"
            >
              ← Back
            </button>
            <button
              onClick={() => setStep(3)}
              className="px-5 py-2.5 bg-[#1d61f2] hover:bg-[#1554d8] text-white rounded-full text-xs font-bold shadow-sm transition-all"
            >
              Next: Connect Sentry Webhooks →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Log Sources (Sentry / Actions / Generic) */}
      {step === 3 && (
        <div className="kanban-card p-6 rounded-2xl bg-white border border-slate-200/90 space-y-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-600" />
              Step 3: Connect Telemetry & Error Logging (Sentry)
            </h3>
            <span className="text-[11px] font-mono text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-full font-bold">
              Vendor-Neutral Ingest
            </span>
          </div>

          <p className="text-xs text-slate-500">
            Configure Sentry integration and error webhooks. Incoming production errors are normalized and correlated with active git commits.
          </p>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-700 mb-1 font-semibold">
                Sentry Webhook Secret (HMAC SHA-256 verification):
              </label>
              <input
                type="password"
                value={sentrySecret}
                onChange={e => setSentrySecret(e.target.value)}
                placeholder="sentry-webhook-secret-token"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono focus:bg-white focus:border-cyan-500 outline-none"
              />
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
              <span className="font-semibold text-slate-700 block">Your Sentry Ingest URL:</span>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-cyan-700 font-mono text-[11px] truncate">
                  {webhookBaseUrl}/api/webhooks/sentry
                </code>
                <button
                  onClick={() => copyToClipboard(`${webhookBaseUrl}/api/webhooks/sentry`, 'sentry')}
                  className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1"
                >
                  {copiedUrl === 'sentry' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  Copy
                </button>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-between">
            <button
              onClick={() => setStep(2)}
              className="px-4 py-2 bg-slate-100 text-slate-600 hover:text-slate-900 rounded-full text-xs font-semibold"
            >
              ← Back
            </button>
            <button
              onClick={() => setStep(4)}
              className="px-5 py-2.5 bg-[#1d61f2] hover:bg-[#1554d8] text-white rounded-full text-xs font-bold shadow-sm transition-all"
            >
              Next: Connect Telegram Channel →
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Telegram Channel */}
      {step === 4 && (
        <div className="kanban-card p-6 rounded-2xl bg-white border border-slate-200/90 space-y-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              Step 4: Connect Telegram Alerts & Action Buttons
            </h3>
            <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">
              Telegram Bot API
            </span>
          </div>

          <p className="text-xs text-slate-500">
            Receive live incident alert cards on Telegram with 4 interactive buttons: View Details, Accept & Patch, Reject, Snooze.
          </p>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-700 mb-1 font-semibold">
                Telegram Bot Token (created via @BotFather):
              </label>
              <input
                type="password"
                value={telegramToken}
                onChange={e => setTelegramToken(e.target.value)}
                placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono focus:bg-white focus:border-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-700 mb-1 font-semibold">
                Your Telegram Chat ID:
              </label>
              <input
                type="text"
                value={telegramChatId}
                onChange={e => setTelegramChatId(e.target.value)}
                placeholder="e.g. 928614686"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono focus:bg-white focus:border-emerald-500 outline-none"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Tip: Send a message to your bot or message @userinfobot on Telegram to get your Chat ID.
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
            <button
              onClick={() => setStep(3)}
              className="px-4 py-2 bg-slate-100 text-slate-600 hover:text-slate-900 rounded-full text-xs font-semibold"
            >
              ← Back
            </button>
            <button
              onClick={handleCreateProject}
              disabled={saving}
              className="px-6 py-2.5 bg-[#1d61f2] hover:bg-[#1554d8] text-white rounded-full text-xs font-bold shadow-md shadow-blue-500/20 disabled:opacity-50 flex items-center gap-2"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {saving ? 'Creating & Connecting...' : 'Save & Create Project in Database'}
            </button>
          </div>
        </div>
      )}

      {/* Step 5: Success & Generated Webhook Endpoints */}
      {step === 5 && createdProject && (
        <div className="kanban-card p-8 rounded-2xl border border-emerald-200 bg-emerald-50/50 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-600">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Project Created & Resources Connected!</h2>
              <p className="text-xs text-slate-600 mt-0.5 font-mono">
                Project ID: <span className="text-emerald-700 font-bold">{createdProject.projectId}</span> | Repo: {createdProject.project.repo}
              </p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <span className="text-slate-700 font-bold block">Generated Webhook Endpoints for this Project:</span>

            <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-slate-500 text-[11px] block">Sentry Ingest URL:</span>
                <code className="text-cyan-700 font-mono text-[11px]">{webhookBaseUrl}{createdProject.webhookUrls.sentry}</code>
              </div>
              <button
                onClick={() => copyToClipboard(`${webhookBaseUrl}${createdProject.webhookUrls.sentry}`, 'sentry_final')}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1"
              >
                {copiedUrl === 'sentry_final' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                Copy
              </button>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-slate-500 text-[11px] block">GitHub Actions Ingest URL:</span>
                <code className="text-cyan-700 font-mono text-[11px]">{webhookBaseUrl}{createdProject.webhookUrls.githubActions}</code>
              </div>
              <button
                onClick={() => copyToClipboard(`${webhookBaseUrl}${createdProject.webhookUrls.githubActions}`, 'gha_final')}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1"
              >
                {copiedUrl === 'gha_final' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                Copy
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-emerald-200/60 flex items-center justify-between">
            <button
              onClick={() => router.push('/')}
              className="px-5 py-2.5 bg-[#1d61f2] hover:bg-[#1554d8] text-white rounded-full text-xs font-bold"
            >
              Go to Live Board →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
