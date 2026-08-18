import { nanoid } from 'nanoid';
import type { TripItineraryActivity, TripItineraryDay } from '../../../shared/tripOperations';

function timeValue(time?: string) {
  if (!time) return Number.POSITIVE_INFINITY;
  const match = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!match) return Number.POSITIVE_INFINITY;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function sortItineraryActivities(activities: TripItineraryActivity[]) {
  return activities
    .map((activity, index) => ({ activity, index }))
    .sort((left, right) => timeValue(left.activity.time) - timeValue(right.activity.time) || left.index - right.index)
    .map(({ activity }) => activity);
}

export function copyItineraryTemplate(templateDays: TripItineraryDay[], targetDates: string[]): TripItineraryDay[] {
  return targetDates.map((date, index) => ({
    date,
    activities: sortItineraryActivities((templateDays[index]?.activities ?? []).map(activity => ({ ...activity, id: nanoid() }))),
  }));
}
