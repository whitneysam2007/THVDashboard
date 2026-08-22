import { useMemo, useState } from 'react';
import { Check, ChevronDown, Pencil, Plus, Trash2, X } from 'lucide-react';
import { nanoid } from 'nanoid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { trpc } from '@/lib/trpc';
import { MEDICAL_TASK_ASSIGNEES, MEDICAL_TASK_CATEGORIES, sortMedicalTasks, type MedicalTask, type MedicalTaskAssignee, type MedicalTaskCategory } from '@shared/medicalTasks';

const EMPTY_DRAFT = (): Omit<MedicalTask, 'id'> => ({ title: '', owner: 'Emily', category: 'Volunteer profiles & credentials', dueDate: '', notes: '', completed: false });

function TaskFields({ task, onChange }: { task: Omit<MedicalTask, 'id'>; onChange: (next: Omit<MedicalTask, 'id'>) => void }) {
  return <div className="grid gap-2 rounded-lg border border-dashed border-[oklch(0.78_0.025_155)] bg-[oklch(0.99_0.008_80)] p-3 sm:grid-cols-2">
    <Input value={task.title} onChange={event => onChange({ ...task, title: event.target.value })} placeholder="Task" />
    <label className="text-xs font-medium text-[oklch(0.42_0.018_55)]">Who is in charge of this task?<select value={task.owner} onChange={event => onChange({ ...task, owner: event.target.value as MedicalTaskAssignee })} className="mt-1 h-9 w-full rounded border border-[oklch(0.80_0.018_75)] bg-white px-2 text-sm">{MEDICAL_TASK_ASSIGNEES.map(owner => <option key={owner}>{owner}</option>)}</select></label>
    <label className="text-xs font-medium text-[oklch(0.42_0.018_55)]">Category<select value={task.category} onChange={event => onChange({ ...task, category: event.target.value as MedicalTaskCategory })} className="mt-1 h-9 w-full rounded border border-[oklch(0.80_0.018_75)] bg-white px-2 text-sm">{MEDICAL_TASK_CATEGORIES.map(category => <option key={category}>{category}</option>)}</select></label>
    <label className="text-xs font-medium text-[oklch(0.42_0.018_55)]">Due date<Input className="mt-1" type="date" value={task.dueDate ?? ''} onChange={event => onChange({ ...task, dueDate: event.target.value })} /></label>
    <Textarea className="sm:col-span-2" value={task.notes ?? ''} onChange={event => onChange({ ...task, notes: event.target.value })} placeholder="Notes (optional)" />
  </div>;
}

