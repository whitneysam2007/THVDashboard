// THV Donor Dashboard — Unified Donor Journey Timeline
// Dark dot = logged interaction | Blue dot = onboarding/manual task | Yellow dot = recurring annual task

import { useState, useEffect, useRef } from 'react';
import { trpc } from '@/lib/trpc';
import { Donor, TaskEntry, ActivityEntry } from '@/lib/types';
import { buildTimeline, formatDate, recurringJourneyColor } from '@/lib/utils';
import { useDashboard } from '@/contexts/DashboardContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Check, Mail } from 'lucide-react';
import { nanoid } from 'nanoid';

const TEAM_MEMBERS = ['Liz', 'Lauren', 'Anna', 'Brenley', 'Emily', 'Amy', 'Kirsten'];
const TODAY = new Date().toISOString().split('T')[0];

// Inline edit form for a manual task label/date
function InlineTaskEdit({ task, onSave, onCancel }: {
  task: TaskEntry;
  onSave: (label: string, date: string) => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState(task.label);
  const [date, setDate] = useState(task.dueDate);
  return (
    <div className="space-y-1 mt-1" onClick={e => e.stopPropagation()}>
      <Input value={label} onChange={e => setLabel(e.target.value)} className="text-xs h-7 px-2" autoFocus onKeyDown={e => e.key === 'Enter' && onSave(label, date)} />
      <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="text-xs h-7 px-2 w-full" />
      <div className="flex gap-1">
        <button onClick={() => onSave(label, date)} disabled={!label.trim()} className="text-xs px-2 py-0.5 rounded text-white disabled:opacity-40" style={{ background: 'oklch(0.50 0.18 250)' }}>Save</button>
        <button onClick={onCancel} className="text-xs px-2 py-0.5 rounded" style={{ color: 'oklch(0.52 0.022 65)' }}>cancel</button>
      </div>
    </div>
  );
}

interface DonorJourneyProps {
  donor: Donor;
  currentUser?: string;
  liveActivities?: ActivityEntry[];
  liveTasks?: TaskEntry[];
  onActivityAdded?: () => void;
  onTaskCompleted?: () => void;
}

export default function DonorJourney({ donor, currentUser, liveActivities, liveTasks, onActivityAdded, onTaskCompleted }: DonorJourneyProps) {
  const { addActivity, updateDonor } = useDashboard();
  const upsertTaskMut = trpc.donors.upsertTask.useMutation();
  const deleteTaskMut = trpc.donors.deleteTask.useMutation();
  const updateActivityMut = trpc.donors.updateActivity.useMutation();
  const deleteActivityMut = trpc.donors.deleteActivity.useMutation();
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [editActivityNote, setEditActivityNote] = useState('');
  const [editActivityDate, setEditActivityDate] = useState('');

  // Log interaction state
  const [newNote, setNewNote] = useState('');
  const [noteAuthor, setNoteAuthor] = useState(() => {
    const u = currentUser?.split('@')[0] ?? '';
    return TEAM_MEMBERS.find(m => m.toLowerCase() === u) ?? TEAM_MEMBERS[0];
  });
  const [noteDate, setNoteDate] = useState(TODAY);

  // Add manual next-action task state
  const [showAddTask, setShowAddTask] = useState(false);
  const [showLogInteraction, setShowLogInteraction] = useState(false);
  const [taskLabel, setTaskLabel] = useState('');
  const [taskDate, setTaskDate] = useState(TODAY);
  const [taskAuthor, setTaskAuthor] = useState(noteAuthor);

  // Complete task state
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [completeBy, setCompleteBy] = useState(noteAuthor);
  const [completeDate, setCompleteDate] = useState(TODAY);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [showCompletedTasks, setShowCompletedTasks] = useState(false);

  // Undo toast state
  const [undoSnapshot, setUndoSnapshot] = useState<{ completedTasks: TaskEntry[]; dismissedTasks: string[]; label: string } | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const effectiveCompletedTasks = liveTasks ?? donor.completedTasks ?? [];
  const captureUndo = (label: string) => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setUndoSnapshot({
      completedTasks: [...effectiveCompletedTasks],
      dismissedTasks: [...(donor.dismissedTasks ?? [])],
      label,
    });
    undoTimer.current = setTimeout(() => setUndoSnapshot(null), 5000);
  };

  const handleUndo = () => {
    if (!undoSnapshot) return;
    updateDonor(donor.id, {
      completedTasks: undoSnapshot.completedTasks,
      dismissedTasks: undoSnapshot.dismissedTasks,
    });
    setUndoSnapshot(null);
    if (undoTimer.current) clearTimeout(undoTimer.current);
  };

  useEffect(() => () => { if (undoTimer.current) clearTimeout(undoTimer.current); }, []);

  const donorWithLiveData = { ...donor, ...(liveActivities ? { activities: liveActivities } : {}), ...(liveTasks ? { completedTasks: liveTasks } : {}) };
  const fullTimeline = buildTimeline(donorWithLiveData);
  // Completed tasks are collapsed out of the main timeline so the card shows what
  // still needs doing. They stay available behind a toggle.
  const completedTaskCount = fullTimeline.filter(i => i.kind === 'task' && !!i.completed?.completedDate).length;
  const timeline = showCompletedTasks
    ? fullTimeline
    : fullTimeline.filter(i => !(i.kind === 'task' && !!i.completed?.completedDate));
  const todayStr = TODAY;

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    await addActivity(donor.id, { date: noteDate, author: noteAuthor, note: newNote.trim() });
    onActivityAdded?.();
    // Auto-clear nextAction when interaction logged
    if (donor.nextAction) updateDonor(donor.id, { nextAction: undefined });
    setNewNote('');
  };

  const handleAddTask = () => {
    if (!taskLabel.trim()) return;
    const newTask: TaskEntry = {
      id: `manual-${nanoid()}`,
      kind: 'onboarding',
      label: taskLabel.trim(),
      dueDate: taskDate,
    };
    updateDonor(donor.id, { completedTasks: [...effectiveCompletedTasks, newTask] });
    setTaskLabel('');
    setTaskDate(TODAY);
    setShowAddTask(false);
  };

  const handleEditTask = async (task: TaskEntry, newLabel: string, newDate: string) => {
    const storedTask = effectiveCompletedTasks.find(entry => entry.id === task.id);
    await upsertTaskMut.mutateAsync({
      id: task.id,
      donorId: donor.id,
      kind: task.kind,
      label: newLabel.trim() || task.label,
      dueDate: newDate || task.dueDate,
      completedDate: storedTask?.completedDate,
      completedBy: storedTask?.completedBy,
    });
    setEditingTaskId(null);
    onTaskCompleted?.();
  };

  const handleDismissTask = (taskId: string, label: string) => {
    captureUndo(`Removed "${label}"`);
    updateDonor(donor.id, {
      dismissedTasks: [...(donor.dismissedTasks ?? []), taskId],
    });
  };

  const handleDeleteTask = async (task: TaskEntry) => {
    captureUndo(`Deleted "${task.label}"`);
    await deleteTaskMut.mutateAsync({ id: task.id, donorId: donor.id });
    if (!task.id.startsWith('manual-')) {
      await updateDonor(donor.id, { dismissedTasks: Array.from(new Set([...(donor.dismissedTasks ?? []), task.id])) });
    }
    onTaskCompleted?.();
  };

  const handleCompleteTask = async (taskId: string) => {
    const dateUsed = completeDate || TODAY;
    // Find the task definition (either from liveTasks or from the auto-generated timeline)
    const existingTask = effectiveCompletedTasks.find(t => t.id === taskId);
    const autoTask = timeline.find(i => i.kind === 'task' && i.data.id === taskId);
    const taskDef = existingTask ?? (autoTask?.kind === 'task' ? autoTask.data : null);
    if (!taskDef) return;
    // Write directly to DB via tRPC — no intermediate updateDonor
    await upsertTaskMut.mutateAsync({
      id: taskId,
      donorId: donor.id,
      kind: taskDef.kind,
      label: taskDef.label,
      dueDate: taskDef.dueDate,
      completedDate: dateUsed,
      completedBy: completeBy,
    });
    // If newsletter task, also update the donor flag
    if (taskId === 'newsletter') {
      await updateDonor(donor.id, { newsletterSubscribed: true });
    }
    setCompletingId(null);
    setCompleteDate(TODAY);
    // Refetch after DB write is confirmed
    onTaskCompleted?.();
  };

  const handleUncompleteTask = async (taskId: string) => {
    const taskDef = effectiveCompletedTasks.find(t => t.id === taskId);
    if (!taskDef) return;
    await upsertTaskMut.mutateAsync({
      id: taskId,
      donorId: donor.id,
      kind: taskDef.kind,
      label: taskDef.label,
      dueDate: taskDef.dueDate,
      completedDate: undefined,
      completedBy: undefined,
    });
    if (taskId === 'newsletter') {
      await updateDonor(donor.id, { newsletterSubscribed: false });
    }
    onTaskCompleted?.();
  };

  // Default colors by type. Recurring task colors use the state-aware fig palette.
  const dotColor = (kind: string, isTask: boolean) => {
    if (!isTask) return 'oklch(0.45 0.012 65)'; // dark — logged interaction
    return 'oklch(0.50 0.18 250)'; // blue — onboarding / manual
  };

  const dotBg = (kind: string, isTask: boolean) => {
    if (!isTask) return 'oklch(0.45 0.012 65)';
    return 'oklch(0.50 0.18 250)';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-lg" style={{ color: 'oklch(0.22 0.018 55)' }}>Donor Journey</h3>
        <div className="flex items-center gap-2">
          {completedTaskCount > 0 && (
            <button
              onClick={() => setShowCompletedTasks(v => !v)}
              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border transition-colors"
              style={{
                color: 'oklch(0.42 0.13 145)',
                borderColor: 'oklch(0.75 0.10 145)',
                background: showCompletedTasks ? 'oklch(0.95 0.05 145)' : 'transparent',
              }}
            >
              <Check size={11} /> {showCompletedTasks ? 'Hide completed' : `View completed (${completedTaskCount})`}
            </button>
          )}
          <button
            onClick={() => { setShowLogInteraction(v => !v); setShowAddTask(false); }}
            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border transition-colors"
            style={{ color: 'oklch(0.45 0.012 65)', borderColor: 'oklch(0.75 0.012 65)', background: showLogInteraction ? 'oklch(0.92 0.008 65)' : 'transparent' }}
          >
            <Plus size={11} /> Log Interaction
          </button>
          <button
            onClick={() => { setShowAddTask(v => !v); setShowLogInteraction(false); }}
            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border transition-colors"
            style={{ color: 'oklch(0.50 0.18 250)', borderColor: 'oklch(0.75 0.12 250)', background: showAddTask ? 'oklch(0.96 0.04 250)' : 'transparent' }}
          >
            <Plus size={11} /> Add task
          </button>
        </div>
      </div>

      {/* Add manual task form */}
      {showAddTask && (
        <div className="mb-4 p-3 rounded-lg border border-[oklch(0.75_0.12_250)] bg-[oklch(0.96_0.04_250)] space-y-2">
          <p className="text-xs uppercase tracking-widest" style={{ color: 'oklch(0.50 0.18 250)' }}>New Next Action Task</p>
          <Input value={taskLabel} onChange={e => setTaskLabel(e.target.value)} placeholder="e.g. Send impact photos, schedule a call…" className="text-sm" />
          <div className="flex gap-2 flex-wrap items-end">
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'oklch(0.50 0.18 250)' }}>Due date</label>
              <Input type="date" value={taskDate} onChange={e => setTaskDate(e.target.value)} className="text-sm w-36" />
            </div>
            <Button size="sm" onClick={handleAddTask} disabled={!taskLabel.trim()} style={{ background: 'oklch(0.50 0.18 250)', color: 'white' }}>
              <Plus size={12} className="mr-1" /> Add to timeline
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowAddTask(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Log interaction — collapsible form */}
      {showLogInteraction && (
        <div className="mb-4 p-3 rounded-lg border border-[oklch(0.84_0.018_75)] bg-[oklch(0.965_0.012_80)] space-y-2">
          <Textarea value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="What happened? (e.g., Sent thank you note, had a call, mailed donor packet…)" rows={2} className="text-sm" autoFocus />
          <div className="flex gap-2 flex-wrap items-center">
            <div className="flex items-center gap-2">
              <label className="text-xs" style={{ color: 'oklch(0.52 0.022 65)' }}>By:</label>
              <select value={noteAuthor} onChange={e => setNoteAuthor(e.target.value)} className="text-sm border rounded px-2 py-1 bg-white border-[oklch(0.84_0.018_75)]">
                {TEAM_MEMBERS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs" style={{ color: 'oklch(0.52 0.022 65)' }}>Date:</label>
              <Input type="date" value={noteDate} onChange={e => setNoteDate(e.target.value)} className="text-sm w-36" />
            </div>
            <Button size="sm" onClick={async () => { await handleAddNote(); setShowLogInteraction(false); }} disabled={!newNote.trim()} style={{ background: 'oklch(0.22 0.018 55)', color: 'oklch(0.96 0.008 75)' }}>
              Save
            </Button>
            <button onClick={() => setShowLogInteraction(false)} className="text-xs" style={{ color: 'oklch(0.52 0.022 65)' }}>cancel</button>
          </div>
        </div>
      )}

      {/* Timeline */}
      {timeline.length === 0 ? (
        <p className="text-sm text-center py-6 italic" style={{ color: 'oklch(0.62 0.012 65)' }}>No entries yet.</p>
      ) : (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[7px] top-2 bottom-2 w-px" style={{ background: 'oklch(0.88 0.012 75)' }} />
          <div className="space-y-0">
            {timeline.map((item, idx) => {
              const isTask = item.kind === 'task';
              const isFuture = item.date > todayStr;
              const isToday = item.date === todayStr;

              if (isTask) {
                const task = item.data;
                const completed = item.completed;
                const isCompleted = !!completed?.completedDate;
                const isConfirming = completingId === task.id;
                const taskColor = task.kind === 'recurring'
                  ? recurringJourneyColor(isFuture, isCompleted)
                  : dotColor(task.kind, true);
                const futureBlueFade = isFuture && task.kind !== 'recurring';

                return (
                  <div key={task.id} className={`flex gap-3 pb-4 ${futureBlueFade ? 'opacity-70' : ''}`}>
                    <div className="flex flex-col items-center flex-shrink-0 z-10">
                      <div className="w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center mt-0.5"
                        style={{
                          borderColor: taskColor,
                          background: isCompleted ? taskColor : 'white',
                        }}
                      >
                        {isCompleted && <Check size={8} color="white" strokeWidth={3} />}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 pb-1">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <span
                            className={`text-sm font-medium ${isCompleted ? 'line-through opacity-60' : ''}`}
                            style={{ color: taskColor }}
                          >
                            {task.label}
                          </span>
                          <span className="text-xs ml-2" style={{ color: 'oklch(0.62 0.012 65)' }}>
                            {isToday ? 'Today' : formatDate(task.dueDate)}
                          </span>
                        </div>
                        {/* Right-side action group */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {!isConfirming && editingTaskId !== task.id && (
                            <button onClick={() => setEditingTaskId(task.id)} className="text-xs opacity-50 hover:opacity-100" style={{ color: 'oklch(0.50 0.18 250)' }}>edit</button>
                          )}
                          {!isCompleted && !isConfirming && editingTaskId !== task.id && (
                            <button
                              onClick={() => { setCompletingId(task.id); setCompleteBy(noteAuthor); }}
                              className="text-xs px-2 py-0.5 rounded border transition-colors"
                              style={{ borderColor: taskColor, color: taskColor, background: 'white' }}
                            >
                              Mark done
                            </button>
                          )}
                          {!isConfirming && editingTaskId !== task.id && (
                            <button
                              onClick={() => task.id.startsWith('manual-') || isCompleted ? handleDeleteTask(task) : handleDismissTask(task.id, task.label)}
                              className="text-xs px-2 py-0.5 rounded border transition-colors hover:bg-red-50"
                              style={{ color: 'oklch(0.50 0.20 27)', borderColor: 'oklch(0.75 0.15 27)', background: 'white' }}
                            >
                              Delete
                            </button>
                          )}
                        {isCompleted && (
                          <button onClick={() => handleUncompleteTask(task.id)} className="text-xs opacity-40 hover:opacity-70 flex-shrink-0" style={{ color: 'oklch(0.52 0.022 65)' }}>undo</button>
                        )}
                        </div>
                      {editingTaskId === task.id && (
                        <InlineTaskEdit
                          task={task}
                          onSave={(l, d) => handleEditTask(task, l, d)}
                          onCancel={() => setEditingTaskId(null)}
                        />
                      )}
                      </div>
                      {isCompleted && completed && (
                        <p className="text-xs mt-0.5" style={{ color: 'oklch(0.62 0.012 65)' }}>
                          Done by {completed.completedBy} · {formatDate(completed.completedDate!)}
                        </p>
                      )}
                      {isConfirming && (
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <label className="text-xs" style={{ color: 'oklch(0.52 0.022 65)' }}>Completed by:</label>
                          <select value={completeBy} onChange={e => setCompleteBy(e.target.value)} className="text-xs border rounded px-1.5 py-0.5 bg-white border-[oklch(0.84_0.018_75)]">
                            {TEAM_MEMBERS.map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                          <label className="text-xs" style={{ color: 'oklch(0.52 0.022 65)' }}>Date:</label>
                          <Input type="date" value={completeDate} onChange={e => setCompleteDate(e.target.value)} className="text-xs h-6 px-1.5 w-32" />
                          <button onClick={() => handleCompleteTask(task.id)} className="text-xs px-2 py-0.5 rounded text-white" style={{ background: taskColor }}>
                            Confirm
                          </button>
                          <button onClick={() => setCompletingId(null)} className="text-xs" style={{ color: 'oklch(0.52 0.022 65)' }}>cancel</button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }

              // Activity entry
              const activity = item.data;
              const isEditingThis = editingActivityId === activity.id;
              return (
                <div key={activity.id} className="flex gap-3 pb-4">
                  <div className="flex flex-col items-center flex-shrink-0 z-10">
                    <div className="w-3.5 h-3.5 rounded-full mt-0.5" style={{ background: dotColor('activity', false) }} />
                  </div>
                  <div className="flex-1 min-w-0 pb-1">
                    <div className="flex items-center justify-between gap-2 mb-0.5 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium" style={{ color: 'oklch(0.22 0.018 55)' }}>{activity.author}</span>
                        <span className="text-xs" style={{ color: 'oklch(0.62 0.012 65)' }}>{formatDate(activity.date)}</span>
                      </div>
                      {!isEditingThis && (
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button onClick={() => { setEditingActivityId(activity.id); setEditActivityNote(activity.note); setEditActivityDate(activity.date); }} className="text-xs opacity-50 hover:opacity-100" style={{ color: 'oklch(0.50 0.18 250)' }}>edit</button>
                          <button onClick={async () => { await deleteActivityMut.mutateAsync({ id: activity.id, donorId: donor.id }); onActivityAdded?.(); }} className="text-xs px-2 py-0.5 rounded border hover:bg-red-50" style={{ color: 'oklch(0.50 0.20 27)', borderColor: 'oklch(0.75 0.15 27)' }}>Delete</button>
                        </div>
                      )}
                    </div>
                    {isEditingThis ? (
                      <div className="space-y-1 mt-1">
                        <Textarea value={editActivityNote} onChange={e => setEditActivityNote(e.target.value)} rows={2} className="text-sm" />
                        <Input type="date" value={editActivityDate} onChange={e => setEditActivityDate(e.target.value)} className="text-xs h-7 px-2 w-36" />
                        <div className="flex gap-1">
                          <button onClick={async () => { await updateActivityMut.mutateAsync({ id: activity.id, donorId: donor.id, note: editActivityNote, date: editActivityDate }); setEditingActivityId(null); onActivityAdded?.(); }} className="text-xs px-2 py-0.5 rounded text-white" style={{ background: 'oklch(0.22 0.018 55)' }}>Save</button>
                          <button onClick={() => setEditingActivityId(null)} className="text-xs px-2 py-0.5 rounded" style={{ color: 'oklch(0.52 0.022 65)' }}>cancel</button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm" style={{ color: 'oklch(0.40 0.018 55)' }}>{activity.note}</p>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    )}
    {/* Undo toast */}
    {undoSnapshot && (
      <div className="flex items-center justify-between gap-3 mt-3 px-3 py-2 rounded-lg border" style={{ background: 'oklch(0.22 0.018 55)', borderColor: 'oklch(0.35 0.018 55)' }}>
        <span className="text-xs" style={{ color: 'oklch(0.88 0.012 75)' }}>{undoSnapshot.label}</span>
        <button onClick={handleUndo} className="text-xs px-2 py-0.5 rounded font-medium flex-shrink-0" style={{ background: 'oklch(0.96 0.008 75)', color: 'oklch(0.22 0.018 55)' }}>
          Undo
        </button>
      </div>
    )}
  </div>
  );
}
