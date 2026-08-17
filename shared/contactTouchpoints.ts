export type ActivityTouchpoint = { date: string };
export type TaskTouchpoint = { id: string; completedDate?: string | null };

/**
 * A donor cadence resets only after a logged interaction or a manually-created
 * blue task is completed. Automated onboarding and recurring tasks are excluded,
 * except Brenley's annual September thank-you, which is intentional stewardship.
 */
export function latestEligibleTouchpointDate(
  activities: ActivityTouchpoint[],
  tasks: TaskTouchpoint[],
) {
  const dates = [
    ...activities.map(activity => activity.date),
    ...tasks
      .filter(task => (task.id.startsWith('manual-') || task.id.startsWith('brenley-annual-thank-you-') || task.id.includes('_brenley-annual-thank-you-')) && Boolean(task.completedDate))
      .map(task => task.completedDate!),
  ].filter(date => /^\d{4}-\d{2}-\d{2}$/.test(date));

  return dates.sort().at(-1) ?? null;
}
