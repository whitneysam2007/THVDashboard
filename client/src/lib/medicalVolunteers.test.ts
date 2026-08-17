import { describe, expect, it } from 'vitest';
import { isMedicalVolunteer, medicalVolunteersByTrip } from './medicalVolunteers';
import type { TripAttendee } from './types';

const attendee = (skills: string[]): TripAttendee => ({ id: skills.join('-'), name: 'Volunteer', skills });

describe('medical volunteers', () => {
  it('includes the five agreed medical skill categories case-insensitively', () => {
    for (const skill of ['Medical', 'Nurse', 'Doctor', 'OB', 'Radiology']) {
      expect(isMedicalVolunteer(attendee([skill]))).toBe(true);
    }
    expect(isMedicalVolunteer(attendee(['Teaching', 'Volunteer']))).toBe(false);
  });

  it('groups only qualifying attendee profiles under their expedition', () => {
    const groups = medicalVolunteersByTrip([
      { id: 'a', name: 'Spring Expedition', startDate: '2026-04-01', endDate: '2026-04-08', teamMembers: [], donorAttendees: [], attendees: [attendee(['Nurse']), attendee(['Photography'])] },
      { id: 'b', name: 'Summer Expedition', startDate: '2026-07-01', endDate: '2026-07-08', teamMembers: [], donorAttendees: [], attendees: [attendee(['Teaching'])] },
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].trip.name).toBe('Spring Expedition');
    expect(groups[0].attendees).toHaveLength(1);
  });
});
