import { describe, expect, it } from 'vitest';
import { attendeeFieldsForStatus, attendeeRosterStatus, isGoingAttendee, summarizeTripRoster } from './tripRoster';

describe('summarizeTripRoster', () => {
  it('groups going guests separately and keeps potential and confirmed guests outside the trip total until they are going', () => {
    const roster = summarizeTripRoster({
      teamMembers: ['Liz', 'Lauren'],
      attendees: [
        { id: 't', name: 'Ticketed Guest', confirmed: true, purchasedTicket: true } as any,
        { id: 'a', name: 'Confirmed Guest', confirmed: true } as any,
        { id: 'b', name: 'Possible Guest', confirmed: false } as any,
      ],
    });

    expect(roster.teamCount).toBe(2);
    expect(roster.goingGuests.map(attendee => attendee.name)).toEqual(['Ticketed Guest']);
    expect(roster.confirmedGuests.map(attendee => attendee.name)).toEqual(['Confirmed Guest']);
    expect(roster.possibleGuests.map(attendee => attendee.name)).toEqual(['Possible Guest']);
    expect(roster.travelingGuestCount).toBe(1);
    expect(roster.totalTravelers).toBe(3);
  });

  it('maps only Potential and Confirmed status while ticket or $500 completion independently places a person in Going', () => {
    expect(attendeeFieldsForStatus('confirmed')).toEqual({ confirmed: true });
    expect(attendeeFieldsForStatus('possible')).toEqual({ confirmed: false });
    expect(attendeeRosterStatus({ confirmed: false } as any)).toBe('possible');
    expect(isGoingAttendee({ purchasedTicket: true } as any)).toBe(true);
    expect(isGoingAttendee({ purchasedTicket: false, tripLogistics: { depositPaid: true } } as any)).toBe(true);
    expect(isGoingAttendee({ purchasedTicket: false, tripLogistics: { depositPaid: false } } as any)).toBe(false);
  });
});
