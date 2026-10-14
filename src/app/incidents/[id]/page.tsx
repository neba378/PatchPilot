'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  GitPullRequest,
  Terminal,
  FileCode,
  ExternalLink,
  Play,
  Copy,
  Check,
  FileText,
  AlertTriangle,
  RotateCw,
  XCircle,
  ShieldAlert,
  Loader2,
  Server
} from 'lucide-react';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';

export default function IncidentDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const [incidentData, setIncidentData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [liveLogs, setLiveLogs] = useState<string[]>([]);
  const [actionStatus, setActionStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [activeLogTab, setActiveLogTab] = useState<'sandbox' | 'sentry'>('sandbox');
  const [copiedDiff, setCopiedDiff] = useState(false);
  const [copiedTest, setCopiedTest] = useState(false);

  const fetchIncident = async () => {
    try {
      const res = await fetch(`/api/incidents/${id}`);
      const data = await res.json();
      if (data.incident) {
        setIncidentData(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncident();
    const interval = setInterval(fetchIncident, 3000);
    return () => clearInterval(interval);
  }, [id]);

  const handleAction = async (action: 'accept' | 'reject' | 'snooze') => {
    setActionLoading(true);
    setActionStatus({
      type: 'info',
      message: action === 'accept'
        ? '⚡ Launching isolated sandbox environment... Running failure reproduction and mutation tests...'
        : action === 'reject'
          ? 'Marking incident as dismissed / rejected...'
          : 'Snoozing incident alert...'
    });

    if (action === 'accept') {
      setLiveLogs([
        `[${new Date().toLocaleTimeString()}] 🚀 Human approved patch execution. Initializing PatchPilot autonomous pipeline...`,
        `[${new Date().toLocaleTimeString()}] 📦 Provisioning isolated sandbox container...`
      ]);
    }

    try {
      const res = await fetch(`/api/incidents/${id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });

      const text = await res.text();
      let data: any = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { error: text || 'Server returned non-JSON response' };
      }

      if (data.fixResult?.logs && Array.isArray(data.fixResult.logs)) {
        setLiveLogs(data.fixResult.logs);
      }

      if (res.ok && data.success) {
        if (action === 'accept') {
          setActionStatus({
            type: 'success',
            message: `✅ Sandbox fix verified! Draft PR #${data.fixResult?.prNumber || 'open'} created with mutation test proof.`
          });
        } else if (action === 'reject') {
          setActionStatus({
            type: 'info',
            message: '🚫 Incident marked as rejected and archived.'
          });
        } else {
          setActionStatus({
            type: 'info',
            message: '⏳ Incident snoozed for 2 hours.'
          });
        }
      } else {
        setActionStatus({
          type: 'error',
          message: `❌ Action failed: ${data.error || 'Pipeline execution failed.'}`
        });
      }

      await fetchIncident();
    } catch (e: any) {
      setActionStatus({
        type: 'error',
        message: `Network error: ${e.message}`
      });
    } finally {
      setActionLoading(false);
    }
  };

  const copyText = (text: string, type: 'diff' | 'test') => {
    navigator.clipboard.writeText(text);
    if (type === 'diff') {
      setCopiedDiff(true);
      setTimeout(() => setCopiedDiff(false), 2000);
    } else {
      setCopiedTest(true);
      setTimeout(() => setCopiedTest(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-xs text-muted-foreground font-mono flex items-center justify-center gap-2">
        <Loader2 className="size-4 animate-spin text-primary" />
        <span>Loading incident details...</span>
      </div>
    );
  }

  if (!incidentData || !incidentData.incident) {
    return (
      <div className="py-16 text-center space-y-3">
        <p className="text-sm font-medium text-foreground">Incident not found</p>
        <Button asChild size="sm" variant="outline">
          <Link href="/">Back to Incidents</Link>
        </Button>
      </div>
    );
  }

  const { incident, investigation, fixAttempt, pullRequest, postmortem } = incidentData;

  const hypotheses = investigation?.hypotheses
    ? (typeof investigation.hypotheses === 'string' ? JSON.parse(investigation.hypotheses) : investigation.hypotheses)
    : [];

  let validationSummary: any = null;
  if (fixAttempt?.validationSummary) {
    try {
      validationSummary = typeof fixAttempt.validationSummary === 'string'
        ? JSON.parse(fixAttempt.validationSummary)
        : fixAttempt.validationSummary;
    } catch {}
  }

  const allSandboxLogs = (validationSummary?.logs && Array.isArray(validationSummary.logs) && validationSummary.logs.length > 0)
    ? validationSummary.logs
    : liveLogs;

  const isPendingApproval = incident.status === 'awaiting_approval';
  const isFailed = incident.status === 'fix_failed';
  const isDiagnosing = incident.status === 'diagnosing';
  const isFixing = incident.status === 'fixing' || incident.status === 'validating' || actionLoading;

  return (
    <div className="space-y-6">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm" className="h-8 -ml-2 text-xs text-muted-foreground hover:text-foreground">
          <Link href="/">
            <ArrowLeft className="size-3.5 mr-1" />
            All Incidents
          </Link>
        </Button>

        {pullRequest && (
          <Button asChild size="sm" variant="outline" className="h-8 text-xs gap-1.5 border-sky-500/40 bg-sky-500/10 text-sky-400 hover:bg-sky-500/20">
            <a href={pullRequest.url} target="_blank" rel="noopener noreferrer">
              <GitPullRequest className="size-3.5" />
              <span>Draft PR #{pullRequest.prNumber}</span>
              <ExternalLink className="size-3 opacity-60 ml-0.5" />
            </a>
          </Button>
        )}
      </div>

      {/* Action Status Banner */}
      {actionStatus && (
        <div
          className={`p-3.5 rounded-lg border text-xs flex items-center justify-between gap-3 ${
            actionStatus.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : actionStatus.type === 'error'
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                : 'bg-primary/10 border-primary/30 text-primary'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionStatus.type === 'success' ? (
              <CheckCircle2 className="size-4 shrink-0" />
            ) : actionStatus.type === 'error' ? (
              <XCircle className="size-4 shrink-0" />
            ) : (
              <Loader2 className="size-4 shrink-0 animate-spin" />
            )}
            <span className="font-medium">{actionStatus.message}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActionStatus(null)}
            className="h-6 text-[11px] px-2 hover:bg-transparent"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Incident Header Card */}
      <Card className="border-border/70 bg-card/60">
        <CardHeader className="p-5 pb-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold text-foreground">{incident.id}</span>
                <Badge
                  variant={incident.severity === 'critical' ? 'destructive' : 'warning'}
                  className="uppercase text-[10px] px-1.5 py-0 font-bold"
                >
                  {incident.severity}
                </Badge>
                <span className="text-xs text-muted-foreground font-mono">
                  {incident.source}
                </span>
                <Badge
                  variant="outline"
                  className={`text-[10px] uppercase font-mono ${
                    incident.status === 'awaiting_approval'
                      ? 'border-amber-400/50 text-amber-400 bg-amber-400/10'
                      : incident.status === 'pr_open'
                        ? 'border-sky-400/50 text-sky-400 bg-sky-400/10'
                        : incident.status === 'fix_failed'
                          ? 'border-rose-400/50 text-rose-400 bg-rose-400/10'
                          : incident.status === 'fixing'
                            ? 'border-blue-400/50 text-blue-400 bg-blue-400/10'
                            : 'border-border text-muted-foreground'
                  }`}
                >
                  {incident.status}
                </Badge>
                {incident.occurrences > 1 && (
                  <span className="text-xs text-muted-foreground/80 font-mono">
                    ({incident.occurrences} signals)
                  </span>
                )}
              </div>
              <h1 className="text-lg md:text-xl font-bold tracking-tight text-foreground">
                {incident.title}
              </h1>
            </div>

            {/* Actions: Apply Patch, Retry, Dismiss, Snooze */}
            <div className="flex items-center gap-2 shrink-0">
              {(isPendingApproval || isFailed || isDiagnosing) && (
                <>
                  <Button
                    size="sm"
                    onClick={() => handleAction('accept')}
                    disabled={actionLoading}
                    className="h-8 px-3 text-xs font-semibold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {actionLoading ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Play className="size-3 fill-current" />
                    )}
                    <span>{actionLoading ? 'Testing in Sandbox...' : isFailed ? 'Retry Sandbox Fix' : 'Apply Patch'}</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAction('reject')}
                    disabled={actionLoading}
                    className="h-8 px-3 text-xs border-border/80 text-muted-foreground hover:text-foreground"
                  >
                    Dismiss
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleAction('snooze')}
                    disabled={actionLoading}
                    className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Snooze
                  </Button>
                </>
              )}

              {incident.status === 'pr_open' && pullRequest && (
                <Button asChild size="sm" className="h-8 px-3 text-xs font-semibold gap-1.5 bg-sky-600 text-white hover:bg-sky-500">
                  <a href={pullRequest.url} target="_blank" rel="noopener noreferrer">
                    <GitPullRequest className="size-3.5" />
                    <span>View Draft PR #{pullRequest.prNumber}</span>
                  </a>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-5 pb-5 pt-0">
          <Separator className="mb-3.5 bg-border/50" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
            <div>
              <span className="text-muted-foreground text-[11px] block">Commit</span>
              <span className="text-foreground">{incident.commitSha?.slice(0, 7) || 'HEAD'}</span>
            </div>
            <div>
              <span className="text-muted-foreground text-[11px] block">Environment</span>
              <span className="text-foreground">{incident.environment || 'production'}</span>
            </div>
            <div>
              <span className="text-muted-foreground text-[11px] block">Fingerprint</span>
              <span className="text-foreground truncate block">{incident.fingerprint?.slice(0, 20)}...</span>
            </div>
            <div>
              <span className="text-muted-foreground text-[11px] block">Detected</span>
              <span className="text-foreground">{new Date(incident.detectedAt).toLocaleTimeString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Live Sandbox Execution Terminal Box (Visible when fixing or logs present) */}
      {(actionLoading || allSandboxLogs.length > 0) && (
        <Card className="border-primary/40 bg-black/80 overflow-hidden shadow-lg shadow-primary/5">
          <CardHeader className="p-3 px-4 bg-muted/20 border-b border-border/60 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="size-4 text-primary" />
              <span className="text-xs font-mono font-semibold text-foreground">
                Sandbox Execution Feed & Live Pipeline Proof
              </span>
              {actionLoading && (
                <span className="flex items-center gap-1.5 text-[10px] text-amber-400 font-mono ml-2">
                  <span className="size-1.5 rounded-full bg-amber-400 animate-pulse" />
                  Container Active
                </span>
              )}
            </div>
            <span className="text-[10px] font-mono text-muted-foreground">
              {allSandboxLogs.length} events logged
            </span>
          </CardHeader>
          <CardContent className="p-3.5">
            <div className="space-y-1 font-mono text-xs max-h-60 overflow-y-auto">
              {allSandboxLogs.map((line: string, idx: number) => {
                const isSuccess = line.includes('✅') || line.includes('clean') || line.includes('SUCCESS');
                const isError = line.includes('❌') || line.includes('FAIL') || line.includes('Failed');
                const isStep = line.includes('Step') || line.includes('🔬') || line.includes('🧠') || line.includes('🧬') || line.includes('🛠️') || line.includes('🧪') || line.includes('🧹') || line.includes('🚀');
                return (
                  <div
                    key={idx}
                    className={`leading-relaxed ${
                      isError
                        ? 'text-rose-400 font-semibold'
                        : isSuccess
                          ? 'text-emerald-400 font-medium'
                          : isStep
                            ? 'text-sky-300 font-semibold mt-1'
                            : 'text-muted-foreground'
                    }`}
                  >
                    {line}
                  </div>
                );
              })}
              {actionLoading && (
                <div className="flex items-center gap-2 text-xs text-primary font-mono pt-1">
                  <Loader2 className="size-3 animate-spin" />
                  <span>Executing step in isolated sandbox...</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="hypotheses" className="space-y-4">
        <TabsList className="h-8 p-0.5 bg-muted/40 border border-border/60">
          <TabsTrigger value="hypotheses" className="text-xs h-7 px-3">
            Hypotheses ({hypotheses.length})
          </TabsTrigger>
          <TabsTrigger value="diff" className="text-xs h-7 px-3">
            Diff {fixAttempt?.diff ? '✅' : ''}
          </TabsTrigger>
          <TabsTrigger value="validation" className="text-xs h-7 px-3">
            Validation Proof
          </TabsTrigger>
          <TabsTrigger value="logs" className="text-xs h-7 px-3">
            Logs & Terminal
          </TabsTrigger>
          <TabsTrigger value="postmortem" className="text-xs h-7 px-3">
            Postmortem
          </TabsTrigger>
        </TabsList>

        {/* Hypotheses */}
        <TabsContent value="hypotheses" className="space-y-3">
          {hypotheses.length === 0 ? (
            <Card className="p-8 text-center text-xs text-muted-foreground border-border/70">
              <Loader2 className="size-4 animate-spin mx-auto mb-2 text-primary" />
              Investigation in progress... Formulating scientific falsification hypotheses.
            </Card>
          ) : (
            hypotheses.map((h: any, idx: number) => {
              const isLeading = h.status === 'leading';
              return (
                <Card
                  key={idx}
                  className={`border transition-all ${
                    isLeading ? 'border-primary/50 bg-card/80' : 'border-border/50 bg-card/30 opacity-70'
                  }`}
                >
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                            isLeading
                              ? 'bg-primary/10 text-primary border border-primary/25'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {isLeading ? 'Leading Theory' : 'Ruled Out'}
                        </span>
                        <span className="text-xs font-mono text-muted-foreground">
                          {Math.round(h.confidence * 100)}% confidence
                        </span>
                      </div>
                    </div>
                    <h4 className="text-sm font-semibold text-foreground mt-1.5">{h.statement}</h4>
                  </CardHeader>

                  <CardContent className="p-4 pt-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="p-2.5 rounded bg-muted/20 border border-border/40">
                        <span className="text-muted-foreground font-medium block text-[11px] mb-1">Supporting Evidence</span>
                        <p className="text-foreground/90">{h.supportingEvidence || 'Stack frame points to suspect controller logic'}</p>
                      </div>
                      <div className="p-2.5 rounded bg-muted/20 border border-border/40">
                        <span className="text-muted-foreground font-medium block text-[11px] mb-1">Adversarial Counter-Check</span>
                        <p className="text-foreground/90">{h.counterEvidence || 'Verified against falsification test suite'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* Diff */}
        <TabsContent value="diff">
          <Card className="border-border/70 bg-card/60">
            <CardHeader className="p-4 py-3 flex flex-row items-center justify-between border-b border-border/60">
              <div className="flex items-center gap-2">
                <FileCode className="size-3.5 text-muted-foreground" />
                <span className="text-xs font-mono text-foreground">
                  {investigation?.affectedFiles?.[0] || 'src/paymentController.ts'}
                </span>
              </div>
              {fixAttempt?.diff && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyText(fixAttempt.diff, 'diff')}
                  className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                >
                  {copiedDiff ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                  <span>{copiedDiff ? 'Copied' : 'Copy'}</span>
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-4">
              {fixAttempt?.diff ? (
                <div className="rounded-lg bg-black/70 p-3.5 border border-border/50 font-mono text-xs overflow-x-auto space-y-0.5">
                  {fixAttempt.diff.split('\n').map((line: string, i: number) => {
                    const isAdd = line.startsWith('+') && !line.startsWith('+++');
                    const isDel = line.startsWith('-') && !line.startsWith('---');
                    return (
                      <div
                        key={i}
                        className={`px-2 py-0.5 rounded ${
                          isAdd
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : isDel
                              ? 'bg-rose-500/15 text-rose-400'
                              : 'text-muted-foreground'
                        }`}
                      >
                        {line}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 space-y-2 text-xs text-muted-foreground font-mono">
                  <p>Unified diff will appear once sandbox patch is applied.</p>
                  {(isPendingApproval || isFailed) && (
                    <Button size="sm" variant="outline" onClick={() => handleAction('accept')} className="text-xs">
                      Run Fix in Sandbox Now
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Validation Proof */}
        <TabsContent value="validation" className="space-y-4">
          <Card className="border-border/70 bg-card/60 p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-muted/20 rounded border border-border/40">
                <span className="text-muted-foreground text-[11px] block">Failure Reproduction</span>
                <span className="text-rose-400 font-semibold block text-xs mt-0.5">
                  {fixAttempt?.reproduced ? 'Confirmed (Exited Code 1)' : 'Pending Sandbox Run'}
                </span>
              </div>
              <div className="p-3 bg-muted/20 rounded border border-border/40">
                <span className="text-muted-foreground text-[11px] block">Mutation Check</span>
                <span className="text-emerald-400 font-semibold block text-xs mt-0.5">
                  {fixAttempt?.mutationCheckPassed ? '✅ Proven (Failed pre-patch, Passed post-patch)' : 'Pending Sandbox Run'}
                </span>
              </div>
              <div className="p-3 bg-muted/20 rounded border border-border/40">
                <span className="text-muted-foreground text-[11px] block">Linter & TypeCheck</span>
                <span className="text-emerald-400 font-semibold block text-xs mt-0.5">
                  {fixAttempt?.linterPassed && fixAttempt?.typecheckPassed ? '✅ 0 Errors (ESLint & TypeScript)' : 'Pending Sandbox Run'}
                </span>
              </div>
            </div>

            {/* Terminal Test Proof Outputs */}
            {validationSummary && (
              <div className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <span className="text-xs font-mono font-medium text-muted-foreground flex items-center gap-1.5">
                    <Terminal className="size-3 text-rose-400" />
                    <span>Reproduction Output (Pre-patch Failure Evidence):</span>
                  </span>
                  <pre className="p-3 bg-black/80 rounded border border-border/50 text-xs font-mono text-rose-300 overflow-x-auto whitespace-pre-wrap">
                    {validationSummary.reproOutput || 'Failure confirmed on initial test run.'}
                  </pre>
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs font-mono font-medium text-muted-foreground flex items-center gap-1.5">
                    <CheckCircle2 className="size-3 text-emerald-400" />
                    <span>Post-Patch Test Runner Output (Regression Proof):</span>
                  </span>
                  <pre className="p-3 bg-black/80 rounded border border-border/50 text-xs font-mono text-emerald-300 overflow-x-auto whitespace-pre-wrap">
                    {validationSummary.postPatchOutput || 'All unit and regression tests passed.'}
                  </pre>
                </div>
              </div>
            )}

            {fixAttempt?.regressionTestCode && (
              <div className="space-y-1.5 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground font-mono flex items-center gap-1.5">
                    <FileCode className="size-3.5 text-primary" />
                    <span>Authored Regression Test ({fixAttempt.regressionTestPath || 'src/__tests__/patchpilot.regression.test.ts'})</span>
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyText(fixAttempt.regressionTestCode, 'test')}
                    className="h-6 text-xs text-muted-foreground hover:text-foreground gap-1"
                  >
                    {copiedTest ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                    <span>{copiedTest ? 'Copied' : 'Copy'}</span>
                  </Button>
                </div>
                <pre className="p-3 bg-black/70 rounded border border-border/50 text-xs font-mono text-emerald-400 overflow-x-auto">
                  {fixAttempt.regressionTestCode}
                </pre>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Logs */}
        <TabsContent value="logs">
          <Card className="border-border/70 bg-card/60 p-4 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-border/60">
              <Button
                variant={activeLogTab === 'sandbox' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setActiveLogTab('sandbox')}
                className="h-7 text-xs font-mono gap-1.5"
              >
                <Terminal className="size-3" />
                <span>Sandbox Container Execution Logs</span>
              </Button>
              <Button
                variant={activeLogTab === 'sentry' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setActiveLogTab('sentry')}
                className="h-7 text-xs font-mono gap-1.5"
              >
                <ShieldAlert className="size-3" />
                <span>Raw Sentry / CI Telemetry</span>
              </Button>
            </div>

            {activeLogTab === 'sandbox' ? (
              allSandboxLogs.length > 0 ? (
                <pre className="p-3.5 bg-black/80 rounded border border-border/50 font-mono text-xs text-muted-foreground overflow-x-auto whitespace-pre-wrap leading-relaxed">
                  {allSandboxLogs.join('\n')}
                </pre>
              ) : (
                <div className="text-center py-10 text-xs text-muted-foreground font-mono">
                  Sandbox logs will be recorded when you click "Apply Patch" above.
                </div>
              )
            ) : (
              <pre className="p-3.5 bg-black/80 rounded border border-border/50 font-mono text-xs text-muted-foreground overflow-x-auto whitespace-pre-wrap">
                {incident.logExcerpt || incident.errorMessage || 'No raw log data available.'}
              </pre>
            )}
          </Card>
        </TabsContent>

        {/* Postmortem */}
        <TabsContent value="postmortem">
          <Card className="border-border/70 bg-card/60 p-4">
            {postmortem ? (
              <pre className="p-3 bg-black/70 rounded border border-border/50 font-mono text-xs text-foreground overflow-x-auto whitespace-pre-wrap">
                {postmortem.markdown}
              </pre>
            ) : (
              <p className="text-xs text-muted-foreground py-8 text-center font-mono">
                Postmortem document will be generated automatically once the PR is merged or incident verified resolved.
              </p>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
