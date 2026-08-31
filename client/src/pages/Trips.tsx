// THV Donor Dashboard — Trips Page
// Shows upcoming and past trips with team + donor attendees
import { trpc } from '@/lib/trpc';

import { Fragment, useEffect, useState } from 'react';
import { useDashboard } from '@/contexts/DashboardContext';
import { formatDate, cn } from '@/lib/utils';
import { Donor, Trip, TripAttendee } from '@/lib/types';
import { attendeeFieldsForStatus, attendeeRosterStatus, isGoingAttendee, summarizeTripRoster, type AttendeeRosterStatus } from '@/lib/tripRoster';
import { getTripLeaders } from '@/lib/teamLeaders';
import { receivedUsanaGrantTotal } from '@/lib/usanaTotals';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ExpenseWorkspace } from '@/components/ExpenseWorkspace';
import { TripItinerary } from '@/components/TripItinerary';
import { TripAssignments } from '@/components/TripAssignments';
import { TripTodoTemplateList } from '@/components/TripTodoTemplateList';
import { Plus, Plane, Calendar, Users, X, Edit2, Check, Trash2, Mail, Phone, ChevronDown, ChevronUp } from 'lucide-react';
import { nanoid } from 'nanoid';
import { jsPDF } from 'jspdf';
import type { TripExpense, TripFlightDetails, TripGuateTeamDocument, TripOperations, TripPhotoLink, TripPlanningTask } from '../../../shared/tripOperations';
import { buildExpeditionTodoTemplateTasks, hasExpeditionTodoTemplate } from '../../../shared/expeditionTodoTemplate';

const SKILLS = ['Medical', 'Nurse', 'Doctor', 'OB', 'Radiology', 'Teacher', "Q'eqchi", 'Photography', 'Volunteer'];
const TEAM_MEMBERS = ['Liz', 'Lauren', 'Anna', 'Brenley', 'Emily', 'Amy', 'Kirsten'];
const TASK_ASSIGNEES = [...TEAM_MEMBERS, 'Yvonne/Nieve'];
const CLINICAL_TAGS = new Set(['Medical', 'Nurse', 'Doctor', 'OB', 'Radiology']);
const normalizeSkill = (skill: string) => skill === 'Translation' || skill === 'Translator' ? "Q'eqchi" : skill === 'Teaching' ? 'Teacher' : skill;
const normalizeSkills = (skills: string[]) => Array.from(new Set(skills.map(normalizeSkill)));

