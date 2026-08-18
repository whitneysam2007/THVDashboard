// THV Donor Dashboard — Donor Detail Modal
// Layout order: Header → Donation History (prominent, top) → Metrics → Flags/Edit → Cadence → Notes → Journey

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { trpc } from '@/lib/trpc';
import { Donor, DonationEntry } from '@/lib/types';
import { useDashboard } from '@/contexts/DashboardContext';
import { Trip } from '@/lib/types';
import StatusBadge from '@/components/StatusBadge';
import { formatDate, nextContactDate, daysUntilNextContact, formatCurrency, totalDonated, tierLabel, donorTypeLabel, cn } from '@/lib/utils';
import DonorJourney from '@/components/DonorJourney';
import ThankYouLetterControl from '@/components/ThankYouLetterControl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  X, MapPin, Phone, Mail, Calendar, Star, Plane, Receipt,
  RefreshCw, Clock, Plus, Edit2, Check, ChevronDown, ChevronUp,
  DollarSign, Trash2, AlertTriangle, ContactRound
} from 'lucide-react';
import { nanoid } from 'nanoid';

const TEAM_MEMBERS = ['Liz', 'Lauren', 'Anna', 'Brenley', 'Emily', 'Amy', 'Kirsten'];
const CURRENT_YEAR = new Date().getFullYear();
const THREE_YEARS_AGO = CURRENT_YEAR - 3;
const IS_FEBRUARY = new Date().getMonth() === 1; // 0-indexed

// Small inline component: "+ add next action…" that opens a compact form in place
function InlineNextAction({ donorId, existingTasks }: { donorId: string; existingTasks: import('@/lib/types').TaskEntry[] }) {
  const { updateDonor } = useDashboard();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const handleAdd = () => {
    if (!label.trim()) return;
    const newTask: import('@/lib/types').TaskEntry = {
      id: `manual-${nanoid()}`,
      kind: 'onboarding',
      label: label.trim(),
      dueDate: date,
    };
    updateDonor(donorId, { completedTasks: [...existingTasks, newTask] });
    setOpen(false);
    setLabel('');
    setDate(new Date().toISOString().split('T')[0]);
  };

  if (!open) {
    return (
      <button onClick={e => { e.stopPropagation(); setOpen(true); }} className="text-xs italic hover:underline" style={{ color: 'oklch(0.50 0.18 250)' }}>
        + add next action…
      </button>
    );
  }
  return (
    <div className="mt-1 space-y-1" onClick={e => e.stopPropagation()}>
      <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="What needs to happen?" className="text-xs h-7 px-2" autoFocus onKeyDown={e => e.key === 'Enter' && handleAdd()} />
      <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="text-xs h-7 px-2 w-full" />
      <div className="flex gap-1">
        <button onClick={handleAdd} disabled={!label.trim()} className="text-xs px-2 py-0.5 rounded text-white disabled:opacity-40" style={{ background: 'oklch(0.50 0.18 250)' }}>Add</button>
        <button onClick={() => setOpen(false)} className="text-xs px-2 py-0.5 rounded" style={{ color: 'oklch(0.52 0.022 65)' }}>cancel</button>
      </div>
    </div>
  );
}

// Donor Trip toggle — tap to select a trip or deselect
function TripToggle({ donor, trips, onUpdate }: {
  donor: Donor;
  trips: Trip[];
  onUpdate: (id: string, updates: Partial<Donor>) => void;
}) {
  const [open, setOpen] = useState(false);
  const isOn = donor.donorTrip;
  const selectedTrip = trips.find(t => t.id === donor.tripId);

  const handleDeselect = () => {
    onUpdate(donor.id, { donorTrip: false, tripId: undefined });
    setOpen(false);
  };

  const label = isOn ? (selectedTrip?.name ?? 'Yes') : 'No';

  return (
    <div className="relative" onClick={e => e.stopPropagation()}>
      <button
        onClick={() => setOpen(o => !o)}
        className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border cursor-pointer transition-colors',
          isOn ? 'bg-[oklch(0.88_0.022_72)] border-[oklch(0.80_0.022_72)] text-[oklch(0.28_0.018_55)]' : 'bg-[oklch(0.92_0.012_78)] border-[oklch(0.84_0.018_75)] text-[oklch(0.62_0.012_65)]'
        )}
      >
        <Plane size={10} /> Donor Trip: {label}
      </button>
      {open && (
        <div className="absolute top-full left-0 z-20 mt-1 min-w-[200px] bg-white border border-[oklch(0.84_0.018_75)] rounded-lg shadow-lg p-2 space-y-1">
          <p className="text-xs uppercase tracking-widest px-1 pb-1" style={{ color: 'oklch(0.62 0.012 65)' }}>Select a trip</p>
          {trips.length === 0 && <p className="text-xs px-1 italic" style={{ color: 'oklch(0.62 0.012 65)' }}>No trips yet — add one in the Trips tab.</p>}
          {trips.map(t => (
            <button key={t.id} onClick={() => { onUpdate(donor.id, { donorTrip: true, tripId: t.id }); setOpen(false); }} className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-[oklch(0.96_0.012_78)] transition-colors" style={{ color: 'oklch(0.22 0.018 55)' }}>
              {t.name} · {t.startDate}
            </button>
          ))}
          {isOn && <button onClick={handleDeselect} className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-red-50 transition-colors" style={{ color: 'oklch(0.55 0.20 27)' }}>Remove from trip</button>}
          <button onClick={() => setOpen(false)} className="w-full text-left text-xs px-2 py-1 rounded" style={{ color: 'oklch(0.62 0.012 65)' }}>cancel</button>
        </div>
      )}
    </div>
  );
}

