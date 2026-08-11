// THV Donor Dashboard — Add New Donor Modal

import { useState } from 'react';
import { useDashboard } from '@/contexts/DashboardContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { X } from 'lucide-react';
import { DonorTier } from '@/lib/types';

const CURRENT_YEAR = new Date().getFullYear();

interface AddDonorModalProps {
  onClose: () => void;
}

export default function AddDonorModal({ onClose }: AddDonorModalProps) {
  const { addDonor } = useDashboard();
  const [form, setForm] = useState({
    name: '',
    contactName: '',
    email: '',
    phone: '',
    address: '',
    startDate: new Date().toISOString().split('T')[0],
    type: 'recurring' as 'recurring' | 'one-time' | 'past',
    tier: 'institution' as DonorTier,
    contractEndDate: '',
    cadenceDays: 90, // stored internally as days; input is months
    cadenceDescription: '',
    recurringAmount: '',
    recurringFrequency: 'yearly' as 'monthly' | 'yearly',
    naruCircle: false,
    donorTrip: false,
    taxReceiptSent: false,
    newsletterSubscribed: false,
    manuallyInactive: false,
    referredBy: '',
    notes: '',
  });

  const set = (key: string, value: any) => setForm(f => ({ ...f, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    addDonor({
      name: form.name.trim(),
      contactName: form.contactName.trim(),
      email: form.email || undefined,
      phone: form.phone || undefined,
      address: form.address || undefined,
      startDate: form.startDate,
      type: form.type,
      tier: form.tier,
      contractEndDate: form.contractEndDate || undefined,
      cadenceDays: Number(form.cadenceDays),
      cadenceDescription: form.cadenceDescription,
      recurringAmount: form.type === 'recurring' && form.recurringAmount ? Number(form.recurringAmount) : undefined,
      recurringFrequency: form.type === 'recurring' ? form.recurringFrequency : undefined,
      naruCircle: form.naruCircle,
      donorTrip: form.donorTrip,
      taxReceiptSent: form.taxReceiptSent,
      newsletterSubscribed: form.newsletterSubscribed,
      manuallyInactive: false,
      completedTasks: [],
      referredBy: form.referredBy || undefined,
      donations: [],
      notes: form.notes || undefined,
      tags: [],
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(34,26,20,0.55)' }}>
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl" style={{ background: 'oklch(0.985 0.008 80)' }}>
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 pt-5 pb-4 border-b border-[oklch(0.84_0.018_75)]" style={{ background: 'oklch(0.985 0.008 80)' }}>
          <h2 className="font-display text-2xl" style={{ color: 'oklch(0.22 0.018 55)' }}>Add New Donor</h2>
          <button onClick={onClose} className="p-2 rounded-md hover:bg-[oklch(0.92_0.012_78)]">
            <X size={16} style={{ color: 'oklch(0.52 0.022 65)' }} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs mb-1 block uppercase tracking-widest" style={{ color: 'oklch(0.52 0.022 65)' }}>Donor / Organization Name *</label>
              <Input value={form.name} onChange={e => set('name', e.target.value)} required placeholder="e.g., Marriott Foundation" />
            </div>
            <div className="col-span-2">
              <label className="text-xs mb-1 block uppercase tracking-widest" style={{ color: 'oklch(0.52 0.022 65)' }}>Contact Name <span style={{ color: 'oklch(0.62 0.012 65)', fontWeight: 400 }}>(if different from above)</span></label>
              <Input value={form.contactName} onChange={e => set('contactName', e.target.value)} placeholder="e.g., Sarah Marriott" />
            </div>
            <div>
              <label className="text-xs mb-1 block uppercase tracking-widest" style={{ color: 'oklch(0.52 0.022 65)' }}>Email</label>
              <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
            <div>
              <label className="text-xs mb-1 block uppercase tracking-widest" style={{ color: 'oklch(0.52 0.022 65)' }}>Phone</label>
              <Input value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="text-xs mb-1 block uppercase tracking-widest" style={{ color: 'oklch(0.52 0.022 65)' }}>Address</label>
              <Input value={form.address} onChange={e => set('address', e.target.value)} />
            </div>
            <div>
              <label className="text-xs mb-1 block uppercase tracking-widest" style={{ color: 'oklch(0.52 0.022 65)' }}>Start Date</label>
              <Input type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} />
            </div>
            <div>
              <label className="text-xs mb-1 block uppercase tracking-widest" style={{ color: 'oklch(0.52 0.022 65)' }}>Donor Type</label>
              <select value={form.type} onChange={e => set('type', e.target.value)} className="w-full text-sm border rounded px-2 py-2 bg-white border-[oklch(0.84_0.018_75)]">
                <option value="recurring">Recurring</option>
                <option value="potentially-recurring">Potentially Recurring</option>
                <option value="potential">Potential Donor</option>
                <option value="one-time">One-time</option>
                <option value="past">Past</option>
              </select>
            </div>
            <div>
              <label className="text-xs mb-1 block uppercase tracking-widest" style={{ color: 'oklch(0.52 0.022 65)' }}>Tier</label>
              <select value={form.tier} onChange={e => set('tier', e.target.value)} className="w-full text-sm border rounded px-2 py-2 bg-white border-[oklch(0.84_0.018_75)]">
                <option value="individual">Individual</option>
                <option value="family-foundation">Family Foundation</option>
                <option value="business">Business</option>
                <option value="institution">Institution</option>
              </select>
            </div>

            {/* Recurring amount — only show when type is recurring */}
            {form.type === 'recurring' && (
              <>
                <div>
                  <label className="text-xs mb-1 block uppercase tracking-widest" style={{ color: 'oklch(0.52 0.022 65)' }}>Recurring Amount ($)</label>
                  <Input type="number" value={form.recurringAmount} onChange={e => set('recurringAmount', e.target.value)} placeholder="e.g. 5000" min={0} />
                </div>
                <div>
                  <label className="text-xs mb-1 block uppercase tracking-widest" style={{ color: 'oklch(0.52 0.022 65)' }}>Frequency</label>
                  <select value={form.recurringFrequency} onChange={e => set('recurringFrequency', e.target.value)} className="w-full text-sm border rounded px-2 py-2 bg-white border-[oklch(0.84_0.018_75)]">
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="text-xs mb-1 block uppercase tracking-widest" style={{ color: 'oklch(0.52 0.022 65)' }}>Communication cadence (months)</label>
              <Input type="number" value={Math.round(Number(form.cadenceDays) / 30)} onChange={e => set('cadenceDays', Number(e.target.value) * 30)} min={1} placeholder="e.g. 3" />
            </div>
            <div>
              <label className="text-xs mb-1 block uppercase tracking-widest" style={{ color: 'oklch(0.52 0.022 65)' }}>Contract End Date</label>
              <Input type="date" value={form.contractEndDate} onChange={e => set('contractEndDate', e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="text-xs mb-1 block uppercase tracking-widest" style={{ color: 'oklch(0.52 0.022 65)' }}>Cadence Description</label>
              <Input value={form.cadenceDescription} onChange={e => set('cadenceDescription', e.target.value)} placeholder="e.g., Photos + stories every 3 months" />
            </div>
          </div>

          <div className="flex gap-4 flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: 'oklch(0.22 0.018 55)' }}>
              <input type="checkbox" checked={form.naruCircle} onChange={e => set('naruCircle', e.target.checked)} />
              Narú Circle
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: 'oklch(0.22 0.018 55)' }}>
              <input type="checkbox" checked={form.donorTrip} onChange={e => set('donorTrip', e.target.checked)} />
              Donor Trip
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: 'oklch(0.22 0.018 55)' }}>
              <input type="checkbox" checked={form.newsletterSubscribed} onChange={e => set('newsletterSubscribed', e.target.checked)} />
              Added to Newsletter
            </label>
          </div>

          <div>
            <label className="text-xs mb-1 block uppercase tracking-widest" style={{ color: 'oklch(0.52 0.022 65)' }}>Internal Notes</label>
            <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} />
          </div>
          <div>
            <label className="text-xs mb-1 block uppercase tracking-widest" style={{ color: 'oklch(0.52 0.022 65)' }}>Referred / Connected by</label>
            <Input value={form.referredBy} onChange={e => set('referredBy', e.target.value)} placeholder="e.g. Brenley, or a mutual contact's name" />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit" style={{ background: 'oklch(0.22 0.018 55)', color: 'oklch(0.96 0.008 75)' }}>
              Add Donor
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
