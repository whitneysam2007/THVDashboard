import type { Trip } from './types';

export function receivedUsanaGrantTotal(trips: Trip[]) {
  return trips.reduce((sum, trip) => {
    const operations = trip.operations;
    return sum + (operations?.gardenTowerFundsReceived ? operations.gardenTowerFundsUsd ?? 0 : 0);
  }, 0);
}
