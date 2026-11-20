import React, { useEffect, useState } from 'react';

interface AuthSession {
  authRequired: boolean;
  configured: boolean;
  authenticated: boolean;
}

interface AuthGateProps {
  children: React.ReactNode;
}

export const AuthGate: React.FC<AuthGateProps> = ({ children }) => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const refreshSession = async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError('');
    }
    try {
      const response = await fetch('/api/auth/session', { cache: 'no-store' });
      if (!response.ok) throw new Error('Could not verify the workspace session.');
      setSession((await response.json()) as AuthSession);
      if (silent) setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reach the workspace server.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    void refreshSession();
  }, []);

  // Re-check long-lived tabs so an expired server session also locks the UI.
  useEffect(() => {
    if (!session?.authRequired || !session.authenticated) return;
    const intervalId = window.setInterval(() => {
      void refreshSession(true);
    }, 60_000);
    return () => window.clearInterval(intervalId);
  }, [session?.authRequired, session?.authenticated]);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ password }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || 'Sign-in failed.');
      setPassword('');
      await refreshSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'same-origin',
    }).catch(() => undefined);
    setSession((current) => current ? { ...current, authenticated: false } : current);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-6">
        <div className="text-sm font-semibold text-slate-500">Verifying secure workspace session…</div>
      </main>
    );
  }

  if (!session || !session.configured) {
    return (
      <main className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-6">
        <section className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-600">Aethel Studios</div>
          <h1 className="mt-3 text-2xl font-extrabold text-slate-950">Workspace access is not configured</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Production API access is disabled until the server has both required secrets.
            Add <code className="rounded bg-slate-100 px-1">AETHEL_ACCESS_PASSWORD</code> (at least 12 characters)
            and <code className="rounded bg-slate-100 px-1">AETHEL_SESSION_SECRET</code> (at least 32 characters)
            in your deployment environment, then redeploy.
          </p>
          {error && <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
          <button type="button" onClick={() => void refreshSession()} className="mt-6 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white">
            Check configuration again
          </button>
        </section>
      </main>
    );
  }

  if (!session.authenticated) {
    return (
      <main className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-6">
        <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-600">Aethel Studios</div>
          <h1 className="mt-3 text-2xl font-extrabold text-slate-950">Sign in to Aethel OS</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">Enter the private workspace password to continue.</p>
          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
              Workspace password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
            {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
            <button disabled={submitting || !password} className="w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
              {submitting ? 'Signing in…' : 'Unlock workspace'}
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <>
      {children}
      {session.authRequired && (
        <button
          type="button"
          onClick={() => void handleLogout()}
          className="fixed bottom-4 right-4 z-[100] rounded-full border border-slate-700 bg-slate-950/95 px-3.5 py-2 text-[11px] font-bold text-white shadow-lg hover:bg-slate-800"
        >
          Lock workspace
        </button>
      )}
    </>
  );
};
