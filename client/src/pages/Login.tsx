// THV Donor Dashboard — Login Page
// Passwordless sign-in for existing, owner-invited Supabase accounts.

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { Turnstile } from '@marsidev/react-turnstile';

const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;

export default function Login({ accessRevoked = false }: { accessRevoked?: boolean }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = email.trim().toLowerCase();
    if (!normalized) { setError('Please enter your email address.'); return; }
    if (turnstileSiteKey && !captchaToken) { setError('Please complete the verification step.'); return; }
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email: normalized,
      options: { emailRedirectTo: window.location.origin, shouldCreateUser: false, captchaToken: captchaToken ?? undefined },
    });
    if (signInError) { setError('We could not send an access link. Please contact the dashboard owner if you need access.'); return; }
    setSent(true);
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

        {!sent ? (
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
            {turnstileSiteKey && (
              <Turnstile
                siteKey={turnstileSiteKey}
                onSuccess={token => { setCaptchaToken(token); setError(''); }}
                onExpire={() => setCaptchaToken(null)}
                options={{ theme: 'light' }}
              />
            )}
            <Button type="submit" className="w-full" style={{ background: 'oklch(0.22 0.018 55)', color: 'oklch(0.96 0.008 75)' }}>
              Access Dashboard
            </Button>
          </form>
        ) : (
          <div className="text-center space-y-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto" style={{ background: 'oklch(0.94 0.06 145)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="oklch(0.45 0.13 145)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <p className="font-display text-xl" style={{ color: 'oklch(0.22 0.018 55)' }}>Check your email</p>
            <p className="text-sm" style={{ color: 'oklch(0.52 0.022 65)' }}>Select the secure sign-in link to open the dashboard. If you are new to the team, ask the dashboard owner to send you an invitation first.</p>
          </div>
        )}

        <p className="text-center text-xs mt-8" style={{ color: 'oklch(0.62 0.012 65)' }}>
          Access restricted to The Humble Village team.
        </p>
      </div>
    </div>
  );
}
