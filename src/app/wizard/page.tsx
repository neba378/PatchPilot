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
  ExternalLink,
  ArrowRight,
  ArrowLeft,
  Sparkles
} from 'lucide-react';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

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
      <div className="space-y-1">
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          Project Creation & Resource Connector
        </h1>
        <p className="text-xs text-muted-foreground">
          Create a project entity in SQLite and connect GitHub repo, Gemini AI key, Sentry webhooks, and Telegram alerts.
        </p>
      </div>

      {/* Stepper Header Block */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 border-b border-border/60 pb-4">
        {[
          { num: 1, title: 'Repository Host', icon: FolderGit2 },
          { num: 2, title: 'Gemini AI Studio', icon: Cpu },
          { num: 3, title: 'Sentry Telemetry', icon: Terminal },
          { num: 4, title: 'Telegram Channel', icon: MessageSquare }
        ].map((s) => (
          <button
            key={s.num}
            onClick={() => setStep(s.num)}
            className={`p-3 rounded-lg text-left transition-all border flex items-center gap-2.5 ${
              step === s.num
                ? 'bg-primary/10 border-primary/40 text-foreground'
                : 'bg-card border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/40'
            }`}
          >
            <span
              className={`size-6 rounded-full flex items-center justify-center text-xs font-bold ${
                step === s.num ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}
            >
              {s.num}
            </span>
            <div className="truncate">
              <span className="block text-xs font-medium truncate">{s.title}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Step 1: Repository Host (GitHub) */}
      {step === 1 && (
        <Card className="border-border/80">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <FolderGit2 className="size-5 text-blue-400" />
                Step 1: Project Details & Code Repository
              </CardTitle>
              <Badge variant="outline" className="font-mono text-[10px]">
                `projects` SQLite table
              </Badge>
            </div>
            <CardDescription>
              Configure the target GitHub repository for which PatchPilot will monitor incidents and open draft pull requests.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-medium text-foreground">Project Name:</label>
              <Input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="e.g. Core Checkout API Service"
                className="font-medium"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="font-medium text-foreground">Repo Owner (User or Org):</label>
                <Input
                  type="text"
                  value={repoOwner}
                  onChange={(e) => setRepoOwner(e.target.value)}
                  placeholder="e.g. nebiyu-org"
                  className="font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-medium text-foreground">Repository Name:</label>
                <Input
                  type="text"
                  value={repoName}
                  onChange={(e) => setRepoName(e.target.value)}
                  placeholder="e.g. checkout-api-service"
                  className="font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-medium text-foreground">Default Branch:</label>
                <Input
                  type="text"
                  value={defaultBranch}
                  onChange={(e) => setDefaultBranch(e.target.value)}
                  placeholder="main"
                  className="font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-medium text-foreground">GitHub Personal Access Token (PAT):</label>
              <Input
                type="password"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                placeholder="ghp_************************************"
                className="font-mono"
              />
              <span className="text-[11px] text-muted-foreground block">
                Requires &apos;repo&apos; scope to create fix branches and open draft PRs. Token is encrypted at rest.
              </span>
            </div>
          </CardContent>

          <CardFooter className="flex justify-end border-t border-border/60 pt-4">
            <Button size="sm" onClick={() => setStep(2)} className="gap-1.5">
              Next: Connect Gemini AI
              <ArrowRight className="size-3.5" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 2: Gemini AI Key */}
      {step === 2 && (
        <Card className="border-border/80">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Cpu className="size-5 text-purple-400" />
                Step 2: Connect Google Gemini AI
              </CardTitle>
              <Badge variant="purple" className="font-mono text-[10px]">
                Gemini 2.5 Flash Free Tier
              </Badge>
            </div>
            <CardDescription>
              PatchPilot leverages Google Gemini 2.5 Flash to generate falsification hypotheses and author regression tests.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-medium text-foreground">Google Gemini API Key:</label>
              <Input
                type="password"
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                placeholder="AIzaSy***********************************"
                className="font-mono"
              />
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                Don&apos;t have one? Generate for free at
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-0.5 ml-1"
                >
                  aistudio.google.com
                  <ExternalLink className="size-3" />
                </a>
              </span>
            </div>

            <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg text-purple-300 space-y-1">
              <span className="font-bold block text-xs">Free Tier Rate Limiter Guard:</span>
              <p className="text-[11px] text-muted-foreground">
                The engine enforces a token-bucket rate limiter of 10 requests per minute and 250 requests per day, ensuring 100% compliance with Google AI Studio free limits.
              </p>
            </div>
          </CardContent>

          <CardFooter className="flex justify-between border-t border-border/60 pt-4">
            <Button size="sm" variant="outline" onClick={() => setStep(1)} className="gap-1.5">
              <ArrowLeft className="size-3.5" />
              Back
            </Button>
            <Button size="sm" onClick={() => setStep(3)} className="gap-1.5">
              Next: Connect Sentry Webhooks
              <ArrowRight className="size-3.5" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 3: Log Sources (Sentry) */}
      {step === 3 && (
        <Card className="border-border/80">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Terminal className="size-5 text-cyan-400" />
                Step 3: Connect Telemetry & Sentry Webhook
              </CardTitle>
              <Badge variant="outline" className="font-mono text-[10px] text-cyan-400 border-cyan-500/30">
                Vendor-Neutral Ingest
              </Badge>
            </div>
            <CardDescription>
              Configure Sentry integration and error webhooks. Incoming production errors are normalized and correlated with active git commits.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-medium text-foreground">Sentry Webhook Secret (HMAC SHA-256 verification):</label>
              <Input
                type="password"
                value={sentrySecret}
                onChange={(e) => setSentrySecret(e.target.value)}
                placeholder="sentry-webhook-secret-token"
                className="font-mono"
              />
            </div>

            <div className="p-4 bg-muted/40 rounded-lg border border-border/60 space-y-2">
              <span className="font-semibold text-foreground block">Your Sentry Ingest URL:</span>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-black/60 rounded text-cyan-400 font-mono text-[11px] truncate border border-border/40">
                  {webhookBaseUrl}/api/webhooks/sentry
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(`${webhookBaseUrl}/api/webhooks/sentry`, 'sentry')}
                  className="h-8 gap-1.5"
                >
                  {copiedUrl === 'sentry' ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                  {copiedUrl === 'sentry' ? 'Copied' : 'Copy'}
                </Button>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex justify-between border-t border-border/60 pt-4">
            <Button size="sm" variant="outline" onClick={() => setStep(2)} className="gap-1.5">
              <ArrowLeft className="size-3.5" />
              Back
            </Button>
            <Button size="sm" onClick={() => setStep(4)} className="gap-1.5">
              Next: Connect Telegram Channel
              <ArrowRight className="size-3.5" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 4: Telegram Channel */}
      {step === 4 && (
        <Card className="border-border/80">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="size-5 text-emerald-400" />
                Step 4: Connect Telegram Alerts & Action Buttons
              </CardTitle>
              <Badge variant="success" className="font-mono text-[10px]">
                Chat SDK / Bot
              </Badge>
            </div>
            <CardDescription>
              Receive live incident alert cards on Telegram with interactive action buttons: Accept & Patch, Reject, Snooze.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-medium text-foreground">Telegram Bot Token (from @BotFather):</label>
              <Input
                type="password"
                value={telegramToken}
                onChange={(e) => setTelegramToken(e.target.value)}
                placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                className="font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-medium text-foreground">Telegram Chat ID:</label>
              <Input
                type="text"
                value={telegramChatId}
                onChange={(e) => setTelegramChatId(e.target.value)}
                placeholder="e.g. 123456789 or group ID -100123456789"
                className="font-mono"
              />
              <span className="text-[11px] text-muted-foreground block">
                Message @userinfobot on Telegram to get your Chat ID.
              </span>
            </div>
          </CardContent>

          <CardFooter className="flex justify-between border-t border-border/60 pt-4">
            <Button size="sm" variant="outline" onClick={() => setStep(3)} className="gap-1.5">
              <ArrowLeft className="size-3.5" />
              Back
            </Button>
            <Button
              size="sm"
              onClick={handleCreateProject}
              disabled={saving}
              className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 font-semibold"
            >
              <Play className="size-3.5 fill-current" />
              {saving ? 'Creating & Connecting...' : 'Save & Create Project'}
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 5: Success & Generated Webhook Endpoints */}
      {step === 5 && createdProject && (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <CheckCircle className="size-5" />
              </div>
              <div>
                <CardTitle className="text-lg text-foreground">Project Created & Resources Connected!</CardTitle>
                <CardDescription className="font-mono text-xs text-muted-foreground">
                  Project ID: <span className="text-emerald-400 font-semibold">{createdProject.projectId}</span> | Repo: {createdProject.project.repo}
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-3 text-xs">
            <span className="font-semibold text-foreground block">Generated Webhook Endpoints:</span>

            <div className="p-3 bg-card rounded-lg border border-border/60 flex items-center justify-between">
              <div>
                <span className="text-muted-foreground text-[11px] block">Sentry Ingest URL:</span>
                <code className="text-cyan-400 font-mono text-[11px]">{webhookBaseUrl}{createdProject.webhookUrls.sentry}</code>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(`${webhookBaseUrl}${createdProject.webhookUrls.sentry}`, 'sentry_final')}
                className="h-8 gap-1.5"
              >
                {copiedUrl === 'sentry_final' ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                {copiedUrl === 'sentry_final' ? 'Copied' : 'Copy'}
              </Button>
            </div>

            <div className="p-3 bg-card rounded-lg border border-border/60 flex items-center justify-between">
              <div>
                <span className="text-muted-foreground text-[11px] block">GitHub Actions Ingest URL:</span>
                <code className="text-cyan-400 font-mono text-[11px]">{webhookBaseUrl}{createdProject.webhookUrls.githubActions}</code>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(`${webhookBaseUrl}${createdProject.webhookUrls.githubActions}`, 'gha_final')}
                className="h-8 gap-1.5"
              >
                {copiedUrl === 'gha_final' ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                {copiedUrl === 'gha_final' ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </CardContent>

          <CardFooter className="border-t border-border/60 pt-4">
            <Button size="sm" onClick={() => router.push('/')} className="gap-1.5">
              Go to Live Incidents Cockpit
              <ArrowRight className="size-3.5" />
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
