'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  FolderGit2,
  Cpu,
  Terminal,
  MessageSquare,
  CheckCircle,
  Copy,
  Check,
  ExternalLink,
  ArrowRight,
  ArrowLeft,
  Github,
  RefreshCw,
  LogOut,
  Search,
  Lock,
  GitBranch
} from 'lucide-react';

import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
}

export default function SetupWizardPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [createdProject, setCreatedProject] = useState<any>(null);

  // GitHub OAuth State
  const [isGithubConnected, setIsGithubConnected] = useState(false);
  const [githubUser, setGithubUser] = useState<GitHubUser | null>(null);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [selectedRepoFullName, setSelectedRepoFullName] = useState('');
  const [repoSearchQuery, setRepoSearchQuery] = useState('');

  // Form State
  const [projectName, setProjectName] = useState('Checkout Payment Service');
  const [repoOwner, setRepoOwner] = useState('nebiyu-org');
  const [repoName, setRepoName] = useState('checkout-api-service');
  const [defaultBranch, setDefaultBranch] = useState('main');

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

  const checkGitHubStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/github/status');
      const data = await res.json();
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

    // Listen for OAuth completion from popup / new tab
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GITHUB_OAUTH_RESULT') {
        const payload = event.data.payload;
        if (payload.success && payload.user) {
          setIsGithubConnected(true);
          setGithubUser(payload.user);
          fetchRepos();
        }
      }
    };

    window.addEventListener('message', handleMessage);

    // Also poll status occasionally when window refocuses
    const handleFocus = () => {
      checkGitHubStatus();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('focus', handleFocus);
    };
  }, [checkGitHubStatus, fetchRepos]);

  const handleConnectGitHub = () => {
    window.open('/api/auth/github/login', '_blank');
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
        alert(data.error || 'Failed to save configuration');
      }
    } catch (e: any) {
      alert(`Error saving configuration: ${e.message}`);
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
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Integrations</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Connect your GitHub repository via OAuth, Gemini AI key, and monitoring webhooks.
        </p>
      </div>

      {/* Stepper Navigation */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border-b border-border/60 pb-3">
        {[
          { num: 1, title: 'GitHub Repository' },
          { num: 2, title: 'AI Model' },
          { num: 3, title: 'Monitoring' },
          { num: 4, title: 'Alerts' }
        ].map((s) => (
          <button
            key={s.num}
            onClick={() => setStep(s.num)}
            className={`p-2.5 rounded-lg text-left transition-all border text-xs font-medium flex items-center gap-2 ${
              step === s.num
                ? 'bg-secondary text-foreground border-border/80 shadow-sm'
                : 'bg-card/40 border-border/40 text-muted-foreground hover:text-foreground'
            }`}
          >
            <span
              className={`size-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                step === s.num ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}
            >
              {s.num}
            </span>
            <span className="truncate">{s.title}</span>
          </button>
        ))}
      </div>

      {/* Step 1: GitHub Repository Connection */}
      {step === 1 && (
        <Card className="border-border/70 bg-card/60">
          <CardHeader className="p-5 pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FolderGit2 className="size-4 text-primary" />
              GitHub Connection & Repository
            </CardTitle>
          </CardHeader>

          <CardContent className="p-5 pt-1 space-y-4 text-xs">
            {/* GitHub OAuth Connection Card */}
            {!isGithubConnected ? (
              <div className="p-4 rounded-xl border border-border/80 bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center sm:text-left">
                  <div className="flex items-center gap-2 justify-center sm:justify-start">
                    <Github className="size-4 text-foreground" />
                    <span className="font-semibold text-sm text-foreground">Connect with GitHub</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Sign in with your GitHub account to authorize repository access, code inspection, and DRAFT pull requests.
                  </p>
                </div>

                <Button
                  type="button"
                  onClick={handleConnectGitHub}
                  className="gap-2 shrink-0 font-semibold"
                >
                  <Github className="size-4" />
                  Connect to GitHub
                </Button>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar className="size-9 border border-emerald-500/40">
                    {githubUser?.avatarUrl ? (
                      <AvatarImage src={githubUser.avatarUrl} alt={githubUser.login} />
                    ) : null}
                    <AvatarFallback>{githubUser?.login?.slice(0, 2) || 'GH'}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground">
                        {githubUser?.name || githubUser?.login}
                      </span>
                      <span className="text-[11px] font-mono text-muted-foreground">@{githubUser?.login}</span>
                      <Badge variant="outline" className="text-[10px] text-emerald-400 bg-emerald-500/20 border-emerald-500/30 gap-1 py-0 px-1.5">
                        <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Connected
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <a
                        href="https://github.com/settings/tokens"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-muted-foreground hover:text-foreground hover:underline flex items-center gap-1"
                      >
                        Manage repository permissions on GitHub
                        <ExternalLink className="size-2.5" />
                      </a>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={fetchRepos}
                    disabled={loadingRepos}
                    className="size-7"
                    title="Refresh Repositories"
                  >
                    <RefreshCw className={`size-3.5 ${loadingRepos ? 'animate-spin' : ''}`} />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleDisconnectGitHub}
                    className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 text-xs h-7 px-2"
                  >
                    <LogOut className="size-3 mr-1" />
                    Disconnect
                  </Button>
                </div>
              </div>
            )}

            {/* Repository Picker (when connected) */}
            {isGithubConnected && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-foreground">
                    Select Repository:
                  </label>
                  <span className="text-[10px] text-muted-foreground">
                    {repos.length} repositories
                  </span>
                </div>

                <div className="relative">
                  <Search className="size-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
                  <Input
                    type="text"
                    value={repoSearchQuery}
                    onChange={(e) => setRepoSearchQuery(e.target.value)}
                    placeholder="Search repositories..."
                    className="pl-8 h-8 text-xs bg-muted/20"
                  />
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1 pr-1 border border-border/50 rounded-lg p-1 bg-background/50">
                  {loadingRepos && repos.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground text-xs flex items-center justify-center gap-1.5">
                      <RefreshCw className="size-3.5 animate-spin text-primary" />
                      Loading repositories from GitHub...
                    </div>
                  ) : filteredRepos.length > 0 ? (
                    filteredRepos.map((repo) => {
                      const isSelected = selectedRepoFullName === repo.fullName;
                      return (
                        <div
                          key={repo.id}
                          onClick={() => handleSelectRepo(repo)}
                          className={`p-2 rounded-md cursor-pointer transition-all flex items-center justify-between text-xs ${
                            isSelected
                              ? 'bg-primary/15 border border-primary/50 text-foreground'
                              : 'hover:bg-muted/40 text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <div className="truncate">
                            <span className="font-mono text-xs text-foreground font-medium mr-1.5">
                              {repo.fullName}
                            </span>
                            {repo.private && (
                              <Badge variant="outline" className="text-[9px] text-amber-400 py-0 px-1 border-amber-500/20">
                                <Lock className="size-2 mr-0.5" /> Private
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                              <GitBranch className="size-2.5" />
                              {repo.defaultBranch}
                            </span>
                            {isSelected && <Check className="size-3 text-primary" />}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-3 text-center text-muted-foreground text-xs">
                      No repositories found.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Service & Repo Fields */}
            <div className="space-y-1">
              <label className="text-muted-foreground">Service Name</label>
              <Input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="e.g. Checkout Service"
                className="h-8 text-xs bg-muted/20"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-muted-foreground">Owner / Org</label>
                <Input
                  type="text"
                  value={repoOwner}
                  onChange={(e) => setRepoOwner(e.target.value)}
                  placeholder="nebiyu-org"
                  className="h-8 text-xs font-mono bg-muted/20"
                />
              </div>
              <div className="space-y-1">
                <label className="text-muted-foreground">Repository</label>
                <Input
                  type="text"
                  value={repoName}
                  onChange={(e) => setRepoName(e.target.value)}
                  placeholder="checkout-api-service"
                  className="h-8 text-xs font-mono bg-muted/20"
                />
              </div>
              <div className="space-y-1">
                <label className="text-muted-foreground">Branch</label>
                <Input
                  type="text"
                  value={defaultBranch}
                  onChange={(e) => setDefaultBranch(e.target.value)}
                  placeholder="main"
                  className="h-8 text-xs font-mono bg-muted/20"
                />
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex justify-between border-t border-border/50 p-4 items-center">
            <span className="text-[11px] font-mono text-muted-foreground">
              Target: <code className="text-primary">{repoOwner}/{repoName}</code>
            </span>
            <Button size="sm" onClick={() => setStep(2)} className="h-8 text-xs gap-1">
              Next: AI Model
              <ArrowRight className="size-3" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 2: AI Model */}
      {step === 2 && (
        <Card className="border-border/70 bg-card/60">
          <CardHeader className="p-5 pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Cpu className="size-4 text-primary" />
              Gemini AI Key
            </CardTitle>
          </CardHeader>

          <CardContent className="p-5 pt-1 space-y-3.5 text-xs">
            <div className="space-y-1">
              <label className="text-muted-foreground">Google Gemini API Key</label>
              <Input
                type="password"
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                placeholder="AIzaSy***********************************"
                className="h-8 text-xs font-mono bg-muted/20"
              />
              <span className="text-[11px] text-muted-foreground/80 flex items-center gap-1">
                Free keys available at
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-0.5"
                >
                  aistudio.google.com <ExternalLink className="size-2.5" />
                </a>
              </span>
            </div>

            <div className="p-3 bg-muted/30 border border-border/60 rounded-md text-muted-foreground space-y-1">
              <span className="font-medium text-foreground block">Free Tier Rate Limits</span>
              <p className="text-[11px] leading-relaxed">
                Token bucket enforces 10 requests per minute and 250 requests per day to stay strictly within Google AI Studio free tier quotas.
              </p>
            </div>
          </CardContent>

          <CardFooter className="flex justify-between border-t border-border/50 p-4">
            <Button variant="outline" size="sm" onClick={() => setStep(1)} className="h-8 text-xs gap-1">
              <ArrowLeft className="size-3" /> Back
            </Button>
            <Button size="sm" onClick={() => setStep(3)} className="h-8 text-xs gap-1">
              Next: Monitoring
              <ArrowRight className="size-3" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 3: Monitoring */}
      {step === 3 && (
        <Card className="border-border/70 bg-card/60">
          <CardHeader className="p-5 pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Terminal className="size-4 text-primary" />
              Error Logging & Telemetry
            </CardTitle>
          </CardHeader>

          <CardContent className="p-5 pt-1 space-y-3.5 text-xs">
            <div className="space-y-1">
              <label className="text-muted-foreground">Sentry Webhook Secret</label>
              <Input
                type="password"
                value={sentrySecret}
                onChange={(e) => setSentrySecret(e.target.value)}
                placeholder="sentry-webhook-secret-token"
                className="h-8 text-xs font-mono bg-muted/20"
              />
            </div>

            <div className="p-3 bg-muted/30 rounded-md border border-border/60 space-y-1.5">
              <span className="text-muted-foreground block text-[11px]">Sentry Ingest URL:</span>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-2.5 py-1.5 bg-background rounded text-cyan-400 font-mono text-[11px] border border-border/40 truncate">
                  {webhookBaseUrl}/api/webhooks/sentry
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(`${webhookBaseUrl}/api/webhooks/sentry`, 'sentry')}
                  className="h-7 text-xs gap-1"
                >
                  {copiedUrl === 'sentry' ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                  Copy
                </Button>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex justify-between border-t border-border/50 p-4">
            <Button variant="outline" size="sm" onClick={() => setStep(2)} className="h-8 text-xs gap-1">
              <ArrowLeft className="size-3" /> Back
            </Button>
            <Button size="sm" onClick={() => setStep(4)} className="h-8 text-xs gap-1">
              Next: Alerts
              <ArrowRight className="size-3" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 4: Alerts */}
      {step === 4 && (
        <Card className="border-border/70 bg-card/60">
          <CardHeader className="p-5 pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <MessageSquare className="size-4 text-primary" />
              Telegram Alerts
            </CardTitle>
          </CardHeader>

          <CardContent className="p-5 pt-1 space-y-3.5 text-xs">
            <div className="space-y-1">
              <label className="text-muted-foreground">Bot Token (via @BotFather)</label>
              <Input
                type="password"
                value={telegramToken}
                onChange={(e) => setTelegramToken(e.target.value)}
                placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                className="h-8 text-xs font-mono bg-muted/20"
              />
            </div>

            <div className="space-y-1">
              <label className="text-muted-foreground">Chat ID</label>
              <Input
                type="text"
                value={telegramChatId}
                onChange={(e) => setTelegramChatId(e.target.value)}
                placeholder="e.g. 123456789 or group ID -100123456789"
                className="h-8 text-xs font-mono bg-muted/20"
              />
              <span className="text-[11px] text-muted-foreground/80 block">
                Get your Chat ID by messaging @userinfobot on Telegram.
              </span>
            </div>
          </CardContent>

          <CardFooter className="flex justify-between border-t border-border/50 p-4">
            <Button variant="outline" size="sm" onClick={() => setStep(3)} className="h-8 text-xs gap-1">
              <ArrowLeft className="size-3" /> Back
            </Button>
            <Button size="sm" onClick={handleCreateProject} disabled={saving} className="h-8 text-xs gap-1.5 font-medium">
              <Check className="size-3" />
              {saving ? 'Saving...' : 'Save Configuration'}
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 5: Success */}
      {step === 5 && createdProject && (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardHeader className="p-5 pb-3">
            <div className="flex items-center gap-2.5">
              <CheckCircle className="size-5 text-emerald-400" />
              <div>
                <CardTitle className="text-sm font-semibold">Project Connected</CardTitle>
                <p className="text-xs text-muted-foreground font-mono">
                  {createdProject.projectId} · {createdProject.project.repo}
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-5 pt-1 space-y-3 text-xs">
            <div className="p-3 bg-card/60 rounded-md border border-border/60 flex items-center justify-between">
              <div>
                <span className="text-muted-foreground text-[11px] block">Sentry Ingest URL</span>
                <code className="text-cyan-400 font-mono text-[11px]">{webhookBaseUrl}{createdProject.webhookUrls.sentry}</code>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(`${webhookBaseUrl}${createdProject.webhookUrls.sentry}`, 'sentry_final')}
                className="h-7 text-xs gap-1"
              >
                {copiedUrl === 'sentry_final' ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                Copy
              </Button>
            </div>

            <div className="p-3 bg-card/60 rounded-md border border-border/60 flex items-center justify-between">
              <div>
                <span className="text-muted-foreground text-[11px] block">GitHub Actions Ingest URL</span>
                <code className="text-cyan-400 font-mono text-[11px]">{webhookBaseUrl}{createdProject.webhookUrls.githubActions}</code>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(`${webhookBaseUrl}${createdProject.webhookUrls.githubActions}`, 'gha_final')}
                className="h-7 text-xs gap-1"
              >
                {copiedUrl === 'gha_final' ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                Copy
              </Button>
            </div>
          </CardContent>

          <CardFooter className="flex justify-end border-t border-border/50 p-4">
            <Button size="sm" onClick={() => router.push('/')} className="h-8 text-xs gap-1">
              Go to Incidents <ArrowRight className="size-3" />
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
