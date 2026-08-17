import { describe, expect, it } from 'vitest';
import { joinAttendeeNotes, splitAttendeeNotes } from './medicalProfileStorage';

describe('medical profile note storage', () => {
  it('preserves visible trip notes while storing a profile separately', () => {
    const stored = joinAttendeeNotes('Needs a morning assignment.', { specialty: 'Pediatrics' });
    expect(splitAttendeeNotes(stored)).toEqual({ notes: 'Needs a morning assignment.', medicalProfile: { specialty: 'Pediatrics' } });
  });

  it('returns ordinary notes unchanged when no profile marker exists', () => {
    expect(splitAttendeeNotes('Photography background')).toEqual({ notes: 'Photography background', medicalProfile: {} });
  });
});
