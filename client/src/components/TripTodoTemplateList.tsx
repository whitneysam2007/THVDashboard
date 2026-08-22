import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { Edit2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatDate } from '@/lib/utils';
import type { TripPlanningTask } from '../../../shared/tripOperations';

const TASK_ASSIGNEES = ['Liz', 'Lauren', 'Anna', 'Brenley', 'Emily', 'Amy', 'Kirsten', 'Yvonne/Nieve', 'Naru'];

const sortByDueDate = (left: TripPlanningTask, right: TripPlanningTask) => {
  const dueDateOrder = (left.dueDate ?? '9999-12-31').localeCompare(right.dueDate ?? '9999-12-31');
  return dueDateOrder || left.position - right.position || left.title.localeCompare(right.title);
};

function ParentPath({ task, byId }: { task: TripPlanningTask; byId: Map<string, TripPlanningTask> }) {
  const parents: string[] = [];
  let current = task.parentTaskId ? byId.get(task.parentTaskId) : undefined;
  while (current) {
    parents.unshift(current.title);
    current = current.parentTaskId ? byId.get(current.parentTaskId) : undefined;
  }
  return parents.length ? <p className="mt-0.5 text-[10px] text-[oklch(0.52_0.022_65)]">Under: {parents.join(' › ')}</p> : null;
}