function RosterTag({ label: rawLabel }: { label: string }) {
  const label = normalizeSkill(rawLabel);
  const classes = label === 'Leader'
    ? 'bg-[oklch(0.90_0.035_315)] text-[oklch(0.36_0.12_315)]'
    : label === 'Spanish' || label === 'SPANISH' || label === 'ES'
      ? 'bg-[oklch(0.88_0.12_145)] text-[oklch(0.28_0.12_145)]'
      : CLINICAL_TAGS.has(label)
        ? 'bg-[oklch(0.92_0.07_65)] text-[oklch(0.48_0.13_45)]'
        : label === 'Youth' || label === 'Teen'
          ? 'bg-[oklch(0.88_0.12_250)] text-[oklch(0.30_0.18_250)]'
          : 'bg-[oklch(0.90_0.02_72)] text-[oklch(0.28_0.018_55)]';
  return <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${classes}`}>{label}</span>;
}

type FlightEditor = {
  name: string;
  flight: TripFlightDetails;
  onSave: (flight: TripFlightDetails) => Promise<void> | void;
};

function FlightDetailsCard({ editor, onClose }: { editor: FlightEditor; onClose: () => void }) {
  const [flight, setFlight] = useState<TripFlightDetails>(editor.flight);
  const [saving, setSaving] = useState(false);
  const fields: Array<{ field: keyof TripFlightDetails; label: string; type?: 'time' }> = [
    { field: 'airline', label: 'Airline' }, { field: 'flightNumber', label: 'Flight number' }, { field: 'departureAirport', label: 'Home departure airport' }, { field: 'arrivalAirport', label: 'Guatemala arrival airport' },
    { field: 'departureDateTime', label: 'Outbound departure date' }, { field: 'outboundDepartureTime', label: 'Outbound departure time', type: 'time' }, { field: 'outboundLandingTime', label: 'Guatemala landing time', type: 'time' },
    { field: 'returnDateTime', label: 'Return departure date' }, { field: 'returnDepartureTime', label: 'Return departure time', type: 'time' }, { field: 'returnLandingTime', label: 'Home-airport landing time', type: 'time' },
    { field: 'bookingReference', label: 'Booking reference' }, { field: 'seatNotes', label: 'Seat notes' }, { field: 'baggageNotes', label: 'Baggage / 2-bag notes' },
  ];
  const save = async () => { setSaving(true); try { await editor.onSave(flight); onClose(); } finally { setSaving(false); } };
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="w-full max-w-2xl rounded-2xl bg-[oklch(0.985_0.008_80)] p-5 shadow-2xl"><div className="flex items-start justify-between gap-4 border-b border-[oklch(0.84_0.018_75)] pb-3"><div><p className="text-xs uppercase tracking-[0.14em] text-[oklch(0.52_0.022_65)]">Purchased ticket</p><h2 className="font-display text-2xl text-[oklch(0.22_0.018_55)]">Flight details for {editor.name}</h2><p className="mt-1 text-xs text-[oklch(0.52_0.022_65)]">Add departure and landing times so the Guatemala airport shuttle can be planned accurately.</p></div><button onClick={onClose} className="rounded p-2 hover:bg-[oklch(0.92_0.012_78)]" aria-label="Close flight details"><X size={18} /></button></div><div className="mt-4 grid gap-2 sm:grid-cols-2">{fields.map(({ field, label, type }) => <label key={field} className="text-xs text-[oklch(0.48_0.022_65)]">{label}<Input aria-label={label} type={type ?? 'text'} className="mt-1" value={flight[field] ?? ''} onChange={event => setFlight(current => ({ ...current, [field]: event.target.value }))} /></label>)}</div><div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={saving} onClick={() => void save()}>{saving ? 'Saving…' : 'Save flight details'}</Button></div></div></div>;
}

type FlightTraveler = { name: string; flight?: TripFlightDetails };

function FlightCompilationEntry({ name, leader, flight, onUpdate }: { name: string; leader?: boolean; flight?: TripFlightDetails; onUpdate: (field: keyof TripFlightDetails, value: string) => void }) {
  const field = (key: keyof TripFlightDetails, label: string, type: 'text' | 'time' = 'text') => <label key={key} className="text-xs text-[oklch(0.48_0.022_65)]">{label}<Input aria-label={`${label} for ${name}`} type={type} className="mt-1 h-8" defaultValue={flight?.[key] ?? ''} onBlur={event => onUpdate(key, event.target.value)} /></label>;
  return <div className="rounded-lg border border-[oklch(0.87_0.018_75)] bg-white p-3"><div className="mb-3 flex items-baseline justify-between gap-3"><p className="text-sm font-medium text-[oklch(0.22_0.018_55)]">{name}{leader && <span className="ml-1 text-xs font-normal text-[oklch(0.48_0.04_315)]">Leader</span>}</p><span className="text-[10px] uppercase tracking-[0.1em] text-[oklch(0.52_0.022_65)]">Saves when you leave a field</span></div><div className="grid gap-2 sm:grid-cols-2">{field('airline', 'Airline')}{field('flightNumber', 'Flight number')}{field('departureAirport', 'Home departure airport')}{field('arrivalAirport', 'Guatemala arrival airport')}</div><div className="mt-3 rounded-md border border-[oklch(0.84_0.04_145)] bg-[oklch(0.98_0.014_145)] p-3"><p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[oklch(0.30_0.10_145)]">Outbound flight — Guatemala arrival</p><div className="grid gap-2 sm:grid-cols-3">{field('departureDateTime', 'Departure date')}{field('outboundDepartureTime', 'Departure time', 'time')}{field('outboundLandingTime', 'Landing time in Guatemala', 'time')}</div></div><div className="mt-3 rounded-md border border-[oklch(0.86_0.035_315)] bg-[oklch(0.98_0.012_315)] p-3"><p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[oklch(0.36_0.12_315)]">Return flight — home arrival</p><div className="grid gap-2 sm:grid-cols-3">{field('returnDateTime', 'Return departure date')}{field('returnDepartureTime', 'Return departure time', 'time')}{field('returnLandingTime', 'Landing time at home airport', 'time')}</div></div><div className="mt-3 grid gap-2 sm:grid-cols-3">{field('bookingReference', 'Booking reference')}{field('seatNotes', 'Seat notes')}{field('baggageNotes', 'Baggage / 2-bag notes')}</div></div>;
}

const GUATE_DOCUMENT_CATEGORIES: TripGuateTeamDocument['category'][] = ['Garden Tower', 'Family market list', 'Home visits', 'Other'];

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.readAsDataURL(file);
  });
}

function GuateTeamDocuments({ trip, operations, onSave }: { trip: Trip; operations: TripOperations; onSave: (updates: Partial<TripOperations>) => void }) {
  const [category, setCategory] = useState<TripGuateTeamDocument['category']>('Other');
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<TripGuateTeamDocument | null>(null);
  const upload = trpc.trips.uploadGuateTeamDocument.useMutation();
  const getDownloadUrl = trpc.trips.getGuateTeamDocumentUrl.useMutation();
  const documents = operations.guateTeamDocuments ?? [];

  const uploadSelected = async () => {
    if (!file) return;
    setMessage(null);
    try {
      const base64 = await fileToBase64(file);
      const uploaded = await upload.mutateAsync({ tripId: trip.id, fileName: file.name, mimeType: file.type || 'application/pdf', base64 });
      onSave({ guateTeamDocuments: [...documents, { id: nanoid(), name: file.name, category, key: uploaded.key, mimeType: file.type, uploadedAt: new Date().toISOString() }] });
      setFile(null);
      setMessage('Document uploaded to this trip.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not upload that document.');
    }
  };

  const downloadDocument = async (document: TripGuateTeamDocument) => {
    try {
      const url = await getDownloadUrl.mutateAsync({ key: document.key });
      const anchor = window.document.createElement('a');
      anchor.href = url;
      anchor.download = document.name;
      window.document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not download that document.');
    }
  };
  const removeDocument = () => {
    if (!deleteCandidate) return;
    onSave({ guateTeamDocuments: documents.filter(document => document.id !== deleteCandidate.id) });
    setMessage(`${deleteCandidate.name} removed from this trip.`);
    setDeleteCandidate(null);
  };

  return <div className="space-y-4 pt-3">
    <div className="rounded-lg border border-[oklch(0.84_0.018_75)] bg-[oklch(0.975_0.012_80)] p-4">
      <p className="font-medium text-sm text-[oklch(0.22_0.018_55)]">Trip Docs</p>
      <p className="mt-1 text-xs text-[oklch(0.52_0.022_65)]">These are trip-specific documents only. Materials that span several trips should be added on Reports & Resources under the Trips header.</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-[180px_1fr_auto]"><select aria-label="Document category" value={category} onChange={event => setCategory(event.target.value as TripGuateTeamDocument['category'])} className="h-9 rounded border border-[oklch(0.80_0.018_75)] bg-white px-2 text-sm">{GUATE_DOCUMENT_CATEGORIES.map(option => <option key={option} value={option}>{option}</option>)}</select><Input aria-label="Choose trip-specific document" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.jpg,.jpeg,.png" onChange={event => setFile(event.target.files?.[0] ?? null)} /><Button size="sm" disabled={!file || upload.isPending} onClick={() => void uploadSelected()}>{upload.isPending ? 'Uploading…' : 'Upload file'}</Button></div>
      {message && <p className="mt-2 text-xs text-[oklch(0.42_0.018_55)]">{message}</p>}
    </div>
    {documents.length ? <div className="space-y-2">{documents.map(document => <div key={document.id} className="rounded-lg border border-[oklch(0.88_0.018_75)] bg-white p-3"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-medium text-[oklch(0.22_0.018_55)]">{document.name}</p><p className="mt-0.5 text-xs text-[oklch(0.52_0.022_65)]">{document.category} · Uploaded {formatDate(document.uploadedAt.slice(0, 10))}</p></div><div className="flex gap-2"><Button size="sm" variant="outline" disabled={getDownloadUrl.isPending} onClick={() => void downloadDocument(document)}>{getDownloadUrl.isPending ? 'Preparing…' : 'Download file'}</Button><Button size="sm" variant="outline" className="border-[oklch(0.72_0.11_27)] text-[oklch(0.48_0.18_27)] hover:bg-[oklch(0.97_0.025_27)]" onClick={() => setDeleteCandidate(document)}><Trash2 size={14} className="mr-1" />Delete</Button></div></div>{deleteCandidate?.id === document.id && <div role="alertdialog" className="mt-3 border-t border-[oklch(0.80_0.10_27)] pt-3"><p className="text-sm font-medium text-[oklch(0.42_0.16_27)]">Delete “{document.name}” from this trip?</p><p className="mt-1 text-xs text-[oklch(0.48_0.08_27)]">This removes the file from Trip Docs. It will no longer be accessible from the dashboard.</p><div className="mt-3 flex gap-2"><Button size="sm" variant="outline" onClick={() => setDeleteCandidate(null)}>Keep file</Button><Button size="sm" className="bg-[oklch(0.48_0.18_27)] hover:bg-[oklch(0.42_0.18_27)]" onClick={removeDocument}>Delete file</Button></div></div>}</div>)}</div> : <p className="rounded-lg border border-dashed border-[oklch(0.84_0.018_75)] px-4 py-7 text-center text-sm italic text-[oklch(0.52_0.022_65)]">No trip-specific documents have been added to this trip yet.</p>}
  </div>;
}

function isShareablePhotoUrl(value: string) {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

function TripPhotoLinks({ operations, onSave }: { operations: TripOperations; onSave: (updates: Partial<TripOperations>) => void }) {
  const links = operations.photoLinks ?? [];
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState({ label: '', url: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editing, setEditing] = useState({ label: '', url: '' });
  const [removeCandidate, setRemoveCandidate] = useState<TripPhotoLink | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const addLink = () => {
    const label = draft.label.trim(); const url = draft.url.trim();
    if (!label || !isShareablePhotoUrl(url)) { setMessage('Add a folder name and a valid https:// share link.'); return; }
    onSave({ photoLinks: [...links, { id: nanoid(), label, url, addedAt: new Date().toISOString() }] });
    setDraft({ label: '', url: '' }); setShowAdd(false); setMessage('Photo folder link added.');
  };
  const saveEdit = () => {
    const label = editing.label.trim(); const url = editing.url.trim();
    if (!editingId || !label || !isShareablePhotoUrl(url)) { setMessage('Use a folder name and a valid https:// share link.'); return; }
    onSave({ photoLinks: links.map(link => link.id === editingId ? { ...link, label, url } : link) });
    setEditingId(null); setMessage('Photo folder link updated.');
  };
  return <div className="space-y-3 pt-3"><div className="rounded-lg border border-[oklch(0.79_0.06_250)] bg-[oklch(0.975_0.02_250)] p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-medium text-[oklch(0.22_0.018_55)]">Trip photo folders</p><p className="mt-1 text-xs text-[oklch(0.45_0.022_65)]">Store links to this trip’s photos. The photos stay in Google Photos, Apple Photos, Google Drive, or your preferred service.</p></div><Button size="sm" variant="outline" onClick={() => { setShowAdd(value => !value); setMessage(null); }}>{showAdd ? 'Cancel' : <><Plus size={14} className="mr-1" />Add photo folder</>}</Button></div>{showAdd && <div className="mt-3 grid gap-2 border-t border-[oklch(0.82_0.06_250)] pt-3 sm:grid-cols-[minmax(160px,1fr)_minmax(240px,2fr)_auto]"><Input aria-label="Photo folder name" value={draft.label} onChange={event => setDraft(value => ({ ...value, label: event.target.value }))} placeholder="Folder name, e.g. November 2026" /><Input aria-label="Photo-folder share link" type="url" value={draft.url} onChange={event => setDraft(value => ({ ...value, url: event.target.value }))} placeholder="Paste an https:// share link" /><Button size="sm" disabled={!draft.label.trim() || !draft.url.trim()} onClick={addLink}>Add link</Button></div>}{message && <p className="mt-2 text-xs text-[oklch(0.36_0.09_145)]">{message}</p>}</div>{links.length ? <div className="space-y-2">{links.map(link => <div key={link.id} className="rounded-lg border border-[oklch(0.88_0.018_75)] bg-white p-3">{editingId === link.id ? <div className="grid gap-2 sm:grid-cols-[minmax(160px,1fr)_minmax(240px,2fr)_auto_auto]"><Input aria-label={`Photo folder name for ${link.label}`} value={editing.label} onChange={event => setEditing(value => ({ ...value, label: event.target.value }))} /><Input aria-label={`Photo-folder share link for ${link.label}`} type="url" value={editing.url} onChange={event => setEditing(value => ({ ...value, url: event.target.value }))} /><Button size="sm" onClick={saveEdit}>Save</Button><Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button></div> : <><div className="flex flex-wrap items-center justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-medium text-[oklch(0.22_0.018_55)]">{link.label}</p><p className="mt-0.5 truncate text-xs text-[oklch(0.52_0.022_65)]">{link.url}</p></div><div className="flex shrink-0 gap-2"><a href={link.url} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 items-center rounded-md bg-[oklch(0.50_0.18_250)] px-3 text-xs font-medium text-white hover:bg-[oklch(0.44_0.18_250)]">Open folder</a><Button size="sm" variant="outline" onClick={() => { setEditingId(link.id); setEditing({ label: link.label, url: link.url }); setRemoveCandidate(null); }}>Edit</Button><Button size="sm" variant="outline" className="border-[oklch(0.72_0.11_27)] text-[oklch(0.48_0.18_27)] hover:bg-[oklch(0.97_0.025_27)]" onClick={() => { setRemoveCandidate(link); setEditingId(null); }}>Remove</Button></div></div>{removeCandidate?.id === link.id && <div role="alertdialog" className="mt-3 border-t border-[oklch(0.80_0.10_27)] pt-3"><p className="text-sm font-medium text-[oklch(0.42_0.16_27)]">Remove “{link.label}” from this trip?</p><div className="mt-3 flex gap-2"><Button size="sm" variant="outline" onClick={() => setRemoveCandidate(null)}>Keep link</Button><Button size="sm" className="bg-[oklch(0.48_0.18_27)] hover:bg-[oklch(0.42_0.18_27)]" onClick={() => { onSave({ photoLinks: links.filter(item => item.id !== link.id) }); setRemoveCandidate(null); setMessage('Photo folder link removed.'); }}>Remove link</Button></div></div>}</>}</div>)}</div> : <p className="rounded-lg border border-dashed border-[oklch(0.84_0.018_75)] px-4 py-7 text-center text-sm italic text-[oklch(0.52_0.022_65)]">No photo folders have been added to this trip yet.</p>}</div>;
}

function downloadFlightCompilationPdf(trip: Trip, travelers: FlightTraveler[]) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 42;
  let y = 52;
  doc.setTextColor(46, 40, 35);
  doc.setFont('times', 'bold');
  doc.setFontSize(22);
  doc.text('THV Flight Compilation', margin, y);
  y += 26;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`${trip.name} · ${formatDate(trip.startDate)}${trip.endDate ? ` – ${formatDate(trip.endDate)}` : ''}`, margin, y);
  y += 18;
  doc.setTextColor(83, 75, 66);
  doc.text('Prepared for Amy · Confirm departure and landing times, airline details, booking references, seats, and two checked bags.', margin, y);
  y += 22;

  travelers.forEach((attendee, index) => {
    const flight = attendee.flight ?? {};
    const lines = [
      `Airline / flight: ${flight.airline || '—'} ${flight.flightNumber || ''}`,
      `Route: ${flight.departureAirport || '—'} → ${flight.arrivalAirport || '—'}`,
      `Outbound: Depart ${flight.departureDateTime || '—'} at ${flight.outboundDepartureTime || '—'}     Land in Guatemala at ${flight.outboundLandingTime || '—'}`,
      `Return: Depart ${flight.returnDateTime || '—'} at ${flight.returnDepartureTime || '—'}     Land at home airport at ${flight.returnLandingTime || '—'}`,
      `Booking reference: ${flight.bookingReference || '—'}     Seat notes: ${flight.seatNotes || '—'}`,
      `Baggage / 2-bag notes: ${flight.baggageNotes || '—'}`,
    ];
    const cardHeight = 105;
    if (y + cardHeight > 540) { doc.addPage(); y = 48; }
    doc.setFillColor(248, 245, 239);
    doc.roundedRect(margin, y - 17, pageWidth - margin * 2, cardHeight, 5, 5, 'F');
    doc.setTextColor(46, 40, 35);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(`${index + 1}. ${attendee.name}`, margin + 12, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(83, 75, 66);
    lines.forEach((line, lineIndex) => doc.text(line, margin + 12, y + 17 + lineIndex * 12));
    y += cardHeight + 9;
  });

  if (!travelers.length) {
    doc.setTextColor(83, 75, 66);
    doc.text('No travelers have been marked as going for this trip.', margin, y + 10);
  }
  const filename = `${trip.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'trip'}-flight-compilation.pdf`;
  doc.save(filename);
}

function AttendeeSection({ trip, onSaveOperations }: { trip: Trip; onSaveOperations: (updates: Partial<TripOperations>) => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', skills: [] as string[], isTeen: false, speaksSpanish: false, status: 'possible' as AttendeeRosterStatus, knowsAtTHV: [] as string[], knowsOther: '', notes: '' });
  const attendees = trip.attendees ?? [];
  const { store } = useDashboard();
  const donorTripAttendees = store.donors.filter(donor => donor.tripId === trip.id);
  const tripOptions = [...store.trips]
    .filter(candidate => candidate.id === trip.id || candidate.startDate >= trip.startDate)
    .sort((first, second) => first.startDate.localeCompare(second.startDate));
  const roster = summarizeTripRoster(trip);
  const leaders = getTripLeaders(trip.teamMembers, trip.operations);
  const totalTripNumber = leaders.length + roster.travelingGuestCount;
  const utils = trpc.useUtils();

  const addAttendeeMut = trpc.trips.addAttendee.useMutation({ onSuccess: () => utils.trips.list.invalidate() });
  const updateAttendeeMut = trpc.trips.updateAttendee.useMutation({ onSuccess: () => utils.trips.list.invalidate() });
  const deleteAttendeeMut = trpc.trips.deleteAttendee.useMutation({ onSuccess: () => utils.trips.list.invalidate() });
  const [editingAttendeeId, setEditingAttendeeId] = useState<string | null>(null);
  const [goingDeleteCandidate, setGoingDeleteCandidate] = useState<TripAttendee | null>(null);
  const [showLaterTripFor, setShowLaterTripFor] = useState<string | null>(null);
  const [flightEditor, setFlightEditor] = useState<FlightEditor | null>(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '', skills: [] as string[], isTeen: false, speaksSpanish: false, status: 'possible' as AttendeeRosterStatus, knowsAtTHV: [] as string[], knowsOther: '', notes: '' });

  const startEditAttendee = (a: TripAttendee) => {
    setEditingAttendeeId(a.id);
    setEditForm({ name: a.name, email: a.email ?? '', phone: a.phone ?? '', skills: normalizeSkills(a.skills ?? []), isTeen: !!a.isTeen, speaksSpanish: !!a.speaksSpanish, status: attendeeRosterStatus(a), knowsAtTHV: a.knowsAtTHV ?? [], knowsOther: '', notes: a.notes ?? '' });
  };

  const handleSaveEdit = async (id: string) => {
    const knowsAll = [...editForm.knowsAtTHV, ...(editForm.knowsOther.trim() ? [editForm.knowsOther.trim()] : [])];
    await updateAttendeeMut.mutateAsync({ id, name: editForm.name, email: editForm.email || undefined, phone: editForm.phone || undefined, skills: normalizeSkills(editForm.skills), isTeen: editForm.isTeen, speaksSpanish: editForm.speaksSpanish, ...attendeeFieldsForStatus(editForm.status), knowsAtTHV: knowsAll, notes: editForm.notes || undefined });
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
      skills: normalizeSkills(form.skills),
      isTeen: form.isTeen || undefined,
      speaksSpanish: form.speaksSpanish || undefined,
      ...attendeeFieldsForStatus(form.status),
      knowsAtTHV: knowsAll.length ? knowsAll : undefined,
      notes: form.notes || undefined,
    });
    setForm({ name: '', email: '', phone: '', skills: [], isTeen: false, speaksSpanish: false, status: 'possible', knowsAtTHV: [], knowsOther: '', notes: '' });
    setShowAdd(false);
  };

  const handleDelete = async (id: string) => { await deleteAttendeeMut.mutateAsync({ id }); };

  const handleStatusChange = async (attendee: TripAttendee, status: AttendeeRosterStatus) => {
    await updateAttendeeMut.mutateAsync({
      id: attendee.id,
      name: attendee.name,
      email: attendee.email || undefined,
      phone: attendee.phone || undefined,
      skills: normalizeSkills(attendee.skills ?? []),
      isTeen: attendee.isTeen,
      speaksSpanish: attendee.speaksSpanish,
      ...attendeeFieldsForStatus(status),
      knowsAtTHV: attendee.knowsAtTHV,
      notes: attendee.notes || undefined,
    });
  };
  const reassignAttendee = async (attendee: TripAttendee, targetTripId: string) => {
    if (targetTripId !== trip.id) await updateAttendeeMut.mutateAsync({ id: attendee.id, tripId: targetTripId });
  };
  const updateLeaderTicket = (name: string, purchasedTicket: boolean, flight?: TripFlightDetails) => {
    const previous = trip.operations?.leaderLogistics?.[name] ?? {};
    onSaveOperations({ leaderLogistics: { ...trip.operations?.leaderLogistics, [name]: { ...previous, purchasedTicket, ...(flight ? { flight } : {}) } } });
  };
  const openLeaderFlightDetails = (name: string) => setFlightEditor({ name, flight: trip.operations?.leaderLogistics?.[name]?.flight ?? {}, onSave: async flight => updateLeaderTicket(name, true, flight) });
  const openAttendeeFlightDetails = (attendee: TripAttendee) => setFlightEditor({ name: attendee.name, flight: attendee.tripLogistics?.flight ?? {}, onSave: async flight => {
    await updateAttendeeMut.mutateAsync({ id: attendee.id, purchasedTicket: true, medicalProfile: { ...attendee.medicalProfile, tripLogistics: { ...attendee.tripLogistics, flight } } });
  } });

  return (
      <div className="mt-4">
      {flightEditor && <FlightDetailsCard editor={flightEditor} onClose={() => setFlightEditor(null)} />}
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs uppercase tracking-widest" style={{ color: 'oklch(0.62 0.012 65)' }}>Trip roster</p>
        <button onClick={() => setShowAdd(!showAdd)} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border" style={{ color: 'oklch(0.50 0.18 250)', borderColor: 'oklch(0.75 0.12 250)', background: 'oklch(0.96 0.04 250)' }}>
          <Plus size={10} /> Add attendee
        </button>
      </div>
      <div className="mb-3 rounded-lg border border-[oklch(0.82_0.022_75)] bg-[oklch(0.97_0.012_80)] px-3 py-2">
        <p className="text-xs uppercase tracking-widest" style={{ color: 'oklch(0.52 0.022 65)' }}>Total trip number</p>
        <div className="mt-0.5 flex items-baseline gap-2">
          <span className="font-display text-2xl" style={{ color: 'oklch(0.22 0.018 55)' }}>{totalTripNumber}</span>
          <span className="text-xs" style={{ color: 'oklch(0.52 0.022 65)' }}>leaders and volunteers are currently going</span>
        </div>
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
            <label className="flex items-center gap-1.5 text-xs" style={{ color: 'oklch(0.22 0.018 55)' }}>
              Status
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as AttendeeRosterStatus }))} className="h-7 rounded border border-[oklch(0.80_0.018_75)] bg-white px-1">
                <option value="possible">Potential</option>
                <option value="confirmed">Confirmed</option>
              </select>
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
      {attendees.length === 0 && donorTripAttendees.length === 0 && !showAdd && (
        <p className="text-xs italic" style={{ color: 'oklch(0.72 0.012 65)' }}>No attendees added yet.</p>
      )}
      <div className="space-y-4">
        <div className="rounded-lg border border-[oklch(0.84_0.04_145)] bg-[oklch(0.975_0.02_145)] p-3">
          <div className="mb-2 flex items-baseline justify-between"><p className="text-xs uppercase tracking-widest" style={{ color: 'oklch(0.30 0.10 145)' }}>Going ({totalTripNumber})</p><span className="text-xs" style={{ color: 'oklch(0.42 0.018 55)' }}>Leaders are included automatically; a guest check in either column places them here.</span></div>
          {totalTripNumber ? <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-xs"><thead><tr className="border-b border-[oklch(0.84_0.04_145)] text-left uppercase tracking-wide" style={{ color: 'oklch(0.42 0.018 55)' }}><th className="pb-2 pr-3">Name</th><th className="pb-2 pr-3">Tags</th><th className="pb-2 pr-3 text-center">Purchased ticket</th><th className="pb-2 text-center">Paid $500 to program / deposit</th><th className="pb-2 pl-3 text-right">Actions</th></tr></thead><tbody>{leaders.map(leader => <tr key={`leader-${leader.name}`} className="border-b border-[oklch(0.90_0.02_145)]"><td className="py-2 pr-3 font-medium text-sm" style={{ color: 'oklch(0.22 0.018 55)' }}>{leader.name}</td><td className="py-2 pr-3"><div className="flex flex-wrap gap-1">{leader.tags.map(tag => <RosterTag key={tag} label={tag} />)}</div></td><td className="py-2 pr-3 text-center"><input aria-label={`Purchased ticket for leader ${leader.name}`} type="checkbox" checked={leader.purchasedTicket} onChange={event => event.target.checked ? openLeaderFlightDetails(leader.name) : updateLeaderTicket(leader.name, false)} /></td><td className="py-2 text-center text-[oklch(0.52_0.022_65)]">Not required</td><td /></tr>)}{roster.goingGuests.map(a => <tr key={a.id} className="border-b border-[oklch(0.90_0.02_145)] last:border-0"><td className="py-2 pr-3 font-medium text-sm" style={{ color: 'oklch(0.22 0.018 55)' }}>{a.name}</td><td className="py-2 pr-3"><div className="flex flex-wrap gap-1">{a.isTeen && <RosterTag label="Youth" />}{a.speaksSpanish && <RosterTag label="SPANISH" />}{a.skills.map((skill: string) => <RosterTag key={skill} label={skill} />)}</div></td><td className="py-2 pr-3 text-center"><input aria-label={`Purchased ticket for ${a.name}`} type="checkbox" checked={!!a.purchasedTicket} onChange={e => e.target.checked ? openAttendeeFlightDetails(a) : void updateAttendeeMut.mutateAsync({ id: a.id, purchasedTicket: false })}/></td><td className="py-2 text-center"><input aria-label={`Paid $500 to program or deposit for ${a.name}`} type="checkbox" checked={!!a.tripLogistics?.depositPaid} onChange={e => void updateAttendeeMut.mutateAsync({ id: a.id, medicalProfile: { ...a.medicalProfile, tripLogistics: { ...a.tripLogistics, depositPaid: e.target.checked, depositDate: e.target.checked ? new Date().toISOString().slice(0, 10) : undefined } } })}/></td><td className="py-2 pl-3 text-right"><button aria-label={`Edit ${a.name}`} onClick={() => startEditAttendee(a)} className="rounded p-1 hover:bg-[oklch(0.94_0.02_250)]"><Edit2 size={14} className="text-[oklch(0.42_0.15_250)]" /></button><button aria-label={`Delete ${a.name}`} onClick={() => setGoingDeleteCandidate(a)} className="ml-1 rounded p-1 hover:bg-red-50"><Trash2 size={14} className="text-[oklch(0.55_0.20_27)]" /></button></td></tr>)}</tbody></table></div> : <p className="text-xs italic" style={{ color: 'oklch(0.42 0.018 55)' }}>No leaders or volunteers are going yet.</p>}
          {roster.goingGuests.filter(attendee => attendee.id === editingAttendeeId).map(attendee => <div key={`going-edit-${attendee.id}`} className="mt-3 rounded-md border border-[oklch(0.75_0.12_250)] bg-[oklch(0.97_0.03_250)] p-3"><div className="grid gap-2 sm:grid-cols-2"><Input value={editForm.name} onChange={event => setEditForm(value => ({ ...value, name: event.target.value }))} placeholder="Full name" /><Input type="email" value={editForm.email} onChange={event => setEditForm(value => ({ ...value, email: event.target.value }))} placeholder="Email" /><Input value={editForm.phone} onChange={event => setEditForm(value => ({ ...value, phone: event.target.value }))} placeholder="Phone" /><Input value={editForm.notes} onChange={event => setEditForm(value => ({ ...value, notes: event.target.value }))} placeholder="Notes" /></div><div className="mt-2 flex flex-wrap gap-1.5">{SKILLS.map(skill => <button key={skill} type="button" onClick={() => toggleEditSkill(skill)} className={`rounded-full border px-2 py-0.5 text-xs ${editForm.skills.includes(skill) ? 'border-[oklch(0.22_0.018_55)] bg-[oklch(0.22_0.018_55)] text-white' : 'border-[oklch(0.84_0.018_75)] bg-white text-[oklch(0.52_0.022_65)]'}`}>{skill}</button>)}</div><div className="mt-2 flex flex-wrap gap-3"><label className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={editForm.isTeen} onChange={event => setEditForm(value => ({ ...value, isTeen: event.target.checked }))} /> Teen</label><label className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={editForm.speaksSpanish} onChange={event => setEditForm(value => ({ ...value, speaksSpanish: event.target.checked }))} /> Speaks Spanish</label></div><div className="mt-3 flex gap-2"><Button size="sm" disabled={!editForm.name.trim() || updateAttendeeMut.isPending} onClick={() => void handleSaveEdit(attendee.id)}>Save attendee</Button><Button size="sm" variant="outline" onClick={() => setEditingAttendeeId(null)}>Cancel</Button></div></div>)}
          {goingDeleteCandidate && <div role="alertdialog" className="mt-3 rounded-md border border-[oklch(0.76_0.12_27)] bg-[oklch(0.98_0.025_27)] p-3"><p className="text-sm font-medium text-[oklch(0.40_0.16_27)]">Delete {goingDeleteCandidate.name} from this trip?</p><p className="mt-1 text-xs text-[oklch(0.46_0.08_27)]">This permanently removes this attendee card and their trip details.</p><div className="mt-3 flex gap-2"><Button size="sm" variant="outline" onClick={() => setGoingDeleteCandidate(null)}>Keep attendee</Button><Button size="sm" className="bg-[oklch(0.48_0.18_27)] hover:bg-[oklch(0.42_0.18_27)]" disabled={deleteAttendeeMut.isPending} onClick={() => { void handleDelete(goingDeleteCandidate.id); setGoingDeleteCandidate(null); }}>Delete attendee</Button></div></div>}
          <div className="mt-3 flex items-baseline justify-between border-t border-[oklch(0.84_0.04_145)] pt-3"><span className="text-xs font-medium uppercase tracking-wide text-[oklch(0.30_0.10_145)]">Total program contribution</span><span className="font-display text-2xl text-[oklch(0.22_0.018_55)]">${(roster.goingGuests.filter(a => a.tripLogistics?.depositPaid).length * 500).toLocaleString()}</span></div>
        </div>
        <div><p className="mb-2 text-xs uppercase tracking-widest" style={{ color: 'oklch(0.52 0.022 65)' }}>Potential & confirmed attendees</p><div className="space-y-2">
        {donorTripAttendees.map(donor => <div key={`donor-${donor.id}`} className="rounded-lg border border-[oklch(0.88_0.018_75)] bg-white px-3 py-2"><div className="flex items-center justify-between gap-2"><span className="text-sm font-medium" style={{ color: 'oklch(0.22 0.018 55)' }}>{donor.name}</span><span className="text-[10px] text-[oklch(0.48_0.04_345)]">Potential</span></div></div>)}
        {[...roster.confirmedGuests, ...roster.possibleGuests].map(a => (
          <div key={a.id}>
          <div className="rounded-lg border border-[oklch(0.88_0.018_75)] bg-white overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 cursor-pointer" onClick={() => setExpanded(expanded === a.id ? null : a.id)}>
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-medium truncate" style={{ color: 'oklch(0.22 0.018 55)' }}>{a.name}</span>
                {a.isTeen && <RosterTag label="Teen" />}
                {a.speaksSpanish && <RosterTag label="SPANISH" />}
                {a.skills.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {a.skills.map(s => <RosterTag key={s} label={normalizeSkill(s)} />)}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <select
                  aria-label={`Status for ${a.name}`}
                  value={attendeeRosterStatus(a)}
                  onClick={e => e.stopPropagation()}
                  onChange={e => { e.stopPropagation(); void handleStatusChange(a, e.target.value as AttendeeRosterStatus); }}
                  className="h-6 rounded border border-[oklch(0.80_0.018_75)] bg-[oklch(0.985_0.008_80)] px-1 text-[10px]"
                  style={{ color: attendeeRosterStatus(a) === 'confirmed' ? 'oklch(0.34 0.10 145)' : 'oklch(0.48 0.04 345)' }}
                >
                  <option value="possible">Potential</option>
                  <option value="confirmed">Confirmed</option>
                </select>
                <label className="flex items-center gap-1 text-[10px] text-[oklch(0.42_0.018_55)]" onClick={e => e.stopPropagation()}><input aria-label={`Purchased ticket for ${a.name}`} type="checkbox" checked={!!a.purchasedTicket} onChange={e => e.target.checked ? openAttendeeFlightDetails(a) : void updateAttendeeMut.mutateAsync({ id: a.id, purchasedTicket: false })}/> Ticket</label>
                <label className="flex items-center gap-1 text-[10px] text-[oklch(0.42_0.018_55)]" onClick={e => e.stopPropagation()}><input aria-label={`Paid $500 to program or deposit for ${a.name}`} type="checkbox" checked={!!a.tripLogistics?.depositPaid} onChange={e => void updateAttendeeMut.mutateAsync({ id: a.id, medicalProfile: { ...a.medicalProfile, tripLogistics: { ...a.tripLogistics, depositPaid: e.target.checked, depositDate: e.target.checked ? new Date().toISOString().slice(0, 10) : undefined } } })}/> $500</label>
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
                      {[['isTeen','Teen'],['speaksSpanish','Speaks Spanish']].map(([key, label]) => (
                        <label key={key} className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: 'oklch(0.22 0.018 55)' }}>
                          <input type="checkbox" checked={(editForm as any)[key]} onChange={e => setEditForm(f => ({ ...f, [key]: e.target.checked }))} />{label}
                        </label>
                      ))}
                      <label className="flex items-center gap-1.5 text-xs" style={{ color: 'oklch(0.22 0.018 55)' }}>
                        Status
                        <select value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value as AttendeeRosterStatus }))} className="h-7 rounded border border-[oklch(0.80_0.018_75)] bg-white px-1"><option value="possible">Potential</option><option value="confirmed">Confirmed</option></select>
                      </label>
                    </div>
                    <div><label className="text-xs mb-1 block" style={{ color: 'oklch(0.52 0.022 65)' }}>Who do they know at THV?</label><div className="flex flex-wrap gap-1.5 mb-1.5">{TEAM_MEMBERS.map(m => <button key={m} type="button" onClick={() => toggleEditKnows(m)} className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${editForm.knowsAtTHV.includes(m) ? 'bg-[oklch(0.50_0.18_250)] text-white border-[oklch(0.50_0.18_250)]' : 'bg-white border-[oklch(0.84_0.018_75)] text-[oklch(0.52_0.022_65)]'}`}>{m}</button>)}</div><Input value={editForm.knowsOther} onChange={e => setEditForm(f => ({ ...f, knowsOther: e.target.value }))} placeholder="Other (type a name)" className="text-sm h-8" /></div>
                    <div><label className="text-xs mb-0.5 block" style={{ color: 'oklch(0.52 0.022 65)' }}>Notes</label><Textarea value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="text-sm" /></div>
                    <div className="flex gap-2"><Button size="sm" onClick={() => handleSaveEdit(a.id)} style={{ background: 'oklch(0.22 0.018 55)', color: 'oklch(0.96 0.008 75)' }}>Save</Button><Button size="sm" variant="outline" onClick={() => setEditingAttendeeId(null)}>Cancel</Button></div>
                  </div>
                ) : (
                  <>
                    {a.email && <div className="flex items-center gap-2 text-xs"><Mail size={11} style={{ color: 'oklch(0.62 0.012 65)' }} /><span style={{ color: 'oklch(0.40 0.018 55)' }}>{a.email}</span></div>}
                    {a.phone && <div className="flex items-center gap-2 text-xs"><Phone size={11} style={{ color: 'oklch(0.62 0.012 65)' }} /><span style={{ color: 'oklch(0.40 0.018 55)' }}>{a.phone}</span></div>}
                    {a.skills.length > 0 && <div className="flex flex-wrap gap-1 pt-0.5">{a.skills.map((s: string) => <span key={s} className="text-[10px] px-1.5 py-0.5 rounded-full bg-[oklch(0.88_0.022_72)] text-[oklch(0.28_0.018_55)]">{normalizeSkill(s)}</span>)}</div>}
                    {a.knowsAtTHV && a.knowsAtTHV.length > 0 && <p className="text-xs" style={{ color: 'oklch(0.52 0.022 65)' }}>Knows: {a.knowsAtTHV.join(', ')}</p>}
                    {a.notes && <p className="text-xs italic" style={{ color: 'oklch(0.52 0.022 65)' }}>{a.notes}</p>}
                    <div className="mt-2 flex flex-wrap items-center gap-3"><button onClick={() => startEditAttendee(a)} className="text-xs" style={{ color: 'oklch(0.50 0.18 250)' }}>Edit</button>{tripOptions.filter(option => option.id !== trip.id).length > 0 && <button onClick={() => setShowLaterTripFor(showLaterTripFor === a.id ? null : a.id)} className="text-xs text-[oklch(0.40_0.08_250)]">Go on a later trip</button>}</div>
                    {showLaterTripFor === a.id && <div className="mt-2 rounded-md bg-[oklch(0.97_0.02_250)] p-2"><label className="block text-xs text-[oklch(0.42_0.018_55)]">Which trip?<select aria-label={`Choose a later trip for ${a.name}`} defaultValue="" onChange={event => { if (event.target.value) { void reassignAttendee(a, event.target.value); setShowLaterTripFor(null); } }} className="mt-1 h-8 w-full rounded border border-[oklch(0.75_0.12_250)] bg-white px-2 text-sm"><option value="" disabled>Select a future trip</option>{tripOptions.filter(option => option.id !== trip.id).map(option => <option key={option.id} value={option.id}>{formatDate(option.startDate)} · {option.name}</option>)}</select></label></div>}
                  </>
                )}
              </div>
            )}
          </div>
          </div>
        ))}
        </div></div>
      </div>
    </div>
  );
}


