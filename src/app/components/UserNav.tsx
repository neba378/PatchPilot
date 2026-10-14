'use client';

// src/app/components/UserNav.tsx
import React, { useEffect, useState } from 'react';
import { LogOut, User as UserIcon, ShieldCheck } from 'lucide-react';
import type { GoogleUserSession } from '@/core/session';

export function UserNav() {
  const [session, setSession] = useState<GoogleUserSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSession() {
      try {
        const res = await fetch('/api/auth/session');
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user) {
            setSession(data.user);
          }
        }
      } catch {
        // Ignore session check error
      } finally {
        setLoading(false);
      }
    }
    loadSession();
  }, []);

  if (loading) {
    return <div className="w-24 h-8 bg-slate-800/40 rounded-lg animate-pulse" />;
  }

  if (!session) {
    return (
      <a
        href="/login"
        className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-200 bg-blue-600 hover:bg-blue-500 shadow-sm transition-colors flex items-center gap-1.5"
      >
        <span>Sign In</span>
      </a>
    );
  }

  return (
    <div className="flex items-center space-x-3 pl-3 border-l border-slate-800">
      <div className="flex items-center space-x-2.5">
        {session.picture ? (
          <img
            src={session.picture}
            alt={session.name}
            className="w-7 h-7 rounded-full border border-blue-500/40 object-cover"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
            <UserIcon className="w-3.5 h-3.5" />
          </div>
        )}
        <div className="hidden sm:block text-left">
          <div className="text-xs font-medium text-slate-200 flex items-center gap-1">
            <span className="truncate max-w-[120px]">{session.name}</span>
            <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
          </div>
          <p className="text-[10px] text-slate-400 truncate max-w-[130px]">{session.email}</p>
        </div>
      </div>

      <a
        href="/api/auth/google/logout"
        title="Sign Out"
        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 transition-colors"
      >
        <LogOut className="w-4 h-4" />
      </a>
    </div>
  );
}
