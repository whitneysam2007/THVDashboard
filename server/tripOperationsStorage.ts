import type { TripOperations } from '../shared/tripOperations';

const PREFIX = '\n\n<!--thv-trip-operations:';
const SUFFIX = '-->';

export function splitTripNotes(value?: string | null) {
  const raw = value ?? '';
  const start = raw.lastIndexOf(PREFIX);
  if (start === -1 || !raw.endsWith(SUFFIX)) return { notes: raw, operations: {} as TripOperations };
  try {
    return { notes: raw.slice(0, start).trimEnd(), operations: JSON.parse(raw.slice(start + PREFIX.length, -SUFFIX.length)) as TripOperations };
  } catch {
    return { notes: raw, operations: {} as TripOperations };
  }
}

export function joinTripNotes(notes: string | undefined, operations: TripOperations | undefined) {
  const visibleNotes = notes?.trim() ?? '';
  if (!operations || Object.keys(operations).length === 0) return visibleNotes || null;
  return `${visibleNotes}${PREFIX}${JSON.stringify(operations)}${SUFFIX}`;
}