export default function Trips() {
  const { store, addTrip, updateTrip, deleteTrip } = useDashboard();
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];
  const upcoming = store.trips.filter(t => (t.endDate ?? t.startDate) >= today).sort((a, b) => a.startDate.localeCompare(b.startDate));
  const past = store.trips.filter(t => (t.endDate ?? t.startDate) < today).sort((a, b) => b.startDate.localeCompare(a.startDate));

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

      <UsanaGardenTowerPanel trips={store.trips} onSaveTrip={updateTrip} />

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
                onEdit={() => setEditId(trip.id)}
                onDelete={() => deleteTrip(trip.id)}
                isEditing={editId === trip.id}
                workspaceOpen={workspaceId === trip.id}
                onToggleWorkspace={() => setWorkspaceId(current => current === trip.id ? null : trip.id)}
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
                onEdit={() => setEditId(trip.id)}
                onDelete={() => deleteTrip(trip.id)}
                isEditing={editId === trip.id}
                workspaceOpen={workspaceId === trip.id}
                onToggleWorkspace={() => setWorkspaceId(current => current === trip.id ? null : trip.id)}
                onSave={(updates) => { updateTrip(trip.id, updates); setEditId(null); }}
                onCancelEdit={() => setEditId(null)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Add trip modal */}
      {showAdd && <AddTripModal onClose={() => setShowAdd(false)} onAdd={addTrip} />}
    </div>
  );
}

