export type TeamRole = 'owner' | 'member';

export function normalizeTeamEmail(value: string) {
  return value.trim().toLowerCase();
}

export function canManageTeamMember(actorEmail: string, targetEmail: string) {
  return normalizeTeamEmail(actorEmail) !== normalizeTeamEmail(targetEmail);
}

export function isActiveAllowedMember<T extends { is_active: boolean }>(entry: T | null | undefined): entry is T {
  return entry?.is_active === true;
}

export function displayNameFromEmail(email: string) {
  const localPart = normalizeTeamEmail(email).split('@')[0] ?? 'Team member';
  return localPart
    .split(/[._-]/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
