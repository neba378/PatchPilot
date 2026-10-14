'use client';

import { useState, useEffect, useCallback } from 'react';
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
  Sparkles,
  RefreshCw,
  LogOut,
  Search,
  Lock,
  GitBranch,
  ChevronDown,
  AlertCircle
} from 'lucide-react';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface GitHubUser {
  id?: number;
  login: string;
  name?: string;
  avatarUrl?: string;
  htmlUrl?: string;
}

interface GitHubRepo {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  defaultBranch: string;
  private: boolean;
  description: string | null;
  htmlUrl: string;
  updatedAt?: string;
}

export default function SetupWizardPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [createdProject, setCreatedProject] = useState<any>(null);

  // GitHub OAuth & Integration State
  const [isGithubConnected, setIsGithubConnected] = useState(false);
  const [isOAuthConfigured, setIsOAuthConfigured] = useState(false);
  const [githubUser, setGithubUser] = useState<GitHubUser | null>(null);
  const [isConnectingGithub, setIsConnectingGithub] = useState(false);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [selectedRepoFullName, setSelectedRepoFullName] = useState('');
  const [repoSearchQuery, setRepoSearchQuery] = useState('');
  const [showManualConfig, setShowManualConfig] = useState(false);
  const [showOAuthModal, setShowOAuthModal] = useState(false);
  const [devTokenInput, setDevTokenInput] = useState('');
  const [connectingDev, setConnectingDev] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);

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

  // Fetch GitHub repos for authenticated user
  const fetchRepos = useCallback(async () => {
    setLoadingRepos(true);
    try {
      const res = await fetch('/api/auth/github/repos');
      const data = await res.json();
      if (res.ok && data.repos) {
        setRepos(data.repos);
      }
    } catch (err: any) {
      console.warn('Failed to load GitHub repos:', err.message);
    } finally {
      setLoadingRepos(false);
    }
  }, []);

  // Check current GitHub OAuth connection status
  const checkGitHubStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/github/status');
      const data = await res.json();
      setIsOAuthConfigured(Boolean(data.configured));
      if (data.connected && data.user) {
        setIsGithubConnected(true);
        setGithubUser(data.user);
        fetchRepos();
      } else {
        setIsGithubConnected(false);
        setGithubUser(null);
      }
    } catch (err: any) {
      console.warn('Failed to check GitHub status:', err.message);
    }
  }, [fetchRepos]);

  useEffect(() => {
    checkGitHubStatus();

    // Listen for OAuth popup completion
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GITHUB_OAUTH_RESULT') {
        const payload = event.data.payload;
        if (payload.success && payload.user) {
          setIsGithubConnected(true);
          setGithubUser(payload.user);
          setIsConnectingGithub(false);
          setShowOAuthModal(false);
          fetchRepos();
        } else {
          setOauthError(payload.error || 'Authentication failed');
          setIsConnectingGithub(false);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [checkGitHubStatus, fetchRepos]);

  // Initiate OAuth flow
  const handleConnectGitHub = () => {
    setOauthError(null);
    if (!isOAuthConfigured) {
      setShowOAuthModal(true);
      return;
    }

    setIsConnectingGithub(true);
    const width = 600;
    const height = 750;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    const popup = window.open(
      '/api/auth/github/login',
      'github_oauth_window',
      `width=${width},height=${height},left=${left},top=${top},status=yes,scrollbars=yes`
    );

    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      window.location.href = '/api/auth/github/login';
    } else {
      const timer = setInterval(() => {
        if (popup.closed) {
          clearInterval(timer);
          setIsConnectingGithub(false);
          checkGitHubStatus();
        }
      }, 1000);
    }
  };

  const handleDisconnectGitHub = async () => {
    try {
      await fetch('/api/auth/github/disconnect', { method: 'POST' });
      setIsGithubConnected(false);
      setGithubUser(null);
      setRepos([]);
      setSelectedRepoFullName('');
    } catch (err: any) {
      alert(`Failed to disconnect: ${err.message}`);
    }
  };

  const handleDevConnect = async (simulate: boolean, token?: string) => {
    setConnectingDev(true);
    setOauthError(null);
    try {
      const res = await fetch('/api/auth/github/dev-connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ simulate, token })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsGithubConnected(true);
        setGithubUser(data.user);
        setShowOAuthModal(false);
        fetchRepos();
      } else {
        setOauthError(data.error || 'Connection failed');
      }
    } catch (err: any) {
      setOauthError(err.message);
    } finally {
      setConnectingDev(false);
    }
  };

  const handleSelectRepo = (repo: GitHubRepo) => {
    setSelectedRepoFullName(repo.fullName);
    setRepoOwner(repo.owner);
    setRepoName(repo.name);
    setDefaultBranch(repo.defaultBranch || 'main');

    const formatted = repo.name
      .split(/[-_]/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    setProjectName(formatted);
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
          githubToken: githubToken || undefined,
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

  const filteredRepos = repos.filter(
    (r) =>
      r.fullName.toLowerCase().includes(repoSearchQuery.toLowerCase()) ||
      (r.description && r.description.toLowerCase().includes(repoSearchQuery.toLowerCase()))
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          Project Creation & Resource Connector
        </h1>
        <p className="text-xs text-muted-foreground">
          Connect your GitHub account via OAuth, choose your repository, and link Gemini AI, Sentry webhooks, and Telegram alerts.
        </p>
      </div>

      {/* Stepper Header Block */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 border-b border-border/60 pb-4">
        {[
          { num: 1, title: 'GitHub OAuth', icon: FolderGit2 },
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

      {/* Step 1: Repository Host (GitHub OAuth) */}
      {step === 1 && (
        <Card className="border-border/80">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <FolderGit2 className="size-5 text-blue-400" />
                Step 1: Connect to GitHub & Select Repository
              </CardTitle>
              <Badge variant="outline" className="font-mono text-[10px]">
                OAuth 2.0 Web Flow
              </Badge>
            </div>
            <CardDescription>
              Connect your GitHub account to grant repository access without manually copying API keys.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5 text-xs">
            {/* GitHub Connect Banner / Connected Card */}
            {!isGithubConnected ? (
              <div className="p-5 rounded-xl border border-border/80 bg-muted/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center sm:text-left">
                  <div className="flex items-center gap-2 justify-center sm:justify-start">
                    <Github className="size-5 text-foreground" />
                    <span className="font-bold text-sm text-foreground">GitHub Integration</span>
                    <Badge variant="secondary" className="text-[10px] uppercase font-bold text-blue-400 bg-blue-500/10 border-blue-500/20">
                      Recommended UX
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground max-w-lg">
                    Authorize PatchPilot to read repositories, inspect code context, author regression tests, and open DRAFT pull requests.
                  </p>
                </div>

                <Button
                  type="button"
                  onClick={handleConnectGitHub}
                  disabled={isConnectingGithub}
                  className="gap-2 shrink-0 font-bold"
                >
                  <Github className="size-4" />
                  {isConnectingGithub ? 'Opening GitHub...' : 'Connect to GitHub'}
                </Button>
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Avatar className="size-10 border-2 border-emerald-500/40">
                    {githubUser?.avatarUrl ? (
                      <AvatarImage src={githubUser.avatarUrl} alt={githubUser.login} />
                    ) : null}
                    <AvatarFallback>{githubUser?.login?.slice(0, 2) || 'GH'}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground">
                        {githubUser?.name || githubUser?.login}
                      </span>
                      <span className="text-xs font-mono text-muted-foreground">@{githubUser?.login}</span>
                      <Badge variant="outline" className="text-[10px] text-emerald-400 bg-emerald-500/20 border-emerald-500/30 gap-1">
                        <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        OAuth Connected
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Granted scopes: <code className="text-emerald-400">repo, read:user</code>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={fetchRepos}
                    disabled={loadingRepos}
                    className="size-8"
                    title="Refresh Repositories"
                  >
                    <RefreshCw className={`size-3.5 ${loadingRepos ? 'animate-spin' : ''}`} />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDisconnectGitHub}
                    className="text-rose-400 border-rose-500/30 hover:bg-rose-500/10 gap-1 text-xs"
                  >
                    <LogOut className="size-3.5" />
                    Disconnect
                  </Button>
                </div>
              </div>
            )}

            {/* Repository Picker (when connected) */}
            {isGithubConnected && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="font-medium text-foreground">
                    Select Repository to Integrate:
                  </label>
                  <span className="text-[11px] text-muted-foreground">
                    {repos.length} repositories available
                  </span>
                </div>

                <div className="relative">
                  <Search className="size-4 text-muted-foreground absolute left-3 top-2.5" />
                  <Input
                    type="text"
                    value={repoSearchQuery}
                    onChange={(e) => setRepoSearchQuery(e.target.value)}
                    placeholder="Filter repositories by name or description..."
                    className="pl-9 text-xs"
                  />
                </div>

                <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
                  {loadingRepos && repos.length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground text-xs flex items-center justify-center gap-2">
                      <RefreshCw className="size-4 animate-spin text-primary" />
                      Fetching repositories from GitHub...
                    </div>
                  ) : filteredRepos.length > 0 ? (
                    filteredRepos.map((repo) => {
                      const isSelected = selectedRepoFullName === repo.fullName;
                      return (
                        <div
                          key={repo.id}
                          onClick={() => handleSelectRepo(repo)}
                          className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between text-xs ${
                            isSelected
                              ? 'bg-primary/10 border-primary text-foreground'
                              : 'bg-card border-border/60 text-muted-foreground hover:border-border hover:bg-muted/40'
                          }`}
                        >
                          <div className="space-y-0.5 truncate">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground font-mono text-xs">
                                {repo.fullName}
                              </span>
                              {repo.private ? (
                                <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-500/20 bg-amber-500/10 gap-0.5">
                                  <Lock className="size-2.5" /> Private
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[10px]">
                                  Public
                                </Badge>
                              )}
                            </div>
                            {repo.description && (
                              <p className="text-[11px] text-muted-foreground truncate max-w-xl">
                                {repo.description}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
                              <GitBranch className="size-3" />
                              {repo.defaultBranch}
                            </span>
                            {isSelected && (
                              <span className="size-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                                <Check className="size-3" />
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-4 text-center text-muted-foreground text-xs border border-dashed border-border rounded-lg">
                      No repositories matching &quot;{repoSearchQuery}&quot; found.
                    </div>
                  )}
                </div>
              </div>
            )}

            <Separator />

            {/* Target Repository Details */}
            <div className="space-y-3">
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

              {/* Collapsible Manual PAT override */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowManualConfig(!showManualConfig)}
                  className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 font-medium"
                >
                  <ChevronDown className={`size-3.5 transition-transform ${showManualConfig ? 'rotate-180' : ''}`} />
                  {showManualConfig ? 'Hide manual token override' : 'Need custom PAT or manual credentials?'}
                </button>

                {showManualConfig && (
                  <div className="mt-2.5 p-3 rounded-lg bg-muted/40 border border-border/80 space-y-1.5">
                    <label className="font-semibold text-foreground text-[11px]">
                      Optional Override: Personal Access Token (PAT)
                    </label>
                    <Input
                      type="password"
                      value={githubToken}
                      onChange={(e) => setGithubToken(e.target.value)}
                      placeholder="ghp_************************************ (Optional if OAuth is connected)"
                      className="font-mono text-xs"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      If left blank, the active GitHub OAuth session token will be automatically secured and linked to this project.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex justify-between border-t border-border/60 pt-4 items-center">
            <span className="text-[11px] font-mono text-muted-foreground">
              Target: <code className="text-primary">{repoOwner}/{repoName}</code> ({defaultBranch})
            </span>
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
                Step 2: Connect Google Gemini API
              </CardTitle>
              <Badge variant="outline" className="font-mono text-[10px] text-purple-400 border-purple-500/30">
                Gemini 2.5 Flash Free Tier
              </Badge>
            </div>
            <CardDescription>
              PatchPilot uses Google Gemini 2.5 Flash to perform adversarial falsification analysis, diagnose root causes, and author regression tests.
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
                Don&apos;t have one? Generate for free without credit card at
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-0.5"
                >
                  aistudio.google.com <ExternalLink className="size-3" />
                </a>
              </span>
            </div>

            <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg text-purple-300 space-y-1">
              <span className="font-bold block">Free Tier Rate Limiter Guard:</span>
              <p className="text-[11px] text-muted-foreground">
                The engine enforces a token-bucket rate limiter of 10 requests per minute and 250 requests per day, ensuring 100% compliance with Google AI Studio free limits.
              </p>
            </div>
          </CardContent>

          <CardFooter className="flex justify-between border-t border-border/60 pt-4">
            <Button variant="outline" size="sm" onClick={() => setStep(1)} className="gap-1.5">
              <ArrowLeft className="size-3.5" /> Back
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
                Step 3: Connect Telemetry & Error Logging (Sentry)
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

            <div className="p-4 bg-muted/40 rounded-lg border border-border/80 space-y-2">
              <span className="font-semibold text-foreground block">Your Sentry Ingest URL:</span>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-background rounded text-cyan-400 font-mono text-[11px] truncate border border-border/50">
                  {webhookBaseUrl}/api/webhooks/sentry
                </code>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => copyToClipboard(`${webhookBaseUrl}/api/webhooks/sentry`, 'sentry')}
                  className="gap-1"
                >
                  {copiedUrl === 'sentry' ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                  Copy
                </Button>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex justify-between border-t border-border/60 pt-4">
            <Button variant="outline" size="sm" onClick={() => setStep(2)} className="gap-1.5">
              <ArrowLeft className="size-3.5" /> Back
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
              <Badge variant="outline" className="font-mono text-[10px] text-emerald-400 border-emerald-500/30">
                Telegram Bot
              </Badge>
            </div>
            <CardDescription>
              Receive live incident alert cards on Telegram with 4 interactive buttons: View Details, Accept & Patch, Reject, Snooze.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-medium text-foreground">Telegram Bot Token (via @BotFather):</label>
              <Input
                type="password"
                value={telegramToken}
                onChange={(e) => setTelegramToken(e.target.value)}
                placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                className="font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-medium text-foreground">Your Telegram Chat ID:</label>
              <Input
                type="text"
                value={telegramChatId}
                onChange={(e) => setTelegramChatId(e.target.value)}
                placeholder="e.g. 123456789 or group ID -100123456789"
                className="font-mono"
              />
              <span className="text-[11px] text-muted-foreground block">
                Tip: Send a message to your bot or message @userinfobot on Telegram to get your Chat ID.
              </span>
            </div>
          </CardContent>

          <CardFooter className="flex justify-between border-t border-border/60 pt-4">
            <Button variant="outline" size="sm" onClick={() => setStep(3)} className="gap-1.5">
              <ArrowLeft className="size-3.5" /> Back
            </Button>
            <Button
              size="sm"
              onClick={handleCreateProject}
              disabled={saving}
              className="gap-2 font-bold shadow-md shadow-primary/20"
            >
              <Play className="size-3.5 fill-current" />
              {saving ? 'Creating & Connecting...' : 'Save & Create Project in Database'}
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 5: Success & Generated Webhook Endpoints */}
      {step === 5 && createdProject && (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="size-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <CheckCircle className="size-6" />
              </div>
              <div>
                <CardTitle className="text-xl">Project Created & Resources Connected!</CardTitle>
                <CardDescription className="font-mono mt-0.5">
                  Project ID: <span className="text-emerald-400">{createdProject.projectId}</span> | Repo: {createdProject.project.repo}
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-3 text-xs">
            <span className="font-semibold text-foreground block">Generated Webhook Endpoints for this Project:</span>

            <div className="p-3 bg-muted/60 rounded-lg border border-border/80 flex items-center justify-between">
              <div>
                <span className="text-muted-foreground text-[11px] block">Sentry Ingest URL:</span>
                <code className="text-cyan-400 font-mono text-[11px]">{webhookBaseUrl}{createdProject.webhookUrls.sentry}</code>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => copyToClipboard(`${webhookBaseUrl}{createdProject.webhookUrls.sentry}`, 'sentry_final')}
                className="gap-1"
              >
                {copiedUrl === 'sentry_final' ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                Copy
              </Button>
            </div>

            <div className="p-3 bg-muted/60 rounded-lg border border-border/80 flex items-center justify-between">
              <div>
                <span className="text-muted-foreground text-[11px] block">GitHub Actions Ingest URL:</span>
                <code className="text-cyan-400 font-mono text-[11px]">{webhookBaseUrl}{createdProject.webhookUrls.githubActions}</code>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => copyToClipboard(`${webhookBaseUrl}{createdProject.webhookUrls.githubActions}`, 'gha_final')}
                className="gap-1"
              >
                {copiedUrl === 'gha_final' ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                Copy
              </Button>
            </div>
          </CardContent>

          <CardFooter className="flex justify-end border-t border-border/60 pt-4">
            <Button size="sm" onClick={() => router.push('/')} className="gap-1.5">
              Go to Live Incidents Cockpit <ArrowRight className="size-3.5" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* GitHub OAuth Setup / Dev Mode Helper Modal */}
      {showOAuthModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Github className="size-5 text-foreground" />
                <h3 className="font-bold text-foreground text-sm">GitHub Connection Options</h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowOAuthModal(false)}
                className="size-7 text-muted-foreground"
              >
                ✕
              </Button>
            </div>

            {oauthError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="size-4 shrink-0" />
                <span>{oauthError}</span>
              </div>
            )}

            <div className="space-y-4 text-xs">
              <div className="p-3.5 bg-blue-500/10 border border-blue-500/20 rounded-lg space-y-2 text-foreground">
                <span className="font-bold text-blue-400 flex items-center gap-1.5">
                  <Sparkles className="size-4" /> Live OAuth App Setup
                </span>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  To authenticate via GitHub.com OAuth, set <code className="text-blue-300 font-mono">GITHUB_CLIENT_ID</code> and <code className="text-blue-300 font-mono">GITHUB_CLIENT_SECRET</code> in your <code className="text-blue-300 font-mono">.env</code>.
                </p>
                <a
                  href={`https://github.com/settings/applications/new?oauth_application[name]=PatchPilot&oauth_application[url]=${encodeURIComponent(webhookBaseUrl)}&oauth_application[callback_url]=${encodeURIComponent(webhookBaseUrl + '/api/auth/github/callback')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline font-semibold text-[11px]"
                >
                  Create OAuth App on GitHub <ExternalLink className="size-3" />
                </a>
              </div>

              <div className="p-3.5 bg-muted/40 border border-border/80 rounded-lg space-y-2">
                <span className="font-bold text-foreground block">1-Click Dev / Demo Simulation:</span>
                <p className="text-[11px] text-muted-foreground">
                  Instant simulated OAuth flow for local development without registering an OAuth App.
                </p>
                <Button
                  type="button"
                  onClick={() => handleDevConnect(true)}
                  disabled={connectingDev}
                  className="w-full gap-1.5 font-bold"
                >
                  <Sparkles className="size-3.5" />
                  {connectingDev ? 'Connecting...' : 'Connect Simulated GitHub Account (@octocat)'}
                </Button>
              </div>

              <div className="p-3.5 bg-muted/40 border border-border/80 rounded-lg space-y-2">
                <span className="font-bold text-foreground block">Or Connect with Personal Access Token:</span>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    value={devTokenInput}
                    onChange={(e) => setDevTokenInput(e.target.value)}
                    placeholder="ghp_********************************"
                    className="flex-1 font-mono text-xs"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => handleDevConnect(false, devTokenInput)}
                    disabled={connectingDev || !devTokenInput}
                  >
                    Authenticate
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowOAuthModal(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
