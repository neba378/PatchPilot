'use client';

// src/app/login/page.tsx
import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Shield, Lock, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';

function GoogleIcon() {
  return (
    <svg className="w-5 h-5 mr-3 shrink-0" viewBox="0 0 24 24">
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
      case 'access_denied':
        return 'Access was denied. Please approve Google permissions to continue.';
      case 'invalid_state':
        return 'Security verification failed or session timed out. Please try signing in again.';
      case 'missing_code_or_state':
        return 'Missing OAuth authorization parameters. Please try again.';
      case 'auth_failed':
        return 'Failed to verify Google identity. Please ensure your account has access and retry.';
      default:
        return err ? `Authentication error: ${err}` : null;
    }
  };

  const errorMessage = getErrorMessage(error);
  const loginUrl = `/api/auth/google/login?returnUrl=${encodeURIComponent(returnUrl)}`;

  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center px-4">
      {/* Background Glow */}
      <div className="absolute inset-0 max-w-4xl mx-auto h-[480px] bg-gradient-to-b from-blue-600/10 via-cyan-500/5 to-transparent blur-3xl pointer-events-none -z-10" />

      <div className="w-full max-w-md">
        {/* Card Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white shadow-xl shadow-blue-500/25 mb-4 border border-blue-400/30">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
            PatchPilot
            <span className="text-xs uppercase font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
              DevOps SRE
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-2">
            Autonomous Incident Remediation & Production SRE Platform
          </p>
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-start gap-3 backdrop-blur animate-fade-in">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-semibold block text-red-200">Authentication Failed</span>
              {errorMessage}
            </div>
          </div>
        )}

        {/* Login Box */}
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 sm:p-8 backdrop-blur shadow-2xl">
          <div className="mb-6">
            <h2 className="text-base font-semibold text-white">Sign In to Dashboard</h2>
            <p className="text-xs text-slate-400 mt-1">
              Authenticate with your authorized Google Workspace or developer account to manage incidents and remediation policies.
            </p>
          </div>

          <a
            href={loginUrl}
            className="w-full flex items-center justify-center py-3.5 px-4 rounded-xl font-medium text-sm text-slate-100 bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-slate-600 shadow-md hover:shadow-lg transition-all group"
          >
            <GoogleIcon />
            <span>Continue with Google</span>
            <ArrowRight className="w-4 h-4 ml-auto text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
          </a>

          {/* Security Features */}
          <div className="mt-8 pt-6 border-t border-slate-800/80 space-y-2.5">
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>OAuth 2.0 PKCE & Encrypted Session State</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <Lock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>AES-256-GCM Session Protection at Rest</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <Shield className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span>Strict Role-Based Access for Production Remediations</span>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-slate-500 mt-6">
          Protected by PatchPilot Security Policy Engine
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-center text-slate-400 py-20">Loading authentication...</div>}>
      <LoginContent />
    </Suspense>
  );
}
