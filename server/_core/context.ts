import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { getSupabaseServerClient } from '../supabase';

export type DashboardUser = {
  id?: number;
  openId: string;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  role: 'user' | 'admin';
};

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: DashboardUser | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: DashboardUser | null = null;

  try {
    const authorization = opts.req.headers.authorization;
    const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;
    if (token) {
      const supabase = getSupabaseServerClient();
      const { data: authData, error: authError } = await supabase.auth.getUser(token);
      if (!authError && authData.user?.email) {
        const email = authData.user.email.toLowerCase();
        const allowedResult = await supabase
          .from('allowed_team_emails')
          .select('email, display_name')
          .eq('email', email)
          .maybeSingle();
        const allowed = allowedResult.data as { email: string; display_name: string } | null;
        if (!allowedResult.error && allowed) {
          user = {
            openId: authData.user.id,
            email,
            name: authData.user.user_metadata?.full_name ?? allowed.display_name,
            loginMethod: 'magic-link',
            role: email === 'liz@thehumblevillage.org' ? 'admin' : 'user',
          };
        }
      }
    }
  } catch (error) {
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
