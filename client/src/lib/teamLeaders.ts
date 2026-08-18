import type { TripOperations } from '../../../shared/tripOperations';

export type TripLeader = {
  name: string;
  tags: string[];
  purchasedTicket: boolean;
};

const TEAM_TAGS: Record<string, string[]> = {
  Liz: ['Leader', 'Nurse', 'SPANISH'],
  Lauren: ['Leader', 'SPANISH'],
  Anna: ['Leader', 'SPANISH'],
  Brenley: ['Leader', 'SPANISH'],
  Emily: ['Leader', 'Nurse', 'SPANISH'],
  Amy: ['Leader'],
  Kirsten: ['Leader', 'SPANISH'],
};

export function getTripLeaders(teamMembers: string[], operations?: TripOperations): TripLeader[] {
  return teamMembers.map(name => ({
    name,
    tags: TEAM_TAGS[name] ?? ['Leader'],
    purchasedTicket: Boolean(operations?.leaderLogistics?.[name]?.purchasedTicket),
  }));
}
