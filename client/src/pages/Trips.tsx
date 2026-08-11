// THV Donor Dashboard — Trips Page
// Shows upcoming and past trips with team + donor attendees
import { trpc } from '@/lib/trpc';

import { useState } from 'react';
import { useDashboard } from '@/contexts/DashboardContext';
import { formatDate, cn } from '@/lib/utils';
import { Trip, TripAttendee } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Plane, Calendar, Users, X, Edit2, Check, Trash2, Mail, Phone, ChevronDown, ChevronUp } from 'lucide-react';
import { nanoid } from 'nanoid';

const SKILLS = ['Medical', 'Nurse', 'Doctor', 'OB', 'Radiology', 'Teaching', 'Translation', 'Photography', 'Volunteer'];
const TEAM_MEMBERS = ['Liz', 'Lauren', 'Anna', 'Brenley', 'Emily', 'Amy', 'Kirsten'];

function AttendeeSection({ trip }: { trip: Trip }) {
  const [showAdd, setShowAdd] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', skills: [] as string[], isTeen: false, speaksSpanish: false, confirmed: false, purchasedTicket: false, knowsAtTHV: [] as string[], knowsOther: '', notes: '' });
  const attendees = trip.attendees ?? [];
  const utils = trpc.useUtils();

  const addAttendeeMut = trpc.trips.addAttendee.useMutation({ onSuccess: () => utils.trips.list.invalidate() });
  const updateAttendeeMut = trpc.trips.updateAttendee.useMutation({ onSuccess: () => utils.trips.list.invalidate() });
  const deleteAttendeeMut = trpc.trips.deleteAttendee.useMutation({ onSuccess: () => utils.trips.list.invalidate() });
  const [editingAttendeeId, setEditingAttendeeId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '', skills: [] as string[], isTeen: false, speaksSpanish: false, confirmed: false, purchasedTicket: false, knowsAtTHV: [] as string[], knowsOther: '', notes: '' });

  const startEditAttendee = (a: TripAttendee) => {
    setEditingAttendeeId(a.id);
    setEditForm({ name: a.name, email: a.email ?? '', phone: a.phone ?? '', skills: a.skills ?? [], isTeen: !!a.isTeen, speaksSpanish: !!a.speaksSpanish, confirmed: !!a.confirmed, purchasedTicket: !!a.purchasedTicket, knowsAtTHV: a.knowsAtTHV ?? [], knowsOther: '', notes: a.notes ?? '' });
  };

  const handleSaveEdit = async (id: string) => {
    const knowsAll = [...editForm.knowsAtTHV, ...(editForm.knowsOther.trim() ? [editForm.knowsOther.trim()] : [])];
    await updateAttendeeMut.mutateAsync({ id, name: editForm.name, email: editForm.email || undefined, phone: editForm.phone || undefined, skills: editForm.skills, isTeen: editForm.isTeen, speaksSpanish: editForm.speaksSpanish, confirmed: editForm.confirmed, purchasedTicket: editForm.purchasedTicket, knowsAtTHV: knowsAll, notes: editForm.notes || undefined });
    setEditingAttendeeId(null);
  };

  const toggleEditSkill = (s: string) => setEditForm(f => ({ ...f, skills: f.skills.includes(s) ? f.skills.filter(x => x !== s) : [...f.skills, s] }));
  const toggleEditKnows = (name: string) => setEditForm(f => ({ ...f, knowsAtTHV: f.knowsAtTHV.includes(name) ? f.knowsAtTHV.filter(x => x !== name) : [...f.knowsAtTHV, name] }));

  const toggleSkill = (s: string) => setForm(f => ({
    ...f, skills: f.skills.includes(s) ? f.skills.filter(x => x !== s) : [...f.skills, s]
  }));

  const toggleKnows = (name: string) => setForm(f => ({
    ...f, knowsAtTHV: f.knowsAtTHV.includes(name) ? f.knowsAtTHV.filter(x => x !== name) : [...f.knowsAtTHV, name]
  }));

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    const knowsAll = [...form.knowsAtTHV, ...(form.knowsOther.trim() ? [form.knowsOther.trim()] : [])];
    await addAttendeeMut.mutateAsync({
      tripId: trip.id,
      name: form.name.trim(),
      email: form.email || undefined,
      phone: form.phone || undefined,
      skills: form.skills,
      isTeen: form.isTeen || undefined,
      speaksSpanish: form.speaksSpanish || undefined,
      confirmed: form.confirmed || undefined,
      purchasedTicket: form.purchasedTicket || undefined,
      knowsAtTHV: knowsAll.length ? knowsAll : undefined,
      notes: form.notes || undefined,
    });
    setForm({ name: '', email: '', phone: '', skills: [], isTeen: false, speaksSpanish: false, confirmed: false, purchasedTicket: false, knowsAtTHV: [], knowsOther: '', notes: '' });
    setShowAdd(false);
  };

  const handleDelete = async (id: string) => { await deleteAttendeeMut.mutateAsync({ id }); };

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs uppercase tracking-widest" style={{ color: 'oklch(0.62 0.012 65)' }}>Trip Attendees ({attendees.length})</p>
        <button onClick={() => setShowAdd(!showAdd)} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border" style={{ color: 'oklch(0.50 0.18 250)', borderColor: 'oklch(0.75 0.12 250)', background: 'oklch(0.96 0.04 250)' }}>
          <Plus size={10} /> Add attendee
        </button>
      </div>
      {showAdd && (
        <div className="mb-3 p-3 rounded-lg border border-[oklch(0.75_0.12_250)] bg-[oklch(0.97_0.03_250)] space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2">
              <label className="text-xs mb-0.5 block" style={{ color: 'oklch(0.52 0.022 65)' }}>Name *</label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="text-sm h-8" placeholder="Full name" />
            </div>
            <div>
              <label className="text-xs mb-0.5 block" style={{ color: 'oklch(0.52 0.022 65)' }}>Email</label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="text-sm h-8" />
            </div>
            <div>
              <label className="text-xs mb-0.5 block" style={{ color: 'oklch(0.52 0.022 65)' }}>Phone</label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="text-sm h-8" />
            </div>
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'oklch(0.52 0.022 65)' }}>Skills</label>
            <div className="flex flex-wrap gap-1.5">
              {SKILLS.map(s => (
                <button key={s} type="button" onClick={() => toggleSkill(s)} className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${form.skills.includes(s) ? 'bg-[oklch(0.22_0.018_55)] text-[oklch(0.96_0.008_75)] border-[oklch(0.22_0.018_55)]' : 'bg-white border-[oklch(0.84_0.018_75)] text-[oklch(0.52_0.022_65)]'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: 'oklch(0.22 0.018 55)' }}>
              <input type="checkbox" checked={form.isTeen} onChange={e => setForm(f => ({ ...f, isTeen: e.target.checked }))} />
              Teen
            </label>
            <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: 'oklch(0.22 0.018 55)' }}>
              <input type="checkbox" checked={form.speaksSpanish} onChange={e => setForm(f => ({ ...f, speaksSpanish: e.target.checked }))} />
              Speaks Spanish
            </label>
            <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: 'oklch(0.22 0.018 55)' }}>
              <input type="checkbox" checked={form.confirmed} onChange={e => setForm(f => ({ ...f, confirmed: e.target.checked }))} />
              Confirmed
            </label>
            <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: 'oklch(0.22 0.018 55)' }}>
              <input type="checkbox" checked={form.purchasedTicket} onChange={e => setForm(f => ({ ...f, purchasedTicket: e.target.checked }))} />
              Purchased Ticket
            </label>
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'oklch(0.52 0.022 65)' }}>Who do they know at THV?</label>
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              {TEAM_MEMBERS.map(m => (
                <button key={m} type="button" onClick={() => toggleKnows(m)} className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${form.knowsAtTHV.includes(m) ? 'bg-[oklch(0.50_0.18_250)] text-white border-[oklch(0.50_0.18_250)]' : 'bg-white border-[oklch(0.84_0.018_75)] text-[oklch(0.52_0.022_65)]'}`}>
                  {m}
                </button>
              ))}
            </div>
            <Input value={form.knowsOther} onChange={e => setForm(f => ({ ...f, knowsOther: e.target.value }))} placeholder="Other (type a name)" className="text-sm h-8" />
          </div>
          <div>
            <label className="text-xs mb-0.5 block" style={{ color: 'oklch(0.52 0.022 65)' }}>Notes</label>
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="text-sm" />
          </div>
          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={handleAdd} disabled={!form.name.trim()} style={{ background: 'oklch(0.22 0.018 55)', color: 'oklch(0.96 0.008 75)' }}>Save Attendee</Button>
            <Button size="sm" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </div>
      )}
      {attendees.length === 0 && !showAdd && (
        <p className="text-xs italic" style={{ color: 'oklch(0.72 0.012 65)' }}>No attendees added yet.</p>
      )}
      <div className="space-y-2">
        {attendees.map(a => (
          <div key={a.id} className="rounded-lg border border-[oklch(0.88_0.018_75)] bg-white overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 cursor-pointer" onClick={() => setExpanded(expanded === a.id ? null : a.id)}>
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-medium truncate" style={{ color: 'oklch(0.22 0.018 55)' }}>{a.name}</span>
                {a.isTeen && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-[oklch(0.88_0.12_250)] text-[oklch(0.30_0.18_250)]">Teen</span>}
                {a.speaksSpanish && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-[oklch(0.88_0.12_145)] text-[oklch(0.28_0.12_145)]">ES</span>}
                {a.confirmed && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-[oklch(0.88_0.14_145)] text-[oklch(0.28_0.14_145)]">✓ Confirmed</span>}
                {a.purchasedTicket && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-[oklch(0.88_0.10_250)] text-[oklch(0.28_0.18_250)]">🎫 Ticket</span>}
                {a.skills.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {a.skills.map(s => <span key={s} className="text-[10px] px-1.5 py-0.5 rounded-full bg-[oklch(0.88_0.022_72)] text-[oklch(0.28_0.018_55)]">{s}</span>)}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={e => { e.stopPropagation(); handleDelete(a.id); }} className="p-1 rounded hover:bg-red-50"><Trash2 size={11} style={{ color: 'oklch(0.55 0.20 27)' }} /></button>
                {expanded === a.id ? <ChevronUp size={13} style={{ color: 'oklch(0.62 0.012 65)' }} /> : <ChevronDown size={13} style={{ color: 'oklch(0.62 0.012 65)' }} />}
              </div>
            </div>
            {expanded === a.id && (
              <div className="px-3 pb-3 pt-1 border-t border-[oklch(0.92_0.012_78)] space-y-1.5">
                {editingAttendeeId === a.id ? (
                  <div className="space-y-2 pt-1">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="col-span-2"><label className="text-xs mb-0.5 block" style={{ color: 'oklch(0.52 0.022 65)' }}>Name</label><Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="text-sm h-8" /></div>
                      <div><label className="text-xs mb-0.5 block" style={{ color: 'oklch(0.52 0.022 65)' }}>Email</label><Input value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} className="text-sm h-8" /></div>
                      <div><label className="text-xs mb-0.5 block" style={{ color: 'oklch(0.52 0.022 65)' }}>Phone</label><Input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} className="text-sm h-8" /></div>
                    </div>
                    <div><label className="text-xs mb-1 block" style={{ color: 'oklch(0.52 0.022 65)' }}>Skills</label><div className="flex flex-wrap gap-1.5">{SKILLS.map(s => <button key={s} type="button" onClick={() => toggleEditSkill(s)} className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${editForm.skills.includes(s) ? 'bg-[oklch(0.22_0.018_55)] text-[oklch(0.96_0.008_75)] border-[oklch(0.22_0.018_55)]' : 'bg-white border-[oklch(0.84_0.018_75)] text-[oklch(0.52_0.022_65)]'}`}>{s}</button>)}</div></div>
                    <div className="flex flex-wrap gap-4">
                      {[['isTeen','Teen'],['speaksSpanish','Speaks Spanish'],['confirmed','Confirmed'],['purchasedTicket','Purchased Ticket']].map(([key, label]) => (
                        <label key={key} className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: 'oklch(0.22 0.018 55)' }}>
                          <input type="checkbox" checked={(editForm as any)[key]} onChange={e => setEditForm(f => ({ ...f, [key]: e.target.checked }))} />{label}
                        </label>
                      ))}
                    </div>
                    <div><label className="text-xs mb-1 block" style={{ color: 'oklch(0.52 0.022 65)' }}>Who do they know at THV?</label><div className="flex flex-wrap gap-1.5 mb-1.5">{TEAM_MEMBERS.map(m => <button key={m} type="button" onClick={() => toggleEditKnows(m)} className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${editForm.knowsAtTHV.includes(m) ? 'bg-[oklch(0.50_0.18_250)] text-white border-[oklch(0.50_0.18_250)]' : 'bg-white border-[oklch(0.84_0.018_75)] text-[oklch(0.52_0.022_65)]'}`}>{m}</button>)}</div><Input value={editForm.knowsOther} onChange={e => setEditForm(f => ({ ...f, knowsOther: e.target.value }))} placeholder="Other (type a name)" className="text-sm h-8" /></div>
                    <div><label className="text-xs mb-0.5 block" style={{ color: 'oklch(0.52 0.022 65)' }}>Notes</label><Textarea value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="text-sm" /></div>
                    <div className="flex gap-2"><Button size="sm" onClick={() => handleSaveEdit(a.id)} style={{ background: 'oklch(0.22 0.018 55)', color: 'oklch(0.96 0.008 75)' }}>Save</Button><Button size="sm" variant="outline" onClick={() => setEditingAttendeeId(null)}>Cancel</Button></div>
                  </div>
                ) : (
                  <>
                    {a.email && <div className="flex items-center gap-2 text-xs"><Mail size={11} style={{ color: 'oklch(0.62 0.012 65)' }} /><span style={{ color: 'oklch(0.40 0.018 55)' }}>{a.email}</span></div>}
                    {a.phone && <div className="flex items-center gap-2 text-xs"><Phone size={11} style={{ color: 'oklch(0.62 0.012 65)' }} /><span style={{ color: 'oklch(0.40 0.018 55)' }}>{a.phone}</span></div>}
                    {a.skills.length > 0 && <div className="flex flex-wrap gap-1 pt-0.5">{a.skills.map(s => <span key={s} className="text-[10px] px-1.5 py-0.5 rounded-full bg-[oklch(0.88_0.022_72)] text-[oklch(0.28_0.018_55)]">{s}</span>)}</div>}
                    {a.knowsAtTHV && a.knowsAtTHV.length > 0 && <p className="text-xs" style={{ color: 'oklch(0.52 0.022 65)' }}>Knows: {a.knowsAtTHV.join(', ')}</p>}
                    {a.notes && <p className="text-xs italic" style={{ color: 'oklch(0.52 0.022 65)' }}>{a.notes}</p>}
                    <button onClick={() => startEditAttendee(a)} className="text-xs mt-1" style={{ color: 'oklch(0.50 0.18 250)' }}>Edit</button>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}


export default function Trips() {
  const { store, addTrip, updateTrip, deleteTrip } = useDashboard();
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];
  const upcoming = store.trips.filter(t => (t.endDate ?? t.startDate) >= today).sort((a, b) => a.startDate.localeCompare(b.startDate));
  const past = store.trips.filter(t => (t.endDate ?? t.startDate) < today).sort((a, b) => b.startDate.localeCompare(a.startDate));

  const getDonorName = (id: string) => store.donors.find(d => d.id === id)?.name ?? id;

  return (
    <div className="p-6 lg:p-8 max-w-[900px]">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-4xl mb-1" style={{ color: 'oklch(0.22 0.018 55)' }}>Trips</h1>
          <p className="text-sm" style={{ color: 'oklch(0.52 0.022 65)' }}>
            {upcoming.length} upcoming · {past.length} past
          </p>
        </div>
        <Button
          onClick={() => setShowAdd(true)}
          style={{ background: 'oklch(0.22 0.018 55)', color: 'oklch(0.96 0.008 75)' }}
          className="flex items-center gap-2"
        >
          <Plus size={15} /> Add Trip
        </Button>
      </div>

      {/* Upcoming */}
      <section className="mb-10">
        <h2 className="font-display text-xl mb-4" style={{ color: 'oklch(0.22 0.018 55)' }}>Upcoming</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm" style={{ color: 'oklch(0.62 0.012 65)' }}>No upcoming trips scheduled.</p>
        ) : (
          <div className="space-y-4">
            {upcoming.map(trip => (
              <TripCard
                key={trip.id}
                trip={trip}
                getDonorName={getDonorName}
                donors={store.donors}
                onEdit={() => setEditId(trip.id)}
                onDelete={() => deleteTrip(trip.id)}
                isEditing={editId === trip.id}
                onSave={(updates) => { updateTrip(trip.id, updates); setEditId(null); }}
                onCancelEdit={() => setEditId(null)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Past */}
      {past.length > 0 && (
        <section>
          <h2 className="font-display text-xl mb-4" style={{ color: 'oklch(0.52 0.022 65)' }}>Past Trips</h2>
          <div className="space-y-4 opacity-70">
            {past.map(trip => (
              <TripCard
                key={trip.id}
                trip={trip}
                getDonorName={getDonorName}
                donors={store.donors}
                onEdit={() => setEditId(trip.id)}
                onDelete={() => deleteTrip(trip.id)}
                isEditing={editId === trip.id}
                onSave={(updates) => { updateTrip(trip.id, updates); setEditId(null); }}
                onCancelEdit={() => setEditId(null)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Add trip modal */}
      {showAdd && <AddTripModal donors={store.donors} onClose={() => setShowAdd(false)} onAdd={addTrip} />}
    </div>
  );
}

interface TripCardProps {
  trip: Trip;
  getDonorName: (id: string) => string;
  donors: any[];
  onEdit: () => void;
  onDelete: () => void;
  isEditing: boolean;
  onSave: (updates: Partial<Trip>) => void;
  onCancelEdit: () => void;
}

function TripCard({ trip, getDonorName, donors, onEdit, onDelete, isEditing, onSave, onCancelEdit }: TripCardProps) {
  const [editFields, setEditFields] = useState({
    name: trip.name,
    startDate: trip.startDate ?? '',
    endDate: trip.endDate ?? '',
    teamMembers: [...trip.teamMembers],
    donorAttendees: [...trip.donorAttendees],
    notes: trip.notes ?? '',
  });

  if (isEditing) {
    return (
      <div className="p-5 rounded-lg border border-[oklch(0.22_0.018_55)] bg-[oklch(0.985_0.008_80)] space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="text-xs mb-1 block" style={{ color: 'oklch(0.52 0.022 65)' }}>Trip Name</label>
            <Input value={editFields.name} onChange={e => setEditFields(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'oklch(0.52 0.022 65)' }}>Start Date</label>
            <Input type="date" value={editFields.startDate} onChange={e => setEditFields(f => ({ ...f, startDate: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'oklch(0.52 0.022 65)' }}>End Date</label>
            <Input type="date" value={editFields.endDate} onChange={e => setEditFields(f => ({ ...f, endDate: e.target.value }))} />
          </div>
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'oklch(0.52 0.022 65)' }}>Team Members</label>
          <div className="flex gap-3 flex-wrap">
            {TEAM_MEMBERS.map(m => (
              <label key={m} className="flex items-center gap-1.5 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={editFields.teamMembers.includes(m)}
                  onChange={e => setEditFields(f => ({
                    ...f,
                    teamMembers: e.target.checked ? [...f.teamMembers, m] : f.teamMembers.filter(x => x !== m)
                  }))}
                />
                {m}
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'oklch(0.52 0.022 65)' }}>Donor Attendees</label>
          <div className="flex gap-3 flex-wrap max-h-32 overflow-y-auto">
            {donors.map(d => (
              <label key={d.id} className="flex items-center gap-1.5 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={editFields.donorAttendees.includes(d.id)}
                  onChange={e => setEditFields(f => ({
                    ...f,
                    donorAttendees: e.target.checked ? [...f.donorAttendees, d.id] : f.donorAttendees.filter(x => x !== d.id)
                  }))}
                />
                {d.name}
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'oklch(0.52 0.022 65)' }}>Notes</label>
          <Textarea value={editFields.notes} onChange={e => setEditFields(f => ({ ...f, notes: e.target.value }))} rows={2} />
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => onSave(editFields)} style={{ background: 'oklch(0.22 0.018 55)', color: 'oklch(0.96 0.008 75)' }}>
            <Check size={13} className="mr-1" /> Save
          </Button>
          <Button size="sm" variant="outline" onClick={onCancelEdit}>Cancel</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 rounded-lg border border-[oklch(0.84_0.018_75)] bg-[oklch(0.985_0.008_80)]">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'oklch(0.22 0.018 55)' }}>
            <Plane size={16} style={{ color: 'oklch(0.96 0.008 75)' }} />
          </div>
          <div>
            <h3 className="font-display text-lg" style={{ color: 'oklch(0.22 0.018 55)' }}>{trip.name}</h3>
            <div className="flex items-center gap-3 text-xs mt-0.5" style={{ color: 'oklch(0.52 0.022 65)' }}>
              <span className="flex items-center gap-1"><Calendar size={11} />{formatDate(trip.startDate)}{trip.endDate && trip.endDate !== trip.startDate ? ` – ${formatDate(trip.endDate)}` : ''}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onEdit} className="p-1.5 rounded hover:bg-[oklch(0.92_0.012_78)]">
            <Edit2 size={13} style={{ color: 'oklch(0.52 0.022 65)' }} />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded hover:bg-[oklch(0.95_0.08_27)]">
            <Trash2 size={13} style={{ color: 'oklch(0.55 0.20 27)' }} />
          </button>
        </div>
      </div>
      <hr className="thv-rule mb-3" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest mb-1.5" style={{ color: 'oklch(0.62 0.012 65)' }}>Team</p>
          <div className="flex flex-wrap gap-1.5">
            {trip.teamMembers.map(m => (
              <span key={m} className="px-2 py-0.5 rounded-full text-xs bg-[oklch(0.22_0.018_55)] text-[oklch(0.96_0.008_75)]">{m}</span>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest mb-1.5" style={{ color: 'oklch(0.62 0.012 65)' }}>
            Donors Attending ({trip.donorAttendees.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {trip.donorAttendees.map(id => (
              <span key={id} className="px-2 py-0.5 rounded-full text-xs bg-[oklch(0.88_0.022_72)] text-[oklch(0.28_0.018_55)]">
                {getDonorName(id)}
              </span>
            ))}
            {trip.donorAttendees.length === 0 && <span className="text-xs" style={{ color: 'oklch(0.62 0.012 65)' }}>None assigned</span>}
          </div>
        </div>
      </div>
      {trip.notes && (
        <p className="text-sm mt-3" style={{ color: 'oklch(0.52 0.022 65)' }}>{trip.notes}</p>
      )}
      <AttendeeSection trip={trip} />
    </div>
  );
}

function AddTripModal({ donors, onClose, onAdd }: { donors: any[]; onClose: () => void; onAdd: (t: any) => void }) {
  const [form, setForm] = useState({
    name: '', startDate: '', endDate: '', teamMembers: [] as string[], donorAttendees: [] as string[], notes: ''
  });
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const toggle = (key: 'teamMembers' | 'donorAttendees', val: string) => {
    setForm(f => ({
      ...f,
      [key]: f[key].includes(val) ? f[key].filter((x: string) => x !== val) : [...f[key], val]
    }));
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.startDate) return;
    onAdd(form);
    onClose();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(34,26,20,0.55)' }}>
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl" style={{ background: 'oklch(0.985 0.008 80)' }}>
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 pt-5 pb-4 border-b border-[oklch(0.84_0.018_75)]" style={{ background: 'oklch(0.985 0.008 80)' }}>
          <h2 className="font-display text-2xl" style={{ color: 'oklch(0.22 0.018 55)' }}>Add Trip</h2>
          <button onClick={onClose} className="p-2 rounded-md hover:bg-[oklch(0.92_0.012_78)]"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs mb-1 block uppercase tracking-widest" style={{ color: 'oklch(0.52 0.022 65)' }}>Trip Name *</label>
              <Input value={form.name} onChange={e => set('name', e.target.value)} required />
            </div>
            <div>
              <label className="text-xs mb-1 block uppercase tracking-widest" style={{ color: 'oklch(0.52 0.022 65)' }}>Start Date *</label>
              <Input type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} required />
            </div>
            <div>
              <label className="text-xs mb-1 block uppercase tracking-widest" style={{ color: 'oklch(0.52 0.022 65)' }}>End Date</label>
              <Input type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs mb-2 block uppercase tracking-widest" style={{ color: 'oklch(0.52 0.022 65)' }}>Team Members</label>
            <div className="flex gap-4 flex-wrap">
              {TEAM_MEMBERS.map(m => (
                <label key={m} className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.teamMembers.includes(m)} onChange={() => toggle('teamMembers', m)} />
                  {m}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs mb-2 block uppercase tracking-widest" style={{ color: 'oklch(0.52 0.022 65)' }}>Donor Attendees</label>
            <div className="flex gap-3 flex-wrap max-h-36 overflow-y-auto">
              {donors.map(d => (
                <label key={d.id} className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.donorAttendees.includes(d.id)} onChange={() => toggle('donorAttendees', d.id)} />
                  {d.name}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs mb-1 block uppercase tracking-widest" style={{ color: 'oklch(0.52 0.022 65)' }}>Notes</label>
            <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit" style={{ background: 'oklch(0.22 0.018 55)', color: 'oklch(0.96 0.008 75)' }}>Add Trip</Button>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
