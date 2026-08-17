export function matchesRecurringDonorFilter(donor: { type: string }, recurringOnly: boolean) {
  return !recurringOnly || donor.type === 'recurring';
}

export function matchesPotentiallyRecurringDonorFilter(donor: { type: string }, potentiallyRecurringOnly: boolean) {
  return !potentiallyRecurringOnly || donor.type === 'potentially-recurring';
}

export function matchesPotentialDonorFilter(donor: { type: string }, potentialOnly: boolean) {
  return !potentialOnly || donor.type === 'potential';
}
