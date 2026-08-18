import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, GripVertical, Plus, Trash2 } from 'lucide-react';
import { nanoid } from 'nanoid';
import { jsPDF } from 'jspdf';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Trip } from '@/lib/types';
import { copyItineraryTemplate, sortItineraryActivities } from '@/lib/tripItinerary';
import type { TripItineraryActivity, TripItineraryDay, TripOperations } from '../../../shared/tripOperations';

const V2V_SAMPLE: Array<Array<{ title: string; notes?: string }>> = [
  [{ title: 'Arrive in Guatemala City' }, { title: 'Shuttle to the Barceló Hotel' }],
  [{ title: 'Optional worship service', notes: 'One option begins at 8:00 a.m.' }, { title: 'Private shuttle bus to Rio Escondido', notes: 'Approximately five hours.' }],
  [{ title: 'Devotional' }, { title: 'Charmack Ochoch visit' }, { title: 'Arrive in Senahú and hotel check-in' }, { title: 'Narú staff appreciation dinner' }, { title: 'Group sharing' }],
  [{ title: 'Devotional' }, { title: 'Medical training' }, { title: 'Market food purchase' }, { title: 'Clinic support' }, { title: 'Food deliveries' }, { title: 'Waterfall hike / swim' }, { title: 'Group sharing' }],
  [{ title: 'Devotional' }, { title: 'Medical training' }, { title: 'Garden Tower projects' }, { title: 'Charmack Ochoch dinner' }, { title: 'Group sharing' }],
  [{ title: 'Sunrise hike' }, { title: 'Devotional' }, { title: 'Cobán excursion' }, { title: 'Temple / lunch' }, { title: 'King Marcos cave' }, { title: 'Optional activities' }, { title: 'Group sharing' }],
  [{ title: 'Devotional' }, { title: 'Six-hour bus to Guatemala City' }, { title: 'Barceló stay' }, { title: 'Final group meeting' }],
  [{ title: 'Mercado de Artesanías' }, { title: 'Shuttle to airport' }, { title: 'Fly home' }],
];

const LEGACY_COMBINED_TITLES = ['Arrive in Guatemala City', 'Travel to Rio Escondido', 'Visit Charmack, arrive in Senahú', 'Market Day / Food Deliveries / Medical', 'Work Day / Medical / Charmack Dinner', 'Sunrise Hike, Cobán Excursion', 'Travel to Guatemala City', 'Market Day, Fly Home'];

function isoDays(start: string, end: string) {
  const days: string[] = [];
  const cursor = new Date(`${start}T12:00:00`);
  const finish = new Date(`${end || start}T12:00:00`);
  while (cursor <= finish) { days.push(cursor.toISOString().slice(0, 10)); cursor.setDate(cursor.getDate() + 1); }
  return days;
}

function initialDays(trip: Trip): TripItineraryDay[] {
  const isV2V = /v2v|village[-\s]?to[-\s]?village/i.test(trip.name);
  return isoDays(trip.startDate, trip.endDate ?? trip.startDate).map((date, index) => ({ date, activities: isV2V ? (V2V_SAMPLE[index] ?? []).map(entry => ({ id: nanoid(), ...entry })) : [] }));
}

function dateLabel(date: string, index: number) {
  return `Day ${index + 1} · ${new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`;
}

