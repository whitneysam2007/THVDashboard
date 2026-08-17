import { useState } from 'react';
import { Mail, RotateCcw } from 'lucide-react';
import { useDashboard } from '@/contexts/DashboardContext';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatDate } from '@/lib/utils';
import type { TaskEntry } from '@/lib/types';
import { THANK_YOU_LETTER_LABEL, isThankYouLetterTaskId, thankYouLetterTaskId } from '@shared/thankYouLetters';

type ThankYouLetterControlProps = {
  donorId: string;
  tasks: TaskEntry[];
  hasCurrentYearDonation: boolean;
};

export default function ThankYouLetterControl({ donorId, tasks, hasCurrentYearDonation }: ThankYouLetterControlProps) {
  const { currentUser } = useDashboard();
  const utils = trpc.useUtils();
  const upsertTaskMut = trpc.donors.upsertTask.useMutation();
  const deleteTaskMut = trpc.donors.deleteTask.useMutation();
  const [sentDate, setSentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const year = new Date().getFullYear();
  const taskId = thankYouLetterTaskId(year);
  const completed = tasks.find(task => isThankYouLetterTaskId(task.id, year) && task.completedDate);

  if (!hasCurrentYearDonation) return null;

  const refresh = async () => {
    await Promise.all([
      utils.donors.list.invalidate(),
      utils.donors.getWithDetails.invalidate({ id: donorId }),
    ]);
  };

  const markSent = async () => {
    setSaving(true);
    try {
      await upsertTaskMut.mutateAsync({
        id: taskId,
        donorId,
        kind: 'onboarding',
        label: `${THANK_YOU_LETTER_LABEL} (${year})`,
        dueDate: sentDate,
        completedDate: sentDate,
        completedBy: currentUser ?? 'THV team',
      });
      await refresh();
    } finally {
      setSaving(false);
    }
  };

  const unmark = async () => {
    setSaving(true);
    try {
      await deleteTaskMut.mutateAsync({ id: taskId, donorId });
      await refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={`rounded-lg border p-4 ${completed ? 'border-[oklch(0.78_0.10_145)] bg-[oklch(0.95_0.05_145)]' : 'border-[oklch(0.74_0.09_250)] bg-[oklch(0.95_0.035_250)]'}`}>
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-full ${completed ? 'bg-[oklch(0.54_0.13_145)] text-white' : 'bg-[oklch(0.52_0.18_250)] text-white'}`}>
          <Mail size={17} />
        </span>
        <div className="flex-1">
          <p className="text-xs uppercase tracking-[0.14em]" style={{ color: completed ? 'oklch(0.38 0.11 145)' : 'oklch(0.38 0.14 250)' }}>Handwritten thank-you card</p>
          <h3 className="font-display text-xl mt-1" style={{ color: 'oklch(0.22 0.018 55)' }}>Has THV sent a thank-you card to this person in {year}?</h3>
          {completed ? (
            <p className="text-xs mt-1" style={{ color: 'oklch(0.38 0.11 145)' }}>Sent {formatDate(completed.completedDate!)} by {completed.completedBy || 'THV team'}.</p>
          ) : (
            <p className="text-xs mt-1" style={{ color: 'oklch(0.38 0.14 250)' }}>Blue means this year’s card has not yet been marked sent.</p>
          )}
        </div>
      </div>
      <div className="mt-3 flex flex-col sm:flex-row gap-2">
        <Input type="date" className="sm:max-w-[180px]" value={completed?.completedDate ?? sentDate} onChange={event => setSentDate(event.target.value)} />
        {completed ? (
          <Button size="sm" variant="outline" disabled={saving} onClick={() => void unmark()}><RotateCcw size={14} /> Undo sent</Button>
        ) : (
          <Button size="sm" disabled={saving} onClick={() => void markSent()}><Mail size={14} /> Mark card sent</Button>
        )}
      </div>
    </section>
  );
}
