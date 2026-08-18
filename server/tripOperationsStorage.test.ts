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
});
