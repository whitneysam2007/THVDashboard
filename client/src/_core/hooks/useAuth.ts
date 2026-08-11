import { startLogin } from "@/const";
import { supabase } from '@/lib/supabase';
import { useCallback, useEffect, useState } from 'react';

export type AuthenticatedTeamUser = {
  openId: string;
  name: string | null;
  email: string | null;
  role: 'user' | 'admin';
};

export function useAuth() {
  const [user, setUser] = useState<AuthenticatedTeamUser | null>(null);
  const [loading, setLoading] = useState(true);

  const hydrate = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    const authUser = data.user;
    setUser(authUser ? {
      openId: authUser.id,
      email: authUser.email ?? null,
      name: authUser.user_metadata?.full_name ?? authUser.email?.split('@')[0] ?? null,
      role: authUser.email?.toLowerCase() === 'liz@thehumblevillage.org' ? 'admin' : 'user',
    } : null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void hydrate();
    const { data: listener } = supabase.auth.onAuthStateChange(() => { void hydrate(); });
    return () => listener.subscription.unsubscribe();
  }, [hydrate]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  return { user, loading, error: null, isAuthenticated: Boolean(user), refresh: hydrate, logout };
}
