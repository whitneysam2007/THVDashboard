import { describe, expect, it } from 'vitest';
import { attendeeFieldsForStatus, attendeeRosterStatus, summarizeTripRoster } from './tripRoster';

describe('summarizeTripRoster', () => {
  it('groups ticketed, confirmed, and possible guests while excluding only possible guests from total travelers', () => {
    const roster = summarizeTripRoster({
      teamMembers: ['Liz', 'Lauren'],
      attendees: [
        { id: 't', name: 'Ticketed Guest', confirmed: true, purchasedTicket: true } as any,
        { id: 'a', name: 'Confirmed Guest', confirmed: true } as any,
        { id: 'b', name: 'Possible Guest', confirmed: false } as any,
      ],
    });

    expect(roster.teamCount).toBe(2);
    expect(roster.ticketedGuests.map(attendee => attendee.name)).toEqual(['Ticketed Guest']);
    expect(roster.confirmedGuests.map(attendee => attendee.name)).toEqual(['Confirmed Guest']);
    expect(roster.possibleGuests.map(attendee => attendee.name)).toEqual(['Possible Guest']);
    expect(roster.travelingGuestCount).toBe(2);
    expect(roster.totalTravelers).toBe(4);
  });

  it('maps each dropdown status to the persisted compatibility fields', () => {
    expect(attendeeFieldsForStatus('purchased-ticket')).toEqual({ confirmed: true, purchasedTicket: true });
    expect(attendeeFieldsForStatus('confirmed')).toEqual({ confirmed: true, purchasedTicket: false });
    expect(attendeeFieldsForStatus('possible')).toEqual({ confirmed: false, purchasedTicket: false });
    expect(attendeeRosterStatus({ confirmed: false, purchasedTicket: true } as any)).toBe('purchased-ticket');
  });
});
