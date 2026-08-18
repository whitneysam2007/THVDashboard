import { describe, expect, it } from 'vitest';
import { getTripLeaders } from './teamLeaders';

describe('getTripLeaders', () => {
  it('applies saved leader capabilities and ticket status for a trip', () => {
    expect(getTripLeaders(['Liz', 'Amy', 'Kirsten'], { leaderLogistics: { Liz: { purchasedTicket: true } } })).toEqual([
      { name: 'Liz', tags: ['Leader', 'Nurse', 'SPANISH'], purchasedTicket: true },
      { name: 'Amy', tags: ['Leader'], purchasedTicket: false },
      { name: 'Kirsten', tags: ['Leader', 'SPANISH'], purchasedTicket: false },
    ]);
  });
});
