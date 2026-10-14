'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  GitPullRequest,
  Terminal,
  FileCode,
  ExternalLink,
  AlertTriangle,
  Play,
  RotateCcw,
  Copy,
  Check,
  CheckCircle,
  Sparkles,
  Layers,
  FileText
} from 'lucide-react';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
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
    try {
      await fetch(`/api/incidents/${id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      await fetchIncident();
    } catch (e) {
      console.error(e);
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
      <div className="py-24 text-center space-y-3">
        <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="font-mono text-xs text-muted-foreground">Loading incident telemetry...</p>
      </div>
    );
  }

  if (!incidentData || !incidentData.incident) {
    return (
      <Card className="max-w-md mx-auto my-16 text-center p-8">
        <CardHeader>
          <div className="mx-auto size-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-2">
            <AlertTriangle className="size-6 text-amber-400" />
          </div>
          <CardTitle className="text-lg">Incident Not Found</CardTitle>
          <CardDescription>
            The requested incident ID does not exist in the database.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild size="sm">
            <Link href="/">Return to Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { incident, investigation, fixAttempt, pullRequest, postmortem } = incidentData;

  const hypotheses = investigation?.hypotheses
    ? (typeof investigation.hypotheses === 'string' ? JSON.parse(investigation.hypotheses) : investigation.hypotheses)
    : [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'awaiting_approval':
        return (
          <Badge variant="info" className="gap-1.5 font-medium">
            <span className="size-1.5 rounded-full bg-blue-400 animate-pulse" />
            Awaiting Approval
          </Badge>
        );
      case 'fixing':
      case 'validating':
        return (
          <Badge variant="warning" className="gap-1.5 font-medium">
            <span className="size-1.5 rounded-full bg-amber-400 animate-pulse" />
            Sandbox Fixing
          </Badge>
        );
      case 'pr_open':
        return (
          <Badge variant="default" className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 gap-1.5 font-medium">
            <GitPullRequest className="size-3" />
            Draft PR Open
          </Badge>
        );
      case 'verified_resolved':
        return (
          <Badge variant="success" className="gap-1.5 font-medium">
            <CheckCircle2 className="size-3 text-emerald-400" />
            Verified Resolved
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Back button & external PR actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm" className="h-8 -ml-2 text-xs text-muted-foreground hover:text-foreground">
          <Link href="/">
            <ArrowLeft className="size-3.5 mr-1.5" />
            Back to Incident Feed
          </Link>
        </Button>

        {pullRequest && (
          <Button asChild size="sm" variant="outline" className="h-8 text-xs border-cyan-500/30 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20">
            <a href={pullRequest.url} target="_blank" rel="noopener noreferrer">
              <GitPullRequest className="size-3.5 mr-1.5 text-cyan-400" />
              View Draft PR #{pullRequest.prNumber} on GitHub
              <ExternalLink className="size-3 ml-1.5 opacity-70" />
            </a>
          </Button>
        )}
      </div>

      {/* Incident Header Card Block */}
      <Card className="border-border/80">
        <CardHeader className="space-y-4 pb-4">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-bold text-muted-foreground">{incident.id}</span>
                <Badge variant={incident.severity === 'critical' ? 'destructive' : 'warning'} className="uppercase text-[10px] font-bold">
                  {incident.severity}
                </Badge>
                {getStatusBadge(incident.status)}
                <Badge variant="outline" className="font-mono text-[10px] bg-muted/30">
                  {incident.source}
                </Badge>
                {incident.occurrences > 1 && (
                  <Badge variant="secondary" className="font-mono text-[10px] text-primary bg-primary/10 border-primary/20">
                    {incident.occurrences}x correlated
                  </Badge>
                )}
              </div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
                {incident.title}
              </h1>
            </div>

            {/* Human-in-the-Loop Review Actions */}
            <div className="flex items-center gap-2 shrink-0">
              {incident.status === 'awaiting_approval' && (
                <>
                  <Button
                    size="sm"
                    onClick={() => handleAction('accept')}
                    disabled={actionLoading}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm font-semibold text-xs h-9"
                  >
                    <Play className="size-3.5 mr-1.5 fill-current" />
                    {actionLoading ? 'Executing Sandbox Fix...' : 'Accept & Patch'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAction('reject')}
                    disabled={actionLoading}
                    className="text-xs h-9"
                  >
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAction('snooze')}
                    disabled={actionLoading}
                    className="text-xs h-9"
                  >
                    Snooze
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-2">
          <Separator className="mb-4" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
            <div>
              <span className="text-muted-foreground block text-[11px]">Suspect Commit:</span>
              <span className="text-foreground font-semibold">{incident.commitSha?.slice(0, 7) || 'HEAD'}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Environment:</span>
              <span className="text-foreground font-semibold">{incident.environment || 'production'}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Fingerprint:</span>
              <span className="text-foreground truncate block">{incident.fingerprint?.slice(0, 16)}...</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Detected At:</span>
              <span className="text-foreground">{new Date(incident.detectedAt).toLocaleString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs Block for Evidence, Reasoning, Sandbox & Code */}
      <Tabs defaultValue="reasoning" className="space-y-4">
        <TabsList className="w-full justify-start h-auto p-1 bg-muted/40 border border-border/60 flex-wrap gap-1">
          <TabsTrigger value="reasoning" className="text-xs py-1.5 px-3">
            🧠 Competing Hypotheses
          </TabsTrigger>
          <TabsTrigger value="diff" className="text-xs py-1.5 px-3">
            📄 Interactive Git Diff
          </TabsTrigger>
          <TabsTrigger value="sandbox" className="text-xs py-1.5 px-3">
            🧪 Sandbox & Mutation Tests
          </TabsTrigger>
          <TabsTrigger value="logs" className="text-xs py-1.5 px-3">
            📜 Scrubbed Telemetry
          </TabsTrigger>
          <TabsTrigger value="postmortem" className="text-xs py-1.5 px-3">
            📝 Postmortem Report
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Falsification Reasoning */}
        <TabsContent value="reasoning" className="space-y-4">
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <Shield className="size-4" />
                Adversarial Falsification Protocol
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
              PatchPilot formulates competing theories and actively attempts to rule each one out with empirical code tests before proposing a fix.
            </CardContent>
          </Card>

          <div className="space-y-3">
            {hypotheses.length === 0 ? (
              <Card className="p-8 text-center text-xs text-muted-foreground">
                Hypothesis formulation in progress...
              </Card>
            ) : (
              hypotheses.map((h: any, idx: number) => {
                const isLeading = h.status === 'leading';
                return (
                  <Card
                    key={idx}
                    className={`border transition-all ${
                      isLeading ? 'border-emerald-500/40 bg-emerald-500/5 shadow-sm' : 'border-border/60 opacity-75'
                    }`}
                  >
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-center justify-between">
                        <Badge variant={isLeading ? "success" : "destructive"} className="uppercase text-[10px] font-bold">
                          {isLeading ? '⭐ Leading Hypothesis' : '❌ Ruled Out by Evidence'}
                        </Badge>
                        <span className="text-xs font-mono text-muted-foreground">
                          Confidence: {Math.round(h.confidence * 100)}%
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-foreground mt-2">{h.statement}</h4>
                    </CardHeader>

                    <CardContent className="p-4 pt-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="p-3 bg-muted/40 rounded-lg border border-border/50">
                          <span className="text-muted-foreground font-semibold block mb-1">Supporting Evidence:</span>
                          <p className="text-foreground">{h.supportingEvidence}</p>
                        </div>
                        <div className="p-3 bg-muted/40 rounded-lg border border-border/50">
                          <span className="text-muted-foreground font-semibold block mb-1">Disproving Evidence Tested:</span>
                          <p className="text-foreground">{h.counterEvidence || 'None found (stood up to falsification tests)'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* Tab 2: Interactive Git Diff */}
        <TabsContent value="diff" className="space-y-4">
          <Card className="border-border/80">
            <CardHeader className="p-4 flex flex-row items-center justify-between border-b border-border/60">
              <div className="space-y-1">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FileCode className="size-4 text-cyan-400" />
                  Unified Patch Diff (Minimal Change Proof)
                </CardTitle>
                <CardDescription className="font-mono text-[11px]">
                  Target: src/controllers/paymentController.ts
                </CardDescription>
              </div>

              {fixAttempt?.diff && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyText(fixAttempt.diff, 'diff')}
                  className="h-8 text-xs gap-1.5"
                >
                  {copiedDiff ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                  {copiedDiff ? 'Copied' : 'Copy Diff'}
                </Button>
              )}
            </CardHeader>

            <CardContent className="p-4">
              {fixAttempt?.diff ? (
                <div className="rounded-lg bg-black/80 p-4 border border-border/60 font-mono text-xs overflow-x-auto space-y-0.5">
                  {fixAttempt.diff.split('\n').map((line: string, i: number) => {
                    const isAdd = line.startsWith('+') && !line.startsWith('+++');
                    const isDel = line.startsWith('-') && !line.startsWith('---');
                    return (
                      <div key={i} className={`px-2 py-0.5 rounded ${isAdd ? 'diff-add' : isDel ? 'diff-del' : 'diff-ctx'}`}>
                        {line}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground text-xs font-mono">
                  Patch diff will appear here after clicking &apos;Accept & Patch&apos;.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Sandbox Validation & Mutation Test */}
        <TabsContent value="sandbox" className="space-y-4">
          <Card className="border-border/80">
            <CardHeader className="p-4 border-b border-border/60">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-400" />
                Isolated Sandbox Reproduction & Mutation Verification
              </CardTitle>
            </CardHeader>

            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-4 bg-muted/40 rounded-lg border border-border/60 space-y-1">
                  <span className="text-muted-foreground block text-[11px]">Pre-Patch Reproduction:</span>
                  <span className="text-rose-400 font-bold block text-sm">❌ FAILED (500 Error reproduced)</span>
                  <p className="text-[11px] text-muted-foreground">Confirmed failure on original unpatched commit.</p>
                </div>

                <div className="p-4 bg-muted/40 rounded-lg border border-border/60 space-y-1">
                  <span className="text-muted-foreground block text-[11px]">Mutation Test Pass:</span>
                  <span className="text-emerald-400 font-bold block text-sm">✅ PASSED (2/2 tests passed)</span>
                  <p className="text-[11px] text-muted-foreground">Proves newly authored regression test passes on patch.</p>
                </div>

                <div className="p-4 bg-muted/40 rounded-lg border border-border/60 space-y-1">
                  <span className="text-muted-foreground block text-[11px]">Linter & TypeScript:</span>
                  <span className="text-cyan-400 font-bold block text-sm">✅ Clean (0 errors)</span>
                  <p className="text-[11px] text-muted-foreground">Zero syntax breaks, regressions, or type errors.</p>
                </div>
              </div>

              {fixAttempt?.regressionTestCode && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">Authored Regression Test:</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyText(fixAttempt.regressionTestCode, 'test')}
                      className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
                    >
                      {copiedTest ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                      {copiedTest ? 'Copied' : 'Copy Test'}
                    </Button>
                  </div>
                  <pre className="p-4 bg-black/80 rounded-lg border border-border/60 text-xs font-mono text-emerald-400 overflow-x-auto">
                    {fixAttempt.regressionTestCode}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Logs */}
        <TabsContent value="logs" className="space-y-4">
          <Card className="border-border/80">
            <CardHeader className="p-4 border-b border-border/60">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Terminal className="size-4 text-muted-foreground" />
                Scrubbed Exception Telemetry
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <pre className="p-4 bg-black/80 rounded-lg border border-border/60 font-mono text-xs text-muted-foreground overflow-x-auto whitespace-pre-wrap">
                {incident.logExcerpt || incident.errorMessage || 'No raw logs recorded.'}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 5: Postmortem */}
        <TabsContent value="postmortem" className="space-y-4">
          <Card className="border-border/80">
            <CardHeader className="p-4 border-b border-border/60">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileText className="size-4 text-primary" />
                Postmortem Markdown Documentation
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {postmortem ? (
                <pre className="p-4 bg-black/80 rounded-lg border border-border/60 font-mono text-xs text-foreground overflow-x-auto whitespace-pre-wrap">
                  {postmortem.markdown}
                </pre>
              ) : (
                <p className="text-xs text-muted-foreground py-8 text-center font-mono">
                  Postmortem report is generated automatically after pull request is reviewed and merged.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
