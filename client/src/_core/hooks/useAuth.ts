import { startLogin } from "@/const";
import { supabase } from '@/lib/supabase';
import { useCallback, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { trpc } from '@/lib/trpc';
import { dashboardRoleForProfile } from '@/lib/authRole';

export type AuthenticatedTeamUser = {
  openId: string;
  name: string | null;
  email: string | null;
  role: 'user' | 'admin';
};

export function useAuth() {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { data: profile, isLoading: profileLoading, error: profileError, refetch: refetchProfile } = trpc.auth.me.useQuery(undefined, { enabled: Boolean(authUser), retry: false });

  const hydrate = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    const authUser = data.user;
    setAuthUser(authUser ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void hydrate();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      // Let React re-render with the fresh session first. The enabled auth.me query
      // will then fetch with its matching bearer token; eagerly refetching here can
      // race the session write and return a false unauthenticated profile.
      setAuthUser(session?.user ?? null);
      setLoading(false);
    });
    return () => listener.subscription.unsubscribe();
  }, [hydrate]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setAuthUser(null);
  }, []);

  const user: AuthenticatedTeamUser | null = authUser ? {
    openId: authUser.id,
    email: authUser.email ?? null,
    name: authUser.user_metadata?.full_name ?? authUser.email?.split('@')[0] ?? null,
    role: dashboardRoleForProfile(profile),
  } : null;

  return { user, loading: loading || (Boolean(authUser) && profileLoading), error: profileError ?? null, isAuthenticated: Boolean(user), refresh: hydrate, logout };
}