function UsanaGardenTowerPanel({ trips, onSaveTrip }: { trips: Trip[]; onSaveTrip: (id: string, updates: Partial<Trip>) => void }) {
  const [open, setOpen] = useState(false);
  const [project, setProject] = useState<NonNullable<TripOperations['usanaProject']>>({ contactName: 'Michelle Benedict', contactEmail: 'michelle.benedict@usanainc.com', contactPhone: '8019524518', contactAddress: '2538 S. 3850 W. Salt Lake City, UT 84120' });
  const projectQuery = trpc.usana.get.useQuery();
  const updateProject = trpc.usana.update.useMutation({ onSuccess: () => projectQuery.refetch() });
  const totalGardenTowers = trips.reduce((sum, trip) => sum + (trip.operations?.gardenTowers ?? 0), 0);
  const totalUsanaGrantDollars = receivedUsanaGrantTotal(trips);

  useEffect(() => {
    setProject(projectQuery.data ?? { contactName: 'Michelle Benedict', contactEmail: 'michelle.benedict@usanainc.com', contactPhone: '8019524518', contactAddress: '2538 S. 3850 W. Salt Lake City, UT 84120' });
  }, [projectQuery.data]);

  const saveProject = () => {
    void updateProject.mutateAsync(project);
  };
  const saveTripTowerFields = (trip: Trip, patch: Partial<TripOperations>) => onSaveTrip(trip.id, { operations: { ...trip.operations, ...patch } });

  return <section className="mb-8 overflow-hidden rounded-xl border border-[oklch(0.70_0.11_315)] bg-[oklch(0.98_0.018_315)]">
    <button onClick={() => setOpen(value => !value)} className="flex w-full items-center justify-between gap-3 p-5 text-left"><div><p className="text-xs uppercase tracking-[0.14em] text-[oklch(0.47_0.13_315)]">USANA</p><h2 className="font-display text-2xl text-[oklch(0.30_0.10_315)]">USANA Garden Tower Project</h2><p className="mt-1 text-xs text-[oklch(0.45_0.03_315)]">Global contract details plus V2V-specific tower plans, funds, and Guatemala documents.</p></div>{open ? <ChevronUp /> : <ChevronDown />}</button>
    {open && <div className="border-t border-[oklch(0.84_0.035_315)] p-5"><div className="grid gap-3 sm:grid-cols-2"><Input placeholder="Contract / account number" value={project.contractNumber ?? ''} onChange={e => setProject(value => ({ ...value, contractNumber: e.target.value }))} onBlur={saveProject}/><Input placeholder="USANA contact name" value={project.contactName ?? ''} onChange={e => setProject(value => ({ ...value, contactName: e.target.value }))} onBlur={saveProject}/><Input placeholder="USANA contact email" type="email" value={project.contactEmail ?? ''} onChange={e => setProject(value => ({ ...value, contactEmail: e.target.value }))} onBlur={saveProject}/><Input placeholder="USANA contact phone" value={project.contactPhone ?? ''} onChange={e => setProject(value => ({ ...value, contactPhone: e.target.value }))} onBlur={saveProject}/><Input className="sm:col-span-2" placeholder="USANA contact address" value={project.contactAddress ?? ''} onChange={e => setProject(value => ({ ...value, contactAddress: e.target.value }))} onBlur={saveProject}/></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-lg border border-[oklch(0.83_0.05_315)] bg-white p-3"><p className="text-xs uppercase tracking-wide text-[oklch(0.47_0.13_315)]">Total garden towers erected</p><p className="mt-1 font-display text-3xl text-[oklch(0.30_0.10_315)]">{totalGardenTowers.toLocaleString()}</p><p className="mt-1 text-xs text-[oklch(0.45_0.03_315)]">To change this number, alter the number of Garden Towers on the individual V2V trips below.</p></div><div className="rounded-lg border border-[oklch(0.83_0.05_315)] bg-white p-3"><p className="text-xs uppercase tracking-wide text-[oklch(0.47_0.13_315)]">Total USANA funds received</p><p className="mt-1 font-display text-3xl text-[oklch(0.30_0.10_315)]">${totalUsanaGrantDollars.toLocaleString()}</p><p className="mt-1 text-xs text-[oklch(0.45_0.03_315)]">Calculated from expedition grants marked received below.</p></div></div>
      {trips.length === 0 ? <p className="mt-4 text-sm text-[oklch(0.52_0.022_65)]">Create a trip first to begin V2V Garden Tower planning.</p> : <div className="mt-6 space-y-3"><h3 className="font-display text-xl text-[oklch(0.22_0.018_55)]">V2V trip plans</h3>{[...trips].sort((first, second) => first.startDate.localeCompare(second.startDate)).map(trip => <GardenTowerTripRow key={trip.id} trip={trip} onSave={saveTripTowerFields}/>)}</div>}
    </div>}
  </section>;
}

