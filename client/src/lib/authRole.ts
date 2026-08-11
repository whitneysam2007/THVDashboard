export function dashboardRoleForProfile(profile: { role?: 'user' | 'admin' } | null | undefined): 'user' | 'admin' {
  return profile?.role === 'admin' ? 'admin' : 'user';
}