function downloadItineraryPdf(trip: Trip, days: TripItineraryDay[]) {
  const document = new jsPDF({ unit: 'pt', format: 'letter' });
  const pageWidth = document.internal.pageSize.getWidth();
  const pageHeight = document.internal.pageSize.getHeight();
  const margin = 42;
  const contentWidth = pageWidth - margin * 2;
  let y = 52;
  const ensureRoom = (height: number) => { if (y + height > pageHeight - 48) { document.addPage(); y = 52; } };
  const write = (value: string, size = 10, bold = false, indent = 0) => {
    document.setFont('helvetica', bold ? 'bold' : 'normal'); document.setFontSize(size); document.setTextColor(73, 66, 57);
    const lines = document.splitTextToSize(value, contentWidth - indent - 12) as string[];
    ensureRoom(lines.length * (size + 3) + 7); document.text(lines, margin + indent, y); y += lines.length * (size + 3) + 7;
  };
  document.setTextColor(46, 40, 35); document.setFont('times', 'bold'); document.setFontSize(22); document.text(`${trip.name} Itinerary`, margin, y); y += 24;
  document.setFont('helvetica', 'normal'); document.setFontSize(10); document.setTextColor(83, 75, 66);
  document.text(`${new Date(`${trip.startDate}T12:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} – ${new Date(`${trip.endDate}T12:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`, margin, y); y += 26;
  days.forEach((day, index) => {
    ensureRoom(34); document.setFillColor(244, 239, 232); document.roundedRect(margin, y - 16, contentWidth, 27, 5, 5, 'F');
    document.setTextColor(46, 40, 35); document.setFont('times', 'bold'); document.setFontSize(15); document.text(dateLabel(day.date, index), margin + 10, y + 2); y += 31;
    if (!day.activities.length) write('No activities added yet.', 9, false, 10);
    day.activities.forEach(activity => { write(`${activity.time || 'Time TBD'}  ·  ${activity.title}`, 10, true, 10); if (activity.notes) write(activity.notes, 9, false, 28); });
    y += 9;
  });
  const safeName = trip.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  document.save(`${safeName}-itinerary.pdf`);
}

export function TripItinerary({ trip, operations, templateTrips, onSave }: { trip: Trip; operations: TripOperations; templateTrips: Trip[]; onSave: (updates: Partial<TripOperations>) => void }) {
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [dragged, setDragged] = useState<{ day: string; id: string } | null>(null);
  const [templateId, setTemplateId] = useState('');
  const convertedLegacy = useRef(false);
  const days = useMemo(() => (operations.itineraryDays?.length ? operations.itineraryDays : initialDays(trip)).map(day => ({ ...day, activities: sortItineraryActivities(day.activities) })), [operations.itineraryDays, trip]);
  const templateOptions = useMemo(() => templateTrips.filter(candidate => candidate.id !== trip.id && candidate.startDate < trip.startDate && candidate.operations?.itineraryDays?.length), [templateTrips, trip.id, trip.startDate]);
  useEffect(() => {
    if (convertedLegacy.current || !operations.itineraryDays?.length || !/v2v|village[-\s]?to[-\s]?village/i.test(trip.name)) return;
    const needsConversion = operations.itineraryDays.some((day, index) => day.activities.some(activity => activity.title === LEGACY_COMBINED_TITLES[index]));
    if (!needsConversion) return;
    convertedLegacy.current = true;
    onSave({ itineraryDays: operations.itineraryDays.map((day, index) => day.activities.some(activity => activity.title === LEGACY_COMBINED_TITLES[index]) ? { ...day, activities: (V2V_SAMPLE[index] ?? []).map(entry => ({ id: nanoid(), ...entry })) } : day) });
  }, [operations.itineraryDays, onSave, trip.name]);
  const saveDays = (next: TripItineraryDay[]) => onSave({ itineraryDays: next.map(day => ({ ...day, activities: sortItineraryActivities(day.activities) })) });
  const updateActivity = (day: string, id: string, patch: Partial<TripItineraryActivity>) => saveDays(days.map(entry => entry.date === day ? { ...entry, activities: entry.activities.map(activity => activity.id === id ? { ...activity, ...patch } : activity) } : entry));
  const removeActivity = (day: string, id: string) => saveDays(days.map(entry => entry.date === day ? { ...entry, activities: entry.activities.filter(activity => activity.id !== id) } : entry));
  const addActivity = (day: string) => {
    if (!newTitle.trim()) return;
    saveDays(days.map(entry => entry.date === day ? { ...entry, activities: [...entry.activities, { id: nanoid(), title: newTitle.trim(), time: newTime || undefined, notes: newNotes.trim() || undefined }] } : entry));
    setAddingTo(null); setNewTitle(''); setNewTime(''); setNewNotes('');
  };
  const moveActivity = (targetDay: string) => {
    if (!dragged) return;
    const source = days.find(entry => entry.date === dragged.day)?.activities.find(activity => activity.id === dragged.id);
    if (!source) return;
    saveDays(days.map(entry => {
      if (entry.date === dragged.day && entry.date === targetDay) return entry;
      if (entry.date === dragged.day) return { ...entry, activities: entry.activities.filter(activity => activity.id !== dragged.id) };
      if (entry.date === targetDay) return { ...entry, activities: [...entry.activities, source] };
      return entry;
    }));
    setDragged(null);
  };
  const applyTemplate = () => {
    const template = templateOptions.find(candidate => candidate.id === templateId);
    if (!template?.operations?.itineraryDays?.length) return;
    if (operations.itineraryDays?.length && !window.confirm(`Replace ${trip.name}'s current itinerary with the itinerary from ${template.name}?`)) return;
    saveDays(copyItineraryTemplate(template.operations.itineraryDays, days.map(day => day.date)));
    setTemplateId('');
  };
  const usingSample = !operations.itineraryDays?.length && /v2v|village[-\s]?to[-\s]?village/i.test(trip.name);

  return <div className="space-y-3 pt-3">
    <div className="rounded-md bg-[oklch(0.97_0.02_80)] p-3 text-xs text-[oklch(0.42_0.018_55)]">
      {usingSample ? 'Village to Village sample itinerary is shown from the approved expedition information. Each activity has its own time, drag handle, and delete control; your first change saves this itinerary to the trip.' : 'Build the daily plan here. Drag an activity from one day to another to reorder the itinerary.'}
    </div>
    {templateOptions.length > 0 && <div className="flex flex-col gap-2 rounded-md border border-[oklch(0.84_0.018_75)] bg-white p-3 sm:flex-row sm:items-end"><label className="min-w-0 flex-1 text-xs text-[oklch(0.42_0.018_55)]">Use previous itinerary template<select value={templateId} onChange={event => setTemplateId(event.target.value)} className="mt-1 h-9 w-full rounded border border-[oklch(0.80_0.018_75)] bg-white px-2 text-sm text-[oklch(0.22_0.018_55)]"><option value="">Select a prior trip itinerary</option>{templateOptions.map(candidate => <option key={candidate.id} value={candidate.id}>{candidate.name} · {new Date(`${candidate.startDate}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</option>)}</select></label><Button size="sm" disabled={!templateId} onClick={applyTemplate}>Use itinerary</Button></div>}
    {days.map((day, index) => <section key={day.date} onDragOver={event => event.preventDefault()} onDrop={() => moveActivity(day.date)} className={`rounded-lg border p-3 ${dragged ? 'border-[oklch(0.67_0.11_250)] bg-[oklch(0.98_0.018_250)]' : 'border-[oklch(0.87_0.018_75)] bg-white'}`}>
      <div className="mb-2 flex items-center justify-between gap-3"><h3 className="font-display text-lg text-[oklch(0.22_0.018_55)]">{dateLabel(day.date, index)}</h3><Button size="sm" variant="outline" onClick={() => { setAddingTo(day.date); setNewTitle(''); setNewTime(''); setNewNotes(''); }}><Plus size={13} className="mr-1" />Add activity</Button></div>
      <div className="space-y-2">
        {day.activities.map(activity => <div key={activity.id} draggable onDragStart={() => setDragged({ day: day.date, id: activity.id })} onDragEnd={() => setDragged(null)} className="flex gap-2 rounded-md border border-[oklch(0.90_0.012_78)] bg-[oklch(0.995_0.003_80)] p-2">
          <span className="mt-1 shrink-0 rounded border border-[oklch(0.86_0.018_75)] bg-white p-1 text-[oklch(0.55_0.022_65)]" title="Drag this activity to another day" aria-label={`Drag ${activity.title}`}><GripVertical className="cursor-grab" size={15} /></span>
          <div className="min-w-0 flex-1 space-y-1"><div className="grid gap-1 sm:grid-cols-[170px_1fr]"><Input type="time" defaultValue={activity.time ?? ''} onBlur={event => updateActivity(day.date, activity.id, { time: event.target.value || undefined })} aria-label={`Time for ${activity.title}`} className="h-7 text-xs" /><Input defaultValue={activity.title} onBlur={event => updateActivity(day.date, activity.id, { title: event.target.value })} className="h-7 text-sm" /></div><Input defaultValue={activity.notes ?? ''} onBlur={event => updateActivity(day.date, activity.id, { notes: event.target.value || undefined })} placeholder="Optional notes" className="h-7 text-xs" /></div>
          <button onClick={() => removeActivity(day.date, activity.id)} className="self-center rounded border border-transparent p-1.5 text-[oklch(0.55_0.20_27)] hover:border-[oklch(0.88_0.08_27)] hover:bg-red-50" aria-label={`Delete ${activity.title}`} title="Delete activity"><Trash2 size={14} /></button>
        </div>)}
        {day.activities.length === 0 && addingTo !== day.date && <p className="py-2 text-xs italic text-[oklch(0.58_0.022_65)]">Drop an activity here or add one.</p>}
      </div>
      {addingTo === day.date && <div className="mt-2 grid gap-2 rounded-md bg-[oklch(0.97_0.02_250)] p-2 sm:grid-cols-[160px_1fr_1fr_auto_auto]"><Input type="time" value={newTime} onChange={event => setNewTime(event.target.value)} aria-label="New activity time" className="h-8" /><Input autoFocus value={newTitle} onChange={event => setNewTitle(event.target.value)} placeholder="Activity" className="h-8" onKeyDown={event => event.key === 'Enter' && addActivity(day.date)} /><Input value={newNotes} onChange={event => setNewNotes(event.target.value)} placeholder="Notes (optional)" className="h-8" onKeyDown={event => event.key === 'Enter' && addActivity(day.date)} /><Button size="sm" onClick={() => addActivity(day.date)} disabled={!newTitle.trim()}>Save</Button><Button size="sm" variant="outline" onClick={() => setAddingTo(null)}>Cancel</Button></div>}
    </section>)}
    <div className="flex justify-end border-t border-[oklch(0.87_0.018_75)] pt-5"><Button onClick={() => downloadItineraryPdf(trip, days)}><Download size={16} className="mr-2" />Download Itinerary PDF</Button></div>
  </div>;
}
