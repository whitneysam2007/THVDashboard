import type { Trip, TripAttendee } from './types';

export const MEDICAL_VOLUNTEER_SKILLS = ['medical', 'nurse', 'doctor', 'ob', 'radiology'] as const;

export function isMedicalVolunteer(attendee: Pick<TripAttendee, 'skills'>) {
  return attendee.skills.some(skill => MEDICAL_VOLUNTEER_SKILLS.includes(skill.trim().toLowerCase() as typeof MEDICAL_VOLUNTEER_SKILLS[number]));
}

export function medicalVolunteersByTrip(trips: Trip[]) {
  return trips
    .map(trip => ({
      trip,
      attendees: (trip.attendees ?? []).filter(isMedicalVolunteer),
    }))
    .filter(group => group.attendees.length > 0);
}
