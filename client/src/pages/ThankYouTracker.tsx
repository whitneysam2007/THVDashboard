import { useMemo, useState } from 'react';
import { CheckSquare, Mail, Send, Undo2 } from 'lucide-react';
import { useDashboard } from '@/contexts/DashboardContext';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { formatCurrency, formatDate } from '@/lib/utils';
import { thankYouLetterTaskId } from '@shared/thankYouLetters';

const CURRENT_YEAR = new Date().getFullYear();
const today = () => new Date().toISOString().slice(0, 10);

export default function ThankYouTracker() {
  const { store } = useDashboard();
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchDate, setBatchDate] = useState(today());
  const [rowDates, setRowDates] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const upsertTask = trpc.donors.upsertTask.useMutation();
  const deleteTask = trpc.donors.deleteTask.useMutation();

  const donors = useMemo(() => store.donors
    .filter(donor => (donor.currentYearDonated ?? 0) > 0 && donor.currentYearLatestDonation)
    .sort((a, b) => a.name.localeCompare(b.name)), [store.donors]);
  const allSelected = donors.length > 0 && donors.every(donor => selected.has(donor.id));

  const refresh = () => {
    utils.donors.list.invalidate();
    donors.forEach(donor => utils.donors.getWithDetails.invalidate({ id: donor.id }));
  };
  const markSent = async (donorIds: string[], sentDate: string) => {
    setBusy(true);
    try {
      await Promise.all(donorIds.map(donorId => upsertTask.mutateAsync({
        id: thankYouLetterTaskId(CURRENT_YEAR), donorId, kind: 'onboarding',
        label: `Handwritten thank-you card (${CURRENT_YEAR})`, dueDate: sentDate,
        completedDate: sentDate, completedBy: user?.name ?? user?.email ?? 'THV team',
      })));
      setSelected(new Set());
      refresh();
    } finally { setBusy(false); }
  };
  const undo = async (donorId: string) => {
    setBusy(true);
    try {
      await deleteTask.mutateAsync({ donorId, id: thankYouLetterTaskId(CURRENT_YEAR) });
      refresh();
    } finally { setBusy(false); }
  };
  const toggle = (donorId: string) => setSelected(previous => {
    const next = new Set(previous);
    next.has(donorId) ? next.delete(donorId) : next.add(donorId);
    return next;
  });
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(donors.map(donor => donor.id)));

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-[oklch(0.52_0.022_65)]">Stewardship</p>
        <h1 className="font-display text-4xl text-[oklch(0.22_0.018_55)]">Thank You Tracker</h1>
        <p className="mt-2 max-w-2xl text-sm text-[oklch(0.48_0.022_65)]">Every donor who gave in {CURRENT_YEAR} appears here. Marking a card sent updates the donor’s letter indicator everywhere in the dashboard.</p>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-[oklch(0.84_0.018_75)] bg-[oklch(0.985_0.008_80)] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-[oklch(0.35_0.025_55)]"><CheckSquare size={17} /> {selected.size} selected</div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs uppercase tracking-wider text-[oklch(0.52_0.022_65)]">Sent date</label>
          <input type="date" value={batchDate} onChange={event => setBatchDate(event.target.value)} className="rounded-md border border-[oklch(0.80_0.018_75)] bg-white px-2 py-1.5 text-sm" />
          <button type="button" disabled={!selected.size || busy} onClick={() => markSent(Array.from(selected), batchDate)} className="inline-flex items-center gap-2 rounded-md bg-[oklch(0.22_0.018_55)] px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-45">
            <Send size={15} /> Mark selected cards sent
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[oklch(0.84_0.018_75)] bg-[oklch(0.99_0.006_80)]">
        <table className="w-full min-w-[900px] text-left">
          <thead className="border-b border-[oklch(0.84_0.018_75)] bg-[oklch(0.95_0.012_78)] text-xs uppercase tracking-wider text-[oklch(0.46_0.022_65)]">
            <tr>
              <th className="w-12 px-4 py-3"><input aria-label="Select all donors" type="checkbox" checked={allSelected} onChange={toggleAll} /></th>
              <th className="px-3 py-3">Name</th><th className="px-3 py-3">Address</th><th className="px-3 py-3">Amount given</th><th className="px-3 py-3">Date given</th><th className="px-3 py-3">Thank-you card</th>
            </tr>
          </thead>
          <tbody>
            {donors.map(donor => {
              const sent = donor.thankYouLetterForCurrentYear;
              const sentDate = rowDates[donor.id] ?? today();
              return <tr key={donor.id} className="border-b border-[oklch(0.90_0.012_78)] last:border-0">
                <td className="px-4 py-3"><input aria-label={`Select ${donor.name}`} type="checkbox" checked={selected.has(donor.id)} onChange={() => toggle(donor.id)} /></td>
                <td className="px-3 py-3 font-medium text-[oklch(0.25_0.02_55)]">{donor.name}</td>
                <td className="max-w-[250px] px-3 py-3 text-sm text-[oklch(0.46_0.022_65)]">{donor.address || 'Address needed'}</td>
                <td className="px-3 py-3 text-sm font-medium">{formatCurrency(donor.currentYearLatestDonation?.amount ?? 0)}</td>
                <td className="px-3 py-3 text-sm">{donor.currentYearLatestDonation ? formatDate(donor.currentYearLatestDonation.date) : '—'}</td>
                <td className="px-3 py-3">
                  {sent ? <div className="flex items-center gap-2 text-sm text-[oklch(0.42_0.13_145)]"><Mail size={17} /><span>Sent {formatDate(sent.completedDate)}</span><button type="button" disabled={busy} onClick={() => undo(donor.id)} title="Undo sent card" className="ml-1 rounded p-1 text-[oklch(0.50_0.022_65)] hover:bg-[oklch(0.92_0.012_78)]"><Undo2 size={14} /></button></div>
                    : <div className="flex items-center gap-2"><Mail size={17} className="text-[oklch(0.50_0.18_250)]" /><input aria-label={`Sent date for ${donor.name}`} type="date" value={sentDate} onChange={event => setRowDates(previous => ({ ...previous, [donor.id]: event.target.value }))} className="rounded-md border border-[oklch(0.80_0.018_75)] bg-white px-2 py-1 text-xs" /><button type="button" disabled={busy} onClick={() => markSent([donor.id], sentDate)} className="rounded-md bg-[oklch(0.87_0.10_250)] px-2 py-1 text-xs font-medium text-[oklch(0.25_0.08_250)]">Mark sent</button></div>}
                </td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
