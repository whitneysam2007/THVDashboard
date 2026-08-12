import { describe, expect, it } from 'vitest';
import {
  getAllDonors,
  getAllInitiatives,
  getAllTasks,
  getAllTrips,
} from './db';

describe('Supabase dashboard migration', () => {
  it('exposes the imported production dashboard records through the server data layer', async () => {
    const [donors, tasks, trips, initiatives] = await Promise.all([
      getAllDonors(),
      getAllTasks(),
      getAllTrips(),
      getAllInitiatives(),
    ]);

    expect(donors.length).toBeGreaterThan(0);
    expect(tasks.length).toBeGreaterThan(0);
    expect(trips.length).toBeGreaterThan(0);
    expect(initiatives.length).toBeGreaterThan(0);
  });
});