function GardenTowerTripRow({ trip, onSave }: { trip: Trip; onSave: (trip: Trip, patch: Partial<TripOperations>) => void }) {
  const [towers, setTowers] = useState(String(trip.operations?.gardenTowers ?? ''));
  const [funds, setFunds] = useState(String(trip.operations?.gardenTowerFundsUsd ?? ''));
  const [fundsReceived, setFundsReceived] = useState(Boolean(trip.operations?.gardenTowerFundsReceived));
  const documentKey = trip.operations?.gardenTowerDocumentUrl ?? 'usana/garden-tower/unavailable.pdf';
  const documentQuery = trpc.trips.getGardenTowerDocumentUrl.useQuery({ key: documentKey }, { enabled: false, retry: false });
  useEffect(() => { setTowers(String(trip.operations?.gardenTowers ?? '')); setFunds(String(trip.operations?.gardenTowerFundsUsd ?? '')); setFundsReceived(Boolean(trip.operations?.gardenTowerFundsReceived)); }, [trip.id, trip.operations?.gardenTowers, trip.operations?.gardenTowerFundsUsd, trip.operations?.gardenTowerFundsReceived]);
  const openDocument = async () => { const response = await documentQuery.refetch(); if (response.data) window.open(response.data, '_blank', 'noopener,noreferrer'); };
  return <div className="rounded-lg border border-[oklch(0.86_0.02_75)] bg-white p-4"><div className="mb-3 flex flex-wrap items-baseline justify-between gap-2"><div><p className="font-medium text-sm text-[oklch(0.22_0.018_55)]">{trip.name}</p><p className="text-xs text-[oklch(0.52_0.022_65)]">{formatDate(trip.startDate)}</p></div>{trip.operations?.gardenTowerDocumentUrl && <button onClick={() => void openDocument()} className="text-xs text-[oklch(0.48_0.16_250)]">Download existing Guatemala GT assignments PDF</button>}</div><div className="grid gap-2 sm:grid-cols-2"><Input type="number" min="0" placeholder="Number of Garden Towers THV committed to" value={towers} onChange={e => setTowers(e.target.value)} onBlur={() => onSave(trip, { gardenTowers: Number(towers) || undefined })}/><Input type="number" min="0" placeholder="Garden Tower Funds from USANA" value={funds} onChange={e => setFunds(e.target.value)} onBlur={() => onSave(trip, { gardenTowerFundsUsd: Number(funds) || undefined })}/></div><label className="mt-3 flex items-center gap-2 text-xs text-[oklch(0.30_0.10_315)]"><input type="checkbox" checked={fundsReceived} onChange={event => { const checked = event.target.checked; setFundsReceived(checked); onSave(trip, { gardenTowerFundsReceived: checked }); }} />Funds received from USANA</label></div>;
}

