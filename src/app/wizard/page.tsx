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
  GitBranch,
  Boxes,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Key,
  Settings2
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

  // GitHub OAuth & UI Connection State
  const [isGithubConnected, setIsGithubConnected] = useState(false);
  const [githubUser, setGithubUser] = useState<GitHubUser | null>(null);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [selectedRepoFullName, setSelectedRepoFullName] = useState('');
  const [repoSearchQuery, setRepoSearchQuery] = useState('');

  // UI Connection & Permission State
  const [ghConnectMode, setGhConnectMode] = useState<'oauth' | 'token'>('oauth');
  const [oauthClientId, setOauthClientId] = useState('');
  const [oauthClientSecret, setOauthClientSecret] = useState('');
  const [patToken, setPatToken] = useState('');
  const [verifyingToken, setVerifyingToken] = useState(false);
  const [savingOauth, setSavingOauth] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [permChecking, setPermChecking] = useState(false);
  const [repoPermissions, setRepoPermissions] = useState<{ canRead: boolean; canWrite: boolean; defaultBranch?: string; error?: string } | null>(null);
  const [canDraftPR, setCanDraftPR] = useState(true);
  const [canRunSandbox, setCanRunSandbox] = useState(true);
  const [canInvestigate, setCanInvestigate] = useState(true);
  const [callbackCopied, setCallbackCopied] = useState(false);

  // Form State
  const [projectName, setProjectName] = useState('Checkout Payment Service');
  const [repoOwner, setRepoOwner] = useState('nebiyu-org');
  const [repoName, setRepoName] = useState('checkout-api-service');
  const [defaultBranch, setDefaultBranch] = useState('main');
  const [sandboxProvider, setSandboxProvider] = useState<'local-docker' | 'e2b' | 'modal' | 'fake'>('local-docker');

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

  const checkRepoPermissions = async (fullName: string) => {
    setPermChecking(true);
    setRepoPermissions(null);
    try {
      const res = await fetch('/api/auth/github/check-permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo: fullName })
      });
      const data = await res.json();
      setRepoPermissions(data);
      if (data.canWrite) {
        setCanDraftPR(true);
      }
    } catch (e: any) {
      setRepoPermissions({ canRead: false, canWrite: false, error: e.message });
    } finally {
      setPermChecking(false);
    }
  };

  const handleConnectToken = async () => {
    if (!patToken.trim()) return;
    setVerifyingToken(true);
    setTokenError(null);
    try {
      const res = await fetch('/api/auth/github/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: patToken.trim() })
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to authenticate token with GitHub');
      }
      setIsGithubConnected(true);
      setGithubUser(data.user);
      fetchRepos();
    } catch (err: any) {
      setTokenError(err.message);
    } finally {
      setVerifyingToken(false);
    }
  };

  const handleSaveAndConnectOAuth = async () => {
    if (oauthClientId.trim() && oauthClientSecret.trim()) {
      setSavingOauth(true);
      try {
        const res = await fetch('/api/auth/github/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientId: oauthClientId.trim(), clientSecret: oauthClientSecret.trim() })
        });
        const data = await res.json();
        if (data.authorizeUrl) {
          window.open(data.authorizeUrl, '_blank');
          return;
        }
      } catch (e: any) {
        alert(`Failed to save OAuth configuration: ${e.message}`);
      } finally {
        setSavingOauth(false);
      }
    } else {
      window.open('/api/auth/github/login', '_blank');
    }
  };

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
      setRepoPermissions(null);
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
    checkRepoPermissions(repo.fullName);
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
          sandboxProvider,
          canDraftPR,
          geminiApiKey,
          sentrySecret,
          telegramToken,
          telegramChatId
        })
      });

      const data = await res.json();
      if (data.success) {
        setCreatedProject(data);
        setStep(6);
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
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 border-b border-border/60 pb-3">
        {[
          { num: 1, title: 'GitHub Repo' },
          { num: 2, title: 'AI Model' },
          { num: 3, title: 'Sandbox' },
          { num: 4, title: 'Monitoring' },
          { num: 5, title: 'Alerts' }
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
            {/* GitHub OAuth & Token UI Connection Card */}
            {!isGithubConnected ? (
              <div className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Github className="size-4 text-foreground" />
                      <span className="font-semibold text-sm text-foreground">GitHub Integration</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Choose how you want to connect your GitHub account to authorize repository access.
                    </p>
                  </div>

                  <div className="flex items-center bg-card/60 p-0.5 rounded-lg border border-border/60 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setGhConnectMode('oauth')}
                      className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                        ghConnectMode === 'oauth' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      OAuth App
                    </button>
                    <button
                      type="button"
                      onClick={() => setGhConnectMode('token')}
                      className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                        ghConnectMode === 'token' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Personal Token
                    </button>
                  </div>
                </div>

                {ghConnectMode === 'oauth' ? (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Connect via GitHub OAuth with the <code>repo</code> scope to automatically grant branch creation, commit pushing, and Draft PR permissions.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-foreground">Client ID (Optional)</label>
                        <Input
                          type="text"
                          value={oauthClientId}
                          onChange={(e) => setOauthClientId(e.target.value)}
                          placeholder="Ov23li..."
                          className="h-8 text-xs font-mono bg-background/50"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-foreground">Client Secret (Optional)</label>
                        <Input
                          type="password"
                          value={oauthClientSecret}
                          onChange={(e) => setOauthClientSecret(e.target.value)}
                          placeholder="••••••••••••••••••••"
                          className="h-8 text-xs font-mono bg-background/50"
                        />
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg border border-border/50 bg-background/40 flex items-center justify-between text-[11px]">
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Authorization Callback URL:</span>
                        <code className="text-foreground font-mono text-[11px]">{webhookBaseUrl}/api/auth/github/callback</code>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(`${webhookBaseUrl}/api/auth/github/callback`, 'gh_cb')}
                        className="h-7 text-xs gap-1"
                      >
                        {copiedUrl === 'gh_cb' ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                        Copy
                      </Button>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <Button
                        type="button"
                        onClick={handleSaveAndConnectOAuth}
                        disabled={savingOauth}
                        className="gap-2 font-semibold text-xs h-8"
                      >
                        {savingOauth ? <RefreshCw className="size-3.5 animate-spin" /> : <Github className="size-3.5" />}
                        {oauthClientId && oauthClientSecret ? 'Save & Connect OAuth' : 'Connect via GitHub'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Enter a GitHub Personal Access Token (PAT) with write access to repositories and pull requests.
                    </p>

                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-foreground">GitHub Access Token</label>
                      <Input
                        type="password"
                        value={patToken}
                        onChange={(e) => setPatToken(e.target.value)}
                        placeholder="github_pat_... or ghp_..."
                        className="h-8 text-xs font-mono bg-background/50"
                      />
                    </div>

                    <div className="p-3 rounded-lg border border-border/50 bg-background/30 space-y-1.5 text-[11px]">
                      <span className="font-semibold text-foreground block">Required Token Scopes for Automated Fixes:</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="size-3 text-emerald-400" />
                          <span>Contents: <strong>Read & write</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="size-3 text-emerald-400" />
                          <span>Pull requests: <strong>Read & write</strong></span>
                        </div>
                      </div>
                    </div>

                    {tokenError && (
                      <div className="p-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs flex items-center gap-2">
                        <AlertTriangle className="size-4 shrink-0 text-rose-400" />
                        <span>{tokenError}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <Button
                        type="button"
                        onClick={handleConnectToken}
                        disabled={verifyingToken || !patToken.trim()}
                        className="gap-2 font-semibold text-xs h-8"
                      >
                        {verifyingToken ? <RefreshCw className="size-3.5 animate-spin" /> : <Key className="size-3.5" />}
                        Verify & Connect Token
                      </Button>
                    </div>
                  </div>
                )}
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

            {/* Selected Repo Capabilities & Permissions Checklist */}
            {isGithubConnected && selectedRepoFullName && (
              <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                    <ShieldCheck className="size-4 text-primary" />
                    Project Capabilities & Permissions for {selectedRepoFullName}
                  </span>
                  {permChecking ? (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground gap-1 py-0 px-2 animate-pulse">
                      <RefreshCw className="size-2.5 animate-spin" />
                      Checking permissions...
                    </Badge>
                  ) : repoPermissions?.canWrite ? (
                    <Badge variant="outline" className="text-[10px] text-emerald-400 bg-emerald-500/15 border-emerald-500/30 gap-1 py-0 px-2">
                      <CheckCircle2 className="size-3 text-emerald-400" />
                      Write & Draft PR Verified
                    </Badge>
                  ) : repoPermissions ? (
                    <Badge variant="outline" className="text-[10px] text-amber-400 bg-amber-500/15 border-amber-500/30 gap-1 py-0 px-2">
                      <AlertTriangle className="size-3 text-amber-400" />
                      Read-Only Permission
                    </Badge>
                  ) : null}
                </div>

                {repoPermissions && !repoPermissions.canWrite && !permChecking && (
                  <div className="p-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300 text-[11px] flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="size-4 shrink-0 text-amber-400" />
                      <span>
                        Branch creation denied by GitHub for this repository. Automated fixes will run in <strong>Advisory Mode</strong> unless write permissions are granted.
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsGithubConnected(false)}
                      className="h-6 text-[10px] border-amber-500/40 text-amber-300 shrink-0"
                    >
                      Update Connection
                    </Button>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  <div
                    onClick={() => setCanDraftPR(!canDraftPR)}
                    className={`p-2.5 rounded-lg border cursor-pointer transition-colors space-y-1 ${
                      canDraftPR
                        ? 'border-primary/60 bg-primary/10'
                        : 'border-border/60 bg-background/30 hover:border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">Draft Pull Requests</span>
                      <input
                        type="checkbox"
                        checked={canDraftPR}
                        onChange={() => {}}
                        className="rounded border-border text-primary size-3.5"
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-normal">
                      Automatically push patch branches and open draft PRs with regression proof.
                    </p>
                  </div>

                  <div
                    onClick={() => setCanRunSandbox(!canRunSandbox)}
                    className={`p-2.5 rounded-lg border cursor-pointer transition-colors space-y-1 ${
                      canRunSandbox
                        ? 'border-primary/60 bg-primary/10'
                        : 'border-border/60 bg-background/30 hover:border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">Sandbox Validation</span>
                      <input
                        type="checkbox"
                        checked={canRunSandbox}
                        onChange={() => {}}
                        className="rounded border-border text-primary size-3.5"
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-normal">
                      Run isolated mutation and test suites in Docker before human review.
                    </p>
                  </div>

                  <div
                    onClick={() => setCanInvestigate(!canInvestigate)}
                    className={`p-2.5 rounded-lg border cursor-pointer transition-colors space-y-1 ${
                      canInvestigate
                        ? 'border-primary/60 bg-primary/10'
                        : 'border-border/60 bg-background/30 hover:border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">Root Cause Analysis</span>
                      <input
                        type="checkbox"
                        checked={canInvestigate}
                        onChange={() => {}}
                        className="rounded border-border text-primary size-3.5"
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-normal">
                      Hypothesis formulation and stack trace dissection via Vercel AI SDK.
                    </p>
                  </div>
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
              Next: Sandbox
              <ArrowRight className="size-3" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 3: Execution Sandbox */}
      {step === 3 && (
        <Card className="border-border/70 bg-card/60">
          <CardHeader className="p-5 pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Boxes className="size-4 text-primary" />
                Execution Sandbox
              </CardTitle>
              <Badge variant="outline" className="text-[10px] text-muted-foreground font-mono">
                Default: Local Docker
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Choose where PatchPilot spins up isolated environments to reproduce issues and verify candidate fixes.
            </p>
          </CardHeader>

          <CardContent className="p-5 pt-1 space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  id: 'local-docker',
                  name: 'Local Docker',
                  badge: 'Default',
                  badgeVariant: 'secondary',
                  desc: 'Runs isolated execution in local Docker containers. Recommended for standard workloads.'
                },
                {
                  id: 'e2b',
                  name: 'E2B Sandbox',
                  badge: '3rd Party Cloud',
                  badgeVariant: 'outline',
                  desc: 'Secure cloud microVMs purpose-built for autonomous AI code execution.'
                },
                {
                  id: 'modal',
                  name: 'Modal Labs',
                  badge: '3rd Party Cloud',
                  badgeVariant: 'outline',
                  desc: 'Elastic serverless cloud container infrastructure with on-demand scaling.'
                },
                {
                  id: 'fake',
                  name: 'In-Memory Simulation',
                  badge: 'Mock',
                  badgeVariant: 'outline',
                  desc: 'Fast offline dry-run simulation without spinning up real containers.'
                }
              ].map((prov) => {
                const isSelected = sandboxProvider === prov.id;
                return (
                  <div
                    key={prov.id}
                    onClick={() => setSandboxProvider(prov.id as any)}
                    className={`p-3.5 rounded-lg border cursor-pointer transition-all space-y-1.5 ${
                      isSelected
                        ? 'border-primary bg-primary/10 shadow-sm'
                        : 'border-border/60 bg-muted/20 hover:border-border hover:bg-muted/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-semibold ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                          {prov.name}
                        </span>
                        <Badge variant="outline" className="text-[9px] py-0 px-1 border-border/60">
                          {prov.badge}
                        </Badge>
                      </div>
                      {isSelected && <Check className="size-3.5 text-primary" />}
                    </div>
                    <p className="text-[11px] leading-relaxed text-muted-foreground">{prov.desc}</p>
                  </div>
                );
              })}
            </div>

            <div className="p-3 bg-muted/30 border border-border/60 rounded-md text-muted-foreground space-y-1 mt-2">
              <span className="font-medium text-foreground block text-[11px]">3rd-Party & Air-Gapped Security</span>
              <p className="text-[11px] leading-relaxed">
                Repository code is mounted into the sandbox as a clean snapshot. Your GitHub OAuth tokens and repository credentials NEVER enter the sandbox environment.
              </p>
            </div>
          </CardContent>

          <CardFooter className="flex justify-between border-t border-border/50 p-4">
            <Button variant="outline" size="sm" onClick={() => setStep(2)} className="h-8 text-xs gap-1">
              <ArrowLeft className="size-3" /> Back
            </Button>
            <Button size="sm" onClick={() => setStep(4)} className="h-8 text-xs gap-1">
              Next: Monitoring
              <ArrowRight className="size-3" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 4: Monitoring */}
      {step === 4 && (
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
            <Button variant="outline" size="sm" onClick={() => setStep(3)} className="h-8 text-xs gap-1">
              <ArrowLeft className="size-3" /> Back
            </Button>
            <Button size="sm" onClick={() => setStep(5)} className="h-8 text-xs gap-1">
              Next: Alerts
              <ArrowRight className="size-3" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 5: Alerts */}
      {step === 5 && (
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
            <Button variant="outline" size="sm" onClick={() => setStep(4)} className="h-8 text-xs gap-1">
              <ArrowLeft className="size-3" /> Back
            </Button>
            <Button size="sm" onClick={handleCreateProject} disabled={saving} className="h-8 text-xs gap-1.5 font-medium">
              <Check className="size-3" />
              {saving ? 'Saving...' : 'Save Configuration'}
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 6: Success */}
      {step === 6 && createdProject && (
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
