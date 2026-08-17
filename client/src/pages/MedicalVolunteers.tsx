import { Mail, Phone, Stethoscope } from 'lucide-react';
import { useDashboard } from '@/contexts/DashboardContext';
import { medicalVolunteersByTrip, MEDICAL_VOLUNTEER_SKILLS } from '@/lib/medicalVolunteers';

export default function MedicalVolunteers() {
  const { store } = useDashboard();
  const expeditions = medicalVolunteersByTrip(store.trips);

  return <div className="p-6 lg:p-8">
    <div className="max-w-6xl">
      <p className="text-xs uppercase tracking-[0.2em] text-[oklch(0.52_0.022_65)]">Trip support</p>
      <h1 className="mt-1 font-display text-4xl text-[oklch(0.22_0.018_55)]">Medical Volunteers</h1>
      <p className="mt-2 max-w-2xl text-sm text-[oklch(0.48_0.022_65)]">Medical, nursing, doctor, OB, and radiology profiles from existing expedition attendees.</p>

      {expeditions.length === 0 ? <div className="mt-8 rounded-xl border border-[oklch(0.84_0.018_75)] bg-[oklch(0.99_0.006_80)] p-8 text-center"><Stethoscope className="mx-auto text-[oklch(0.52_0.12_250)]" size={28} /><p className="mt-3 font-display text-xl text-[oklch(0.28_0.018_55)]">No medical volunteer profiles yet</p><p className="mt-1 text-sm text-[oklch(0.52_0.022_65)]">Add a qualifying medical skill to an attendee in Trips, and their profile will appear here automatically.</p></div>
        : <div className="mt-8 space-y-10">{expeditions.map(({ trip, attendees }) => <section key={trip.id}>
          <div className="border-b border-[oklch(0.84_0.018_75)] pb-3"><h2 className="font-display text-2xl text-[oklch(0.22_0.018_55)]">{trip.name}</h2></div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{attendees.map(attendee => {
            const medicalSkills = attendee.skills.filter(skill => MEDICAL_VOLUNTEER_SKILLS.includes(skill.trim().toLowerCase() as typeof MEDICAL_VOLUNTEER_SKILLS[number]));
            return <article key={attendee.id} className="rounded-xl border border-[oklch(0.84_0.018_75)] bg-[oklch(0.99_0.006_80)] p-5"><div className="flex items-start justify-between gap-3"><h3 className="font-display text-xl text-[oklch(0.25_0.018_55)]">{attendee.name}</h3><Stethoscope size={18} className="shrink-0 text-[oklch(0.50_0.12_250)]" /></div><div className="mt-3 flex flex-wrap gap-1.5">{medicalSkills.map(skill => <span key={skill} className="rounded-full bg-[oklch(0.94_0.04_250)] px-2 py-1 text-xs font-medium text-[oklch(0.34_0.10_250)]">{skill}</span>)}</div><div className="mt-4 space-y-2 text-sm text-[oklch(0.46_0.022_65)]">{attendee.email && <p className="flex items-center gap-2"><Mail size={14} />{attendee.email}</p>}{attendee.phone && <p className="flex items-center gap-2"><Phone size={14} />{attendee.phone}</p>}{attendee.notes && <p className="border-t border-[oklch(0.90_0.012_78)] pt-3 text-xs leading-relaxed">{attendee.notes}</p>}</div></article>;
          })}</div>
        </section>)}</div>}
    </div>
  </div>;
}
