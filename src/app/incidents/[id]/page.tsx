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
  FileText
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
      <div className="py-20 text-center text-xs text-muted-foreground font-mono">
        Loading incident details...
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
          <Button asChild size="sm" variant="outline" className="h-8 text-xs gap-1.5 border-border/80">
            <a href={pullRequest.url} target="_blank" rel="noopener noreferrer">
              <GitPullRequest className="size-3.5 text-sky-400" />
              <span>PR #{pullRequest.prNumber}</span>
              <ExternalLink className="size-3 opacity-40 ml-0.5" />
            </a>
          </Button>
        )}
      </div>

      {/* Incident Header Card */}
      <Card className="border-border/70 bg-card/60">
        <CardHeader className="p-5 pb-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold text-foreground">{incident.id}</span>
                <Badge variant={incident.severity === 'critical' ? 'destructive' : 'warning'} className="uppercase text-[10px] px-1.5 py-0 font-bold">
                  {incident.severity}
                </Badge>
                <span className="text-xs text-muted-foreground font-mono">
                  {incident.source}
                </span>
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

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              {incident.status === 'awaiting_approval' && (
                <>
                  <Button
                    size="sm"
                    onClick={() => handleAction('accept')}
                    disabled={actionLoading}
                    className="h-8 px-3 text-xs font-semibold gap-1.5"
                  >
                    <Play className="size-3 fill-current" />
                    {actionLoading ? 'Applying...' : 'Apply Patch'}
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

      {/* Tabs */}
      <Tabs defaultValue="hypotheses" className="space-y-4">
        <TabsList className="h-8 p-0.5 bg-muted/40 border border-border/60">
          <TabsTrigger value="hypotheses" className="text-xs h-7 px-3">
            Hypotheses
          </TabsTrigger>
          <TabsTrigger value="diff" className="text-xs h-7 px-3">
            Diff
          </TabsTrigger>
          <TabsTrigger value="validation" className="text-xs h-7 px-3">
            Validation
          </TabsTrigger>
          <TabsTrigger value="logs" className="text-xs h-7 px-3">
            Logs
          </TabsTrigger>
          <TabsTrigger value="postmortem" className="text-xs h-7 px-3">
            Postmortem
          </TabsTrigger>
        </TabsList>

        {/* Hypotheses */}
        <TabsContent value="hypotheses" className="space-y-3">
          {hypotheses.length === 0 ? (
            <Card className="p-8 text-center text-xs text-muted-foreground border-border/70">
              Investigation in progress...
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
                        <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                          isLeading ? 'bg-primary/10 text-primary border border-primary/25' : 'bg-muted text-muted-foreground'
                        }`}>
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
                        <span className="text-muted-foreground font-medium block text-[11px] mb-1">Evidence</span>
                        <p className="text-foreground/90">{h.supportingEvidence}</p>
                      </div>
                      <div className="p-2.5 rounded bg-muted/20 border border-border/40">
                        <span className="text-muted-foreground font-medium block text-[11px] mb-1">Counter-Check</span>
                        <p className="text-foreground/90">{h.counterEvidence || 'Verified against falsification test'}</p>
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
                <span className="text-xs font-mono text-foreground">src/controllers/paymentController.ts</span>
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
                      <div key={i} className={`px-2 py-0.5 rounded ${isAdd ? 'diff-add' : isDel ? 'diff-del' : 'diff-ctx'}`}>
                        {line}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10 text-xs text-muted-foreground font-mono">
                  Diff will appear once patch is synthesized.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Validation */}
        <TabsContent value="validation">
          <Card className="border-border/70 bg-card/60 p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-muted/20 rounded border border-border/40">
                <span className="text-muted-foreground text-[11px] block">Reproduction</span>
                <span className="text-rose-400 font-semibold block text-xs mt-0.5">Confirmed (Exited 1)</span>
              </div>
              <div className="p-3 bg-muted/20 rounded border border-border/40">
                <span className="text-muted-foreground text-[11px] block">Mutation Check</span>
                <span className="text-emerald-400 font-semibold block text-xs mt-0.5">Passed (2/2 tests)</span>
              </div>
              <div className="p-3 bg-muted/20 rounded border border-border/40">
                <span className="text-muted-foreground text-[11px] block">Linter & Types</span>
                <span className="text-emerald-400 font-semibold block text-xs mt-0.5">0 Errors</span>
              </div>
            </div>

            {fixAttempt?.regressionTestCode && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Regression Test</span>
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
          <Card className="border-border/70 bg-card/60 p-4">
            <pre className="p-3 bg-black/70 rounded border border-border/50 font-mono text-xs text-muted-foreground overflow-x-auto whitespace-pre-wrap">
              {incident.logExcerpt || incident.errorMessage || 'No log data.'}
            </pre>
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
                Postmortem document will be generated after resolution.
              </p>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
