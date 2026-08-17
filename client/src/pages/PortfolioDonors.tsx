import { useMemo, useState } from 'react';
import { useDashboard } from '@/contexts/DashboardContext';
import { Donor, DonorPortfolio } from '@/lib/types';
import { donorPortfolioLabel } from '@shared/donorPortfolios';
import { formatCurrency, formatDate, totalDonated } from '@/lib/utils';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ChevronRight, DollarSign, Mail, MapPin, MessageCircle, Plus, RefreshCw, Send, X } from 'lucide-react';
import ThankYouLetterControl from '@/components/ThankYouLetterControl';
import { useAuth } from '@/_core/hooks/useAuth';

type PortfolioDonorsProps = { portfolio: Exclude<DonorPortfolio, 'major'> };

const TODAY = () => new Date().toISOString().slice(0, 10);

function Card({ donor, onOpen, portfolio }: { donor: Donor; onOpen: () => void; portfolio: PortfolioDonorsProps['portfolio'] }) {
  const expectedAnnual = donor.type === 'recurring' && donor.recurringFrequency === 'monthly'
    ? (donor.recurringAmount ?? 0) * 12
    : 0;

  return (
    <button onClick={onOpen} className="text-left p-5 rounded-lg border bg-[oklch(0.985_0.008_80)] border-[oklch(0.84_0.018_75)] hover:border-[oklch(0.60_0.018_65)] hover:shadow-md transition-all duration-200">
      <div className="flex justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-xl leading-tight truncate" style={{ color: 'oklch(0.22 0.018 55)' }}>{donor.name}</h2>
          {donor.email && <p className="mt-1 flex items-center gap-1 text-xs truncate" style={{ color: 'oklch(0.52 0.022 65)' }}><Mail size={12} />{donor.email}</p>}
        </div>
        <ChevronRight size={18} className="shrink-0 mt-1" style={{ color: 'oklch(0.60 0.018 65)' }} />
      </div>
      <div className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-[oklch(0.90_0.012_76)]">
        <div>
          <p className="text-[10px] uppercase tracking-[0.12em]" style={{ color: 'oklch(0.60 0.018 65)' }}>{portfolio === 'monthly-giving' ? 'Monthly gift' : 'Given this year'}</p>
          <p className="font-semibold mt-0.5" style={{ color: 'oklch(0.22 0.018 55)' }}>{portfolio === 'monthly-giving' ? formatCurrency(donor.recurringAmount ?? 0) : formatCurrency(donor.currentYearDonated ?? 0)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.12em]" style={{ color: 'oklch(0.60 0.018 65)' }}>{portfolio === 'monthly-giving' ? 'Expected annually' : 'Lifetime given'}</p>
          <p className="font-semibold mt-0.5" style={{ color: 'oklch(0.22 0.018 55)' }}>{formatCurrency(portfolio === 'monthly-giving' ? expectedAnnual : totalDonated(donor))}</p>
        </div>
      </div>
      {donor.currentYearDonated && donor.currentYearDonated > 0 && <p className="mt-4 text-xs flex items-center gap-1.5" style={{ color: donor.thankYouLetterForCurrentYear ? 'oklch(0.42 0.13 145)' : 'oklch(0.50 0.18 250)' }}><Mail size={13} />{donor.thankYouLetterForCurrentYear ? `Thank-you card sent ${formatDate(donor.thankYouLetterForCurrentYear.completedDate)}` : 'Thank-you card not yet marked sent'}</p>}
    </button>
  );
}