export function MedicalTaskList() {
  const utils = trpc.useUtils();
  const taskQuery = trpc.medicalTasks.list.useQuery(undefined, { refetchOnWindowFocus: false });
  const save = trpc.medicalTasks.save.useMutation({ onSuccess: () => void utils.medicalTasks.list.invalidate() });
  const [showAdd, setShowAdd] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [ownerFilter, setOwnerFilter] = useState<MedicalTaskAssignee | 'All'>('All');
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Omit<MedicalTask, 'id'>>(EMPTY_DRAFT);
  const [deleteCandidate, setDeleteCandidate] = useState<MedicalTask | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const tasks = taskQuery.data ?? [];
  const activeTasks = useMemo(() => sortMedicalTasks(tasks).filter(task => !task.completed && (ownerFilter === 'All' || task.owner === ownerFilter)), [tasks, ownerFilter]);
  const completedTasks = useMemo(() => sortMedicalTasks(tasks).filter(task => task.completed && (ownerFilter === 'All' || task.owner === ownerFilter)), [tasks, ownerFilter]);

  const persist = async (next: MedicalTask[]) => {
    setMessage(null);
    try { await save.mutateAsync(next); } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not save the medical to-do list.'); }
  };
  const addTask = async () => {
    if (!draft.title.trim()) return;
    await persist([...tasks, { ...draft, id: nanoid(), title: draft.title.trim(), dueDate: draft.dueDate || undefined, notes: draft.notes?.trim() || undefined }]);
    setDraft(EMPTY_DRAFT()); setShowAdd(false);
  };
  const saveEdit = async () => {
    if (!editingId || !editing.title.trim()) return;
    await persist(tasks.map(task => task.id === editingId ? { ...editing, id: task.id, title: editing.title.trim(), dueDate: editing.dueDate || undefined, notes: editing.notes?.trim() || undefined } : task));
    setEditingId(null);
  };
  const toggleComplete = async (task: MedicalTask) => await persist(tasks.map(item => item.id === task.id ? { ...item, completed: !item.completed, completedAt: item.completed ? undefined : new Date().toISOString().slice(0, 10) } : item));
  const removeTask = async () => {
    if (!deleteCandidate) return;
    await persist(tasks.filter(task => task.id !== deleteCandidate.id));
    setDeleteCandidate(null);
  };

  const renderTask = (task: MedicalTask) => <div key={task.id} className={`rounded-xl border p-4 ${task.completed ? 'border-[oklch(0.84_0.035_155)] bg-[oklch(0.98_0.02_155)]' : 'border-[oklch(0.84_0.018_75)] bg-white'}`}><div className="flex gap-3"><button aria-label={task.completed ? `Reopen ${task.title}` : `Complete ${task.title}`} onClick={() => void toggleComplete(task)} className={`mt-0.5 rounded-full ${task.completed ? 'text-[oklch(0.35_0.10_155)]' : 'text-[oklch(0.58_0.04_155)] hover:text-[oklch(0.35_0.10_155)]'}`}><Check size={20} strokeWidth={task.completed ? 3 : 1.8} /></button><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className={`font-medium ${task.completed ? 'text-[oklch(0.40_0.04_155)] line-through' : 'text-[oklch(0.22_0.018_55)]'}`}>{task.title}</p><div className="mt-1 flex flex-wrap gap-1.5"><span className="rounded-full bg-[oklch(0.94_0.025_155)] px-2 py-0.5 text-[10px] font-semibold text-[oklch(0.32_0.09_155)]">{task.owner}</span><span className="rounded-full bg-[oklch(0.94_0.02_250)] px-2 py-0.5 text-[10px] font-semibold text-[oklch(0.34_0.10_250)]">{task.category}</span>{task.dueDate && <span className="text-xs text-[oklch(0.48_0.022_65)]">Due {task.dueDate}</span>}{task.completedAt && <span className="text-xs text-[oklch(0.35_0.10_155)]">Completed {task.completedAt}</span>}</div></div><div className="flex gap-1"><button aria-label={`Edit ${task.title}`} onClick={() => { setEditingId(task.id); setEditing({ title: task.title, owner: task.owner, category: task.category, dueDate: task.dueDate ?? '', notes: task.notes ?? '', completed: task.completed, completedAt: task.completedAt }); }} className="rounded p-1.5 hover:bg-[oklch(0.94_0.02_250)]"><Pencil size={15} /></button><button aria-label={`Delete ${task.title}`} onClick={() => setDeleteCandidate(task)} className="rounded p-1.5 text-[oklch(0.55_0.20_27)] hover:bg-red-50"><Trash2 size={15} /></button></div></div>{task.notes && <p className="mt-3 text-sm leading-relaxed text-[oklch(0.48_0.022_65)]">{task.notes}</p>}</div></div>{editingId === task.id && <div className="mt-4"><TaskFields task={editing} onChange={setEditing} /><div className="mt-2 flex gap-2"><Button size="sm" disabled={!editing.title.trim() || save.isPending} onClick={() => void saveEdit()}>Save task</Button><Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button></div></div>}</div>;

  return <section className="mt-8 rounded-2xl border border-[oklch(0.78_0.055_155)] bg-[oklch(0.985_0.018_155)] p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-[0.18em] text-[oklch(0.36_0.10_155)]">Emily’s workspace</p><h2 className="mt-1 font-display text-2xl text-[oklch(0.25_0.05_155)]">Medical Volunteers To-Do</h2><p className="mt-1 text-sm text-[oklch(0.40_0.045_155)]">A separate task list for medical volunteer preparation and coordination.</p></div><div className="flex flex-wrap gap-2"><Button size="sm" onClick={() => setShowAdd(value => !value)}><Plus size={15} className="mr-1" />{showAdd ? 'Close add task' : 'Add task'}</Button><Button size="sm" variant="outline" onClick={() => setShowCompleted(value => !value)}>{showCompleted ? 'Hide completed' : `Show completed (${completedTasks.length})`}</Button></div></div>{showAdd && <div className="mt-4"><TaskFields task={draft} onChange={setDraft} /><div className="mt-2 flex gap-2"><Button size="sm" disabled={!draft.title.trim() || save.isPending} onClick={() => void addTask()}>Save task</Button><Button size="sm" variant="outline" onClick={() => { setShowAdd(false); setDraft(EMPTY_DRAFT()); }}>Cancel</Button></div></div>}<div className="mt-4 flex flex-wrap gap-1.5"><button onClick={() => setOwnerFilter('All')} className={`rounded-full px-3 py-1 text-xs font-medium ${ownerFilter === 'All' ? 'bg-[oklch(0.32_0.10_155)] text-white' : 'bg-white text-[oklch(0.42_0.045_155)]'}`}>All tasks</button>{MEDICAL_TASK_ASSIGNEES.map(owner => <button key={owner} onClick={() => setOwnerFilter(owner)} className={`rounded-full px-3 py-1 text-xs font-medium ${ownerFilter === owner ? 'bg-[oklch(0.32_0.10_155)] text-white' : 'bg-white text-[oklch(0.42_0.045_155)]'}`}>{owner}</button>)}</div>{taskQuery.isLoading ? <p className="mt-5 text-sm text-[oklch(0.48_0.022_65)]">Loading medical tasks…</p> : <div className="mt-4 space-y-2">{activeTasks.length ? activeTasks.map(renderTask) : <p className="rounded-lg border border-dashed border-[oklch(0.78_0.055_155)] bg-white/70 px-4 py-5 text-center text-sm italic text-[oklch(0.46_0.045_155)]">No outstanding medical volunteer tasks.</p>}{showCompleted && completedTasks.map(renderTask)}</div>}{deleteCandidate && <div role="alertdialog" className="mt-4 rounded-lg border border-[oklch(0.75_0.12_27)] bg-[oklch(0.98_0.025_27)] p-3"><p className="font-medium text-[oklch(0.42_0.16_27)]">Delete “{deleteCandidate.title}”?</p><p className="mt-1 text-xs text-[oklch(0.48_0.08_27)]">This removes the task from the Medical Volunteers To-Do list.</p><div className="mt-3 flex gap-2"><Button size="sm" variant="outline" onClick={() => setDeleteCandidate(null)}><X size={14} className="mr-1" />Keep task</Button><Button size="sm" className="bg-[oklch(0.48_0.18_27)] hover:bg-[oklch(0.42_0.18_27)]" onClick={() => void removeTask()}>Delete task</Button></div></div>}{message && <p className="mt-3 text-sm text-[oklch(0.48_0.14_27)]">{message}</p>}</section>;
}
