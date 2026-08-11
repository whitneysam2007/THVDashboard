import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useDashboard } from '@/contexts/DashboardContext';
import { generateAutoTasks } from '@/lib/utils';
import { nanoid } from 'nanoid';
import { Plus, CheckCircle2, Circle, Trash2, Pencil, ChevronDown, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const TEAM_MEMBERS = ['Liz', 'Lauren', 'Anna', 'Brenley', 'Emily', 'Amy', 'Kirsten'];
const TODAY = new Date().toISOString().split('T')[0];

type TaskRow = {
  id: string;
  donorId: string;
  donorName: string;
  kind: string;
  label: string;
  dueDate: string;
  completedDate?: string | null;
  completedBy?: string | null;
  isAuto: boolean; // generated from utils, not yet in DB
};

function formatDate(d: string) {
  if (!d) return '—';
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isOverdue(dueDate: string, completedDate?: string | null) {
  if (completedDate) return false;
  return dueDate < TODAY;
}

export default function Tasks() {
  const { store } = useDashboard();
  const utils = trpc.useUtils();

  // Fetch all DB tasks
  const { data: dbTasks = [], refetch } = trpc.donors.allTasks.useQuery(undefined, { refetchOnWindowFocus: false });
  const upsertTaskMut = trpc.donors.upsertTask.useMutation({ onSuccess: () => { refetch(); utils.donors.list.invalidate(); } });
  const deleteTaskMut = trpc.donors.deleteTask.useMutation({ onSuccess: () => { refetch(); utils.donors.list.invalidate(); } });

  const [completingId, setCompletingId] = useState<string | null>(null);
  const [completeBy, setCompleteBy] = useState(TEAM_MEMBERS[0]);
  const [completeDate, setCompleteDate] = useState(TODAY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editDate, setEditDate] = useState(TODAY);
  const [addingForDonor, setAddingForDonor] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState('');
  const [newDate, setNewDate] = useState(TODAY);
  const [collapsedDonors, setCollapsedDonors] = useState<Set<string>>(new Set());
  // Which donor groups have their completed-task history revealed
  const [expandedDone, setExpandedDone] = useState<Set<string>>(new Set());

  const toggleDone = (donorId: string) => {
    setExpandedDone(prev => {
      const next = new Set(prev);
      if (next.has(donorId)) next.delete(donorId);
      else next.add(donorId);
      return next;
    });
  };

  // Server returns bare slugs, so key the lookup by donorId + slug.
  const dbTaskMap = new Map((dbTasks as any[]).map((t: any) => [t.donorId + '::' + t.id, t]));

  // Build the full task list: auto-generated tasks merged with DB tasks
  const allTasks: TaskRow[] = [];
  for (const donor of store.donors) {
    const autoTasks = generateAutoTasks(donor);
    const dismissed = new Set(donor.dismissedTasks ?? []);
    for (const t of autoTasks) {
      if (dismissed.has(t.id)) continue;
      const dbRow = dbTaskMap.get(donor.id + '::' + t.id);
      allTasks.push({
        id: t.id,
        donorId: donor.id,
        donorName: donor.name,
        kind: t.kind,
        label: t.label,
        dueDate: dbRow?.dueDate ?? t.dueDate,
        completedDate: dbRow?.completedDate ?? null,
        completedBy: dbRow?.completedBy ?? null,
        isAuto: true,
      });
    }
    // Manual tasks from DB for this donor
    const manualDbTasks = (dbTasks as any[]).filter((d: any) => d.donorId === donor.id && d.id.startsWith('manual-'));
    for (const t of manualDbTasks) {
      allTasks.push({
        id: t.id,
        donorId: donor.id,
        donorName: donor.name,
        kind: t.kind,
        label: t.label,
        dueDate: t.dueDate,
        completedDate: t.completedDate ?? null,
        completedBy: t.completedBy ?? null,
        isAuto: false,
      });
    }
  }

  // Group by donor, keeping open and completed tasks in separate buckets so each
  // donor group can reveal its own history independently.
  const byDonor = new Map<string, { donorName: string; tasks: TaskRow[]; done: TaskRow[] }>();
  for (const t of allTasks) {
    if (!byDonor.has(t.donorId)) byDonor.set(t.donorId, { donorName: t.donorName, tasks: [], done: [] });
    const group = byDonor.get(t.donorId)!;
    if (t.completedDate) group.done.push(t);
    else group.tasks.push(t);
  }
  for (const group of Array.from(byDonor.values())) {
    group.tasks.sort((a: TaskRow, b: TaskRow) => a.dueDate.localeCompare(b.dueDate));
    // Most recently completed first
    group.done.sort((a: TaskRow, b: TaskRow) => (b.completedDate ?? '').localeCompare(a.completedDate ?? ''));
  }
  // Drop donors with nothing to show at all
  for (const [id, g] of Array.from(byDonor.entries())) {
    if (g.tasks.length === 0 && g.done.length === 0) byDonor.delete(id);
  }

  const handleComplete = async (task: TaskRow) => {
    await upsertTaskMut.mutateAsync({
      id: task.id,
      donorId: task.donorId,
      kind: task.kind,
      label: task.label,
      dueDate: task.dueDate,
      completedDate: completeDate,
      completedBy: completeBy,
    });
    setCompletingId(null);
    setCompleteDate(TODAY);
  };

  const handleDelete = async (task: TaskRow) => {
    await deleteTaskMut.mutateAsync({ id: task.id, donorId: task.donorId });
  };

  const handleReopen = async (task: TaskRow) => {
    await upsertTaskMut.mutateAsync({
      id: task.id,
      donorId: task.donorId,
      kind: task.kind,
      label: task.label,
      dueDate: task.dueDate,
      completedDate: undefined,
      completedBy: undefined,
    });
  };

  const handleEdit = async (task: TaskRow) => {
    await upsertTaskMut.mutateAsync({
      id: task.id,
      donorId: task.donorId,
      kind: task.kind,
      label: editLabel.trim() || task.label,
      dueDate: editDate || task.dueDate,
      completedDate: task.completedDate ?? undefined,
      completedBy: task.completedBy ?? undefined,
    });
    setEditingId(null);
  };

  const handleAddTask = async (donorId: string) => {
    if (!newLabel.trim()) return;
    const id = 'manual-' + nanoid();
    await upsertTaskMut.mutateAsync({
      id,
      donorId,
      kind: 'onboarding',
      label: newLabel.trim(),
      dueDate: newDate,
      completedDate: undefined,
      completedBy: undefined,
    });
    setNewLabel('');
    setNewDate(TODAY);
    setAddingForDonor(null);
  };

  const toggleDonor = (donorId: string) => {
    setCollapsedDonors(prev => {
      const next = new Set(prev);
      if (next.has(donorId)) next.delete(donorId);
      else next.add(donorId);
      return next;
    });
  };

  const openCount = allTasks.filter(t => !t.completedDate).length;
  const overdueCount = allTasks.filter(t => isOverdue(t.dueDate, t.completedDate)).length;
  const totalDone = allTasks.filter(t => !!t.completedDate).length;

  return (
    <div className="max-w-4xl px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-serif" style={{ color: 'oklch(0.22 0.018 55)', fontFamily: "'Cormorant Garamond', serif" }}>
              Tasks
            </h1>
            <p className="text-sm mt-1" style={{ color: 'oklch(0.52 0.022 65)' }}>
              {openCount} open task{openCount !== 1 ? 's' : ''} across {store.donors.length} donors
              {overdueCount > 0 && <span className="ml-2 font-medium" style={{ color: 'oklch(0.60 0.18 30)' }}>· {overdueCount} overdue</span>}
            </p>
          </div>
          {totalDone > 0 && (
            <button
              onClick={() => setExpandedDone(prev => prev.size > 0 ? new Set() : new Set(Array.from(byDonor.keys())))}
              className="text-xs px-3 py-1.5 rounded-full border transition-colors"
              style={{
                borderColor: expandedDone.size > 0 ? 'oklch(0.55 0.15 145)' : 'oklch(0.84 0.018 75)',
                color: expandedDone.size > 0 ? 'oklch(0.42 0.13 145)' : 'oklch(0.52 0.022 65)',
                background: expandedDone.size > 0 ? 'oklch(0.95 0.05 145)' : 'transparent',
              }}
            >
              {expandedDone.size > 0 ? 'Hide all completed' : `View all completed (${totalDone})`}
            </button>
          )}
        </div>

        {byDonor.size === 0 && (
          <div className="text-center py-16" style={{ color: 'oklch(0.62 0.012 65)' }}>
            <CheckCircle2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No open tasks. All caught up.</p>
          </div>
        )}

        <div className="space-y-4">
          {Array.from(byDonor.entries()).map(([donorId, { donorName, tasks, done }]) => {
            const isCollapsed = collapsedDonors.has(donorId);
            const overdueForDonor = tasks.filter(t => isOverdue(t.dueDate, t.completedDate)).length;
            const showDoneForDonor = expandedDone.has(donorId);
            return (
              <div key={donorId} className="rounded-xl border overflow-hidden" style={{ borderColor: 'oklch(0.88 0.014 75)', background: 'oklch(0.99 0.004 75)' }}>
                {/* Donor header row */}
                <button
                  onClick={() => toggleDonor(donorId)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-[oklch(0.97_0.008_75)] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {isCollapsed ? <ChevronRight className="w-4 h-4 opacity-40" /> : <ChevronDown className="w-4 h-4 opacity-40" />}
                    <span className="font-semibold text-sm" style={{ color: 'oklch(0.22 0.018 55)', fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem' }}>{donorName}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'oklch(0.92 0.012 75)', color: 'oklch(0.42 0.022 65)' }}>
                      {tasks.length} open
                    </span>
                    {overdueForDonor > 0 && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'oklch(0.95 0.06 30)', color: 'oklch(0.55 0.18 30)' }}>
                        {overdueForDonor} overdue
                      </span>
                    )}
                    {done.length > 0 && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'oklch(0.93 0.05 145)', color: 'oklch(0.42 0.13 145)' }}>
                        {done.length} done
                      </span>
                    )}
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); setAddingForDonor(addingForDonor === donorId ? null : donorId); setNewLabel(''); setNewDate(TODAY); }}
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded hover:bg-[oklch(0.94_0.012_75)] transition-colors"
                    style={{ color: 'oklch(0.50 0.18 250)' }}
                  >
                    <Plus className="w-3 h-3" /> Add task
                  </button>
                </button>

                {/* Add task inline form */}
                {addingForDonor === donorId && (
                  <div className="px-4 pb-3 pt-1 border-t flex items-center gap-2 flex-wrap" style={{ borderColor: 'oklch(0.92 0.012 75)', background: 'oklch(0.97 0.006 250)' }}>
                    <Input
                      value={newLabel}
                      onChange={e => setNewLabel(e.target.value)}
                      placeholder="Task description…"
                      className="flex-1 text-sm h-8 min-w-40"
                      autoFocus
                      onKeyDown={e => e.key === 'Enter' && handleAddTask(donorId)}
                    />
                    <Input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="text-sm h-8 w-36" />
                    <Button size="sm" onClick={() => handleAddTask(donorId)} disabled={!newLabel.trim()} className="h-8 text-xs">Save</Button>
                    <button onClick={() => setAddingForDonor(null)} className="text-xs" style={{ color: 'oklch(0.52 0.022 65)' }}>cancel</button>
                  </div>
                )}

                {/* Task rows */}
                {!isCollapsed && (
                  <div className="divide-y" style={{ borderColor: 'oklch(0.92 0.012 75)' }}>
                    {tasks.map(task => {
                      const done = !!task.completedDate;
                      const overdue = isOverdue(task.dueDate, task.completedDate);
                      const isConfirming = completingId === task.id;
                      const dotColor = task.kind === 'recurring' ? 'oklch(0.75 0.12 80)' : 'oklch(0.50 0.18 250)';
                      return (
                        <div key={task.id + task.donorId} className="px-4 py-2.5 flex items-start gap-3" style={{ background: done ? 'oklch(0.985 0.004 75)' : 'transparent' }}>
                          {/* Status dot */}
                          <div className="flex-shrink-0 mt-0.5">
                            {done
                              ? <CheckCircle2 className="w-4 h-4" style={{ color: 'oklch(0.55 0.15 145)' }} />
                              : <Circle className="w-4 h-4 opacity-30" style={{ color: dotColor }} />
                            }
                          </div>
                          {/* Task content */}
                          <div className="flex-1 min-w-0">
                            {editingId === task.id ? (
                              <div className="flex items-center gap-2 flex-wrap">
                                <Input value={editLabel} onChange={e => setEditLabel(e.target.value)} className="text-sm h-7 px-2 flex-1 min-w-32" autoFocus onKeyDown={e => e.key === 'Enter' && handleEdit(task)} />
                                <Input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} className="text-sm h-7 px-2 w-36" />
                                <button onClick={() => handleEdit(task)} className="text-xs px-2 py-0.5 rounded text-white" style={{ background: 'oklch(0.22 0.018 55)' }}>Save</button>
                                <button onClick={() => setEditingId(null)} className="text-xs" style={{ color: 'oklch(0.52 0.022 65)' }}>cancel</button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-sm ${done ? 'line-through opacity-50' : ''}`} style={{ color: 'oklch(0.22 0.018 55)' }}>
                                  {task.label}
                                </span>
                                <span className="text-xs" style={{ color: overdue ? 'oklch(0.55 0.18 30)' : 'oklch(0.62 0.012 65)' }}>
                                  {overdue ? `Overdue · ${formatDate(task.dueDate)}` : formatDate(task.dueDate)}
                                </span>
                              </div>
                            )}
                            {done && task.completedDate && (
                              <p className="text-xs mt-0.5" style={{ color: 'oklch(0.62 0.012 65)' }}>
                                Completed {formatDate(task.completedDate)}{task.completedBy ? ` by ${task.completedBy}` : ''}
                              </p>
                            )}
                            {/* Confirm completion row */}
                            {isConfirming && !done && (
                              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                <label className="text-xs" style={{ color: 'oklch(0.52 0.022 65)' }}>By:</label>
                                <select value={completeBy} onChange={e => setCompleteBy(e.target.value)} className="text-xs border rounded px-1.5 py-0.5 bg-white" style={{ borderColor: 'oklch(0.84 0.018 75)' }}>
                                  {TEAM_MEMBERS.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                                <label className="text-xs" style={{ color: 'oklch(0.52 0.022 65)' }}>Date:</label>
                                <Input type="date" value={completeDate} onChange={e => setCompleteDate(e.target.value)} className="text-xs h-6 px-1.5 w-32" />
                                <button onClick={() => handleComplete(task)} className="text-xs px-2 py-0.5 rounded text-white" style={{ background: 'oklch(0.55 0.15 145)' }}>Confirm</button>
                                <button onClick={() => setCompletingId(null)} className="text-xs" style={{ color: 'oklch(0.52 0.022 65)' }}>cancel</button>
                              </div>
                            )}
                          </div>
                          {/* Actions */}
                          {!done && !isConfirming && (
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {editingId !== task.id && (
                                <button
                                  onClick={() => { setEditingId(task.id); setEditLabel(task.label); setEditDate(task.dueDate); setCompletingId(null); }}
                                  className="p-1 rounded hover:bg-[oklch(0.94_0.012_75)] transition-colors"
                                  style={{ color: 'oklch(0.52 0.022 65)' }}
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                onClick={() => { setCompletingId(task.id); setCompleteDate(TODAY); }}
                                className="text-xs px-2 py-0.5 rounded border transition-colors hover:bg-green-50"
                                style={{ color: 'oklch(0.45 0.15 145)', borderColor: 'oklch(0.75 0.12 145)' }}
                              >
                                Mark done
                              </button>
                              <button onClick={() => handleDelete(task)} className="p-1 rounded hover:bg-red-50 transition-colors" style={{ color: 'oklch(0.55 0.18 27)' }}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {tasks.length === 0 && (
                      <div className="px-4 py-3 text-xs" style={{ color: 'oklch(0.62 0.012 65)' }}>
                        No open tasks for this donor.
                      </div>
                    )}
                  </div>
                )}

                {/* Completed task history */}
                {!isCollapsed && done.length > 0 && (
                  <div className="border-t" style={{ borderColor: 'oklch(0.92 0.012 75)' }}>
                    <button
                      onClick={() => toggleDone(donorId)}
                      className="w-full flex items-center gap-1.5 px-4 py-2 text-xs transition-colors hover:bg-[oklch(0.97_0.008_75)]"
                      style={{ color: 'oklch(0.42 0.13 145)' }}
                    >
                      {showDoneForDonor ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      {showDoneForDonor ? 'Hide completed tasks' : `View completed tasks (${done.length})`}
                    </button>
                    {showDoneForDonor && (
                      <div className="divide-y" style={{ borderColor: 'oklch(0.94 0.008 75)', background: 'oklch(0.982 0.004 75)' }}>
                        {done.map(task => (
                          <div key={task.id + task.donorId} className="px-4 py-2.5 flex items-start gap-3">
                            <div className="flex-shrink-0 mt-0.5">
                              <CheckCircle2 className="w-4 h-4" style={{ color: 'oklch(0.55 0.15 145)' }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-sm line-through opacity-55" style={{ color: 'oklch(0.22 0.018 55)' }}>
                                {task.label}
                              </span>
                              <p className="text-xs mt-0.5" style={{ color: 'oklch(0.48 0.10 145)' }}>
                                Completed {formatDate(task.completedDate!)}{task.completedBy ? ` by ${task.completedBy}` : ''}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <button
                                onClick={() => handleReopen(task)}
                                className="text-xs px-2 py-0.5 rounded border transition-colors hover:bg-[oklch(0.96_0.012_250)]"
                                style={{ color: 'oklch(0.50 0.18 250)', borderColor: 'oklch(0.80 0.10 250)' }}
                              >
                                Reopen
                              </button>
                              <button onClick={() => handleDelete(task)} className="p-1 rounded hover:bg-red-50 transition-colors" style={{ color: 'oklch(0.55 0.18 27)' }}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {/* Color legend */}
      <div className="mt-8 rounded-lg border px-4 py-3 flex flex-wrap gap-x-6 gap-y-2" style={{ borderColor: 'oklch(0.88 0.014 75)', background: 'oklch(0.985 0.008 80)' }}>
        <span className="text-xs uppercase tracking-widest w-full mb-0.5" style={{ color: 'oklch(0.52 0.022 65)' }}>Legend</span>
        <div className="flex items-center gap-1.5">
          <Circle className="w-3.5 h-3.5" style={{ color: 'oklch(0.50 0.18 250)' }} />
          <span className="text-xs" style={{ color: 'oklch(0.42 0.022 65)' }}>Blue — onboarding &amp; manual tasks</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Circle className="w-3.5 h-3.5" style={{ color: 'oklch(0.75 0.12 80)' }} />
          <span className="text-xs" style={{ color: 'oklch(0.42 0.022 65)' }}>Gold — recurring annual tasks</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5" style={{ color: 'oklch(0.55 0.15 145)' }} />
          <span className="text-xs" style={{ color: 'oklch(0.42 0.022 65)' }}>Green — completed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium" style={{ color: 'oklch(0.55 0.18 30)' }}>Red text</span>
          <span className="text-xs" style={{ color: 'oklch(0.42 0.022 65)' }}>— overdue</span>
        </div>
      </div>
    </div>
  );
}
