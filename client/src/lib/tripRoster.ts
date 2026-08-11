import type { Trip, TripAttendee } from './types';

export type TripRosterSummary = {
  teamCount: number;
  confirmedGuests: TripAttendee[];
  possibleGuests: TripAttendee[];
  totalTravelers: number;
};

export function summarizeTripRoster(trip: Pick<Trip, 'teamMembers' | 'attendees'>): TripRosterSummary {
  const attendees = trip.attendees ?? [];
  const confirmedGuests = attendees.filter(attendee => Boolean(attendee.confirmed));
  const possibleGuests = attendees.filter(attendee => !attendee.confirmed);
  const teamCount = trip.teamMembers?.length ?? 0;

  return {
    teamCount,
    confirmedGuests,
    possibleGuests,
    totalTravelers: teamCount + confirmedGuests.length,
  };
}