interface TripCardProps {
  trip: Trip;
  onEdit: () => void;
  onDelete: () => void;
  isEditing: boolean;
  workspaceOpen: boolean;
  onToggleWorkspace: () => void;
  onSave: (updates: Partial<Trip>) => void;
  onCancelEdit: () => void;
}

function TripCard({ trip, onEdit, onDelete, isEditing, workspaceOpen, onToggleWorkspace, onSave, onCancelEdit }: TripCardProps) {
  const [editFields, setEditFields] = useState({
    name: trip.name,
    startDate: trip.startDate ?? '',
    endDate: trip.endDate ?? '',
    teamMembers: [...trip.teamMembers],
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
      <div>
        <div>
          <p className="text-xs uppercase tracking-widest mb-1.5" style={{ color: 'oklch(0.62 0.012 65)' }}>Team</p>
          <div className="flex flex-wrap gap-1.5">
            {trip.teamMembers.map(m => (
              <span key={m} className="px-2 py-0.5 rounded-full text-xs bg-[oklch(0.22_0.018_55)] text-[oklch(0.96_0.008_75)]">{m}</span>
            ))}
          </div>
        </div>
      </div>
      {trip.notes && (
        <p className="text-sm mt-3" style={{ color: 'oklch(0.52 0.022 65)' }}>{trip.notes}</p>
      )}
      <div className="mt-4 border-t border-[oklch(0.90_0.012_76)] pt-3"><button onClick={onToggleWorkspace} className="inline-flex items-center gap-1 rounded-md bg-[oklch(0.94_0.012_78)] px-3 py-1.5 text-xs font-medium text-[oklch(0.28_0.018_55)] hover:bg-[oklch(0.90_0.018_76)]">{workspaceOpen ? 'Close trip workspace' : 'Open trip workspace'} <ChevronDown className={workspaceOpen ? 'rotate-180 transition-transform' : 'transition-transform'} size={14}/></button></div>
      {workspaceOpen && <TripWorkspace trip={trip} onSave={(operations) => onSave({ operations })} />}
    </div>
  );
}

function TripWorkspace({ trip, onSave }: { trip: Trip; onSave: (operations: TripOperations) => void }) {
  const { store } = useDashboard();
  const [tab, setTab] = useState<'attendees' | 'expenses' | 'tasks' | 'itinerary' | 'assignments' | 'docs' | 'photos' | 'flights'>('attendees');
  const [expense, setExpense] = useState<Partial<TripExpense>>({});
  const [task, setTask] = useState<Partial<TripPlanningTask>>({});
  const utils = trpc.useUtils();
  const updateAttendee = trpc.trips.updateAttendee.useMutation({ onSuccess: () => utils.trips.list.invalidate() });
  const ops = trip.operations ?? {};
  const expenses = ops.expenses ?? [];
  const tasks = [...(ops.planningTasks ?? [])].sort((a, b) => {
    if (Boolean(a.completed) !== Boolean(b.completed)) return a.completed ? 1 : -1;
    return (a.dueDate ?? '9999-12-31').localeCompare(b.dueDate ?? '9999-12-31');
  });
  const going = (trip.attendees ?? []).filter(isGoingAttendee);
  const leaders = getTripLeaders(trip.teamMembers, ops);
  const flightTravelers: FlightTraveler[] = [
    ...leaders.map(leader => ({ name: leader.name, flight: ops.leaderLogistics?.[leader.name]?.flight })),
    ...going.map(attendee => ({ name: attendee.name, flight: attendee.tripLogistics?.flight })),
  ];
  const saveOps = (updates: Partial<TripOperations>) => onSave({ ...ops, ...updates });
  const markDeposit = async (a: TripAttendee, paid: boolean) => {
    await updateAttendee.mutateAsync({ id: a.id, medicalProfile: { ...a.medicalProfile, tripLogistics: { ...a.tripLogistics, depositPaid: paid, depositDate: paid ? new Date().toISOString().slice(0, 10) : undefined } } });
  };
  const updateFlight = async (a: TripAttendee, field: keyof TripFlightDetails, value: string) => {
    await updateAttendee.mutateAsync({ id: a.id, medicalProfile: { ...a.medicalProfile, tripLogistics: { ...a.tripLogistics, flight: { ...a.tripLogistics?.flight, [field]: value } } } });
  };
  const addExpense = () => {
    if (!expense.description?.trim()) return;
    saveOps({ expenses: [...expenses, { id: nanoid(), description: expense.description.trim(), category: expense.category, subcategory: expense.subcategory, usdAmount: Number(expense.usdAmount) || undefined, quetzalAmount: Number(expense.quetzalAmount) || undefined, paymentOwner: expense.paymentOwner, receiptLink: expense.receiptLink, notes: expense.notes }] });
    setExpense({});
  };
  const addTask = () => {
    if (!task.title?.trim()) return;
    saveOps({ planningTasks: [...tasks, { id: nanoid(), title: task.title.trim(), owner: task.owner, dueDate: task.dueDate, notes: task.notes, completed: false, position: tasks.length }] });
    setTask({});
  };
  const patchTask = (id: string, patch: Partial<TripPlanningTask>) => saveOps({ planningTasks: tasks.map(t => t.id === id ? { ...t, ...patch } : t) });
  const deleteTask = (id: string) => saveOps({ planningTasks: tasks.filter(taskItem => taskItem.id !== id) });
  const applyExpeditionTemplate = () => {
    if (hasExpeditionTodoTemplate(tasks)) return;
    const templateTasks = buildExpeditionTodoTemplateTasks(key => `template-${key}-${nanoid()}`);
    saveOps({ planningTasks: [...(ops.planningTasks ?? []), ...templateTasks.map((templateTask, index) => ({ ...templateTask, position: (ops.planningTasks?.length ?? 0) + index }))] });
  };
  const assignmentPeople = Array.from(new Set([...leaders.map(leader => leader.name), ...going.map(attendee => attendee.name)])).sort((first, second) => first.localeCompare(second));
  const tabs = [['attendees', 'Attendees'], ['expenses', 'Trip expenses'], ['tasks', 'Trip to-do list'], ['itinerary', 'Trip itinerary'], ['assignments', 'Assignments'], ['docs', 'Trip Docs'], ['photos', 'Trip Photos'], ['flights', 'Flight compilation']] as const;
  return <div className="mt-5 border-t border-[oklch(0.84_0.018_75)] pt-4">
    <div className="flex gap-1 overflow-x-auto pb-2">{tabs.map(([key, label]) => <button key={key} onClick={() => setTab(key)} className={`whitespace-nowrap rounded-full px-3 py-1 text-xs ${tab === key ? 'bg-[oklch(0.22_0.018_55)] text-white' : 'bg-[oklch(0.93_0.015_78)] text-[oklch(0.42_0.018_55)]'}`}>{label}</button>)}</div>
    {tab === 'attendees' && <AttendeeSection trip={trip} onSaveOperations={saveOps} />}
    {tab === 'expenses' && <ExpenseWorkspace tripId={trip.id} expenses={expenses} ops={ops} expense={expense} setExpense={setExpense} onAdd={addExpense} onSave={saveOps}/>} 
    {tab === 'tasks' && <TripTodoTemplateList tasks={tasks} draft={task} onDraftChange={setTask} onAdd={addTask} onPatch={patchTask} onDelete={deleteTask} templateApplied={hasExpeditionTodoTemplate(tasks)} onApplyTemplate={applyExpeditionTemplate} />}
    {tab === 'itinerary' && <TripItinerary trip={trip} operations={ops} templateTrips={store.trips} onSave={saveOps} />}
    {tab === 'assignments' && <TripAssignments goingPeople={assignmentPeople} operations={ops} onSave={saveOps} />}
    {tab === 'docs' && <GuateTeamDocuments trip={trip} operations={ops} onSave={saveOps} />}
    {tab === 'photos' && <TripPhotoLinks operations={ops} onSave={saveOps} />}
    {tab === 'flights' && <div className="space-y-3 pt-3"><div className="rounded-lg border border-[oklch(0.80_0.08_145)] bg-[oklch(0.975_0.02_145)] p-3 text-xs text-[oklch(0.32_0.08_145)]">Use the Guatemala landing time to organize airport shuttles. Each time is entered in the local time of that airport. Changes save when you leave a field.</div>{leaders.map(leader => <FlightCompilationEntry key={`leader-flight-${leader.name}`} name={leader.name} leader flight={ops.leaderLogistics?.[leader.name]?.flight} onUpdate={(field, value) => saveOps({ leaderLogistics: { ...ops.leaderLogistics, [leader.name]: { ...ops.leaderLogistics?.[leader.name], flight: { ...ops.leaderLogistics?.[leader.name]?.flight, [field]: value } } } })} />)}{going.map(attendee => <FlightCompilationEntry key={attendee.id} name={attendee.name} flight={attendee.tripLogistics?.flight} onUpdate={(field, value) => void updateFlight(attendee, field, value)} />)}<div className="flex justify-end border-t border-[oklch(0.90_0.012_76)] pt-4"><Button size="sm" onClick={() => downloadFlightCompilationPdf(trip, flightTravelers)}>Download PDF</Button></div></div>}
  </div>;
}

function TripTodoList({ tasks, draft, onDraftChange, onAdd, onPatch, onDelete }: { tasks: TripPlanningTask[]; draft: Partial<TripPlanningTask>; onDraftChange: React.Dispatch<React.SetStateAction<Partial<TripPlanningTask>>>; onAdd: () => void; onPatch: (id: string, patch: Partial<TripPlanningTask>) => void; onDelete: (id: string) => void }) {
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [showCompleted, setShowCompleted] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Partial<TripPlanningTask>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const visibleTasks = tasks.filter(taskItem => showCompleted || !taskItem.completed);
  const groupOwners = ownerFilter === 'all' ? ['Amy', 'Kirsten', ...TASK_ASSIGNEES.filter(member => member !== 'Amy' && member !== 'Kirsten'), '__owner-required__'] : [ownerFilter];
  const completedCount = tasks.filter(taskItem => taskItem.completed).length;
  const ownerLabel = (owner: string) => owner === '__owner-required__' ? 'Owner required' : owner;
  const beginEdit = (taskItem: TripPlanningTask) => { setEditingId(taskItem.id); setEditing({ title: taskItem.title, owner: taskItem.owner ?? '', dueDate: taskItem.dueDate ?? '', notes: taskItem.notes ?? '' }); setConfirmDeleteId(null); };
  const saveEdit = () => { if (!editingId || !editing.title?.trim()) return; onPatch(editingId, { title: editing.title.trim(), owner: editing.owner || undefined, dueDate: editing.dueDate || undefined, notes: editing.notes || undefined }); setEditingId(null); setEditing({}); };
  return <div className="space-y-4 pt-3"><div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-[oklch(0.97_0.02_80)] p-3 text-xs text-[oklch(0.42_0.018_55)]"><span>Tasks are automatically ordered by due date. Choose a team member to see that person’s responsibilities for this trip.</span><Button size="sm" variant="outline" onClick={() => setShowCompleted(value => !value)}>{showCompleted ? 'Hide completed' : `Show completed (${completedCount})`}</Button></div><div className="flex flex-wrap gap-1.5"><button onClick={() => setOwnerFilter('all')} className={`rounded-full px-3 py-1 text-xs font-medium ${ownerFilter === 'all' ? 'bg-[oklch(0.22_0.018_55)] text-white' : 'bg-[oklch(0.93_0.015_78)] text-[oklch(0.42_0.018_55)]'}`}>All tasks</button>{TASK_ASSIGNEES.map(member => <button key={member} onClick={() => setOwnerFilter(member)} className={`rounded-full px-3 py-1 text-xs font-medium ${ownerFilter === member ? 'bg-[oklch(0.50_0.18_250)] text-white' : 'bg-[oklch(0.93_0.015_78)] text-[oklch(0.42_0.018_55)]'}`}>{member}</button>)}</div>{groupOwners.map(owner => { const groupTasks = visibleTasks.filter(taskItem => owner === '__owner-required__' ? !taskItem.owner : taskItem.owner === owner); if (!groupTasks.length && ownerFilter === 'all') return null; return <section key={owner} className="overflow-hidden rounded-lg border border-[oklch(0.87_0.018_75)] bg-white"><div className="flex items-center justify-between border-b border-[oklch(0.90_0.012_76)] bg-[oklch(0.985_0.008_80)] px-3 py-2"><h3 className="font-display text-lg text-[oklch(0.22_0.018_55)]">{ownerLabel(owner)}</h3><span className="text-xs text-[oklch(0.52_0.022_65)]">{groupTasks.length} task{groupTasks.length === 1 ? '' : 's'}</span></div>{groupTasks.length ? groupTasks.map(taskItem => <div key={taskItem.id} className="border-b border-[oklch(0.93_0.008_76)] p-3 last:border-0">{editingId === taskItem.id ? <div className="grid gap-2 sm:grid-cols-2"><Input value={editing.title ?? ''} onChange={event => setEditing(value => ({ ...value, title: event.target.value }))} placeholder="Task"/><select value={editing.owner ?? ''} onChange={event => setEditing(value => ({ ...value, owner: event.target.value }))} className="rounded border border-[oklch(0.84_0.018_75)] bg-white px-2 text-sm"><option value="">Select owner</option>{TASK_ASSIGNEES.map(member => <option key={member} value={member}>{member}</option>)}</select><Input type="date" value={editing.dueDate ?? ''} onChange={event => setEditing(value => ({ ...value, dueDate: event.target.value }))}/><Input value={editing.notes ?? ''} onChange={event => setEditing(value => ({ ...value, notes: event.target.value }))} placeholder="Notes"/><div className="flex gap-2 sm:col-span-2"><Button size="sm" disabled={!editing.title?.trim() || !editing.owner} onClick={saveEdit}>Save</Button><Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button></div></div> : <div className="flex items-center gap-2"><input aria-label={`Mark ${taskItem.title} complete`} type="checkbox" checked={!!taskItem.completed} onChange={event => onPatch(taskItem.id, { completed: event.target.checked })}/><div className="min-w-0 flex-1"><p className={`text-sm ${taskItem.completed ? 'line-through text-[oklch(0.55_0.018_65)]' : 'text-[oklch(0.22_0.018_55)]'}`}>{taskItem.title}</p><p className="text-xs text-[oklch(0.52_0.022_65)]">{taskItem.dueDate ? `Due ${formatDate(taskItem.dueDate)}` : 'No due date'}{taskItem.notes ? ` · ${taskItem.notes}` : ''}</p></div><select aria-label={`Assign ${taskItem.title}`} value={taskItem.owner ?? ''} onChange={event => event.target.value && onPatch(taskItem.id, { owner: event.target.value })} className="h-8 rounded border border-[oklch(0.84_0.018_75)] bg-white px-2 text-xs"><option value="">Select owner</option>{TASK_ASSIGNEES.map(member => <option key={member} value={member}>{member}</option>)}</select><button onClick={() => beginEdit(taskItem)} className="rounded p-1.5 hover:bg-[oklch(0.92_0.012_78)]" aria-label={`Edit ${taskItem.title}`}><Edit2 size={14} /></button>{confirmDeleteId === taskItem.id ? <span className="flex items-center gap-1"><button onClick={() => { onDelete(taskItem.id); setConfirmDeleteId(null); }} className="rounded bg-[oklch(0.55_0.20_27)] px-2 py-1 text-xs text-white">Delete</button><button onClick={() => setConfirmDeleteId(null)} className="rounded px-2 py-1 text-xs text-[oklch(0.52_0.022_65)]">Cancel</button></span> : <button onClick={() => { setConfirmDeleteId(taskItem.id); setEditingId(null); }} className="rounded p-1.5 text-[oklch(0.55_0.20_27)] hover:bg-[oklch(0.95_0.08_27)]" aria-label={`Delete ${taskItem.title}`}><Trash2 size={14} /></button>}</div>}</div>) : <p className="px-3 py-4 text-sm text-[oklch(0.52_0.022_65)]">No tasks assigned here yet.</p>}</section>; })}<div className="grid gap-2 rounded-lg border border-dashed border-[oklch(0.78_0.018_75)] bg-[oklch(0.99_0.004_80)] p-3 sm:grid-cols-2"><Input placeholder="Task" value={draft.title ?? ''} onChange={event => onDraftChange(value => ({ ...value, title: event.target.value }))}/><select value={draft.owner ?? ''} onChange={event => onDraftChange(value => ({ ...value, owner: event.target.value }))} className="rounded border border-[oklch(0.8_0.018_75)] bg-white px-2 text-sm"><option value="">Select owner</option>{TASK_ASSIGNEES.map(member => <option key={member} value={member}>{member}</option>)}</select><Input type="date" value={draft.dueDate ?? ''} onChange={event => onDraftChange(value => ({ ...value, dueDate: event.target.value }))}/><Input placeholder="Notes" value={draft.notes ?? ''} onChange={event => onDraftChange(value => ({ ...value, notes: event.target.value }))}/><div className="sm:col-span-2"><Button size="sm" disabled={!draft.title?.trim() || !draft.owner} onClick={onAdd}>Add trip to-do</Button></div></div></div>;
}

function TripTodoListWithEntry({ tasks, draft, onDraftChange, onAdd, onPatch, onDelete }: { tasks: TripPlanningTask[]; draft: Partial<TripPlanningTask>; onDraftChange: React.Dispatch<React.SetStateAction<Partial<TripPlanningTask>>>; onAdd: () => void; onPatch: (id: string, patch: Partial<TripPlanningTask>) => void; onDelete: (id: string) => void }) {
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [showCompleted, setShowCompleted] = useState(false);
  const [showEntry, setShowEntry] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Partial<TripPlanningTask>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const visibleTasks = tasks.filter(taskItem => showCompleted || !taskItem.completed);
  const completedCount = tasks.filter(taskItem => taskItem.completed).length;
  const groupOwners = ownerFilter === 'all'
    ? ['Amy', 'Kirsten', ...TASK_ASSIGNEES.filter(member => member !== 'Amy' && member !== 'Kirsten'), '__owner-required__']
    : [ownerFilter];
  const ownerLabel = (owner: string) => owner === '__owner-required__' ? 'Owner required' : owner;
  const beginEdit = (taskItem: TripPlanningTask) => {
    setEditingId(taskItem.id);
    setEditing({ title: taskItem.title, owner: taskItem.owner ?? '', dueDate: taskItem.dueDate ?? '', notes: taskItem.notes ?? '' });
    setConfirmDeleteId(null);
  };
  const saveEdit = () => {
    if (!editingId || !editing.title?.trim() || !editing.owner) return;
    onPatch(editingId, { title: editing.title.trim(), owner: editing.owner, dueDate: editing.dueDate || undefined, notes: editing.notes || undefined });
    setEditingId(null);
    setEditing({});
  };
  const saveNewTask = () => {
    onAdd();
    setShowEntry(false);
  };

  return (
    <div className="space-y-4 pt-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-[oklch(0.97_0.02_80)] p-3 text-xs text-[oklch(0.42_0.018_55)]">
        <span>Tasks are automatically ordered by due date. Choose a team member to see that person’s responsibilities for this trip.</span>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setShowEntry(value => !value)}><Plus size={14} className="mr-1" />{showEntry ? 'Close add to-do' : 'Add to-do'}</Button>
          <Button size="sm" variant="outline" onClick={() => setShowCompleted(value => !value)}>{showCompleted ? 'Hide completed' : `Show completed (${completedCount})`}</Button>
        </div>
      </div>

      {showEntry && <div className="grid gap-2 rounded-lg border border-dashed border-[oklch(0.78_0.018_75)] bg-[oklch(0.99_0.004_80)] p-3 sm:grid-cols-2">
        <Input placeholder="Task" value={draft.title ?? ''} onChange={event => onDraftChange(value => ({ ...value, title: event.target.value }))} />
        <select value={draft.owner ?? ''} onChange={event => onDraftChange(value => ({ ...value, owner: event.target.value }))} className="rounded border border-[oklch(0.8_0.018_75)] bg-white px-2 text-sm"><option value="">Select owner</option>{TASK_ASSIGNEES.map(member => <option key={member} value={member}>{member}</option>)}</select>
        <Input type="date" value={draft.dueDate ?? ''} onChange={event => onDraftChange(value => ({ ...value, dueDate: event.target.value }))} />
        <Input placeholder="Notes" value={draft.notes ?? ''} onChange={event => onDraftChange(value => ({ ...value, notes: event.target.value }))} />
        <div className="flex gap-2 sm:col-span-2"><Button size="sm" disabled={!draft.title?.trim() || !draft.owner} onClick={saveNewTask}>Save to-do</Button><Button size="sm" variant="outline" onClick={() => setShowEntry(false)}>Cancel</Button></div>
      </div>}

      <div className="flex flex-wrap gap-1.5">
        <button onClick={() => setOwnerFilter('all')} className={`rounded-full px-3 py-1 text-xs font-medium ${ownerFilter === 'all' ? 'bg-[oklch(0.22_0.018_55)] text-white' : 'bg-[oklch(0.93_0.015_78)] text-[oklch(0.42_0.018_55)]'}`}>All tasks</button>
        {TASK_ASSIGNEES.map(member => <button key={member} onClick={() => setOwnerFilter(member)} className={`rounded-full px-3 py-1 text-xs font-medium ${ownerFilter === member ? 'bg-[oklch(0.50_0.18_250)] text-white' : 'bg-[oklch(0.93_0.015_78)] text-[oklch(0.42_0.018_55)]'}`}>{member}</button>)}
      </div>

      {groupOwners.map(owner => {
        const groupTasks = visibleTasks.filter(taskItem => owner === '__owner-required__' ? !taskItem.owner : taskItem.owner === owner);
        if (!groupTasks.length && ownerFilter === 'all') return null;
        return (
          <section key={owner} className="overflow-hidden rounded-lg border border-[oklch(0.87_0.018_75)] bg-white">
            <div className="flex items-center justify-between border-b border-[oklch(0.90_0.012_76)] bg-[oklch(0.985_0.008_80)] px-3 py-2">
              <h3 className="font-display text-lg text-[oklch(0.22_0.018_55)]">{ownerLabel(owner)}</h3>
              <span className="text-xs text-[oklch(0.52_0.022_65)]">{groupTasks.length} task{groupTasks.length === 1 ? '' : 's'}</span>
            </div>
            {groupTasks.length ? groupTasks.map(taskItem => (
              <div key={taskItem.id} className="border-b border-[oklch(0.93_0.008_76)] p-3 last:border-0">
                {editingId === taskItem.id ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input value={editing.title ?? ''} onChange={event => setEditing(value => ({ ...value, title: event.target.value }))} placeholder="Task" />
                    <select value={editing.owner ?? ''} onChange={event => setEditing(value => ({ ...value, owner: event.target.value }))} className="rounded border border-[oklch(0.84_0.018_75)] bg-white px-2 text-sm"><option value="">Select owner</option>{TASK_ASSIGNEES.map(member => <option key={member} value={member}>{member}</option>)}</select>
                    <Input type="date" value={editing.dueDate ?? ''} onChange={event => setEditing(value => ({ ...value, dueDate: event.target.value }))} />
                    <Input value={editing.notes ?? ''} onChange={event => setEditing(value => ({ ...value, notes: event.target.value }))} placeholder="Notes" />
                    <div className="flex gap-2 sm:col-span-2"><Button size="sm" disabled={!editing.title?.trim() || !editing.owner} onClick={saveEdit}>Save</Button><Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button></div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <input aria-label={`Mark ${taskItem.title} complete`} type="checkbox" checked={!!taskItem.completed} onChange={event => onPatch(taskItem.id, { completed: event.target.checked })} />
                    <div className="min-w-0 flex-1"><p className={`text-sm ${taskItem.completed ? 'line-through text-[oklch(0.55_0.018_65)]' : 'text-[oklch(0.22_0.018_55)]'}`}>{taskItem.title}</p><p className="text-xs text-[oklch(0.52_0.022_65)]">{taskItem.dueDate ? `Due ${formatDate(taskItem.dueDate)}` : 'No due date'}{taskItem.notes ? ` · ${taskItem.notes}` : ''}</p></div>
                    <select aria-label={`Assign ${taskItem.title}`} value={taskItem.owner ?? ''} onChange={event => event.target.value && onPatch(taskItem.id, { owner: event.target.value })} className="h-8 rounded border border-[oklch(0.84_0.018_75)] bg-white px-2 text-xs"><option value="">Select owner</option>{TASK_ASSIGNEES.map(member => <option key={member} value={member}>{member}</option>)}</select>
                    <button onClick={() => beginEdit(taskItem)} className="rounded p-1.5 hover:bg-[oklch(0.92_0.012_78)]" aria-label={`Edit ${taskItem.title}`}><Edit2 size={14} /></button>
                    {confirmDeleteId === taskItem.id ? <span className="flex items-center gap-1"><button onClick={() => { onDelete(taskItem.id); setConfirmDeleteId(null); }} className="rounded bg-[oklch(0.55_0.20_27)] px-2 py-1 text-xs text-white">Delete</button><button onClick={() => setConfirmDeleteId(null)} className="rounded px-2 py-1 text-xs text-[oklch(0.52_0.022_65)]">Cancel</button></span> : <button onClick={() => { setConfirmDeleteId(taskItem.id); setEditingId(null); }} className="rounded p-1.5 text-[oklch(0.55_0.20_27)] hover:bg-[oklch(0.95_0.08_27)]" aria-label={`Delete ${taskItem.title}`}><Trash2 size={14} /></button>}
                  </div>
                )}
              </div>
            )) : <p className="px-3 py-4 text-sm text-[oklch(0.52_0.022_65)]">No tasks assigned here yet.</p>}
          </section>
        );
      })}

    </div>
  );
}

function AddTripModal({ onClose, onAdd }: { onClose: () => void; onAdd: (t: any) => void }) {
  const [form, setForm] = useState({
    name: '', startDate: '', endDate: '', teamMembers: [] as string[], notes: ''
  });
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const toggle = (key: 'teamMembers', val: string) => {
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
