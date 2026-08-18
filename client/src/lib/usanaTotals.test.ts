import { describe, expect, it } from 'vitest';
import { receivedUsanaGrantTotal } from './usanaTotals';

describe('receivedUsanaGrantTotal', () => {
  it('includes only Garden Tower grants marked received for individual expeditions', () => {
    expect(receivedUsanaGrantTotal([
      { id: 'received', operations: { gardenTowerFundsUsd: 4000, gardenTowerFundsReceived: true } },
      { id: 'planned', operations: { gardenTowerFundsUsd: 2500, gardenTowerFundsReceived: false } },
      { id: 'unspecified', operations: { gardenTowerFundsUsd: 900 } },
    ] as any)).toBe(4000);
  });
});
