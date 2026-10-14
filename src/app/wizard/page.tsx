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
  Sparkles,
  Bot,
  Zap,
  SlidersHorizontal,
  Key,
  Eye,
  EyeOff,
  Boxes,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  GitPullRequest,
  Settings2,
  Save,
  Plus
} from 'lucide-react';

import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { AI_PROVIDERS, getProviderConfig } from '@/core/aiModels';

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

  // Per-repo PR permission & Fine-Grained token state
  const [repoScopedToken, setRepoScopedToken] = useState('');
  const [verifyingRepoToken, setVerifyingRepoToken] = useState(false);
  const [repoTokenError, setRepoTokenError] = useState<string | null>(null);
  const [repoTokenVerified, setRepoTokenVerified] = useState(false);

  // Projects list
  const [existingProjects, setExistingProjects] = useState<any[]>([]);

  // Form State
  const [activeProjectId, setActiveProjectId] = useState<string>('');
  const [projectName, setProjectName] = useState('Checkout Payment Service');
  const [repoOwner, setRepoOwner] = useState('nebiyu-org');
  const [repoName, setRepoName] = useState('checkout-api-service');
  const [defaultBranch, setDefaultBranch] = useState('main');
  const [sandboxProvider, setSandboxProvider] = useState<'local-docker' | 'e2b' | 'modal' | 'fake'>('local-docker');
  const [sandboxApiKey, setSandboxApiKey] = useState<string>('');
  const [showSandboxKey, setShowSandboxKey] = useState<boolean>(false);

  // AI Model State
  const [aiProvider, setAiProvider] = useState<'gemini' | 'openai' | 'anthropic' | 'gateway'>('gemini');
  const [aiModel, setAiModel] = useState<string>('gemini-2.5-flash');
  const [isCustomModel, setIsCustomModel] = useState<boolean>(false);
  const [customModelInput, setCustomModelInput] = useState<string>('');
  const [aiApiKey, setAiApiKey] = useState<string>('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [aiSaveSuccess, setAiSaveSuccess] = useState<string | null>(null);

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

  const loadExistingProject = useCallback(async () => {
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      if (data.projects && data.projects.length > 0) {
        setExistingProjects(data.projects);

        // Check if a specific project was requested via query param
        const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
        const requestedId = params?.get('projectId');
        const prj = (requestedId ? data.projects.find((p: any) => p.id === requestedId) : null) || data.projects[0];

        setActiveProjectId(prj.id);
        if (prj.name) setProjectName(prj.name);
        if (prj.repoOwner) setRepoOwner(prj.repoOwner);
        if (prj.repoName) setRepoName(prj.repoName);
        if (prj.defaultBranch) setDefaultBranch(prj.defaultBranch);

        const fullRepo = prj.repoOwner && prj.repoName ? `${prj.repoOwner}/${prj.repoName}` : '';
        if (fullRepo) {
          setSelectedRepoFullName(fullRepo);
          checkRepoPermissions(fullRepo);
        }

        if (prj.sandboxProvider) {
          setSandboxProvider(prj.sandboxProvider);
        }
        if (prj.sandboxApiKey) {
          setSandboxApiKey(prj.sandboxApiKey);
        }

        if (prj.policy) {
          setCanDraftPR(prj.policy.autonomyLevel === 'draft_pr');
        }

        const ghConn = prj.connections?.find((c: any) => c.type === 'github');
        if (ghConn) {
          if (ghConn.metadata?.canDraftPR !== undefined) {
            setCanDraftPR(Boolean(ghConn.metadata.canDraftPR));
          }
          if (ghConn.metadata?.connectedVia === 'repo_token' && ghConn.encryptedSecret) {
            setRepoScopedToken(ghConn.encryptedSecret);
            setRepoTokenVerified(true);
          }
        }

        const aiConn = prj.connections?.find((c: any) =>
          ['gemini', 'openai', 'anthropic', 'gateway', 'ai'].includes(c.type)
        );
        if (aiConn) {
          const prov = (aiConn.type === 'ai' ? 'gateway' : aiConn.type) as 'gemini' | 'openai' | 'anthropic' | 'gateway';
          setAiProvider(prov);
          const meta = aiConn.metadata || {};
          const model = meta.model || (prov === 'gemini' ? 'gemini-2.5-flash' : 'gpt-4o-mini');

          const providerDef = AI_PROVIDERS.find(p => p.id === prov);
          const isKnown = providerDef?.models.some(m => m.id === model);
          if (isKnown) {
            setAiModel(model);
            setIsCustomModel(false);
          } else {
            setAiModel('custom');
            setIsCustomModel(true);
            setCustomModelInput(model);
          }
        }

        const sentryConn = prj.connections?.find((c: any) => c.type === 'sentry');
        if (sentryConn?.encryptedSecret && sentryConn.encryptedSecret !== 'default_secret') {
          setSentrySecret(sentryConn.encryptedSecret);
        }

        const tgConn = prj.connections?.find((c: any) => c.type === 'telegram');
        if (tgConn?.metadata?.chatId) {
          setTelegramChatId(tgConn.metadata.chatId);
        }
        if (tgConn?.encryptedSecret) {
          setTelegramToken(tgConn.encryptedSecret);
        }
      }
    } catch (err: any) {
      console.warn('Failed to load existing project:', err.message);
    }
  }, []);

  useEffect(() => {
    checkGitHubStatus();
    loadExistingProject();

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
  }, [checkGitHubStatus, fetchRepos, loadExistingProject]);

  const checkRepoPermissions = async (fullName: string, overrideToken?: string) => {
    setPermChecking(true);
    setRepoPermissions(null);
    setRepoTokenError(null);
    try {
      const res = await fetch('/api/auth/github/check-permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo: fullName,
          token: overrideToken !== undefined ? overrideToken.trim() : (repoScopedToken.trim() || undefined)
        })
      });
      const data = await res.json();
      setRepoPermissions(data);
      if (data.canWrite) {
        setCanDraftPR(true);
        if (overrideToken) {
          setRepoTokenVerified(true);
        }
      } else {
        if (overrideToken) {
          setRepoTokenError(data.error || 'Write and Draft PR permission not granted for this repository.');
        }
      }
    } catch (e: any) {
      setRepoPermissions({ canRead: false, canWrite: false, error: e.message });
      if (overrideToken) {
        setRepoTokenError(e.message);
      }
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

  const handleStartNewProject = () => {
    setActiveProjectId('');
    setSelectedRepoFullName('');
    setProjectName('New Project Service');
    setRepoOwner('');
    setRepoName('');
    setDefaultBranch('main');
    setRepoScopedToken('');
    setRepoTokenError(null);
    setRepoTokenVerified(false);
    setCanDraftPR(true);
    setRepoPermissions(null);
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

    const existing = existingProjects.find(
      (p) => p.repoOwner?.toLowerCase() === repo.owner.toLowerCase() && p.repoName?.toLowerCase() === repo.name.toLowerCase()
    );

    if (existing) {
      // Switch to editing existing project for this repo
      setActiveProjectId(existing.id);
      setProjectName(existing.name || formatted);
      if (existing.defaultBranch) setDefaultBranch(existing.defaultBranch);
      if (existing.sandboxProvider) setSandboxProvider(existing.sandboxProvider);
      if (existing.sandboxApiKey) setSandboxApiKey(existing.sandboxApiKey);
      if (existing.policy) setCanDraftPR(existing.policy.autonomyLevel === 'draft_pr');

      const ghConn = existing.connections?.find((c: any) => c.type === 'github');
      if (ghConn) {
        if (ghConn.metadata?.canDraftPR !== undefined) {
          setCanDraftPR(Boolean(ghConn.metadata.canDraftPR));
        }
        if (ghConn.metadata?.connectedVia === 'repo_token' && ghConn.encryptedSecret) {
          setRepoScopedToken(ghConn.encryptedSecret);
          setRepoTokenVerified(true);
        } else {
          setRepoScopedToken('');
          setRepoTokenVerified(false);
        }
      }
    } else {
      // Brand NEW project for this repository - do NOT overwrite previous project!
      setActiveProjectId('');
      setProjectName(formatted);
      setRepoScopedToken('');
      setRepoTokenError(null);
      setRepoTokenVerified(false);
      setCanDraftPR(true);
    }

    checkRepoPermissions(repo.fullName);
  };

  const handleSaveAIModelOnly = async () => {
    if (!activeProjectId) {
      setStep(3);
      return;
    }
    setSaving(true);
    setAiSaveSuccess(null);
    try {
      const effectiveModel = isCustomModel ? customModelInput.trim() : aiModel;
      const res = await fetch('/api/projects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: activeProjectId,
          aiProvider,
          aiModel: effectiveModel,
          aiApiKey: aiApiKey || geminiApiKey
        })
      });
      const data = await res.json();
      if (data.success) {
        setAiSaveSuccess(`Active model updated to ${effectiveModel}!`);
        setTimeout(() => setAiSaveSuccess(null), 3000);
      } else {
        alert(data.error || 'Failed to update AI model');
      }
    } catch (e: any) {
      alert(`Error updating AI model: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveStep = async (nextStep: number) => {
    setSaving(true);
    try {
      const effectiveModel = isCustomModel ? customModelInput.trim() : aiModel;
      const effectiveAiKey = aiApiKey || geminiApiKey;

      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: activeProjectId || undefined,
          name: projectName,
          repoOwner,
          repoName,
          defaultBranch,
          githubToken: repoScopedToken.trim() || patToken.trim() || undefined,
          aiProvider,
          aiModel: effectiveModel,
          aiApiKey: effectiveAiKey,
          geminiApiKey: effectiveAiKey,
          sandboxProvider,
          sandboxApiKey: sandboxApiKey.trim() || undefined,
          canDraftPR,
          sentrySecret,
          telegramToken,
          telegramChatId
        })
      });

      const data = await res.json();
      if (data.success) {
        if (data.projectId) {
          setActiveProjectId(data.projectId);
        }
        // Refresh existing projects list so UI reflects the newly created/updated project
        try {
          const refRes = await fetch('/api/projects');
          const refData = await refRes.json();
          if (refData.projects) setExistingProjects(refData.projects);
        } catch {}

        setCreatedProject(data);
        if (nextStep === 6) {
          setStep(6);
        } else if (nextStep !== step) {
          setStep(nextStep);
        }
      } else {
        alert(data.error || 'Failed to save configuration');
      }
    } catch (e: any) {
      alert(`Error saving configuration: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateProject = async () => {
    await handleSaveStep(6);
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FolderGit2 className="size-4 text-primary" />
                GitHub Connection & Repository
              </CardTitle>

              <div className="flex items-center gap-2">
                {activeProjectId ? (
                  <Badge variant="outline" className="text-[10px] text-cyan-400 border-cyan-500/30 bg-cyan-500/10 gap-1.5 py-0.5 px-2">
                    <span>Editing Project:</span>
                    <strong className="text-foreground">{projectName}</strong>
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30 bg-emerald-500/10 gap-1 py-0.5 px-2">
                    <Sparkles className="size-2.5" /> New Project Mode
                  </Badge>
                )}

                {existingProjects.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleStartNewProject}
                    className="h-7 text-xs gap-1 border-primary/40 text-primary hover:bg-primary/10"
                  >
                    <Plus className="size-3" />
                    New Project
                  </Button>
                )}
              </div>
            </div>
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
                      Connect via GitHub OAuth with read-only identity scope (<code>read:user</code>, <code>user:email</code>).
                      Blanket repository write permissions are <strong>never</strong> requested at the OAuth App level.
                      Pull request permissions are granted specifically per repository when connected below.
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
                          <div className="truncate flex items-center gap-1.5">
                            <span className="font-mono text-xs text-foreground font-medium mr-1.5">
                              {repo.fullName}
                            </span>
                            {repo.private && (
                              <Badge variant="outline" className="text-[9px] text-amber-400 py-0 px-1 border-amber-500/20">
                                <Lock className="size-2 mr-0.5" /> Private
                              </Badge>
                            )}
                            {existingProjects.some(
                              (p) => p.repoOwner?.toLowerCase() === repo.owner.toLowerCase() && p.repoName?.toLowerCase() === repo.name.toLowerCase()
                            ) && (
                              <Badge variant="outline" className="text-[9px] text-cyan-400 py-0 px-1 border-cyan-500/30 bg-cyan-500/10">
                                Project Linked
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

            {/* Repository Permissions & Pull Request Authorization */}
            {isGithubConnected && selectedRepoFullName && (
              <div className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="size-4 text-primary" />
                      <span className="font-semibold text-xs text-foreground">
                        Git Permissions & PR Authorization for <code className="text-primary font-mono">{selectedRepoFullName}</code>
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Permission to open Pull Requests is configured specifically for this repository, not globally via OAuth.
                    </p>
                  </div>

                  {permChecking ? (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground gap-1 py-0.5 px-2 animate-pulse self-start sm:self-auto">
                      <RefreshCw className="size-2.5 animate-spin" />
                      Verifying access...
                    </Badge>
                  ) : canDraftPR && (repoPermissions?.canWrite || repoTokenVerified) ? (
                    <Badge variant="outline" className="text-[10px] text-emerald-400 bg-emerald-500/15 border-emerald-500/30 gap-1 py-0.5 px-2 self-start sm:self-auto">
                      <CheckCircle2 className="size-3 text-emerald-400" />
                      PR Permission Active
                    </Badge>
                  ) : !canDraftPR ? (
                    <Badge variant="outline" className="text-[10px] text-amber-400 bg-amber-500/15 border-amber-500/30 gap-1 py-0.5 px-2 self-start sm:self-auto">
                      <AlertTriangle className="size-3 text-amber-400" />
                      Advisory Mode (No PRs)
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-amber-400 bg-amber-500/15 border-amber-500/30 gap-1 py-0.5 px-2 self-start sm:self-auto">
                      <Key className="size-2.5 text-amber-400" />
                      Write Access Needed
                    </Badge>
                  )}
                </div>

                {/* Permission Choice: Grant PR vs Advisory Mode */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setCanDraftPR(true)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all space-y-1.5 ${
                      canDraftPR
                        ? 'border-primary/60 bg-primary/10 shadow-xs'
                        : 'border-border/60 bg-background/30 hover:border-border text-muted-foreground'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <GitPullRequest className="size-3.5 text-primary" />
                        Grant Pull Request Permission
                      </span>
                      <input
                        type="radio"
                        name="pr_permission"
                        checked={canDraftPR}
                        onChange={() => setCanDraftPR(true)}
                        className="text-primary size-3.5"
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-normal">
                      Allows PatchPilot to automatically create isolated patch branches and open Draft PRs with verified test proof on this repository.
                    </p>
                  </div>

                  <div
                    onClick={() => setCanDraftPR(false)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all space-y-1.5 ${
                      !canDraftPR
                        ? 'border-primary/60 bg-primary/10 shadow-xs'
                        : 'border-border/60 bg-background/30 hover:border-border text-muted-foreground'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <ShieldCheck className="size-3.5 text-amber-400" />
                        Advisory Mode (No PRs)
                      </span>
                      <input
                        type="radio"
                        name="pr_permission"
                        checked={!canDraftPR}
                        onChange={() => setCanDraftPR(false)}
                        className="text-primary size-3.5"
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-normal">
                      PatchPilot will investigate root causes and validate fixes in Docker, but will <strong>never</strong> push code or open PRs. Diffs remain advisory.
                    </p>
                  </div>
                </div>

                {/* If PR permission selected: Handle verification and repo-specific token */}
                {canDraftPR && (
                  <div className="space-y-3 pt-1">
                    {repoPermissions?.canWrite || repoTokenVerified ? (
                      <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
                          <span>
                            Verified! Write and PR creation permissions are authorized for <strong>{selectedRepoFullName}</strong>.
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => checkRepoPermissions(selectedRepoFullName)}
                          className="h-6 text-[10px] text-emerald-300 hover:text-emerald-200 hover:bg-emerald-500/20"
                        >
                          Re-verify
                        </Button>
                      </div>
                    ) : (
                      <div className="p-3.5 rounded-lg border border-amber-500/30 bg-amber-500/10 space-y-2.5 text-xs text-amber-300">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="size-4 shrink-0 text-amber-400 mt-0.5" />
                          <div className="space-y-1">
                            <span className="font-semibold block text-amber-200">
                              Repository PR Permission Authorization
                            </span>
                            <p className="text-[11px] text-amber-300/90 leading-relaxed">
                              Because GitHub was connected with read-only OAuth identity scopes (to protect all your other repositories), provide a <strong>Repository-Scoped Fine-Grained Token</strong> for this specific repository to authorize branch creation and Draft PRs.
                            </p>
                          </div>
                        </div>

                        <div className="space-y-1.5 pt-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <label className="font-medium text-foreground">
                              Repository Token (Fine-Grained PAT for {selectedRepoFullName}):
                            </label>
                            <a
                              href="https://github.com/settings/personal-access-tokens/new"
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] text-primary hover:underline flex items-center gap-1"
                            >
                              Generate on GitHub
                              <ExternalLink className="size-2.5" />
                            </a>
                          </div>

                          <div className="flex gap-2">
                            <Input
                              type="password"
                              value={repoScopedToken}
                              onChange={(e) => setRepoScopedToken(e.target.value)}
                              placeholder="github_pat_..."
                              className="h-8 text-xs font-mono bg-background/50 flex-1"
                            />
                            <Button
                              type="button"
                              onClick={async () => {
                                setVerifyingRepoToken(true);
                                await checkRepoPermissions(selectedRepoFullName, repoScopedToken);
                                setVerifyingRepoToken(false);
                              }}
                              disabled={verifyingRepoToken || !repoScopedToken.trim()}
                              className="h-8 text-xs font-medium gap-1.5 px-3 shrink-0"
                            >
                              {verifyingRepoToken ? <RefreshCw className="size-3 animate-spin" /> : <Key className="size-3" />}
                              Verify & Authorize
                            </Button>
                          </div>

                          {repoTokenError && (
                            <p className="text-[11px] text-rose-400 font-medium pt-0.5">
                              {repoTokenError}
                            </p>
                          )}

                          <div className="text-[10px] text-muted-foreground space-y-0.5 pt-1">
                            <span className="font-medium block text-foreground">Required Fine-Grained Token settings:</span>
                            <p>• <strong>Repository access:</strong> Only select repositories → <code>{selectedRepoFullName}</code></p>
                            <p>• <strong>Permissions:</strong> <em>Contents</em> (Read & write), <em>Pull requests</em> (Read & write)</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Additional capabilities checklist */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 border-t border-border/40">
                  <div
                    onClick={() => setCanRunSandbox(!canRunSandbox)}
                    className={`p-2 rounded-lg border cursor-pointer transition-colors space-y-0.5 ${
                      canRunSandbox ? 'border-primary/60 bg-primary/10' : 'border-border/60 bg-background/30 hover:border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">Sandbox Validation</span>
                      <input type="checkbox" checked={canRunSandbox} onChange={() => {}} className="rounded border-border text-primary size-3.5" />
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-normal">
                      Run isolated mutation and test suites in Docker before human review.
                    </p>
                  </div>

                  <div
                    onClick={() => setCanInvestigate(!canInvestigate)}
                    className={`p-2 rounded-lg border cursor-pointer transition-colors space-y-0.5 ${
                      canInvestigate ? 'border-primary/60 bg-primary/10' : 'border-border/60 bg-background/30 hover:border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">Root Cause Analysis</span>
                      <input type="checkbox" checked={canInvestigate} onChange={() => {}} className="rounded border-border text-primary size-3.5" />
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-normal">
                      Hypothesis formulation and stack trace dissection via AI SDK.
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
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSaveStep(1)}
                disabled={saving}
                className="h-8 text-xs gap-1.5"
              >
                {saving ? <RefreshCw className="size-3 animate-spin" /> : <Save className="size-3" />}
                Save Progress
              </Button>
              <Button size="sm" onClick={() => handleSaveStep(2)} disabled={saving} className="h-8 text-xs gap-1">
                {saving ? <RefreshCw className="size-3 animate-spin" /> : null}
                Next: AI Model
                <ArrowRight className="size-3" />
              </Button>
            </div>
          </CardFooter>
        </Card>
      )}

      {/* Step 2: AI Model Selection & Configuration */}
      {step === 2 && (() => {
        const currentProviderConfig = getProviderConfig(aiProvider);
        const selectedModelObj = currentProviderConfig.models.find(m => m.id === aiModel);

        return (
          <Card className="border-border/70 bg-card/60">
            <CardHeader className="p-5 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Cpu className="size-4 text-primary" />
                  AI Model & Intelligence Provider
                </CardTitle>
                <Badge variant="outline" className="text-[10px] font-mono border-primary/40 text-primary">
                  Multi-Model Engine
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Select your preferred AI foundation model or enter any custom model endpoint for root-cause synthesis and sandbox repairs.
              </p>
            </CardHeader>

            <CardContent className="p-5 pt-2 space-y-4 text-xs">
              {aiSaveSuccess && (
                <div className="p-2.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                  <Check className="size-3.5" />
                  <span>{aiSaveSuccess}</span>
                </div>
              )}

              {/* Provider Selection Cards */}
              <div className="space-y-1.5">
                <label className="text-muted-foreground font-medium flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-primary" />
                  1. Choose AI Provider
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {AI_PROVIDERS.map((prov) => {
                    const isSelected = aiProvider === prov.id;
                    return (
                      <button
                        key={prov.id}
                        type="button"
                        onClick={() => {
                          setAiProvider(prov.id);
                          setAiModel(prov.defaultModel);
                          setIsCustomModel(false);
                          setCustomModelInput('');
                        }}
                        className={`p-3 rounded-lg border text-left transition-all space-y-1 ${
                          isSelected
                            ? 'border-primary bg-primary/10 shadow-sm'
                            : 'border-border/60 bg-muted/20 hover:border-border hover:bg-muted/40'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-semibold ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                            {prov.name}
                          </span>
                          {isSelected && <Check className="size-3 text-primary" />}
                        </div>
                        <p className="text-[10px] text-muted-foreground line-clamp-2 leading-tight">
                          {prov.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Model Selection Dropdown */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-muted-foreground font-medium flex items-center gap-1.5">
                    <Bot className="size-3.5 text-primary" />
                    2. Select AI Model
                  </label>
                  <span className="text-[11px] text-muted-foreground">
                    Provider: <strong className="text-foreground">{currentProviderConfig.name}</strong>
                  </span>
                </div>

                <div className="relative">
                  <select
                    value={isCustomModel ? 'custom' : aiModel}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'custom') {
                        setIsCustomModel(true);
                        setAiModel('custom');
                        if (!customModelInput) setCustomModelInput('');
                      } else {
                        setIsCustomModel(false);
                        setAiModel(val);
                      }
                    }}
                    className="w-full h-9 rounded-md border border-border/80 bg-background/80 px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer font-mono"
                  >
                    {currentProviderConfig.models.map((m) => (
                      <option key={m.id} value={m.id} className="bg-popover text-popover-foreground">
                        {m.name} {m.contextWindow ? `(${m.contextWindow})` : ''} {m.recommended ? '★ Recommended' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Custom Model Input if 'custom' selected */}
              {isCustomModel && (
                <div className="p-3 bg-primary/5 border border-primary/30 rounded-md space-y-1.5 animate-in fade-in-50">
                  <div className="flex items-center justify-between">
                    <label className="text-foreground font-medium flex items-center gap-1.5 text-[11px]">
                      <SlidersHorizontal className="size-3 text-primary" />
                      Custom Model Identifier
                    </label>
                    <span className="text-[10px] text-muted-foreground font-mono">Any valid model string</span>
                  </div>
                  <Input
                    type="text"
                    value={customModelInput}
                    onChange={(e) => setCustomModelInput(e.target.value)}
                    placeholder={
                      aiProvider === 'gemini'
                        ? 'e.g. gemini-3.5-flash or gemini-2.5-pro'
                        : aiProvider === 'openai'
                        ? 'e.g. gpt-4.5-preview or o3-mini'
                        : aiProvider === 'anthropic'
                        ? 'e.g. claude-3-7-sonnet or claude-3-5-sonnet-latest'
                        : 'e.g. deepseek/deepseek-chat or provider/model'
                    }
                    className="h-8 text-xs font-mono bg-background"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    You can type any model identifier supported by your provider account. PatchPilot will route investigation and code synthesis tasks to this model.
                  </p>
                </div>
              )}

              {/* Selected Model Capabilities Card */}
              <div className="p-3 bg-muted/30 border border-border/60 rounded-md text-muted-foreground space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                    <Zap className="size-3.5 text-amber-400" />
                    Active Model: <code className="text-primary font-mono">{isCustomModel ? (customModelInput || 'Custom Model') : aiModel}</code>
                  </span>
                  {selectedModelObj?.contextWindow && (
                    <Badge variant="secondary" className="text-[10px] font-mono">
                      {selectedModelObj.contextWindow} Context
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] leading-relaxed">
                  {isCustomModel
                    ? 'Using custom user-specified model identifier. Ensure your API key has authorization for this model.'
                    : selectedModelObj?.description}
                </p>
                {currentProviderConfig.rateLimitNotice && (
                  <p className="text-[10px] text-muted-foreground/80 pt-0.5 border-t border-border/40">
                    💡 {currentProviderConfig.rateLimitNotice}
                  </p>
                )}
              </div>

              {/* Provider API Key Input */}
              <div className="space-y-1">
                <label className="text-muted-foreground font-medium flex items-center gap-1.5">
                  <Key className="size-3 text-muted-foreground" />
                  3. {currentProviderConfig.keyLabel}
                </label>
                <Input
                  type="password"
                  value={aiApiKey || geminiApiKey}
                  onChange={(e) => {
                    setAiApiKey(e.target.value);
                    setGeminiApiKey(e.target.value);
                  }}
                  placeholder={currentProviderConfig.keyPlaceholder}
                  className="h-8 text-xs font-mono bg-muted/20"
                />
                <span className="text-[11px] text-muted-foreground/80 flex items-center gap-1">
                  Keys available at
                  <a
                    href={currentProviderConfig.keyHelpUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-0.5"
                  >
                    {currentProviderConfig.keyHelpText} <ExternalLink className="size-2.5" />
                  </a>
                  {aiProvider === 'gemini' && ' (Free tier available)'}
                </span>
              </div>
            </CardContent>

            <CardFooter className="flex justify-between border-t border-border/50 p-4">
              <Button variant="outline" size="sm" onClick={() => setStep(1)} className="h-8 text-xs gap-1">
                <ArrowLeft className="size-3" /> Back
              </Button>
              <div className="flex items-center gap-2">
                {activeProjectId && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSaveAIModelOnly}
                    disabled={saving}
                    className="h-8 text-xs gap-1 text-primary border-primary/40 hover:bg-primary/10"
                  >
                    <Check className="size-3" />
                    Apply Model
                  </Button>
                )}
                <Button size="sm" onClick={() => handleSaveStep(3)} disabled={saving} className="h-8 text-xs gap-1">
                  {saving ? <RefreshCw className="size-3 animate-spin" /> : null}
                  Next: Sandbox
                  <ArrowRight className="size-3" />
                </Button>
              </div>
            </CardFooter>
          </Card>
        );
      })()}

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

            {/* Dynamic API Key Input for Cloud Sandboxes */}
            {(sandboxProvider === 'e2b' || sandboxProvider === 'modal') && (
              <div className="p-3.5 rounded-lg border border-border/70 bg-muted/20 space-y-2 mt-3 animate-in fade-in-50">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Key className="size-3.5 text-primary" />
                    <span>{sandboxProvider === 'e2b' ? 'E2B API Key' : 'Modal Token ID / Secret'}</span>
                  </label>
                  <a
                    href={sandboxProvider === 'e2b' ? 'https://e2b.dev/dashboard' : 'https://modal.com/settings'}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-primary hover:underline flex items-center gap-1"
                  >
                    <span>Get Key</span>
                    <ExternalLink className="size-2.5" />
                  </a>
                </div>

                <div className="relative">
                  <Input
                    type={showSandboxKey ? 'text' : 'password'}
                    placeholder={sandboxProvider === 'e2b' ? 'e2b_...' : 'ak-...'}
                    value={sandboxApiKey}
                    onChange={(e) => setSandboxApiKey(e.target.value)}
                    className="h-8 text-xs font-mono pr-8 bg-background border-border/80"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSandboxKey(!showSandboxKey)}
                    className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                  >
                    {showSandboxKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>

                <p className="text-[11px] text-muted-foreground leading-normal">
                  {sandboxProvider === 'e2b'
                    ? 'Required to provision isolated cloud microVMs in E2B. Stored securely per-project in SQLite.'
                    : 'Required for Modal serverless execution compute. Stored securely per-project in SQLite.'}
                </p>
              </div>
            )}

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
            <Button size="sm" onClick={() => handleSaveStep(4)} disabled={saving} className="h-8 text-xs gap-1">
              {saving ? <RefreshCw className="size-3 animate-spin" /> : null}
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
            <Button size="sm" onClick={() => handleSaveStep(5)} disabled={saving} className="h-8 text-xs gap-1">
              {saving ? <RefreshCw className="size-3 animate-spin" /> : null}
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
