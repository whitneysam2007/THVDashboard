// THV Donor Dashboard — Initiatives Page with Gantt-style timeline
// Shows organizational initiatives as a visual timeline + editable list

import { useState, useMemo } from 'react';
import { useDashboard } from '@/contexts/DashboardContext';
import { Initiative } from '@/lib/types';
import { formatDate, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, X, Edit2, Check, Trash2 } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'not-started', label: 'Not Started', color: 'oklch(0.62 0.012 65)', bg: 'oklch(0.92 0.005 65)' },
  { value: 'in-progress', label: 'In Progress', color: 'oklch(0.45 0.14 88)', bg: 'oklch(0.94 0.08 88)' },
  { value: 'complete', label: 'Complete', color: 'oklch(0.45 0.13 145)', bg: 'oklch(0.92 0.06 145)' },
  { value: 'delayed', label: 'Delayed', color: 'oklch(0.45 0.20 27)', bg: 'oklch(0.94 0.08 27)' },
] as const;

const CATEGORIES = ['Compliance', 'Communications', 'Fundraising', 'Events', 'Operations', 'Other'];
const TEAM_MEMBERS = ['Liz', 'Lauren', 'Anna', 'Brenley', 'Emily', 'Amy', 'Kirsten'];

// Single uniform bar color for the timeline — status is tracked on the cards below,
// not encoded in the Gantt.
const BAR_FILL = 'oklch(0.42 0.045 55)';
const BAR_LABEL = 'oklch(0.30 0.03 55)';

// Left gutter width for initiative names. Shared by the header and every row so
// the month axis lines up with the bars.
const LABEL_W = 200;

function shortDate(iso: string) {
  if (!iso) return '';
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''));
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getStatusStyle(status: Initiative['status']) {
  return STATUS_OPTIONS.find(s => s.value === status) ?? STATUS_OPTIONS[0];
}

