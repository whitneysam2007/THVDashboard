// THV Donor Dashboard — Login Page
// Owner-managed individual email-and-password sign-in for approved Supabase accounts.

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { Turnstile } from '@marsidev/react-turnstile';
import { passwordLoginErrorMessage } from '@/lib/authErrors';

const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;

export default function Login({ accessRevoked = false }: { accessRevoked?: boolean }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = email.trim().toLowerCase();
    if (!normalized) { setError('Please enter your email address.'); return; }
    if (turnstileSiteKey && !captchaToken) { setError('Please complete the verification step.'); return; }
    if (!password) { setError('Please enter your password.'); return; }
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: normalized,
      password,
      options: { captchaToken: captchaToken ?? undefined },
    });
    if (signInError) { setError(passwordLoginErrorMessage(signInError)); return; }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'oklch(0.965 0.012 80)' }}>
      <div className="w-full max-w-sm px-8 py-12 bg-[oklch(0.985_0.008_80)] rounded-lg shadow-sm border border-[oklch(0.84_0.018_75)]">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img
            src="/thv-logo.svg"
            alt="The Humble Village"
            className="w-20 h-20"
          />
        </div>

        <h1 className="font-display text-3xl text-center mb-1" style={{ color: 'oklch(0.22 0.018 55)' }}>
          Donor Relations
        </h1>
        <p className="text-center text-sm mb-8" style={{ color: 'oklch(0.52 0.022 65)' }}>
          The Humble Village — Internal Dashboard
        </p>

        {accessRevoked && (
          <div className="mb-5 rounded-md border px-3 py-3 text-xs" style={{ background: 'oklch(0.97 0.05 92)', borderColor: 'oklch(0.83 0.10 92)', color: 'oklch(0.38 0.08 75)' }}>
            Your dashboard access is not currently active. Please contact the dashboard owner if you believe this is an error.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-widest mb-2" style={{ color: 'oklch(0.52 0.022 65)' }}>
                Email Address
              </label>
              <Input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(''); }}
                placeholder="you@thehumblevillage.org"
                className="w-full"
                autoFocus
              />
              {error && <p className="text-xs mt-1 text-[oklch(0.45_0.20_27)]">{error}</p>}
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest mb-2" style={{ color: 'oklch(0.52 0.022 65)' }}>
                Password
              </label>
              <Input
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                placeholder="Your password"
                className="w-full"
                autoComplete="current-password"
              />
            </div>
            {turnstileSiteKey && (
              <Turnstile
                siteKey={turnstileSiteKey}
                onSuccess={token => { setCaptchaToken(token); setError(''); }}
                onExpire={() => setCaptchaToken(null)}
                options={{ theme: 'light' }}
              />
            )}
            <Button type="submit" className="w-full" style={{ background: 'oklch(0.22 0.018 55)', color: 'oklch(0.96 0.008 75)' }}>
              Sign In
            </Button>
          </form>

        <p className="text-center text-xs mt-8" style={{ color: 'oklch(0.62 0.012 65)' }}>
          Access restricted to The Humble Village team.
        </p>
      </div>
    </div>
  );
}