function DonorDetail({ donor, portfolio, onClose }: { donor: Donor; portfolio: PortfolioDonorsProps['portfolio']; onClose: () => void }) {
  const { updateDonor, addDonation, addActivity } = useDashboard();
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const detailQuery = trpc.donors.getWithDetails.useQuery({ id: donor.id });
  const [adding, setAdding] = useState(false);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(TODAY());
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [interactionNote, setInteractionNote] = useState('');
  const [savingInteraction, setSavingInteraction] = useState(false);

  const transactions = detailQuery.data?.donations ?? [];
  const interactions = [...(detailQuery.data?.activities ?? [])].sort((a: any, b: any) => String(b.date).localeCompare(String(a.date)));
  const handleAddTransaction = async () => {
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    setSaving(true);
    try {
      await addDonation(donor.id, { amount: parsed, date, note: note.trim() || undefined });
      await utils.donors.getWithDetails.invalidate({ id: donor.id });
      setAmount(''); setNote(''); setAdding(false);
    } finally { setSaving(false); }
  };

  const moveToMajor = async () => {
    await updateDonor(donor.id, { portfolio: 'major', cadenceDays: 90, cadenceDescription: 'every 3 months' });
    onClose();
  };

  const handleAddInteraction = async () => {
    if (!interactionNote.trim()) return;
    setSavingInteraction(true);
    try {
      await addActivity(donor.id, {
        date: TODAY(),
        author: user?.name ?? user?.email ?? 'THV team',
        note: interactionNote.trim(),
      });
      await utils.donors.getWithDetails.invalidate({ id: donor.id });
      setInteractionNote('');
    } finally { setSavingInteraction(false); }
  };


  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <section className="w-full max-w-xl h-full overflow-y-auto bg-[oklch(0.985_0.008_80)] shadow-2xl p-6" onClick={event => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 pb-5 border-b border-[oklch(0.84_0.018_75)]">
          <div>
            <p className="text-xs uppercase tracking-[0.16em]" style={{ color: 'oklch(0.50 0.16 350)' }}>{donorPortfolioLabel(portfolio)}</p>
            <h1 className="font-display text-3xl mt-1" style={{ color: 'oklch(0.22 0.018 55)' }}>{donor.name}</h1>
          </div>
          <button aria-label="Close donor detail" onClick={onClose} className="p-2 rounded hover:bg-[oklch(0.94_0.012_78)]"><X size={20} /></button>
        </div>

        <div className="mt-6 grid sm:grid-cols-2 gap-3 text-sm">
          {donor.email && <p className="flex gap-2"><Mail size={16} className="mt-0.5" />{donor.email}</p>}
          {donor.address && <p className="flex gap-2"><MapPin size={16} className="mt-0.5" />{donor.address}</p>}
        </div>

        {portfolio === 'monthly-giving' && <div className="mt-6 rounded-lg p-4 bg-[oklch(0.94_0.055_145)] border border-[oklch(0.84_0.065_145)]">
          <p className="text-xs uppercase tracking-[0.14em]" style={{ color: 'oklch(0.40 0.11 145)' }}>Recurring commitment</p>
          <p className="font-display text-2xl mt-1" style={{ color: 'oklch(0.22 0.018 55)' }}>{formatCurrency(donor.recurringAmount ?? 0)} monthly <span className="text-base font-sans">· {formatCurrency((donor.recurringAmount ?? 0) * 12)} annually</span></p>
          <p className="text-xs mt-1" style={{ color: 'oklch(0.40 0.11 145)' }}>Monthly transactions are created automatically from the donor’s start date.</p>
        </div>}

        <div className="mt-6"><ThankYouLetterControl donorId={donor.id} tasks={(detailQuery.data?.tasks ?? []).map((task: any) => ({ id: task.id, kind: task.kind, label: task.label, dueDate: task.dueDate, completedDate: task.completedDate ?? undefined, completedBy: task.completedBy ?? undefined }))} hasCurrentYearDonation={transactions.some((transaction: any) => String(transaction.date).startsWith(`${new Date().getFullYear()}-`))} /></div>

        <div className="mt-7">
          <div className="flex items-center justify-between gap-3">
            <div><h2 className="font-display text-2xl" style={{ color: 'oklch(0.22 0.018 55)' }}>Transaction history</h2><p className="text-xs mt-1" style={{ color: 'oklch(0.52 0.022 65)' }}>Record one-time gifts and review generated monthly gifts.</p></div>
            <Button size="sm" onClick={() => setAdding(value => !value)}><Plus size={14} /> Add transaction</Button>
          </div>
          {adding && <div className="mt-4 rounded-lg border border-[oklch(0.84_0.018_75)] p-4 grid gap-3">
            <div className="grid grid-cols-2 gap-3"><Input type="number" min="0.01" step="0.01" placeholder="Amount" value={amount} onChange={event => setAmount(event.target.value)} /><Input type="date" value={date} onChange={event => setDate(event.target.value)} /></div>
            <Textarea placeholder="Optional transaction note" value={note} onChange={event => setNote(event.target.value)} />
            <div className="flex gap-2"><Button size="sm" disabled={saving || !amount} onClick={() => void handleAddTransaction()}><DollarSign size={14} /> Save transaction</Button><Button size="sm" variant="outline" onClick={() => setAdding(false)}>Cancel</Button></div>
          </div>}
          <div className="mt-4 divide-y divide-[oklch(0.90_0.012_76)] border-y border-[oklch(0.90_0.012_76)]">
            {transactions.map((transaction: any) => <div key={transaction.id} className="py-3 flex justify-between gap-3 text-sm"><div><p className="font-medium">{formatDate(transaction.date)}</p>{transaction.note && <p className="text-xs mt-0.5" style={{ color: 'oklch(0.52 0.022 65)' }}>{transaction.note}</p>}</div><strong>{formatCurrency(Number(transaction.amountCents ?? 0) / 100)}</strong></div>)}
            {transactions.length === 0 && <p className="py-5 text-sm" style={{ color: 'oklch(0.52 0.022 65)' }}>No transactions recorded yet.</p>}
          </div>
        </div>

        {portfolio === 'donors-500-5k' && <div className="mt-8 p-4 rounded-lg border border-[oklch(0.77_0.10_70)] bg-[oklch(0.97_0.035_75)]">
          <h2 className="font-display text-xl" style={{ color: 'oklch(0.22 0.018 55)' }}>Ready for major-donor stewardship?</h2>
          <p className="text-sm mt-1" style={{ color: 'oklch(0.50 0.022 65)' }}>Move this donor when their annual giving reaches more than $5,000. Contact details, transactions, notes, and annual thank-you history remain intact.</p>
          <Button size="sm" className="mt-3" onClick={() => void moveToMajor()}><Send size={14} /> Move to Major Donors</Button>
        </div>}

        <div className="mt-8 border-t border-[oklch(0.84_0.018_75)] pt-6">
          <div className="flex items-start gap-3">
            <MessageCircle size={19} className="mt-0.5 text-[oklch(0.50_0.18_250)]" />
            <div>
              <h2 className="font-display text-2xl" style={{ color: 'oklch(0.22 0.018 55)' }}>Donor Journey Log</h2>
              <p className="mt-1 text-xs" style={{ color: 'oklch(0.52 0.022 65)' }}>Capture relationship notes here. This log does not create tasks, deadlines, or communication cadence.</p>
            </div>
          </div>
          <div className="mt-4 rounded-lg border border-[oklch(0.84_0.018_75)] p-4">
            <Textarea value={interactionNote} onChange={event => setInteractionNote(event.target.value)} placeholder="Log an interaction, call, meeting, or relationship note…" />
            <div className="mt-3 flex justify-end"><Button size="sm" disabled={savingInteraction || !interactionNote.trim()} onClick={() => void handleAddInteraction()}><Plus size={14} /> Add to journey</Button></div>
          </div>
          <div className="mt-4 space-y-3">
            {interactions.map((interaction: any) => <div key={interaction.id} className="rounded-lg border border-[oklch(0.90_0.012_76)] px-4 py-3"><div className="flex items-center justify-between gap-3 text-xs" style={{ color: 'oklch(0.52 0.022 65)' }}><span>{formatDate(interaction.date)}</span><span>{interaction.author}</span></div><p className="mt-1.5 text-sm" style={{ color: 'oklch(0.28 0.018 55)' }}>{interaction.note}</p></div>)}
            {interactions.length === 0 && <p className="py-4 text-sm" style={{ color: 'oklch(0.52 0.022 65)' }}>No journey notes yet.</p>}
          </div>
        </div>
      </section>
    </div>
  );
}