export default function Initiatives() {
  const { store, addInitiative, updateInitiative, deleteInitiative } = useDashboard();
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const initiatives = store.initiatives;

  const filtered = filterStatus === 'all'
    ? initiatives
    : initiatives.filter(i => i.status === filterStatus);

  // Gantt chart date range: min start to max end across all initiatives
  const { ganttStart, ganttEnd, totalDays } = useMemo(() => {
    if (!initiatives.length) {
      const now = new Date();
      return { ganttStart: now, ganttEnd: new Date(now.getFullYear(), now.getMonth() + 6, 1), totalDays: 180 };
    }
    // Parse as local midnight so a date-only string does not shift a day via UTC.
    const parse = (s: string) => new Date(s + (s.length === 10 ? 'T00:00:00' : '')).getTime();
    const starts = initiatives.map(i => parse(i.startDate));
    const ends = initiatives.map(i => parse(i.endDate));
    const minStart = new Date(Math.min(...starts));
    const maxEnd = new Date(Math.max(...ends));
    // Snap to whole months so every axis tick is a real month boundary, and leave
    // room on the right for the end-date label of the last bar.
    minStart.setDate(1);
    maxEnd.setMonth(maxEnd.getMonth() + 1, 1);
    const totalDays = Math.ceil((maxEnd.getTime() - minStart.getTime()) / (1000 * 60 * 60 * 24));
    return { ganttStart: minStart, ganttEnd: maxEnd, totalDays: Math.max(1, totalDays) };
  }, [initiatives]);

  const getBarStyle = (initiative: Initiative) => {
    const parse = (s: string) => new Date(s + (s.length === 10 ? 'T00:00:00' : ''));
    const start = parse(initiative.startDate);
    const end = parse(initiative.endDate);
    const leftPct = ((start.getTime() - ganttStart.getTime()) / (1000 * 60 * 60 * 24)) / totalDays * 100;
    // Add one day so a single-day initiative still renders as a visible span.
    const days = Math.max(1, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24) + 1);
    const widthPct = days / totalDays * 100;
    return { leftPct: Math.max(0, leftPct), widthPct: Math.max(0.8, widthPct) };
  };

  // Generate month markers for Gantt header
  const monthMarkers = useMemo(() => {
    const markers: { label: string; leftPct: number }[] = [];
    const d = new Date(ganttStart);
    d.setDate(1);
    while (d <= ganttEnd) {
      const leftPct = ((d.getTime() - ganttStart.getTime()) / (1000 * 60 * 60 * 24)) / totalDays * 100;
      if (leftPct >= 0 && leftPct <= 100) {
        markers.push({
          label: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          leftPct,
        });
      }
      d.setMonth(d.getMonth() + 1);
    }
    return markers;
  }, [ganttStart, ganttEnd, totalDays]);

  return (
    <div className="p-6 lg:p-8 max-w-[1200px]">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-4xl mb-1" style={{ color: 'oklch(0.22 0.018 55)' }}>Initiatives</h1>
          <p className="text-sm" style={{ color: 'oklch(0.52 0.022 65)' }}>
            {initiatives.filter(i => i.status === 'in-progress').length} in progress · {initiatives.filter(i => i.status === 'not-started').length} not started
          </p>
        </div>
        <Button
          onClick={() => setShowAdd(true)}
          style={{ background: 'oklch(0.22 0.018 55)', color: 'oklch(0.96 0.008 75)' }}
          className="flex items-center gap-2"
        >
          <Plus size={15} /> Add Initiative
        </Button>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap mb-6">
        {[{ value: 'all', label: 'All' }, ...STATUS_OPTIONS].map(s => (
          <button
            key={s.value}
            onClick={() => setFilterStatus(s.value)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
              filterStatus === s.value
                ? 'border-[oklch(0.22_0.018_55)] bg-[oklch(0.22_0.018_55)] text-[oklch(0.96_0.008_75)]'
                : 'border-[oklch(0.84_0.018_75)] text-[oklch(0.52_0.022_65)] hover:border-[oklch(0.60_0.018_65)]'
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Gantt Chart */}
      <div className="mb-8 rounded-lg border border-[oklch(0.84_0.018_75)] bg-[oklch(0.985_0.008_80)] overflow-hidden">
        <div className="px-4 py-3 border-b border-[oklch(0.84_0.018_75)]">
          <p className="text-xs uppercase tracking-widest" style={{ color: 'oklch(0.52 0.022 65)' }}>Timeline Overview</p>
        </div>
        <div className="overflow-x-auto">
          <div style={{ minWidth: 700 }}>
            {/* Month header */}
            <div className="relative h-8 border-b border-[oklch(0.84_0.018_75)]" style={{ marginLeft: LABEL_W }}>
              {monthMarkers.map((m, i) => (
                <div
                  key={i}
                  className="absolute top-0 h-full flex items-center border-l border-[oklch(0.90_0.014_78)]"
                  style={{ left: `${m.leftPct}%` }}
                >
                  <span className="text-xs pl-1.5 whitespace-nowrap" style={{ color: 'oklch(0.55 0.018 65)' }}>{m.label}</span>
                </div>
              ))}
            </div>
            {/* Rows */}
            {filtered.map(initiative => {
              const { leftPct, widthPct } = getBarStyle(initiative);
              // Place the end-date label just past the right edge of the bar, but
              // flip it inside-left if the bar ends too close to the right margin.
              const barEndPct = leftPct + widthPct;
              const labelFlips = barEndPct > 82;
              return (
                <div key={initiative.id} className="flex items-stretch border-b border-[oklch(0.92_0.012_78)] last:border-0 hover:bg-[oklch(0.965_0.012_80)] transition-colors">
                  {/* Label */}
                  <div className="flex-shrink-0 px-4 py-3" style={{ width: LABEL_W }}>
                    <p className="text-xs font-medium leading-tight truncate" style={{ color: 'oklch(0.22 0.018 55)' }}>{initiative.title}</p>
                    <p className="text-xs mt-0.5 truncate" style={{ color: 'oklch(0.62 0.012 65)' }}>{initiative.owner}</p>
                  </div>
                  {/* Bar area */}
                  <div className="flex-1 relative h-14">
                    {/* Month gridlines */}
                    {monthMarkers.map((m, i) => (
                      <div
                        key={i}
                        className="absolute top-0 bottom-0 w-px"
                        style={{ left: `${m.leftPct}%`, background: 'oklch(0.92 0.012 78)' }}
                      />
                    ))}
                    {/* End date label, above the bar */}
                    <div
                      className="absolute top-1.5 text-xs whitespace-nowrap font-medium"
                      style={{
                        left: labelFlips ? undefined : `${barEndPct}%`,
                        right: labelFlips ? `${100 - barEndPct}%` : undefined,
                        marginLeft: labelFlips ? 0 : 6,
                        marginRight: labelFlips ? 6 : 0,
                        color: BAR_LABEL,
                      }}
                    >
                      {shortDate(initiative.endDate)}
                    </div>
                    {/* Bar */}
                    <div
                      className="absolute rounded-full"
                      style={{
                        left: `${leftPct}%`,
                        width: `${widthPct}%`,
                        top: 30,
                        height: 10,
                        background: BAR_FILL,
                        minWidth: 6,
                      }}
                    />
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="py-8 text-center" style={{ color: 'oklch(0.62 0.012 65)' }}>
                <p className="text-sm">No initiatives match this filter.</p>
              </div>
            )}
          </div>
        </div>
        <div className="px-4 py-2.5 border-t border-[oklch(0.84_0.018_75)]">
          <p className="text-xs" style={{ color: 'oklch(0.58 0.018 65)' }}>
            Each bar spans start to end date. The date above each bar is its end date.
          </p>
        </div>
      </div>

      {/* Initiative cards list */}
      <div className="space-y-3">
        {filtered.map(initiative => {
          if (editId === initiative.id) {
            return (
              <EditInitiativeCard
                key={initiative.id}
                initiative={initiative}
                onSave={(updates) => { updateInitiative(initiative.id, updates); setEditId(null); }}
                onCancel={() => setEditId(null)}
              />
            );
          }
          const statusStyle = getStatusStyle(initiative.status);
          return (
            <div key={initiative.id} className="p-4 rounded-lg border border-[oklch(0.84_0.018_75)] bg-[oklch(0.985_0.008_80)]">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-display text-base" style={{ color: 'oklch(0.22 0.018 55)' }}>{initiative.title}</h3>
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ background: statusStyle.bg, color: statusStyle.color }}
                    >
                      {statusStyle.label}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs bg-[oklch(0.92_0.012_78)] text-[oklch(0.52_0.022_65)]">
                      {initiative.category}
                    </span>
                  </div>
                  {initiative.description && (
                    <p className="text-sm mb-2" style={{ color: 'oklch(0.52 0.022 65)' }}>{initiative.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs" style={{ color: 'oklch(0.62 0.012 65)' }}>
                    <span>{formatDate(initiative.startDate)} → {formatDate(initiative.endDate)}</span>
                    <span>Owner: {initiative.owner}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => setEditId(initiative.id)} className="p-1.5 rounded hover:bg-[oklch(0.92_0.012_78)]">
                    <Edit2 size={13} style={{ color: 'oklch(0.52 0.022 65)' }} />
                  </button>
                  <button onClick={() => deleteInitiative(initiative.id)} className="p-1.5 rounded hover:bg-[oklch(0.95_0.08_27)]">
                    <Trash2 size={13} style={{ color: 'oklch(0.55 0.20 27)' }} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showAdd && <AddInitiativeModal onClose={() => setShowAdd(false)} onAdd={addInitiative} />}
    </div>
  );
}

function EditInitiativeCard({ initiative, onSave, onCancel }: { initiative: Initiative; onSave: (u: Partial<Initiative>) => void; onCancel: () => void }) {
  const [f, setF] = useState({ ...initiative });
  return (
    <div className="p-4 rounded-lg border border-[oklch(0.22_0.018_55)] bg-[oklch(0.985_0.008_80)] space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs mb-1 block" style={{ color: 'oklch(0.52 0.022 65)' }}>Title</label>
          <Input value={f.title} onChange={e => setF(x => ({ ...x, title: e.target.value }))} />
        </div>
        <div className="col-span-2">
          <label className="text-xs mb-1 block" style={{ color: 'oklch(0.52 0.022 65)' }}>Description</label>
          <Textarea value={f.description ?? ''} onChange={e => setF(x => ({ ...x, description: e.target.value }))} rows={2} />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'oklch(0.52 0.022 65)' }}>Start Date</label>
          <Input type="date" value={f.startDate} onChange={e => setF(x => ({ ...x, startDate: e.target.value }))} />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'oklch(0.52 0.022 65)' }}>End Date</label>
          <Input type="date" value={f.endDate} onChange={e => setF(x => ({ ...x, endDate: e.target.value }))} />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'oklch(0.52 0.022 65)' }}>Owner</label>
          <select value={f.owner} onChange={e => setF(x => ({ ...x, owner: e.target.value }))} className="w-full text-sm border rounded px-2 py-2 bg-white border-[oklch(0.84_0.018_75)]">
            {TEAM_MEMBERS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'oklch(0.52 0.022 65)' }}>Status</label>
          <select value={f.status} onChange={e => setF(x => ({ ...x, status: e.target.value as any }))} className="w-full text-sm border rounded px-2 py-2 bg-white border-[oklch(0.84_0.018_75)]">
            {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'oklch(0.52 0.022 65)' }}>Category</label>
          <select value={f.category} onChange={e => setF(x => ({ ...x, category: e.target.value }))} className="w-full text-sm border rounded px-2 py-2 bg-white border-[oklch(0.84_0.018_75)]">
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => onSave(f)} style={{ background: 'oklch(0.22 0.018 55)', color: 'oklch(0.96 0.008 75)' }}>
          <Check size={13} className="mr-1" /> Save
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

