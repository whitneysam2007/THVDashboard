export type StoredMedicalProfile = Record<string, unknown>;

const PREFIX = '\n\n<!--thv-medical-profile:';
const SUFFIX = '-->';

export function splitAttendeeNotes(value?: string | null) {
  const raw = value ?? '';
  const start = raw.lastIndexOf(PREFIX);
  if (start === -1 || !raw.endsWith(SUFFIX)) return { notes: raw, medicalProfile: {} as StoredMedicalProfile };
  const serialised = raw.slice(start + PREFIX.length, -SUFFIX.length);
  try {
    const medicalProfile = JSON.parse(serialised) as StoredMedicalProfile;
    return { notes: raw.slice(0, start).trimEnd(), medicalProfile };
  } catch {
    return { notes: raw, medicalProfile: {} as StoredMedicalProfile };
  }
}

export function joinAttendeeNotes(notes: string | undefined, medicalProfile: StoredMedicalProfile | undefined) {
  const visibleNotes = notes?.trim() ?? '';
  if (!medicalProfile || Object.keys(medicalProfile).length === 0) return visibleNotes || null;
  return `${visibleNotes}${PREFIX}${JSON.stringify(medicalProfile)}${SUFFIX}`;
}
