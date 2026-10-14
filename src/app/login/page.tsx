'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Shield, Lock, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

function GoogleIcon() {
  return (
    <svg className="size-4 mr-2 shrink-0" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const returnUrl = searchParams.get('returnUrl') || '/';

  const getErrorMessage = (err: string | null) => {
    switch (err) {
      case 'oauth_not_configured':
        return 'Google OAuth credentials are not configured in .env. Please use On-Call Operator Access below.';
      case 'access_denied':
        return 'Access denied. Please approve Google permissions to continue.';
      case 'invalid_state':
        return 'Session expired. Please sign in again.';
      case 'missing_code_or_state':
        return 'Invalid OAuth response parameters.';
      case 'auth_failed':
        return 'Failed to verify account identity.';
      default:
        return err ? `Authentication error: ${err}` : null;
    }
  };

  const errorMessage = getErrorMessage(error);
  const loginUrl = `/api/auth/google/login?returnUrl=${encodeURIComponent(returnUrl)}`;
  const devLoginUrl = `/api/auth/dev-login?returnUrl=${encodeURIComponent(returnUrl)}`;

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center size-12 rounded-xl bg-primary/10 text-primary border border-primary/20 mb-3 shadow-inner">
            <Shield className="size-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center justify-center gap-2">
            PatchPilot
            <Badge variant="outline" className="text-[10px] font-mono py-0 px-1.5 border-primary/30 text-primary">
              SRE
            </Badge>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Autonomous incident remediation platform
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/15 border border-destructive/30 text-destructive text-xs flex items-center gap-2.5">
            <AlertCircle className="size-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Login Card */}
        <Card className="border-border/70 bg-card/60 backdrop-blur shadow-xl">
          <CardHeader className="p-5 pb-3">
            <CardTitle className="text-base font-semibold text-foreground">Sign In</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Select your authentication method to continue.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-5 pt-1 space-y-3">
            <Button
              asChild
              className="w-full font-medium text-xs h-10 shadow-sm"
            >
              <a href={loginUrl}>
                <GoogleIcon />
                <span>Continue with Google</span>
                <ArrowRight className="size-3.5 ml-auto opacity-70" />
              </a>
            </Button>

            <Button
              asChild
              variant="outline"
              className="w-full font-medium text-xs h-9 border-border/70 hover:bg-muted/30"
            >
              <a href={devLoginUrl}>
                <span>On-Call Operator Access (Demo)</span>
              </a>
            </Button>
          </CardContent>

          <CardFooter className="p-5 pt-2 border-t border-border/50 flex flex-wrap gap-2 justify-center text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="size-3 text-emerald-400" />
              OAuth 2.0 PKCE
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Lock className="size-3 text-cyan-400" />
              AES-256 GCM
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Shield className="size-3 text-primary" />
              Policy Enforced
            </span>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-center text-muted-foreground text-xs py-20">Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}