function AddInitiativeModal({ onClose, onAdd }: { onClose: () => void; onAdd: (i: any) => void }) {
  const [f, setF] = useState({
    title: '', description: '', startDate: '', endDate: '',
    owner: 'Liz', status: 'not-started' as Initiative['status'], category: 'Operations',
  });
  const set = (k: string, v: any) => setF(x => ({ ...x, [k]: v }));
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.title || !f.startDate || !f.endDate) return;
    onAdd(f);
    onClose();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(34,26,20,0.55)' }}>
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl" style={{ background: 'oklch(0.985 0.008 80)' }}>
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 pt-5 pb-4 border-b border-[oklch(0.84_0.018_75)]" style={{ background: 'oklch(0.985 0.008 80)' }}>
          <h2 className="font-display text-2xl" style={{ color: 'oklch(0.22 0.018 55)' }}>Add Initiative</h2>
          <button onClick={onClose} className="p-2 rounded-md hover:bg-[oklch(0.92_0.012_78)]"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs mb-1 block uppercase tracking-widest" style={{ color: 'oklch(0.52 0.022 65)' }}>Title *</label>
              <Input value={f.title} onChange={e => set('title', e.target.value)} required />
            </div>
            <div className="col-span-2">
              <label className="text-xs mb-1 block uppercase tracking-widest" style={{ color: 'oklch(0.52 0.022 65)' }}>Description</label>
              <Textarea value={f.description} onChange={e => set('description', e.target.value)} rows={2} />
            </div>
            <div>
              <label className="text-xs mb-1 block uppercase tracking-widest" style={{ color: 'oklch(0.52 0.022 65)' }}>Start Date *</label>
              <Input type="date" value={f.startDate} onChange={e => set('startDate', e.target.value)} required />
            </div>
            <div>
              <label className="text-xs mb-1 block uppercase tracking-widest" style={{ color: 'oklch(0.52 0.022 65)' }}>End Date *</label>
              <Input type="date" value={f.endDate} onChange={e => set('endDate', e.target.value)} required />
            </div>
            <div>
              <label className="text-xs mb-1 block uppercase tracking-widest" style={{ color: 'oklch(0.52 0.022 65)' }}>Owner</label>
              <select value={f.owner} onChange={e => set('owner', e.target.value)} className="w-full text-sm border rounded px-2 py-2 bg-white border-[oklch(0.84_0.018_75)]">
                {TEAM_MEMBERS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs mb-1 block uppercase tracking-widest" style={{ color: 'oklch(0.52 0.022 65)' }}>Category</label>
              <select value={f.category} onChange={e => set('category', e.target.value)} className="w-full text-sm border rounded px-2 py-2 bg-white border-[oklch(0.84_0.018_75)]">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit" style={{ background: 'oklch(0.22 0.018 55)', color: 'oklch(0.96 0.008 75)' }}>Add Initiative</Button>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
