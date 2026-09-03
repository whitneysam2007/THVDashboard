export type LowerTierDonorContactDraft = {
  name: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
};

export function lowerTierDonorContactUpdate(draft: LowerTierDonorContactDraft) {
  const name = draft.name.trim();
  if (!name) return null;
  return {
    name,
    email: draft.email.trim(),
    phone: draft.phone.trim(),
    address: draft.address.trim(),
    notes: draft.notes.trim(),
  };
}
