import type { Trip, TripAttendee } from './types';

export type TripRosterSummary = {
  teamCount: number;
  ticketedGuests: TripAttendee[];
  confirmedGuests: TripAttendee[];
  possibleGuests: TripAttendee[];
  travelingGuestCount: number;
  totalTravelers: number;
};

export type AttendeeRosterStatus = 'purchased-ticket' | 'confirmed' | 'possible';

export function attendeeRosterStatus(attendee: Pick<TripAttendee, 'confirmed' | 'purchasedTicket'>): AttendeeRosterStatus {
  if (attendee.purchasedTicket) return 'purchased-ticket';
  return attendee.confirmed ? 'confirmed' : 'possible';
}

export function attendeeFieldsForStatus(status: AttendeeRosterStatus) {
  return {
    confirmed: status !== 'possible',
    purchasedTicket: status === 'purchased-ticket',
  };
}

export function summarizeTripRoster(trip: Pick<Trip, 'teamMembers' | 'attendees'>): TripRosterSummary {
  const attendees = trip.attendees ?? [];
  const ticketedGuests = attendees.filter(attendee => attendeeRosterStatus(attendee) === 'purchased-ticket');
  const confirmedGuests = attendees.filter(attendee => attendeeRosterStatus(attendee) === 'confirmed');
  const possibleGuests = attendees.filter(attendee => attendeeRosterStatus(attendee) === 'possible');
  const teamCount = trip.teamMembers?.length ?? 0;
  const travelingGuestCount = ticketedGuests.length + confirmedGuests.length;

  return {
    teamCount,
    ticketedGuests,
    confirmedGuests,
    possibleGuests,
    travelingGuestCount,
    totalTravelers: teamCount + travelingGuestCount,
  };
}
