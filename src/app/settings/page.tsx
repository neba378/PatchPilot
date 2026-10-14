'use client';

import { useState, useEffect } from 'react';
import { Shield, Check, Save, Cpu, Sparkles, Bot, Zap, SlidersHorizontal, ExternalLink, Key, Boxes, Eye, EyeOff, ShieldCheck } from 'lucide-react';

import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { AI_PROVIDERS, getProviderConfig } from '@/core/aiModels';

export default function SettingsPage() {
  const [autonomyLevel, setAutonomyLevel] = useState('draft_pr');
  const [saved, setSaved] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Projects & AI Model State
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [aiProvider, setAiProvider] = useState<'gemini' | 'openai' | 'anthropic' | 'gateway'>('gemini');
  const [aiModel, setAiModel] = useState<string>('gemini-2.5-flash');
  const [isCustomModel, setIsCustomModel] = useState<boolean>(false);
  const [customModelInput, setCustomModelInput] = useState<string>('');
  const [aiApiKey, setAiApiKey] = useState<string>('');

  // Sandbox State
  const [sandboxProvider, setSandboxProvider] = useState<'local-docker' | 'e2b' | 'modal' | 'fake'>('local-docker');
  const [sandboxApiKey, setSandboxApiKey] = useState<string>('');
  const [showSandboxKey, setShowSandboxKey] = useState<boolean>(false);

  useEffect(() => {
    async function loadProjects() {
      try {
        const res = await fetch('/api/projects');
        const data = await res.json();
        if (data.projects && data.projects.length > 0) {
          setProjectsList(data.projects);
          const defaultPrj = data.projects[0];
          setSelectedProjectId(defaultPrj.id);

          if (defaultPrj.sandboxProvider) {
            setSandboxProvider(defaultPrj.sandboxProvider);
          }
          if (defaultPrj.sandboxApiKey) {
            setSandboxApiKey(defaultPrj.sandboxApiKey);
          } else {
            setSandboxApiKey('');
          }
          if (defaultPrj.policy?.autonomyLevel) {
            setAutonomyLevel(defaultPrj.policy.autonomyLevel);
          }

          const aiConn = defaultPrj.connections?.find((c: any) =>
            ['gemini', 'openai', 'anthropic', 'gateway', 'ai'].includes(c.type)
          );
          if (aiConn) {
            const prov = (aiConn.type === 'ai' ? 'gateway' : aiConn.type) as 'gemini' | 'openai' | 'anthropic' | 'gateway';
            setAiProvider(prov);
            const model = aiConn.metadata?.model || (prov === 'gemini' ? 'gemini-2.5-flash' : 'gpt-4o-mini');
            const provConfig = getProviderConfig(prov);
            const isKnown = provConfig.models.some(m => m.id === model);
            if (isKnown) {
              setAiModel(model);
              setIsCustomModel(false);
            } else {
              setAiModel('custom');
              setIsCustomModel(true);
              setCustomModelInput(model);
            }
          }
        }
      } catch (err: any) {
        console.warn('Failed to load projects in settings:', err.message);
      }
    }
    loadProjects();
  }, []);

  const handleSelectProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    const prj = projectsList.find(p => p.id === projectId);
    if (prj) {
      if (prj.sandboxProvider) {
        setSandboxProvider(prj.sandboxProvider);
      } else {
        setSandboxProvider('local-docker');
      }
      if (prj.sandboxApiKey) {
        setSandboxApiKey(prj.sandboxApiKey);
      } else {
        setSandboxApiKey('');
      }
      if (prj.policy?.autonomyLevel) {
        setAutonomyLevel(prj.policy.autonomyLevel);
      }

      const aiConn = prj.connections?.find((c: any) =>
        ['gemini', 'openai', 'anthropic', 'gateway', 'ai'].includes(c.type)
      );
      if (aiConn) {
        const prov = (aiConn.type === 'ai' ? 'gateway' : aiConn.type) as 'gemini' | 'openai' | 'anthropic' | 'gateway';
        setAiProvider(prov);
        const model = aiConn.metadata?.model || (prov === 'gemini' ? 'gemini-2.5-flash' : 'gpt-4o-mini');
        const provConfig = getProviderConfig(prov);
        const isKnown = provConfig.models.some(m => m.id === model);
        if (isKnown) {
          setAiModel(model);
          setIsCustomModel(false);
        } else {
          setAiModel('custom');
          setIsCustomModel(true);
          setCustomModelInput(model);
        }
      }
    }
  };

  const handleSave = async () => {
    try {
      const effectiveModel = isCustomModel ? customModelInput.trim() : aiModel;
      if (selectedProjectId) {
        await fetch('/api/projects', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: selectedProjectId,
            aiProvider,
            aiModel: effectiveModel,
            aiApiKey: aiApiKey || undefined,
            autonomyLevel,
            sandboxProvider,
            sandboxApiKey: sandboxApiKey.trim() || null
          })
        });

        // Update local state list
        setProjectsList(prev => prev.map(p => p.id === selectedProjectId ? {
          ...p,
          sandboxProvider,
          sandboxApiKey: sandboxApiKey.trim() || undefined,
          policy: { ...p.policy, autonomyLevel }
        } : p));
      }
      setSaved(true);
      setSaveMessage(`Saved! Settings and sandbox (${sandboxProvider}) updated.`);
      setTimeout(() => {
        setSaved(false);
        setSaveMessage(null);
      }, 3000);
    } catch (err: any) {
      alert(`Failed to save settings: ${err.message}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Settings</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Automation guardrails, protected paths, and resource limits.
          </p>
        </div>

        <Button onClick={handleSave} size="sm" className="h-8 text-xs font-semibold gap-1.5 self-start sm:self-auto">
          {saved ? <Check className="size-3.5 text-emerald-400" /> : <Save className="size-3.5" />}
          {saved ? 'Saved' : 'Save Changes'}
        </Button>
      </div>

      {/* Invariant Banner */}
      <div className="flex items-center gap-2.5 px-4 py-3 rounded-lg border border-border/70 bg-card/60 text-xs text-muted-foreground">
        <Shield className="size-4 text-primary shrink-0" />
        <span>
          <strong className="text-foreground">Policy Guardrail:</strong> PatchPilot strictly creates Draft Pull Requests. Direct merges and production deployments are permanently disabled.
        </span>
      </div>

      {/* Autonomy Level */}
      <Card className="border-border/70 bg-card/60">
        <CardHeader className="p-4 sm:p-5 pb-3">
          <CardTitle className="text-sm font-semibold text-foreground">Autonomy</CardTitle>
          <p className="text-xs text-muted-foreground">Level of authority granted to automated workflows.</p>
        </CardHeader>

        <CardContent className="p-4 sm:p-5 pt-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              {
                id: 'notify',
                title: 'Notify Only',
                desc: 'Investigate root cause and alert team. No sandboxes provisioned.'
              },
              {
                id: 'suggest',
                title: 'Suggest Fix',
                desc: 'Investigate and generate patch diffs for review without opening PRs.'
              },
              {
                id: 'draft_pr',
                title: 'Draft PR (Default)',
                desc: 'Reproduce in sandbox, run mutation checks, and open draft pull request.'
              }
            ].map((opt) => (
              <div
                key={opt.id}
                onClick={() => setAutonomyLevel(opt.id)}
                className={`p-3.5 rounded-lg border cursor-pointer transition-colors space-y-1.5 ${
                  autonomyLevel === opt.id
                    ? 'border-primary bg-primary/10'
                    : 'border-border/60 bg-muted/20 hover:border-border hover:bg-muted/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold ${autonomyLevel === opt.id ? 'text-primary' : 'text-foreground'}`}>
                    {opt.title}
                  </span>
                  {autonomyLevel === opt.id && <Check className="size-3.5 text-primary" />}
                </div>
                <p className="text-[11px] leading-relaxed text-muted-foreground">{opt.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AI Model & Provider Configuration */}
      {(() => {
        const currentProviderConfig = getProviderConfig(aiProvider);
        const selectedModelObj = currentProviderConfig.models.find(m => m.id === aiModel);

        return (
          <Card className="border-border/70 bg-card/60">
            <CardHeader className="p-4 sm:p-5 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Cpu className="size-4 text-primary" />
                    AI Model & Intelligence Provider
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Select the foundational AI model or enter any custom model endpoint for adversarial investigation and sandbox patch synthesis.
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono border-primary/40 text-primary">
                  Multi-Model
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-5 pt-0 space-y-4 text-xs">
              {saveMessage && (
                <div className="p-2.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                  <Check className="size-3.5" />
                  <span>{saveMessage}</span>
                </div>
              )}

              {/* Target Project Selector if multiple exist */}
              {projectsList.length > 1 && (
                <div className="space-y-1">
                  <label className="text-muted-foreground font-medium">Project</label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => handleSelectProject(e.target.value)}
                    className="w-full h-8 rounded-md border border-border/70 bg-background px-2.5 text-xs text-foreground font-mono"
                  >
                    {projectsList.map((p) => (
                      <option key={p.id} value={p.id} className="bg-popover text-popover-foreground">
                        {p.name} ({p.repoOwner}/{p.repoName})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Provider Selection */}
              <div className="space-y-1.5">
                <label className="text-muted-foreground font-medium flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-primary" />
                  Provider
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {AI_PROVIDERS.map((prov) => {
                    const isSelected = aiProvider === prov.id;
                    return (
                      <div
                        key={prov.id}
                        onClick={() => {
                          setAiProvider(prov.id);
                          setAiModel(prov.defaultModel);
                          setIsCustomModel(false);
                          setCustomModelInput('');
                        }}
                        className={`p-3 rounded-lg border cursor-pointer transition-all space-y-1 ${
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
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Model Dropdown */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-muted-foreground font-medium flex items-center gap-1.5">
                    <Bot className="size-3.5 text-primary" />
                    Model
                  </label>
                  <span className="text-[11px] text-muted-foreground">
                    Provider: <strong className="text-foreground">{currentProviderConfig.name}</strong>
                  </span>
                </div>

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
                  className="w-full h-8 rounded-md border border-border/80 bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer font-mono"
                >
                  {currentProviderConfig.models.map((m) => (
                    <option key={m.id} value={m.id} className="bg-popover text-popover-foreground">
                      {m.name} {m.contextWindow ? `(${m.contextWindow})` : ''} {m.recommended ? '★ Recommended' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom Model Input if 'custom' */}
              {isCustomModel && (
                <div className="p-3 bg-primary/5 border border-primary/30 rounded-md space-y-1.5">
                  <label className="text-foreground font-medium flex items-center gap-1.5 text-[11px]">
                    <SlidersHorizontal className="size-3 text-primary" />
                    Custom Model Identifier
                  </label>
                  <Input
                    type="text"
                    value={customModelInput}
                    onChange={(e) => setCustomModelInput(e.target.value)}
                    placeholder="e.g. gemini-3.5-flash, deepseek-chat, gpt-4.5-preview"
                    className="h-8 text-xs font-mono bg-background"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Specify any model name available in your provider subscription.
                  </p>
                </div>
              )}

              {/* Model Info Banner */}
              <div className="p-3 bg-muted/20 border border-border/50 rounded-md text-muted-foreground space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                    <Zap className="size-3.5 text-amber-400" />
                    Active Model: <code className="text-primary font-mono">{isCustomModel ? (customModelInput || 'Custom Model') : aiModel}</code>
                  </span>
                  {selectedModelObj?.contextWindow && (
                    <Badge variant="secondary" className="text-[10px] font-mono">
                      {selectedModelObj.contextWindow}
                    </Badge>
                  )}
                </div>
                <p className="text-[11px]">
                  {isCustomModel
                    ? 'Using custom user-specified model identifier.'
                    : selectedModelObj?.description}
                </p>
              </div>

              {/* API Key */}
              <div className="space-y-1">
                <label className="text-muted-foreground font-medium flex items-center gap-1.5">
                  <Key className="size-3 text-muted-foreground" />
                  {currentProviderConfig.keyLabel} (Optional if using environment key)
                </label>
                <Input
                  type="password"
                  value={aiApiKey}
                  onChange={(e) => setAiApiKey(e.target.value)}
                  placeholder={currentProviderConfig.keyPlaceholder}
                  className="h-8 text-xs font-mono bg-muted/20"
                />
                <span className="text-[11px] text-muted-foreground/80 flex items-center gap-1">
                  Get API keys at
                  <a
                    href={currentProviderConfig.keyHelpUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-0.5"
                  >
                    {currentProviderConfig.keyHelpText} <ExternalLink className="size-2.5" />
                  </a>
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Protected Paths */}
      <Card className="border-border/70 bg-card/60">
        <CardHeader className="p-4 sm:p-5 pb-3">
          <CardTitle className="text-sm font-semibold text-foreground">Protected Paths</CardTitle>
          <p className="text-xs text-muted-foreground">Files matching these patterns cannot be read or modified by the agent.</p>
        </CardHeader>

        <CardContent className="p-4 sm:p-5 pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              'migrations/**',
              'infra/**',
              '.github/workflows/**',
              'security/**',
              '.env*',
              'config/secrets'
            ].map((path) => (
              <div key={path} className="flex items-center justify-between px-3 py-2 rounded border border-border/50 bg-muted/20 text-xs font-mono">
                <span className="text-foreground">{path}</span>
                <span className="text-[10px] text-muted-foreground">Blocked</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Resource Limits */}
      <Card className="border-border/70 bg-card/60">
        <CardHeader className="p-4 sm:p-5 pb-3">
          <CardTitle className="text-sm font-semibold text-foreground">Resource Limits</CardTitle>
          <p className="text-xs text-muted-foreground">Execution bounds to prevent runaway loops or oversized diffs.</p>
        </CardHeader>

        <CardContent className="p-4 sm:p-5 pt-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-muted/20 rounded-lg border border-border/50">
              <span className="text-muted-foreground text-[11px] block">Max Changed Files</span>
              <span className="text-foreground text-sm font-bold font-mono">3 files</span>
            </div>
            <div className="p-3 bg-muted/20 rounded-lg border border-border/50">
              <span className="text-muted-foreground text-[11px] block">Max Changed Lines</span>
              <span className="text-foreground text-sm font-bold font-mono">60 lines</span>
            </div>
            <div className="p-3 bg-muted/20 rounded-lg border border-border/50">
              <span className="text-muted-foreground text-[11px] block">Max Retries / Fix</span>
              <span className="text-foreground text-sm font-bold font-mono">2 retries</span>
            </div>
            <div className="p-3 bg-muted/20 rounded-lg border border-border/50">
              <span className="text-muted-foreground text-[11px] block">Rate Limit</span>
              <span className="text-foreground text-sm font-bold font-mono">10 RPM</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Execution Sandboxes */}
      <Card className="border-border/70 bg-card/60">
        <CardHeader className="p-4 sm:p-5 pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Boxes className="size-4 text-primary" />
              Execution Sandbox & Isolation Environment
            </CardTitle>
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="text-[10px] text-primary border-primary/40 font-mono">
                Active: {sandboxProvider}
              </Badge>
              {(sandboxProvider === 'e2b' || sandboxProvider === 'modal') && (
                <Badge
                  variant="outline"
                  className={`text-[9px] py-0 px-1 font-sans ${
                    sandboxApiKey
                      ? 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10'
                      : 'border-amber-500/50 text-amber-400 bg-amber-500/10'
                  }`}
                >
                  {sandboxApiKey ? 'Key Configured' : 'API Key Required'}
                </Badge>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Isolated environment used to reproduce bug stack traces, author regression tests, and execute mutation checks before opening Pull Requests.
          </p>
        </CardHeader>

        <CardContent className="p-4 sm:p-5 pt-0 space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {[
              {
                id: 'local-docker',
                name: 'Local Docker',
                badge: 'Container (Default)',
                desc: 'Runs test execution in local Docker container with volume isolation. Zero external API cost.'
              },
              {
                id: 'e2b',
                name: 'E2B Sandbox',
                badge: '3rd Party Cloud MicroVM',
                desc: 'Secure cloud microVMs with dedicated compute per investigation. Ideal for untrusted CI runs.'
              },
              {
                id: 'modal',
                name: 'Modal Labs',
                badge: 'Serverless Cloud',
                desc: 'Elastic serverless cloud container infrastructure with on-demand scaling.'
              },
              {
                id: 'fake',
                name: 'In-Memory Simulation',
                badge: 'Dry Run Mock',
                desc: 'Fast offline dry-run simulation without spinning up real containers.'
              }
            ].map((p) => {
              const isSelected = sandboxProvider === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => setSandboxProvider(p.id as any)}
                  className={`p-3.5 rounded-lg border cursor-pointer transition-all space-y-1.5 ${
                    isSelected
                      ? 'border-primary bg-primary/10 ring-1 ring-primary/40 shadow-sm'
                      : 'border-border/60 bg-muted/20 hover:border-border hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className={`font-semibold font-mono text-xs ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                        {p.name}
                      </span>
                      <Badge variant="outline" className="text-[9px] py-0 px-1 border-border/60">
                        {p.badge}
                      </Badge>
                    </div>
                    {isSelected && <Check className="size-3.5 text-primary" />}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{p.desc}</p>
                </div>
              );
            })}
          </div>

          {/* Dynamic API Key Input for Cloud Sandboxes */}
          {(sandboxProvider === 'e2b' || sandboxProvider === 'modal') && (
            <div className="p-3.5 rounded-lg border border-border/70 bg-muted/20 space-y-2 animate-in fade-in-50">
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
                  ? 'Required to spawn secure cloud microVMs on E2B. Keys are encrypted and saved per-project in your SQLite database.'
                  : 'Required for Modal serverless container execution. Stored securely per-project in SQLite.'}
              </p>
            </div>
          )}

          <div className="flex items-center gap-2 p-2.5 rounded-md bg-muted/20 border border-border/50 text-[11px] text-muted-foreground">
            <ShieldCheck className="size-3.5 text-primary shrink-0" />
            <span>Air-Gapped Security: Code is mounted into the sandbox as a snapshot. GitHub tokens are NEVER passed into the sandbox runtime.</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
