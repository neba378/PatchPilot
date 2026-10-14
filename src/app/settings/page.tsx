'use client';

import { useState, useEffect } from 'react';
import { Shield, Check, Save, Cpu, Sparkles, Bot, Zap, SlidersHorizontal, ExternalLink, Key } from 'lucide-react';

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

  useEffect(() => {
    async function loadProjects() {
      try {
        const res = await fetch('/api/projects');
        const data = await res.json();
        if (data.projects && data.projects.length > 0) {
          setProjectsList(data.projects);
          const defaultPrj = data.projects[0];
          setSelectedProjectId(defaultPrj.id);

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
            aiApiKey: aiApiKey || undefined
          })
        });
      }
      setSaved(true);
      setSaveMessage(`Saved! Active model set to ${effectiveModel}.`);
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
    </div>
  );
}