function AddPortfolioDonor({ portfolio, onClose }: { portfolio: PortfolioDonorsProps['portfolio']; onClose: () => void }) {
  const { addDonor } = useDashboard();
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', startDate: TODAY(), recurringAmount: '' });
  const recurring = portfolio === 'monthly-giving';
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || (recurring && (!form.recurringAmount || Number(form.recurringAmount) <= 0))) return;
    await addDonor({
      name: form.name.trim(), contactName: '', email: form.email || undefined, phone: form.phone || undefined, address: form.address || undefined,
      startDate: form.startDate, portfolio, type: recurring ? 'recurring' : 'one-time', tier: 'individual',
      recurringAmount: recurring ? Number(form.recurringAmount) : undefined, recurringFrequency: recurring ? 'monthly' : undefined,
      cadenceDays: 365, cadenceDescription: 'annual stewardship', naruCircle: false, donorTrip: false, taxReceiptSent: false,
      newsletterSubscribed: false, manuallyInactive: false, dismissedTasks: [], completedTasks: [], donations: [], tags: [],
    });
    onClose();
  };
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}><form onSubmit={event => void submit(event)} onClick={event => event.stopPropagation()} className="w-full max-w-lg rounded-xl p-6 bg-[oklch(0.985_0.008_80)] shadow-2xl">
    <div className="flex justify-between gap-4"><div><p className="text-xs uppercase tracking-[0.16em]" style={{ color: 'oklch(0.50 0.16 350)' }}>{donorPortfolioLabel(portfolio)}</p><h1 className="font-display text-3xl mt-1">Add donor</h1></div><button type="button" aria-label="Close add donor" onClick={onClose}><X /></button></div>
    <div className="mt-6 grid gap-3"><Input required placeholder="Donor name" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /><Input type="email" placeholder="Email address" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} /><Input placeholder="Phone number" value={form.phone} onChange={event => setForm({ ...form, phone: event.target.value })} /><Input placeholder="Mailing address" value={form.address} onChange={event => setForm({ ...form, address: event.target.value })} /><Input type="date" required value={form.startDate} onChange={event => setForm({ ...form, startDate: event.target.value })} />{recurring && <Input type="number" required min="0.01" step="0.01" placeholder="Monthly gift amount" value={form.recurringAmount} onChange={event => setForm({ ...form, recurringAmount: event.target.value })} />}</div>
    <p className="mt-3 text-xs" style={{ color: 'oklch(0.52 0.022 65)' }}>{recurring ? 'Monthly transactions will generate from the start date. No initial welcome-note task will be added.' : 'You can add transaction history after creating the donor.'}</p>
    <div className="mt-5 flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit"><Plus size={14} /> Add donor</Button></div>
  </form></div>;
}

