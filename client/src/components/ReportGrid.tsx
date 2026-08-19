import { useMemo, useState } from 'react';
import type { Donor } from '@/lib/types';
import { REPORTS, reportYearGiving, type ReportKey } from '@/lib/reportRecipients';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const TEAM_MEMBERS = ['Liz', 'Lauren', 'Anna', 'Brenley', 'Emily', 'Amy', 'Kirsten'];
const TODAY = new Date().toISOString().slice(0, 10);
const formatDate = (date?: string | null) => date ? new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
const currency = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

type ReportTask = { id: string; donorId: string; completedDate?: string | null; completedBy?: string | null };

export function ReportGrid({ report, donors, tasks, onSetCompletion }: { report: (typeof REPORTS)[ReportKey]; donors: Donor[]; tasks: ReportTask[]; onSetCompletion: (donor: Donor, completed: boolean, date: string, by: string) => Promise<void> }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [sentDate, setSentDate] = useState(TODAY);
  const [sentBy, setSentBy] = useState('Liz');
  const [busy, setBusy] = useState(false);
  const rows = useMemo(() => donors.map(donor => {
    const record = tasks.find(task => task.donorId === donor.id && task.id === report.taskId);
    return { donor, record, sent: Boolean(record?.completedDate) };
  }).sort((left, right) => {
    if (left.sent !== right.sent) return left.sent ? 1 : -1;
    return left.donor.name.localeCompare(right.donor.name);
  }), [donors, report.taskId, tasks]);
  const unsentRows = rows.filter(row => !row.sent);
  const allSelected = unsentRows.length > 0 && unsentRows.every(row => selected.includes(row.donor.id));
  const setAllSelected = (checked: boolean) => setSelected(checked ? unsentRows.map(row => row.donor.id) : []);
  const toggleSelected = (id: string, checked: boolean) => setSelected(current => checked ? Array.from(new Set([...current, id])) : current.filter(currentId => currentId !== id));
  const markSelected = async () => {
    const selectedDonors = unsentRows.filter(row => selected.includes(row.donor.id)).map(row => row.donor);
    if (!selectedDonors.length) return;
    setBusy(true);
    try {
      await Promise.all(selectedDonors.map(donor => onSetCompletion(donor, true, sentDate, sentBy)));
      setSelected([]);
    } finally {
      setBusy(false);
    }
  };

  return <div className="mt-4 overflow-hidden rounded-xl border border-[oklch(0.87_0.018_75)] bg-white">
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[oklch(0.89_0.012_78)] bg-[oklch(0.975_0.012_80)] px-4 py-3">
      <div><h2 className="font-display text-xl text-[oklch(0.22_0.018_55)]">{report.title}</h2><p className="mt-0.5 text-xs text-[oklch(0.52_0.022_65)]">All donor portfolios · sending this report logs a dated interaction on the donor card and advances Next Contact.</p></div>
      <span className="text-xs text-[oklch(0.52_0.022_65)]">{rows.length} recipients</span>
    </div>
    {selected.length > 0 && <div className="flex flex-wrap items-end gap-2 border-b border-[oklch(0.89_0.012_78)] bg-[oklch(0.99_0.004_80)] px-4 py-3">
      <label className="text-xs text-[oklch(0.48_0.022_65)]">Sent date<Input className="mt-1 h-8 w-40" type="date" value={sentDate} onChange={event => setSentDate(event.target.value)} /></label>
      <label className="text-xs text-[oklch(0.48_0.022_65)]">Sent by<select value={sentBy} onChange={event => setSentBy(event.target.value)} className="mt-1 block h-8 rounded border border-[oklch(0.84_0.018_75)] bg-white px-2 text-sm text-[oklch(0.22_0.018_55)]">{TEAM_MEMBERS.map(member => <option key={member}>{member}</option>)}</select></label>
      <Button size="sm" disabled={busy} onClick={() => void markSelected()}>{busy ? 'Saving…' : `Mark selected sent (${selected.length})`}</Button>
    </div>}
    <div className="overflow-x-auto"><table className={`w-full ${report.showGivingAmount ? 'min-w-[790px]' : 'min-w-[660px]'} text-sm`}><thead className="border-b border-[oklch(0.89_0.012_78)] text-left text-[10px] uppercase tracking-[0.12em] text-[oklch(0.52_0.022_65)]"><tr>
      <th className="w-12 px-4 py-2 text-center"><input aria-label={`Select all unsent recipients for ${report.title}`} type="checkbox" checked={allSelected} onChange={event => setAllSelected(event.target.checked)} /></th><th className="px-4 py-2">Name</th><th className="px-4 py-2">Email</th><th className="px-4 py-2">Mailing address</th>{report.showGivingAmount && <th className="px-4 py-2 text-right">{report.amountLabel}</th>}<th className="px-4 py-2 text-center">Send status</th>
    </tr></thead><tbody>{rows.map(({ donor, record, sent }) => <tr key={donor.id} className="border-b border-[oklch(0.94_0.008_75)] last:border-0"><td className="px-4 py-2.5 text-center">{sent ? <span className="inline-block h-4 w-4" aria-hidden="true" /> : <input aria-label={`Select ${donor.name} for ${report.title}`} type="checkbox" checked={selected.includes(donor.id)} onChange={event => toggleSelected(donor.id, event.target.checked)} />}</td><td className="px-4 py-2.5 font-medium text-[oklch(0.22_0.018_55)]">{donor.name}</td><td className="px-4 py-2.5 text-xs text-[oklch(0.42_0.018_55)]">{donor.email || '—'}</td><td className="max-w-[260px] px-4 py-2.5 text-xs text-[oklch(0.42_0.018_55)]">{donor.address || '—'}</td>{report.showGivingAmount && <td className="px-4 py-2.5 text-right font-medium text-[oklch(0.22_0.018_55)]">{currency(reportYearGiving(donor, report.givingYear))}</td>}<td className="px-4 py-2.5 text-center">{sent ? <div><span className="text-xs font-medium text-[oklch(0.45_0.13_145)]">Report sent on {formatDate(record?.completedDate)}</span><button disabled={busy} onClick={() => void onSetCompletion(donor, false, sentDate, sentBy)} className="ml-2 text-xs text-[oklch(0.52_0.022_65)] underline hover:text-[oklch(0.22_0.018_55)]">Undo</button></div> : <span className="text-xs font-medium text-[oklch(0.50_0.18_250)]">Not sent</span>}</td></tr>)}</tbody></table></div>
  </div>;
}
