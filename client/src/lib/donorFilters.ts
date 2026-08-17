export function matchesRecurringDonorFilter(donor: { type: string }, recurringOnly: boolean) {
  return !recurringOnly || donor.type === 'recurring';
}