export default function PortfolioDonors({ portfolio }: PortfolioDonorsProps) {
  const { store, isLoading } = useDashboard();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const donors = useMemo(() => store.donors.filter(donor => donor.portfolio === portfolio), [store.donors, portfolio]);
  const selected = donors.find(donor => donor.id === selectedId) ?? null;
  const annualExpected = donors.reduce((sum, donor) => sum + (donor.type === 'recurring' && donor.recurringFrequency === 'monthly' ? (donor.recurringAmount ?? 0) * 12 : 0), 0);
  const title = donorPortfolioLabel(portfolio);
  const description = portfolio === 'monthly-giving'
    ? 'All monthly donors, regardless of dollar amount. Monthly commitments support the expected recurring total on the primary dashboard.'
    : 'Annual non-monthly donors whose calendar-year gifts are between $500 and $5,000. Track transactions and handwritten thank-you cards.';

  return <div className="p-6 lg:p-8 max-w-[1300px]">
    <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8"><div><p className="text-xs uppercase tracking-[0.16em]" style={{ color: 'oklch(0.50 0.16 350)' }}>Donor portfolio</p><h1 className="font-display text-4xl mt-1" style={{ color: 'oklch(0.22 0.018 55)' }}>{title}</h1><p className="max-w-2xl text-sm mt-2" style={{ color: 'oklch(0.52 0.022 65)' }}>{description}</p></div><Button onClick={() => setAdding(true)}><Plus size={15} /> Add donor</Button></header>
    <div className="grid sm:grid-cols-2 gap-4 mb-7"><div className="rounded-lg p-4 border bg-[oklch(0.985_0.008_80)] border-[oklch(0.84_0.018_75)]"><p className="text-xs uppercase tracking-[0.14em]" style={{ color: 'oklch(0.60 0.018 65)' }}>Donors tracked</p><p className="font-display text-3xl mt-1">{donors.length}</p></div><div className="rounded-lg p-4 border bg-[oklch(0.985_0.008_80)] border-[oklch(0.84_0.018_75)]"><p className="text-xs uppercase tracking-[0.14em]" style={{ color: 'oklch(0.60 0.018_65)' }}>{portfolio === 'monthly-giving' ? 'Expected annual giving' : `Thank-you letters sent in ${new Date().getFullYear()}`}</p><p className="font-display text-3xl mt-1">{portfolio === 'monthly-giving' ? formatCurrency(annualExpected) : `${donors.filter(donor => donor.thankYouLetterForCurrentYear).length}/${donors.filter(donor => (donor.currentYearDonated ?? 0) > 0).length}`}</p>{portfolio === 'monthly-giving' && <p className="text-xs mt-1.5" style={{ color: 'oklch(0.52 0.022 65)' }}>Included in the Donor Relations expected annual recurring amount.</p>}</div></div>
    {isLoading ? <p className="text-sm" style={{ color: 'oklch(0.52 0.022 65)' }}>Loading donors…</p> : donors.length === 0 ? <div className="rounded-lg border border-dashed p-12 text-center" style={{ borderColor: 'oklch(0.78 0.018 75)', color: 'oklch(0.52 0.022 65)' }}><RefreshCw size={24} className="mx-auto mb-3 opacity-60" /><p className="font-display text-xl">No donors in {title} yet</p><p className="text-sm mt-1">Add a donor or move an existing donor into this portfolio.</p></div> : <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">{donors.map(donor => <Card key={donor.id} donor={donor} portfolio={portfolio} onOpen={() => setSelectedId(donor.id)} />)}</div>}
    {selected && <DonorDetail donor={selected} portfolio={portfolio} onClose={() => setSelectedId(null)} />}
    {adding && <AddPortfolioDonor portfolio={portfolio} onClose={() => setAdding(false)} />}
  </div>;
}
