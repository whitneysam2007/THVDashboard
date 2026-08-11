import { useMemo, useState } from 'react';
import { ShieldCheck, UserPlus, UserRoundCheck, UserRoundX, Trash2, MailCheck, Clock3, Loader2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';

function formatTimestamp(value: string | null) {
  if (!value) return 'Not yet';
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function TeamAccess() {
  const { user } = useAuth();
  const isOwner = user?.role === 'admin';
  const utils = trpc.useUtils();
  const teamQuery = trpc.teamAccess.list.useQuery(undefined, { enabled: isOwner });
  const inviteMutation = trpc.teamAccess.invite.useMutation({
    onSuccess: () => { void utils.teamAccess.list.invalidate(); setEmail(''); setDisplayName(''); },
  });
  const updateMutation = trpc.teamAccess.update.useMutation({ onSuccess: () => void utils.teamAccess.list.invalidate() });
  const removeMutation = trpc.teamAccess.remove.useMutation({ onSuccess: () => void utils.teamAccess.list.invalidate() });
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [message, setMessage] = useState('');

  const members = useMemo(() => teamQuery.data ?? [], [teamQuery.data]);

  if (!isOwner) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16">
        <div className="rounded-lg border bg-[oklch(0.985_0.008_80)] p-8" style={{ borderColor: 'oklch(0.84 0.018 75)' }}>
          <ShieldCheck className="w-7 h-7 mb-4" style={{ color: 'oklch(0.48 0.07 335)' }} />
          <h1 className="font-display text-3xl" style={{ color: 'oklch(0.22 0.018 55)' }}>Team Access</h1>
          <p className="mt-3 text-sm" style={{ color: 'oklch(0.48 0.018 60)' }}>Only the dashboard owner can manage approved team access.</p>
        </div>
      </div>
    );
  }

  const invite = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage('');
    try {
      const result = await inviteMutation.mutateAsync({ email, displayName: displayName || undefined });
      setMessage(result.status === 'invited' ? `Invitation sent to ${result.email}.` : `${result.email} is active and can request a sign-in link.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to update team access.');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 lg:px-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em]" style={{ color: 'oklch(0.48 0.07 335)' }}>
            <ShieldCheck size={15} /> Owner controls
          </div>
          <h1 className="font-display text-4xl mt-2" style={{ color: 'oklch(0.22 0.018 55)' }}>Team Access</h1>
          <p className="mt-2 max-w-2xl text-sm" style={{ color: 'oklch(0.48 0.018 60)' }}>
            Invite approved teammates, pause access when needed, and keep passwordless sign-in limited to the current THV team.
          </p>
        </div>
        <div className="rounded-full px-4 py-2 text-xs font-semibold" style={{ background: 'oklch(0.92 0.04 335)', color: 'oklch(0.35 0.08 335)' }}>
          {members.filter(member => member.isActive).length} active members
        </div>
      </div>

      <section className="rounded-lg border bg-[oklch(0.985_0.008_80)] p-6 mb-7" style={{ borderColor: 'oklch(0.84 0.018 75)' }}>
        <h2 className="font-display text-2xl" style={{ color: 'oklch(0.22 0.018 55)' }}>Invite a team member</h2>
        <p className="text-sm mt-1" style={{ color: 'oklch(0.48 0.018 60)' }}>New people receive a one-time invitation; after enrollment, they use the same simple email sign-in link as everyone else.</p>
        <form onSubmit={invite} className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <input value={displayName} onChange={event => setDisplayName(event.target.value)} placeholder="Name (optional)" className="h-10 rounded-md border px-3 text-sm" style={{ borderColor: 'oklch(0.78 0.02 70)', background: 'oklch(0.99 0.006 80)' }} />
          <input required type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="name@example.org" className="h-10 rounded-md border px-3 text-sm" style={{ borderColor: 'oklch(0.78 0.02 70)', background: 'oklch(0.99 0.006 80)' }} />
          <button disabled={inviteMutation.isPending} className="h-10 rounded-md px-4 text-sm font-semibold disabled:opacity-60" style={{ background: 'oklch(0.22 0.018 55)', color: 'oklch(0.96 0.008 75)' }}>
            {inviteMutation.isPending ? 'Sending…' : <span className="inline-flex items-center gap-2"><UserPlus size={15} /> Send invitation</span>}
          </button>
        </form>
        {message && <p className="mt-3 text-sm" style={{ color: message.startsWith('Unable') ? 'oklch(0.45 0.20 27)' : 'oklch(0.38 0.09 145)' }}>{message}</p>}
      </section>

      <section className="overflow-hidden rounded-lg border bg-[oklch(0.985_0.008_80)]" style={{ borderColor: 'oklch(0.84 0.018 75)' }}>
        <div className="px-6 py-5 border-b" style={{ borderColor: 'oklch(0.88 0.012 75)' }}>
          <h2 className="font-display text-2xl" style={{ color: 'oklch(0.22 0.018 55)' }}>Approved access list</h2>
        </div>
        {teamQuery.isLoading ? (
          <div className="flex items-center gap-3 px-6 py-10 text-sm" style={{ color: 'oklch(0.48 0.018 60)' }}><Loader2 className="animate-spin" size={17} /> Loading access list…</div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'oklch(0.88 0.012 75)' }}>
            {members.map(member => {
              const isSelf = member.email === user?.email?.toLowerCase();
              return (
                <div key={member.email} className="px-6 py-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium" style={{ color: 'oklch(0.22 0.018 55)' }}>{member.displayName}</span>
                      {member.role === 'owner' && <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ background: 'oklch(0.92 0.04 335)', color: 'oklch(0.35 0.08 335)' }}>Owner</span>}
                      {!member.isActive && <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ background: 'oklch(0.91 0.014 70)', color: 'oklch(0.43 0.02 60)' }}>Paused</span>}
                    </div>
                    <div className="mt-1 text-sm" style={{ color: 'oklch(0.48 0.018 60)' }}>{member.email}</div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: 'oklch(0.58 0.014 65)' }}>
                      <span className="inline-flex items-center gap-1"><MailCheck size={13} /> {member.enrolled ? 'Enrolled' : 'Invitation not accepted'}</span>
                      <span className="inline-flex items-center gap-1"><Clock3 size={13} /> Last sign-in: {formatTimestamp(member.lastSignInAt)}</span>
                    </div>
                  </div>
                  {!isSelf && (
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateMutation.mutate({ email: member.email, isActive: !member.isActive })} className="rounded-md border px-3 py-2 text-xs font-semibold" style={{ borderColor: 'oklch(0.78 0.02 70)', color: 'oklch(0.30 0.03 55)' }}>
                        {member.isActive ? <span className="inline-flex items-center gap-1"><UserRoundX size={14} /> Pause</span> : <span className="inline-flex items-center gap-1"><UserRoundCheck size={14} /> Restore</span>}
                      </button>
                      <button onClick={() => { if (window.confirm(`Remove ${member.email} from the approved access list?`)) removeMutation.mutate({ email: member.email }); }} className="rounded-md border px-3 py-2 text-xs font-semibold" style={{ borderColor: 'oklch(0.78 0.02 70)', color: 'oklch(0.48 0.05 20)' }}>
                        <span className="inline-flex items-center gap-1"><Trash2 size={14} /> Remove</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

