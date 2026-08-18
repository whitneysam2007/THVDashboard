import type { Trip, TripAttendee } from './types';

export type TripRosterSummary = {
  teamCount: number;
  goingGuests: TripAttendee[];
  confirmedGuests: TripAttendee[];
  possibleGuests: TripAttendee[];
  travelingGuestCount: number;
  totalTravelers: number;
};

export type AttendeeRosterStatus = 'confirmed' | 'possible';

export function attendeeRosterStatus(attendee: Pick<TripAttendee, 'confirmed'>): AttendeeRosterStatus {
  return attendee.confirmed ? 'confirmed' : 'possible';
}

export function attendeeFieldsForStatus(status: AttendeeRosterStatus) {
  return {
    confirmed: status === 'confirmed',
  };
}

export function isGoingAttendee(attendee: Pick<TripAttendee, 'purchasedTicket' | 'tripLogistics'>) {
  return Boolean(attendee.purchasedTicket || attendee.tripLogistics?.depositPaid);
}

export function summarizeTripRoster(trip: Pick<Trip, 'teamMembers' | 'attendees'>): TripRosterSummary {
  const attendees = trip.attendees ?? [];
  const goingGuests = attendees.filter(isGoingAttendee);
  const confirmedGuests = attendees.filter(attendee => !isGoingAttendee(attendee) && attendeeRosterStatus(attendee) === 'confirmed');
  const possibleGuests = attendees.filter(attendee => !isGoingAttendee(attendee) && attendeeRosterStatus(attendee) === 'possible');
  const teamCount = trip.teamMembers?.length ?? 0;
  const travelingGuestCount = goingGuests.length;

  return {
    teamCount,
    goingGuests,
    confirmedGuests,
    possibleGuests,
    travelingGuestCount,
    totalTravelers: teamCount + travelingGuestCount,
  };
}