export function TripTodoTemplateList({ tasks, draft, onDraftChange, onAdd, onPatch, onDelete, templateApplied, onApplyTemplate }: { tasks: TripPlanningTask[]; draft: Partial<TripPlanningTask>; onDraftChange: Dispatch<SetStateAction<Partial<TripPlanningTask>>>; onAdd: () => void; onPatch: (id: string, patch: Partial<TripPlanningTask>) => void; onDelete: (id: string) => void; templateApplied: boolean; onApplyTemplate: () => void }) {
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [showCompleted, setShowCompleted] = useState(false);
  const [showEntry, setShowEntry] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Partial<TripPlanningTask>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const byId = useMemo(() => new Map(tasks.map(task => [task.id, task])), [tasks]);
  const childrenByParent = useMemo(() => {
    const children = new Map<string, TripPlanningTask[]>();
    tasks.forEach(task => {
      if (!task.parentTaskId) return;
      children.set(task.parentTaskId, [...(children.get(task.parentTaskId) ?? []), task]);
    });
    children.forEach(childrenForParent => childrenForParent.sort(sortByDueDate));
    return children;
  }, [tasks]);
  const roots = useMemo(() => tasks.filter(task => !task.parentTaskId).sort(sortByDueDate), [tasks]);
  const completedCount = tasks.filter(task => task.completed).length;
  const matchingOwner = (task: TripPlanningTask) => ownerFilter === 'all' || task.owner === ownerFilter;
  const hasVisibleDescendant = (task: TripPlanningTask): boolean => (childrenByParent.get(task.id) ?? []).some(child => isVisible(child) || hasVisibleDescendant(child));
  const isVisible = (task: TripPlanningTask) => (showCompleted || !task.completed) && matchingOwner(task);
  const shouldShowTreeTask = (task: TripPlanningTask) => ownerFilter === 'all' ? isVisible(task) || hasVisibleDescendant(task) : isVisible(task);
  const beginEdit = (task: TripPlanningTask) => {
    setEditingId(task.id);
    setEditing({ title: task.title, owner: task.owner ?? '', dueDate: task.dueDate ?? '', notes: task.notes ?? '' });
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
  const taskChildren = (task: TripPlanningTask) => (childrenByParent.get(task.id) ?? []).filter(shouldShowTreeTask);

  const renderTask = (task: TripPlanningTask, depth = 0) => {
    const children = taskChildren(task);
    return <div key={task.id} className={depth ? 'ml-3 border-l border-[oklch(0.80_0.06_315)] pl-3 sm:ml-5' : ''}>
      <div className={`border-b border-[oklch(0.93_0.008_76)] py-2.5 ${depth === 0 ? 'bg-white px-3' : ''}`}>
        {editingId === task.id ? <div className="grid gap-2 sm:grid-cols-2"><Input value={editing.title ?? ''} onChange={event => setEditing(value => ({ ...value, title: event.target.value }))} placeholder="Task" /><select value={editing.owner ?? ''} onChange={event => setEditing(value => ({ ...value, owner: event.target.value }))} className="rounded border border-[oklch(0.84_0.018_75)] bg-white px-2 text-sm"><option value="">Select owner</option>{TASK_ASSIGNEES.map(member => <option key={member} value={member}>{member}</option>)}</select><Input type="date" value={editing.dueDate ?? ''} onChange={event => setEditing(value => ({ ...value, dueDate: event.target.value }))} /><Input value={editing.notes ?? ''} onChange={event => setEditing(value => ({ ...value, notes: event.target.value }))} placeholder="Notes" /><div className="flex gap-2 sm:col-span-2"><Button size="sm" disabled={!editing.title?.trim() || !editing.owner} onClick={saveEdit}>Save</Button><Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button></div></div> : <div className="flex items-start gap-2"><input className="mt-1" aria-label={`Mark ${task.title} complete`} type="checkbox" checked={!!task.completed} onChange={event => onPatch(task.id, { completed: event.target.checked })} /><div className="min-w-0 flex-1"><p className={`text-sm ${task.completed ? 'line-through text-[oklch(0.55_0.018_65)]' : 'text-[oklch(0.22_0.018_55)]'}`}>{task.title}</p><p className="text-xs text-[oklch(0.52_0.022_65)]">{task.owner ? task.owner : 'Owner required'}{task.dueDate ? ` · Due ${formatDate(task.dueDate)}` : ''}{task.notes ? ` · ${task.notes}` : ''}</p>{ownerFilter !== 'all' && <ParentPath task={task} byId={byId} />}</div><select aria-label={`Assign ${task.title}`} value={task.owner ?? ''} onChange={event => event.target.value && onPatch(task.id, { owner: event.target.value })} className="h-8 shrink-0 rounded border border-[oklch(0.84_0.018_75)] bg-white px-2 text-xs"><option value="">Select owner</option>{TASK_ASSIGNEES.map(member => <option key={member} value={member}>{member}</option>)}</select><button onClick={() => beginEdit(task)} className="rounded p-1.5 hover:bg-[oklch(0.92_0.012_78)]" aria-label={`Edit ${task.title}`}><Edit2 size={14} /></button>{confirmDeleteId === task.id ? <span className="flex shrink-0 items-center gap-1"><button onClick={() => { onDelete(task.id); setConfirmDeleteId(null); }} className="rounded bg-[oklch(0.55_0.20_27)] px-2 py-1 text-xs text-white">Delete</button><button onClick={() => setConfirmDeleteId(null)} className="rounded px-2 py-1 text-xs text-[oklch(0.52_0.022_65)]">Cancel</button></span> : <button onClick={() => { setConfirmDeleteId(task.id); setEditingId(null); }} className="rounded p-1.5 text-[oklch(0.55_0.20_27)] hover:bg-[oklch(0.95_0.08_27)]" aria-label={`Delete ${task.title}`}><Trash2 size={14} /></button>}</div>}</div>
      {children.map(child => renderTask(child, depth + 1))}
    </div>;
  };

  const manualRoots = roots.filter(task => !task.templateKey).filter(shouldShowTreeTask);
  const templateRoots = roots.filter(task => task.templateKey).filter(shouldShowTreeTask);
  const filteredTasks = ownerFilter === 'all' ? null : tasks.filter(isVisible).sort(sortByDueDate);

  return <div className="space-y-4 pt-3"><div className="flex flex-wrap justify-end gap-2 rounded-md bg-[oklch(0.97_0.02_80)] p-3">{!templateApplied && <Button size="sm" onClick={onApplyTemplate}>Use expedition to-do template</Button>}<Button size="sm" onClick={() => setShowEntry(value => !value)}><Plus size={14} className="mr-1" />{showEntry ? 'Close add to-do' : 'Add to-do'}</Button><Button size="sm" variant="outline" onClick={() => setShowCompleted(value => !value)}>{showCompleted ? 'Hide completed' : `Show completed (${completedCount})`}</Button></div>
    {showEntry && <div className="grid gap-2 rounded-lg border border-dashed border-[oklch(0.78_0.018_75)] bg-[oklch(0.99_0.004_80)] p-3 sm:grid-cols-2"><Input placeholder="Task" value={draft.title ?? ''} onChange={event => onDraftChange(value => ({ ...value, title: event.target.value }))} /><select value={draft.owner ?? ''} onChange={event => onDraftChange(value => ({ ...value, owner: event.target.value }))} className="rounded border border-[oklch(0.8_0.018_75)] bg-white px-2 text-sm"><option value="">Select owner</option>{TASK_ASSIGNEES.map(member => <option key={member} value={member}>{member}</option>)}</select><Input type="date" value={draft.dueDate ?? ''} onChange={event => onDraftChange(value => ({ ...value, dueDate: event.target.value }))} /><Input placeholder="Notes" value={draft.notes ?? ''} onChange={event => onDraftChange(value => ({ ...value, notes: event.target.value }))} /><div className="flex gap-2 sm:col-span-2"><Button size="sm" disabled={!draft.title?.trim() || !draft.owner} onClick={saveNewTask}>Save to-do</Button><Button size="sm" variant="outline" onClick={() => setShowEntry(false)}>Cancel</Button></div></div>}
    <div className="flex flex-wrap gap-1.5"><button onClick={() => setOwnerFilter('all')} className={`rounded-full px-3 py-1 text-xs font-medium ${ownerFilter === 'all' ? 'bg-[oklch(0.22_0.018_55)] text-white' : 'bg-[oklch(0.93_0.015_78)] text-[oklch(0.42_0.018_55)]'}`}>All tasks</button>{TASK_ASSIGNEES.map(member => <button key={member} onClick={() => setOwnerFilter(member)} className={`rounded-full px-3 py-1 text-xs font-medium ${ownerFilter === member ? 'bg-[oklch(0.50_0.18_250)] text-white' : 'bg-[oklch(0.93_0.015_78)] text-[oklch(0.42_0.018_55)]'}`}>{member}</button>)}</div>
    {ownerFilter === 'all' ? <>{templateRoots.length > 0 && <section className="overflow-hidden rounded-lg border border-[oklch(0.77_0.06_315)] bg-[oklch(0.99_0.005_315)]"><div className="border-b border-[oklch(0.84_0.035_315)] bg-[oklch(0.96_0.025_315)] px-3 py-2"><h3 className="font-display text-xl text-[oklch(0.30_0.10_315)]">Expedition To-Do List</h3><p className="text-xs text-[oklch(0.45_0.03_315)]">Amy’s master template · linked task groups</p></div>{templateRoots.map(task => renderTask(task))}</section>}{manualRoots.length > 0 && <section className="overflow-hidden rounded-lg border border-[oklch(0.87_0.018_75)] bg-white"><div className="border-b border-[oklch(0.90_0.012_76)] bg-[oklch(0.985_0.008_80)] px-3 py-2"><h3 className="font-display text-lg text-[oklch(0.22_0.018_55)]">Additional trip to-dos</h3></div>{manualRoots.map(task => renderTask(task))}</section>}{!templateRoots.length && !manualRoots.length && <p className="rounded-lg border border-dashed border-[oklch(0.84_0.018_75)] px-4 py-7 text-center text-sm italic text-[oklch(0.52_0.022_65)]">No to-dos yet. Use the expedition template to start this trip’s planning list.</p>}</> : <section className="overflow-hidden rounded-lg border border-[oklch(0.87_0.018_75)] bg-white"><div className="border-b border-[oklch(0.90_0.012_76)] bg-[oklch(0.985_0.008_80)] px-3 py-2"><h3 className="font-display text-lg text-[oklch(0.22_0.018_55)]">{ownerFilter}’s tasks</h3></div>{filteredTasks?.length ? filteredTasks.map(task => renderTask(task)) : <p className="px-3 py-4 text-sm text-[oklch(0.52_0.022_65)]">No outstanding tasks assigned to {ownerFilter}.</p>}</section>}</div>;
}
