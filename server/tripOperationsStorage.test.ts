import { describe, expect, it } from 'vitest';
import { joinTripNotes, splitTripNotes } from './tripOperationsStorage';

describe('trip operations note storage', () => {
  it('preserves visible notes and operational data', () => {
    const stored = joinTripNotes('Leadership briefing.', {
      gardenTowers: 8,
      gardenTowerFundsUsd: 4_000,
      gardenTowerFundsReceived: true,
      gardenTowerDocumentUrl: 'usana/garden-tower/trip-1/tower-plan.pdf',
    });
    expect(splitTripNotes(stored)).toEqual({ notes: 'Leadership briefing.', operations: {
      gardenTowers: 8,
      gardenTowerFundsUsd: 4_000,
      gardenTowerFundsReceived: true,
      gardenTowerDocumentUrl: 'usana/garden-tower/trip-1/tower-plan.pdf',
    } });
  });

  it('round-trips leader flight details and daily itinerary activities', () => {
    const stored = joinTripNotes('', {
      leaderLogistics: { Liz: { purchasedTicket: true, flight: { airline: 'Avianca', flightNumber: 'AV001', baggageNotes: 'Two bags' } } },
      itineraryDays: [{ date: '2026-11-07', activities: [{ id: 'arrival', title: 'Arrive in Guatemala City', notes: 'Shuttle to hotel.' }] }],
    });
    expect(splitTripNotes(stored).operations).toMatchObject({
      leaderLogistics: { Liz: { purchasedTicket: true, flight: { airline: 'Avianca', flightNumber: 'AV001', baggageNotes: 'Two bags' } } },
      itineraryDays: [{ date: '2026-11-07', activities: [{ id: 'arrival', title: 'Arrive in Guatemala City', notes: 'Shuttle to hotel.' }] }],
    });
  });

  it('round-trips activity groups and lodging assignments', () => {
    const stored = joinTripNotes('Assignments ready.', {
      activityGroups: [{ id: 'garden-1', activityName: 'Garden Towers Day 1', date: '2026-11-10', groupName: 'Group 1', leader: 'Amy', members: ['Amy', 'Kat Swan'], notes: 'Bring water filters.' }],
      lodgingAssignments: [{ id: 'room-12', roomNumber: '12', capacity: 3, members: ['Amy', 'Kat Swan'], notes: 'Near lobby.' }],
    });
    expect(splitTripNotes(stored)).toMatchObject({
      notes: 'Assignments ready.',
      operations: {
        activityGroups: [{ activityName: 'Garden Towers Day 1', leader: 'Amy', members: ['Amy', 'Kat Swan'] }],
        lodgingAssignments: [{ roomNumber: '12', capacity: 3, members: ['Amy', 'Kat Swan'] }],
      },
    });
  });
});
