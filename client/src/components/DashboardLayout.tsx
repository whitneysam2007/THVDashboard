// THV Donor Dashboard — Persistent Sidebar Layout
// Brand: deep espresso sidebar, warm cream content area

import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { cn } from '@/lib/utils';
import {
  Users, Plane, BarChart2, CheckSquare, LogOut, Menu, X, ChevronRight, ShieldCheck, KeyRound, HeartHandshake, RefreshCw, Mail, Stethoscope
} from 'lucide-react';
import { ChangePasswordDialog } from '@/components/ChangePasswordDialog';

const NAV = [
  { href: '/', label: 'Major Donors', icon: Users },
  { href: '/donors-500-5k', label: 'Donors 500–5K', icon: HeartHandshake },
  { href: '/monthly-giving', label: 'Monthly Giving', icon: RefreshCw },
  { href: '/thank-you-tracker', label: 'Thank You Tracker', icon: Mail },
  { href: '/trips', label: 'Trips', icon: Plane },
  { href: '/medical-volunteers', label: 'Medical Volunteers', icon: Stethoscope },
  { href: '/initiatives', label: 'Initiatives', icon: BarChart2 },
  { href: '/tasks', label: 'Tasks', icon: CheckSquare },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);

  const userName = user?.name ?? user?.email?.split('@')[0] ?? 'Team';
  const displayName = userName.charAt(0).toUpperCase() + userName.slice(1);
  const navigation = user?.role === 'admin' ? [...NAV, { href: '/team-access', label: 'Team Access', icon: ShieldCheck }] : NAV;

  return (
    <div className="flex min-h-screen" style={{ background: 'oklch(0.965 0.012 80)' }}>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 flex flex-col w-64 transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{ background: 'oklch(0.22 0.018 55)' }}
      >
        {/* Logo + brand */}
        <div className="flex items-center gap-3 px-6 pt-8 pb-6 border-b border-[oklch(0.30_0.018_55)]">
          <img src="/thv-logo.svg" alt="THV" className="w-10 h-10 rounded-full" />
          <div>
            <div className="font-display text-lg leading-tight" style={{ color: 'oklch(0.96 0.008 75)' }}>
              The Humble<br />Village
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-6 space-y-1">
          {navigation.map(({ href, label, icon: Icon }) => {
            const active = location === href;
            return (
              <Link key={href} href={href}>
                <div
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium transition-colors cursor-pointer',
                    active
                      ? 'bg-[oklch(0.30_0.018_55)] text-[oklch(0.96_0.008_75)]'
                      : 'text-[oklch(0.72_0.015_65)] hover:bg-[oklch(0.28_0.018_55)] hover:text-[oklch(0.96_0.008_75)]'
                  )}
                  onClick={() => setMobileOpen(false)}
                >
                  <Icon size={16} />
                  {label}
                  {active && <ChevronRight size={14} className="ml-auto opacity-60" />}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* User + logout */}
        <div className="px-4 pb-6 border-t border-[oklch(0.30_0.018_55)] pt-4">
          <div className="flex items-center gap-3 px-2 mb-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0"
              style={{ background: 'oklch(0.60 0.025 65)', color: 'oklch(0.22 0.018 55)' }}
            >
              {displayName[0]}
            </div>
            <div className="min-w-0">
            <div className="text-sm font-medium truncate" style={{ color: 'oklch(0.96 0.008 75)' }}>{displayName}</div>
              <div className="text-xs truncate" style={{ color: 'oklch(0.60 0.025 65)' }}>{user?.email ?? ''}</div>
            </div>
          </div>
          <button
            onClick={() => setPasswordDialogOpen(true)}
            className="flex items-center gap-2 w-full px-3 py-2 rounded text-xs transition-colors hover:bg-[oklch(0.28_0.018_55)]"
            style={{ color: 'oklch(0.60 0.025 65)' }}
          >
            <KeyRound size={13} /> Change password
          </button>
          <button
            onClick={logout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded text-xs transition-colors hover:bg-[oklch(0.28_0.018_55)]"
            style={{ color: 'oklch(0.60 0.025 65)' }}
          >
            <LogOut size={13} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center gap-4 px-4 py-4 border-b border-[oklch(0.84_0.018_75)] bg-[oklch(0.985_0.008_80)]">
          <button onClick={() => setMobileOpen(true)} className="p-1">
            <Menu size={20} style={{ color: 'oklch(0.22 0.018 55)' }} />
          </button>
          <img src="/thv-logo.svg" alt="THV" className="w-7 h-7" />
        </header>

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
      <ChangePasswordDialog email={user?.email ?? null} open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen} />
    </div>
  );
}