const TIER_OPTIONS = [
  { value: 'individual', label: 'Individual' },
  { value: 'family-foundation', label: 'Family Foundation' },
  { value: 'business', label: 'Business' },
  { value: 'institution', label: 'Institution' },
];

interface DonorModalProps {
  donor: Donor;
  onClose: () => void;
  initialFocus?: 'log-interaction';
}

export default function DonorModal({ donor: donorProp, onClose, initialFocus }: DonorModalProps) {
  const { addActivity, updateDonor, deleteDonor, addDonation, deleteDonation, currentUser, store: dashStore } = useDashboard();

  // Load live donations from DB for this donor
  // Always read the live donor from the store so flag toggles reflect immediately
  const donor = dashStore.donors.find(d => d.id === donorProp.id) ?? donorProp;

  const detailsQuery = trpc.donors.getWithDetails.useQuery({ id: donor.id }, { enabled: !!donor.id });
  const liveDonations: DonationEntry[] = (detailsQuery.data?.donations ?? []).map((d: any) => ({
    id: d.id,
    date: d.date,
    amount: d.amountCents / 100,
    note: d.note ?? undefined,
  }));

  // Load live activities from DB for this donor
  const liveActivities: import('@/lib/types').ActivityEntry[] = (detailsQuery.data?.activities ?? []).map((a: any) => ({
    id: a.id,
    date: a.date,
    author: a.author,
    note: a.note,
  }));

  // Load live completed tasks from DB for this donor
  const liveTasks: import('@/lib/types').TaskEntry[] = (detailsQuery.data?.tasks ?? []).map((t: any) => ({
    id: t.id,
    kind: t.kind as 'onboarding' | 'recurring',
    label: t.label,
    dueDate: t.dueDate,
    completedDate: t.completedDate ?? undefined,
    completedBy: t.completedBy ?? undefined,
  }));

  const [newNote, setNewNote] = useState('');
  const [noteAuthor, setNoteAuthor] = useState(() => {
    const u = currentUser?.split('@')[0] ?? '';
    return TEAM_MEMBERS.find(m => m.toLowerCase() === u) ?? TEAM_MEMBERS[0];
  });
  const [noteDate, setNoteDate] = useState(new Date().toISOString().split('T')[0]);
  const [showAllActivity, setShowAllActivity] = useState(false);

  const [newDonationAmount, setNewDonationAmount] = useState('');
  const [newDonationDate, setNewDonationDate] = useState(new Date().toISOString().split('T')[0]);
  const [newDonationNote, setNewDonationNote] = useState('');
  const [showAllDonations, setShowAllDonations] = useState(false);
  const [showAddDonation, setShowAddDonation] = useState(false);

  const [editMode, setEditMode] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editFields, setEditFields] = useState({
    naruCircle: donor.naruCircle,
    name: donor.name,
    contactName: donor.contactName,
    email: donor.email ?? '',
    phone: donor.phone ?? '',
    address: donor.address ?? '',
    startDate: donor.startDate,
    donorTrip: donor.donorTrip,
    taxReceiptSent: donor.taxReceiptSent,
    type: donor.type,
    tier: donor.tier,
    contractEndDate: donor.contractEndDate ?? '',
    cadenceDescription: donor.cadenceDescription,
    cadenceDays: donor.cadenceDays,
    recurringAmount: donor.recurringAmount ?? '',
    recurringFrequency: donor.recurringFrequency ?? 'yearly',
    notes: donor.notes ?? '',
    newsletterSubscribed: donor.newsletterSubscribed ?? false,
    manuallyInactive: donor.manuallyInactive ?? false,
    referredBy: donor.referredBy ?? '',
    nextAction: donor.nextAction ?? '',
  });

  const nextDate = nextContactDate(donor);
  const daysLeft = daysUntilNextContact(donor);
  const overdue = daysLeft < 0;

  const donations3yr = liveDonations
    .filter(d => new Date(d.date).getFullYear() >= THREE_YEARS_AGO)
    .sort((a, b) => b.date.localeCompare(a.date));
  const visibleDonations = showAllDonations ? donations3yr : donations3yr.slice(0, 5);
  const total3yr = donations3yr.reduce((s, d) => s + d.amount, 0);
  const totalAll = liveDonations.reduce((s, d) => s + d.amount, 0);
  const totalThisYear = liveDonations
    .filter(d => new Date(d.date).getFullYear() === CURRENT_YEAR)
    .reduce((s, d) => s + d.amount, 0);

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    await addActivity(donor.id, { date: noteDate, author: noteAuthor, note: newNote.trim() });
    detailsQuery.refetch();
    if (donor.nextAction) updateDonor(donor.id, { nextAction: undefined });
    setNewNote('');
  };

  const handleAddDonation = async () => {
    const amt = parseFloat(newDonationAmount);
    if (!amt || amt <= 0) return;
    await addDonation(donor.id, { date: newDonationDate, amount: amt, note: newDonationNote.trim() || undefined });
    detailsQuery.refetch();
    setNewDonationAmount('');
    setNewDonationNote('');
  };

  const handleRemoveDonation = async (id: string) => {
    await deleteDonation(id, donor.id);
    detailsQuery.refetch();
  };

  const handleSaveEdit = () => {
    updateDonor(donor.id, {
      name: editFields.name.trim() || donor.name,
      contactName: editFields.contactName.trim() || donor.contactName,
      email: editFields.email.trim() || undefined,
      phone: editFields.phone.trim() || undefined,
      address: editFields.address.trim() || undefined,
      startDate: editFields.startDate,
      naruCircle: editFields.naruCircle,
      donorTrip: editFields.donorTrip,
      taxReceiptSent: editFields.taxReceiptSent,
      type: editFields.type as Donor['type'],
      tier: editFields.tier as Donor['tier'],
      contractEndDate: editFields.contractEndDate || undefined,
      cadenceDescription: editFields.cadenceDescription,
      cadenceDays: Number(editFields.cadenceDays),
      recurringAmount: editFields.recurringAmount ? Number(editFields.recurringAmount) : undefined,
      recurringFrequency: editFields.recurringFrequency as 'monthly' | 'yearly',
    notes: editFields.notes,
    newsletterSubscribed: editFields.newsletterSubscribed,
    manuallyInactive: editFields.manuallyInactive,
    referredBy: editFields.referredBy.trim() || undefined,
    nextAction: editFields.nextAction.trim() || undefined,
  });
    setEditMode(false);
  };

  const handleDelete = () => {
    deleteDonor(donor.id);
    onClose();
  };

  const visibleActivities = showAllActivity ? liveActivities : liveActivities.slice(0, 5);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(34,26,20,0.55)' }}>
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl" style={{ background: 'oklch(0.985 0.008 80)' }}>

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between px-6 pt-6 pb-4 border-b border-[oklch(0.84_0.018_75)]" style={{ background: 'oklch(0.985 0.008 80)' }}>
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="font-display text-2xl" style={{ color: 'oklch(0.22 0.018 55)' }}>{donor.name}</h2>
              <StatusBadge status={donor.status} />
            </div>
            <p className="text-sm mt-0.5" style={{ color: 'oklch(0.52 0.022 65)' }}>
              {donor.contactName} · <span className="italic">{tierLabel(donor.tier)}</span>
            </p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={() => { setEditMode(!editMode); setConfirmDelete(false); }} className="p-2 rounded-md hover:bg-[oklch(0.92_0.012_78)] transition-colors" title="Edit donor">
              <Edit2 size={15} style={{ color: 'oklch(0.52 0.022 65)' }} />
            </button>
            <button onClick={() => { setConfirmDelete(!confirmDelete); setEditMode(false); }} className="p-2 rounded-md hover:bg-[oklch(0.95_0.08_27)] transition-colors" title="Delete donor">
              <Trash2 size={15} style={{ color: 'oklch(0.55 0.20 27)' }} />
            </button>
            <button onClick={onClose} className="p-2 rounded-md hover:bg-[oklch(0.92_0.012_78)] transition-colors">
              <X size={16} style={{ color: 'oklch(0.52 0.022 65)' }} />
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-6">

          {/* Delete confirmation */}
          {confirmDelete && (
            <div className="p-4 rounded-lg border-2 border-[oklch(0.55_0.20_27)] bg-[oklch(0.97_0.04_27)]">
              <div className="flex items-start gap-3">
                <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" style={{ color: 'oklch(0.45 0.20 27)' }} />
                <div className="flex-1">
                  <p className="text-sm font-medium mb-1" style={{ color: 'oklch(0.30 0.18 27)' }}>
                    Delete {donor.name}?
                  </p>
                  <p className="text-xs mb-3" style={{ color: 'oklch(0.45 0.18 27)' }}>
                    This will permanently remove this donor and all their activity history. This cannot be undone.
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleDelete} style={{ background: 'oklch(0.45 0.20 27)', color: 'white' }}>
                      Yes, delete permanently
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setConfirmDelete(false)}>Cancel</Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* February tax receipt alert */}
          {IS_FEBRUARY && !donor.taxReceiptSent && (
            <div className="flex items-center gap-3 p-3 rounded-lg border border-[oklch(0.75_0.14_88)] bg-[oklch(0.97_0.06_88)]">
              <Receipt size={15} style={{ color: 'oklch(0.45 0.14 88)' }} />
              <div className="flex-1">
                <span className="text-sm font-medium" style={{ color: 'oklch(0.35 0.14 88)' }}>
                  Tax receipt for {CURRENT_YEAR - 1} not yet sent
                </span>
                <span className="text-xs ml-2" style={{ color: 'oklch(0.50 0.12 88)' }}>February action required</span>
              </div>
              <button
                onClick={() => updateDonor(donor.id, { taxReceiptSent: true })}
                className="text-xs px-2 py-1 rounded font-medium border border-[oklch(0.65_0.14_88)] hover:bg-[oklch(0.92_0.08_88)] transition-colors"
                style={{ color: 'oklch(0.35 0.14 88)' }}
              >
                Mark sent
              </button>
            </div>
          )}
          {IS_FEBRUARY && donor.taxReceiptSent && (
            <div className="flex items-center gap-2 p-3 rounded-lg border border-[oklch(0.75_0.08_145)] bg-[oklch(0.95_0.05_145)]">
              <Check size={14} style={{ color: 'oklch(0.45 0.13 145)' }} />
              <span className="text-sm" style={{ color: 'oklch(0.35 0.13 145)' }}>
                Tax receipt for {CURRENT_YEAR - 1} sent ✓
              </span>
            </div>
          )}

          {(!donor.email || !donor.phone || !donor.address) && (
            <div className="flex items-start gap-2 p-3 rounded-lg border border-[oklch(0.82_0.11_88)] bg-[oklch(0.97_0.05_88)]">
              <span className="relative inline-flex flex-shrink-0 mt-0.5">
                <ContactRound size={14} style={{ color: 'oklch(0.53 0.075 78)' }} />
                <span aria-hidden="true" className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full" style={{ background: 'oklch(0.62 0.10 82)' }} />
              </span>
              <div>
                <p className="text-xs font-medium" style={{ color: 'oklch(0.38 0.075 75)' }}>Incomplete contact information</p>
                <p className="text-xs mt-0.5" style={{ color: 'oklch(0.50 0.06 78)' }}>
                  Missing: {[!donor.email && 'email', !donor.phone && 'phone', !donor.address && 'address'].filter(Boolean).join(', ')}. Click the edit icon above to add the missing details.
                </p>
              </div>
            </div>
          )}

          <ThankYouLetterControl
            donorId={donor.id}
            tasks={liveTasks}
            hasCurrentYearDonation={totalThisYear > 0}
          />

          {/* Contact info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {donor.address && (
              <div className="flex items-start gap-2">
                <MapPin size={13} className="mt-0.5 flex-shrink-0" style={{ color: 'oklch(0.62 0.012 65)' }} />
                <span className="text-sm" style={{ color: 'oklch(0.40 0.018 55)' }}>{donor.address}</span>
              </div>
            )}
            {donor.phone && (
              <div className="flex items-center gap-2">
                <Phone size={13} style={{ color: 'oklch(0.62 0.012 65)' }} />
                <span className="text-sm" style={{ color: 'oklch(0.40 0.018 55)' }}>{donor.phone}</span>
              </div>
            )}
            {donor.email && (
              <div className="flex items-center gap-2">
                <Mail size={13} style={{ color: 'oklch(0.62 0.012 65)' }} />
                <a href={`mailto:${donor.email}`} className="text-sm hover:underline" style={{ color: 'oklch(0.40 0.018 55)' }}>{donor.email}</a>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Calendar size={13} style={{ color: 'oklch(0.62 0.012 65)' }} />
              <span className="text-sm" style={{ color: 'oklch(0.40 0.018 55)' }}>Since {formatDate(donor.startDate)}</span>
            </div>
          </div>

          {/* Keeps the edit form directly after contact information, above donations. */}
          <div id={`donor-edit-anchor-${donor.id}`} className="contents" />

          {/* ── DONATION HISTORY — prominent, top position ── */}
          <div className="rounded-xl border-2 border-[oklch(0.80_0.018_55)] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3" style={{ background: 'oklch(0.22 0.018 55)' }}>
              <h3 className="font-display text-lg" style={{ color: 'oklch(0.96 0.008 75)' }}>Donation History</h3>
            </div>
            <div className="p-4 space-y-3" style={{ background: 'oklch(0.985 0.008 80)' }}>
              {/* Add donation — button toggles form */}
              <div className="mb-1">
                <Button size="sm" onClick={() => setShowAddDonation(v => !v)} style={{ background: 'oklch(0.22 0.018 55)', color: 'oklch(0.96 0.008 75)' }}>
                  <Plus size={13} className="mr-1" /> {showAddDonation ? 'Cancel' : 'Add Donation'}
                </Button>
              </div>
              {showAddDonation && (
                <div className="flex gap-2 flex-wrap items-end p-3 rounded-lg border border-[oklch(0.84_0.018_75)] bg-[oklch(0.97_0.008_80)] mb-2">
                  <div>
                    <label className="text-xs mb-1 block" style={{ color: 'oklch(0.52 0.022 65)' }}>Amount ($)</label>
                    <Input type="number" value={newDonationAmount} onChange={e => setNewDonationAmount(e.target.value)} placeholder="e.g. 10000" className="text-sm w-32" min={0} autoFocus />
                  </div>
                  <div>
                    <label className="text-xs mb-1 block" style={{ color: 'oklch(0.52 0.022 65)' }}>Date</label>
                    <Input type="date" value={newDonationDate} onChange={e => setNewDonationDate(e.target.value)} className="text-sm w-36" />
                  </div>
                  <div className="flex-1 min-w-[120px]">
                    <label className="text-xs mb-1 block" style={{ color: 'oklch(0.52 0.022 65)' }}>Note (optional)</label>
                    <Input value={newDonationNote} onChange={e => setNewDonationNote(e.target.value)} placeholder="e.g. Annual gift" className="text-sm" />
                  </div>
                  <Button size="sm" onClick={async () => { await handleAddDonation(); setShowAddDonation(false); }} disabled={!newDonationAmount || parseFloat(newDonationAmount) <= 0} style={{ background: 'oklch(0.56 0.13 145)', color: 'white' }}>
                    Save
                  </Button>
                </div>
              )}
              {/* Donation list */}
              {donations3yr.length === 0 ? (
                <p className="text-sm italic py-1" style={{ color: 'oklch(0.62 0.012 65)' }}>No donations recorded yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {visibleDonations.map(entry => (
                    <div key={entry.id} className="flex items-center justify-between px-3 py-2 rounded-lg border border-[oklch(0.88_0.018_75)] bg-white group">
                      <div className="flex items-center gap-3">
                        <DollarSign size={13} style={{ color: 'oklch(0.56 0.13 145)' }} />
                        <div>
                          <span className="text-sm font-semibold" style={{ color: 'oklch(0.22 0.018 55)' }}>{formatCurrency(entry.amount)}</span>
                          {entry.note && <span className="text-xs ml-2" style={{ color: 'oklch(0.52 0.022 65)' }}>{entry.note}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs" style={{ color: 'oklch(0.62 0.012 65)' }}>{formatDate(entry.date)}</span>
                        <button onClick={() => handleRemoveDonation(entry.id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-[oklch(0.95_0.08_27)]">
                          <Trash2 size={11} style={{ color: 'oklch(0.55 0.20 27)' }} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {donations3yr.length > 5 && (
                    <button onClick={() => setShowAllDonations(!showAllDonations)} className="flex items-center gap-1 text-xs mt-1 hover:underline" style={{ color: 'oklch(0.52 0.022 65)' }}>
                      {showAllDonations ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      {showAllDonations ? 'Show less' : `Show ${donations3yr.length - 5} more`}
                    </button>
                  )}
                  <div className="pt-2 border-t border-[oklch(0.88_0.018_75)] mt-1 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-xs" style={{ color: 'oklch(0.62 0.012 65)' }}>{CURRENT_YEAR} total</span>
                      <span className="text-xs font-medium" style={{ color: 'oklch(0.22 0.018 55)' }}>{totalThisYear > 0 ? formatCurrency(totalThisYear) : '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs font-medium" style={{ color: 'oklch(0.52 0.022 65)' }}>All-time total</span>
                      <span className="text-sm font-display font-semibold" style={{ color: 'oklch(0.22 0.018 55)' }}>{formatCurrency(totalAll)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Key metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg border border-[oklch(0.84_0.018_75)] bg-[oklch(0.965_0.012_80)]">
              <div className="text-xs uppercase tracking-widest mb-1" style={{ color: 'oklch(0.62 0.012 65)' }}>Next Contact</div>
              <div className={cn('font-display text-xl', overdue ? 'text-[oklch(0.45_0.20_27)]' : '')} style={!overdue ? { color: 'oklch(0.22 0.018 55)' } : {}}>
                {nextDate ? (overdue ? `${Math.abs(daysLeft)} days overdue` : formatDate(nextDate)) : '—'}
              </div>
              {!editMode && (
                <div className="mt-2 pt-2 border-t border-[oklch(0.88_0.018_75)]">
                  {donor.nextAction ? (
                    <p className="text-xs italic" style={{ color: 'oklch(0.40 0.018 55)' }}>{donor.nextAction}</p>
                  ) : (
                    <InlineNextAction donorId={donor.id} existingTasks={donor.completedTasks ?? []} />
                  )}
                </div>
              )}
            </div>
            <div className="p-3 rounded-lg border border-[oklch(0.84_0.018_75)] bg-[oklch(0.965_0.012_80)]">
              <div className="text-xs uppercase tracking-widest mb-1" style={{ color: 'oklch(0.62 0.012 65)' }}>Cadence</div>
              <div className="font-display text-xl" style={{ color: 'oklch(0.22 0.018 55)' }}>every {Math.round(donor.cadenceDays / 30)} month{Math.round(donor.cadenceDays / 30) !== 1 ? 's' : ''}</div>
            </div>
            <div className="p-3 rounded-lg border border-[oklch(0.84_0.018_75)] bg-[oklch(0.965_0.012_80)]">
              <div className="text-xs uppercase tracking-widest mb-1" style={{ color: 'oklch(0.62 0.012 65)' }}>Type</div>
              <div className="font-display text-xl" style={{ color: 'oklch(0.22 0.018 55)' }}>{donorTypeLabel(donor.type)}</div>
            </div>
          </div>

          {/* Recurring gift info */}
          {donor.type === 'recurring' && donor.recurringAmount && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-[oklch(0.965_0.012_80)] border border-[oklch(0.84_0.018_75)]">
              <RefreshCw size={13} style={{ color: 'oklch(0.62 0.012 65)' }} />
              <span className="text-sm" style={{ color: 'oklch(0.40 0.018 55)' }}>
                Recurring gift: <strong>{formatCurrency(donor.recurringAmount)} × {donor.recurringFrequency === 'monthly' ? '12' : '1'} = {formatCurrency(donor.recurringFrequency === 'monthly' ? donor.recurringAmount * 12 : donor.recurringAmount)}</strong> expected annually
              </span>
            </div>
          )}

          {/* Flags row */}
          {!editMode ? (
            <div className="flex flex-wrap gap-2">
              {/* Narú Circle — one-tap toggle */}
              <button onClick={() => updateDonor(donor.id, { naruCircle: !donor.naruCircle })} className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border cursor-pointer transition-colors',
                donor.naruCircle ? 'bg-[oklch(0.88_0.14_145)] border-[oklch(0.78_0.14_145)] text-[oklch(0.28_0.12_145)]' : 'bg-[oklch(0.92_0.012_78)] border-[oklch(0.84_0.018_75)] text-[oklch(0.62_0.012_65)]'
              )}>
                <Star size={10} /> Narú Circle: {donor.naruCircle ? 'Yes' : 'No'}
              </button>
              {/* Donor Trip — tap to open trip selector */}
              <TripToggle donor={donor} trips={dashStore.trips} onUpdate={updateDonor} />
              {/* Newsletter — one-tap toggle */}
              <button onClick={() => updateDonor(donor.id, { newsletterSubscribed: !donor.newsletterSubscribed })} className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border cursor-pointer transition-colors',
                donor.newsletterSubscribed
                  ? 'bg-[oklch(0.88_0.14_145)] border-[oklch(0.78_0.14_145)] text-[oklch(0.28_0.12_145)]'
                  : 'bg-[oklch(0.92_0.012_78)] border-[oklch(0.84_0.018_75)] text-[oklch(0.62_0.012_65)]'
              )}>
                <Mail size={10} /> Newsletter: {donor.newsletterSubscribed ? 'Subscribed' : 'Not added'}
              </button>
              {donor.manuallyInactive && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border bg-[oklch(0.92_0.005_65)] border-[oklch(0.80_0.005_65)] text-[oklch(0.45_0.012_65)]">
                  Marked Inactive
                </span>
              )}
              {donor.contractEndDate && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border bg-[oklch(0.92_0.012_78)] border-[oklch(0.84_0.018_75)] text-[oklch(0.52_0.022_65)]">
                  <Clock size={10} /> Contract ends {formatDate(donor.contractEndDate)}
                </span>
              )}
            </div>
          ) : createPortal(
            <div className="p-4 rounded-lg border border-[oklch(0.84_0.018_75)] bg-[oklch(0.965_0.012_80)] space-y-4">
              <p className="text-xs uppercase tracking-widest" style={{ color: 'oklch(0.52 0.022 65)' }}>Edit Donor Details</p>
              {/* Contact fields */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs mb-1 block" style={{ color: 'oklch(0.52 0.022 65)' }}>Donor / Organization Name</label>
                  <Input value={editFields.name} onChange={e => setEditFields(f => ({ ...f, name: e.target.value }))} className="text-sm" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs mb-1 block" style={{ color: 'oklch(0.52 0.022 65)' }}>Contact Name</label>
                  <Input value={editFields.contactName} onChange={e => setEditFields(f => ({ ...f, contactName: e.target.value }))} className="text-sm" />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'oklch(0.52 0.022 65)' }}>Email</label>
                  <Input type="email" value={editFields.email} onChange={e => setEditFields(f => ({ ...f, email: e.target.value }))} className="text-sm" />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'oklch(0.52 0.022 65)' }}>Phone</label>
                  <Input value={editFields.phone} onChange={e => setEditFields(f => ({ ...f, phone: e.target.value }))} className="text-sm" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs mb-1 block" style={{ color: 'oklch(0.52 0.022 65)' }}>Address</label>
                  <Input value={editFields.address} onChange={e => setEditFields(f => ({ ...f, address: e.target.value }))} className="text-sm" />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'oklch(0.52 0.022 65)' }}>Start Date</label>
                  <Input type="date" value={editFields.startDate} onChange={e => setEditFields(f => ({ ...f, startDate: e.target.value }))} className="text-sm" />
                </div>
              </div>
              <div className="col-span-2">
                <label className="text-xs mb-1 block" style={{ color: 'oklch(0.52 0.022 65)' }}>Referred / Connected by</label>
              <Input value={editFields.referredBy} onChange={e => setEditFields(f => ({ ...f, referredBy: e.target.value }))} placeholder="e.g. Brenley, or a mutual contact's name" className="text-sm" />
            </div>
            <div className="col-span-2">
              <label className="text-xs mb-1 block" style={{ color: 'oklch(0.52 0.022 65)' }}>
                Next Action <span className="font-normal italic">(auto-clears when you log an interaction)</span>
              </label>
              <Input value={editFields.nextAction} onChange={e => setEditFields(f => ({ ...f, nextAction: e.target.value }))} placeholder="e.g. Send impact photos, schedule a call…" className="text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editFields.naruCircle} onChange={e => setEditFields(f => ({ ...f, naruCircle: e.target.checked }))} />
                  <span className="text-sm" style={{ color: 'oklch(0.22 0.018 55)' }}>Narú Circle</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editFields.donorTrip} onChange={e => setEditFields(f => ({ ...f, donorTrip: e.target.checked }))} />
                  <span className="text-sm" style={{ color: 'oklch(0.22 0.018 55)' }}>Donor Trip</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editFields.taxReceiptSent} onChange={e => setEditFields(f => ({ ...f, taxReceiptSent: e.target.checked }))} />
                  <span className="text-sm" style={{ color: 'oklch(0.22 0.018 55)' }}>Tax Receipt Sent ({CURRENT_YEAR})</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editFields.newsletterSubscribed} onChange={e => setEditFields(f => ({ ...f, newsletterSubscribed: e.target.checked }))} />
                  <span className="text-sm" style={{ color: 'oklch(0.22 0.018 55)' }}>Added to Newsletter</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer col-span-2">
                  <input type="checkbox" checked={editFields.manuallyInactive} onChange={e => setEditFields(f => ({ ...f, manuallyInactive: e.target.checked }))} />
                  <span className="text-sm" style={{ color: 'oklch(0.22 0.018 55)' }}>
                    Mark as Inactive
                    <span className="ml-1 font-normal text-xs" style={{ color: 'oklch(0.62 0.012 65)' }}>(overrides auto-status)</span>
                  </span>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'oklch(0.52 0.022 65)' }}>Donor Type</label>
                  <select value={editFields.type} onChange={e => setEditFields(f => ({ ...f, type: e.target.value as any }))} className="w-full text-sm border rounded px-2 py-1.5 bg-white border-[oklch(0.84_0.018_75)]">
                    <option value="recurring">Recurring</option>
                    <option value="potentially-recurring">Potentially Recurring</option>
                    <option value="potential">Potential Donor</option>
                    <option value="one-time">One-time</option>
                    <option value="past">Past</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'oklch(0.52 0.022 65)' }}>Tier</label>
                  <select value={editFields.tier} onChange={e => setEditFields(f => ({ ...f, tier: e.target.value as any }))} className="w-full text-sm border rounded px-2 py-1.5 bg-white border-[oklch(0.84_0.018_75)]">
                    {TIER_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                {editFields.type === 'recurring' && (
                  <>
                    <div>
                      <label className="text-xs mb-1 block" style={{ color: 'oklch(0.52 0.022 65)' }}>Recurring Amount ($)</label>
                      <Input type="number" value={editFields.recurringAmount} onChange={e => setEditFields(f => ({ ...f, recurringAmount: e.target.value }))} placeholder="e.g. 5000" className="text-sm" />
                    </div>
                    <div>
                      <label className="text-xs mb-1 block" style={{ color: 'oklch(0.52 0.022 65)' }}>Frequency</label>
                      <select value={editFields.recurringFrequency} onChange={e => setEditFields(f => ({ ...f, recurringFrequency: e.target.value as any }))} className="w-full text-sm border rounded px-2 py-1.5 bg-white border-[oklch(0.84_0.018_75)]">
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                    </div>
                  </>
                )}
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'oklch(0.52 0.022 65)' }}>Communication cadence (months)</label>
                  <Input type="number" value={Math.round(editFields.cadenceDays / 30)} onChange={e => setEditFields(f => ({ ...f, cadenceDays: Number(e.target.value) * 30 }))} className="text-sm" min={1} />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'oklch(0.52 0.022 65)' }}>Contract End Date</label>
                  <Input type="date" value={editFields.contractEndDate} onChange={e => setEditFields(f => ({ ...f, contractEndDate: e.target.value }))} className="text-sm" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs mb-1 block" style={{ color: 'oklch(0.52 0.022 65)' }}>Cadence Description</label>
                  <Input value={editFields.cadenceDescription} onChange={e => setEditFields(f => ({ ...f, cadenceDescription: e.target.value }))} className="text-sm" />
                </div>
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'oklch(0.52 0.022 65)' }}>Internal Notes</label>
                <Textarea value={editFields.notes} onChange={e => setEditFields(f => ({ ...f, notes: e.target.value }))} rows={2} className="text-sm" />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveEdit} style={{ background: 'oklch(0.22 0.018 55)', color: 'oklch(0.96 0.008 75)' }}>
                  <Check size={13} className="mr-1" /> Save Changes
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditMode(false)}>Cancel</Button>
              </div>
            </div>, document.getElementById(`donor-edit-anchor-${donor.id}`) ?? document.body
          )}

          {/* Cadence info */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-[oklch(0.965_0.012_80)] border border-[oklch(0.84_0.018_75)]">
            <RefreshCw size={13} className="mt-0.5 flex-shrink-0" style={{ color: 'oklch(0.62 0.012 65)' }} />
            <div>
              <span className="text-xs uppercase tracking-widest" style={{ color: 'oklch(0.62 0.012 65)' }}>every {Math.round(donor.cadenceDays / 30)} month{Math.round(donor.cadenceDays / 30) !== 1 ? 's' : ''}: </span>
              <span className="text-sm" style={{ color: 'oklch(0.22 0.018 55)' }}>{donor.cadenceDescription || '—'}</span>
            </div>
          </div>

          {/* Internal notes */}
          {donor.notes && (
            <div className="p-3 rounded-lg bg-[oklch(0.965_0.012_80)] border border-[oklch(0.84_0.018_75)]">
              <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'oklch(0.62 0.012 65)' }}>Notes</p>
              <p className="text-sm" style={{ color: 'oklch(0.40 0.018 55)' }}>{donor.notes}</p>
            </div>
          )}

          {donor.referredBy && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-[oklch(0.965_0.012_80)] border border-[oklch(0.84_0.018_75)]">
              <span className="text-xs uppercase tracking-widest flex-shrink-0" style={{ color: 'oklch(0.62 0.012 65)' }}>Referred / Connected by:</span>
              <span className="text-sm" style={{ color: 'oklch(0.22 0.018 55)' }}>{donor.referredBy}</span>
            </div>
          )}

          {/* ── Donor Journey / Activity Log ── */}
          <DonorJourney donor={donor} currentUser={currentUser ?? undefined} liveActivities={liveActivities} liveTasks={liveTasks} onActivityAdded={() => detailsQuery.refetch()} onTaskCompleted={() => detailsQuery.refetch()} openLogInteraction={initialFocus === 'log-interaction'} />

        </div>
      </div>
    </div>
  );
}
