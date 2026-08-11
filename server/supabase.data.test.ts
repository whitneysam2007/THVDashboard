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

    expect(donors).toHaveLength(16);
    expect(tasks).toHaveLength(49);
    expect(trips).toHaveLength(6);
    expect(initiatives).toHaveLength(4);
  });
});
