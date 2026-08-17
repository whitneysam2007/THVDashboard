// THV Donor Dashboard — Donors Overview Page
// Sorted: biggest donors first (total donations descending)
// Filters: status + Narú Circle, Donor Trip, Tax Receipt (2026)

import { useState } from 'react';
import { useDashboard } from '@/contexts/DashboardContext';
import {
  computeDonorStatus, donorCardPriorityDate, formatDate, nextContactDate, daysUntilNextContact, sortDonorsByCardPriority,
  formatCurrency, totalDonated, currentYearContributionTotal, expectedRecurringAnnualAmount, tierLabel, cn
} from '@/lib/utils';
import { donorTypeLabel } from '@/lib/utils';
import { donationsLastYears } from '@/lib/utils';
import { matchesPotentialDonorFilter, matchesPotentiallyRecurringDonorFilter, matchesRecurringDonorFilter } from '@/lib/donorFilters';
import { DonorStatus } from '@/lib/types';
import StatusBadge from '@/components/StatusBadge';
import DonorModal from '@/components/DonorModal';
import AddDonorModal from '@/components/AddDonorModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, Star, Plane, AlertCircle, Calendar, ContactRound, RefreshCw, Mail } from 'lucide-react';

const CURRENT_YEAR = new Date().getFullYear();

const STATUS_FILTERS: { value: DonorStatus | 'all' | 'potential'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'green', label: 'Active' },
  { value: 'yellow', label: 'Attention' },
  { value: 'orange', label: 'At Risk' },
  { value: 'grey', label: 'Inactive' },
  { value: 'potential', label: 'Potential' },
];

export default function Donors() {
  const { store } = useDashboard();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<DonorStatus | 'all' | 'potential'>('all');
  const [filterNaru, setFilterNaru] = useState(false);
  const [filterTrip, setFilterTrip] = useState(false);
  const [filterPotential, setFilterPotential] = useState(false);
  const [filterRecurring, setFilterRecurring] = useState(false);
  const [filterUpcoming, setFilterUpcoming] = useState(false);
  const [selectedDonorId, setSelectedDonorId] = useState<string | null>(null);
  const [showAddDonor, setShowAddDonor] = useState(false);

  // Compute live status + total donated for each donor
  const allDonors = store.donors;
  const donors = allDonors.filter(d => d.portfolio === 'major').map(d => ({
    ...d,
    status: computeDonorStatus(d),
    _total: totalDonated(d),
  }));

  const filtered = donors.filter(d => {
    const matchSearch =
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.contactName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all'
      || (statusFilter === 'potential' ? matchesPotentialDonorFilter(d, true) : d.status === (statusFilter as DonorStatus));
    const matchPotential = matchesPotentiallyRecurringDonorFilter(d, filterPotential);
    const matchRecurring = matchesRecurringDonorFilter(d, filterRecurring);
    const matchNaru = !filterNaru || d.naruCircle;
    const matchTrip = !filterTrip || d.donorTrip;
    const matchUpcoming = !filterUpcoming || !!donorCardPriorityDate(d);
    return matchSearch && matchStatus && matchNaru && matchTrip && matchPotential && matchRecurring && matchUpcoming;
  });

  // Default: largest lifetime donors first. Upcoming tasks: the date shown on
  // each card, from earliest to latest, with no-date cards excluded by the filter.
  const displayedDonors = filterUpcoming
    ? sortDonorsByCardPriority(filtered)
    : [...filtered].sort((a, b) => b._total - a._total);

  const currentYear = new Date().getFullYear();
  const currentYearTotal = currentYearContributionTotal(donors);
  const recurringAnnualBase = expectedRecurringAnnualAmount(allDonors);
  const selectedDonor = donors.find(d => d.id === selectedDonorId) || null;

  return (
    <div className="p-6 lg:p-8 max-w-[1300px]">
      {/* Page header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-4xl mb-1" style={{ color: 'oklch(0.22 0.018 55)' }}>
            Donor Relations
          </h1>
          <p className="text-sm" style={{ color: 'oklch(0.52 0.022 65)' }}>
            Tracking {donors.length} major donor{donors.length !== 1 ? 's' : ''}
            {' · '}{formatCurrency(currentYearTotal)} total contributed in {currentYear}
          </p>
          <p className="text-sm mt-1" style={{ color: 'oklch(0.42 0.13 145)' }}>
            <span className="font-medium">{formatCurrency(recurringAnnualBase)}</span> expected recurring donor annual amount
          </p>
        </div>
        <Button
          onClick={() => setShowAddDonor(true)}
          className="flex items-center gap-2"
          style={{ background: 'oklch(0.22 0.018 55)', color: 'oklch(0.96 0.008 75)' }}
        >
          <Plus size={15} />
          Add Donor
        </Button>
      </div>

      {/* Search + filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'oklch(0.62 0.012 65)' }} />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search donors…"
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value as DonorStatus | 'all')}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                statusFilter === f.value
                  ? 'border-[oklch(0.22_0.018_55)] bg-[oklch(0.22_0.018_55)] text-[oklch(0.96_0.008_75)]'
                  : 'border-[oklch(0.84_0.018_75)] text-[oklch(0.52_0.022_65)] hover:border-[oklch(0.60_0.018_65)]'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tag filters row */}
      <div className="flex gap-2 flex-wrap mb-6">
        <span className="text-xs self-center" style={{ color: 'oklch(0.62 0.012 65)' }}>Filter by:</span>
        <button
          onClick={() => setFilterNaru(!filterNaru)}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
            filterNaru
              ? 'bg-[oklch(0.88_0.022_72)] border-[oklch(0.70_0.022_72)] text-[oklch(0.28_0.018_55)]'
              : 'border-[oklch(0.84_0.018_75)] text-[oklch(0.52_0.022_65)] hover:border-[oklch(0.60_0.018_65)]'
          )}
        >
          <Star size={10} />
          Narú Circle
        </button>
        <button
          onClick={() => setFilterTrip(!filterTrip)}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
            filterTrip
              ? 'bg-[oklch(0.88_0.022_72)] border-[oklch(0.70_0.022_72)] text-[oklch(0.28_0.018_55)]'
              : 'border-[oklch(0.84_0.018_75)] text-[oklch(0.52_0.022_65)] hover:border-[oklch(0.60_0.018_65)]'
          )}
        >
          <Plane size={10} />
          Donor Trip
        </button>
        <button
          onClick={() => setFilterRecurring(!filterRecurring)}
          aria-pressed={filterRecurring}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
            filterRecurring
              ? 'bg-[oklch(0.88_0.022_72)] border-[oklch(0.70_0.022_72)] text-[oklch(0.28_0.018_55)]'
              : 'border-[oklch(0.84_0.018_75)] text-[oklch(0.52_0.022_65)] hover:border-[oklch(0.60_0.018_65)]'
          )}
        >
          <RefreshCw size={10} />
          Recurring donors
        </button>
        <button
          onClick={() => setFilterPotential(!filterPotential)}
          aria-pressed={filterPotential}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
            filterPotential
              ? 'bg-[oklch(0.88_0.022_72)] border-[oklch(0.70_0.022_72)] text-[oklch(0.28_0.018_55)]'
              : 'border-[oklch(0.84_0.018_75)] text-[oklch(0.52_0.022_65)] hover:border-[oklch(0.60_0.018_65)]'
          )}
        >
          <RefreshCw size={10} />
          Potentially Recurring
        </button>
        <button
          onClick={() => setFilterUpcoming(!filterUpcoming)}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
            filterUpcoming
              ? 'bg-[oklch(0.88_0.022_72)] border-[oklch(0.70_0.022_72)] text-[oklch(0.28_0.018_55)]'
              : 'border-[oklch(0.84_0.018_75)] text-[oklch(0.52_0.022_65)] hover:border-[oklch(0.60_0.018_65)]'
          )}
        >
          <Calendar size={10} />
          Upcoming tasks
        </button>
      </div>

      {/* Donor cards grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16" style={{ color: 'oklch(0.62 0.012 65)' }}>
          <UsersIcon size={32} className="mx-auto mb-3 opacity-40" />
          <p className="font-display text-xl">No donors found</p>
          <p className="text-sm mt-1">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {displayedDonors.map(donor => {
              const nextDate = nextContactDate(donor);
              const daysLeft = daysUntilNextContact(donor);
              const overdue = daysLeft < 0;
              const manualTask = donor.nextManualTask;
              const cardDate = manualTask?.dueDate ?? nextDate;
              const cardDateIsOverdue = !!manualTask
                ? manualTask.dueDate < new Date().toISOString().split('T')[0]
                : overdue;
              const donorTotal = donor._total;

            return (
              <button
                key={donor.id}
                onClick={() => setSelectedDonorId(donor.id)}
                className="text-left p-5 rounded-lg border bg-[oklch(0.985_0.008_80)] border-[oklch(0.84_0.018_75)] hover:border-[oklch(0.60_0.018_65)] hover:shadow-md transition-all duration-200"
              >
                {/* Card header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0 flex-1 pr-2">
                    <h3 className="font-display text-lg leading-tight truncate" style={{ color: 'oklch(0.22 0.018 55)' }}>
                      {donor.name}
                    </h3>
                   <p className="text-xs mt-0.5 truncate" style={{ color: 'oklch(0.52 0.022 65)' }}>
                      {donor.contactName ? <>{donor.contactName} · </> : ''}<span className="italic">{tierLabel(donor.tier)}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {donor.currentYearDonated && donor.currentYearDonated > 0 && (
                      <span title={donor.thankYouLetterForCurrentYear ? `Thank-you card sent ${formatDate(donor.thankYouLetterForCurrentYear.completedDate)}` : `Thank-you card not marked sent for ${CURRENT_YEAR}`} aria-label="Thank-you card status">
                        <Mail size={17} style={{ color: donor.thankYouLetterForCurrentYear ? 'oklch(0.50 0.13 145)' : 'oklch(0.50 0.18 250)' }} />
                      </span>
                    )}
                    <StatusBadge status={donor.status} size="sm" />
                  </div>
                </div>

                <hr className="thv-rule mb-3" />

                <div className="space-y-2">
                  {/* Priority: open manual task, otherwise communication cadence */}
                  <div className="flex items-start gap-2">
                    <Calendar size={12} className="mt-0.5 flex-shrink-0" style={{ color: manualTask ? 'oklch(0.50 0.18 250)' : 'oklch(0.62 0.012 65)' }} />
                    <span className="text-xs" style={{ color: 'oklch(0.52 0.022 65)' }}>
                      {manualTask?.label || donor.cadenceDescription || '—'}
                    </span>
                  </div>

                  {/* Manual-task due date, otherwise next-contact date */}
                  {cardDate && (
                    <div className="flex items-center gap-2">
                      <AlertCircle size={12} className="flex-shrink-0" style={{ color: cardDateIsOverdue ? 'oklch(0.55 0.20 27)' : manualTask ? 'oklch(0.50 0.18 250)' : 'oklch(0.62 0.012 65)' }} />
                      <span className={cn('text-xs', cardDateIsOverdue ? 'text-[oklch(0.45_0.20_27)]' : '')}>
                        {manualTask
                          ? `${cardDateIsOverdue ? 'Overdue · ' : ''}${formatDate(cardDate)}`
                          : overdue
                            ? `Overdue by ${Math.abs(daysLeft)} day${Math.abs(daysLeft) !== 1 ? 's' : ''}`
                            : formatDate(cardDate)
                        }
                      </span>
                    </div>
                  )}

                 {/* Next action note */}

                  {/* Total donated + tags */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-semibold" style={{ color: 'oklch(0.22 0.018 55)' }}>
                        {formatCurrency(donorTotal)}
                      </span>
                      <span className="text-[10px]" style={{ color: 'oklch(0.62 0.012 65)' }}>
                        total lifetime amount given
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {donor.naruCircle && (
                        <span title="Narú Circle" className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-[oklch(0.88_0.022_72)] text-[oklch(0.28_0.018_55)]">
                          <Star size={9} />Narú Circle
                        </span>
                      )}
                      {donor.donorTrip && (
                        <span title="Donor Trip" className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-[oklch(0.88_0.022_72)] text-[oklch(0.28_0.018_55)]">
                          <Plane size={9} />Trip
                        </span>
                      )}
                      <span className="text-xs px-1.5 py-0.5 rounded bg-[oklch(0.92_0.012_78)] text-[oklch(0.52_0.022_65)]">
                        {donorTypeLabel(donor.type)}
                      </span>
                      {/* Missing contact data warning */}
                      {(!donor.email || !donor.phone || !donor.address) && (
                        <span title="Contact information to complete" aria-label="Contact information to complete" className="relative inline-flex items-center">
                          <ContactRound size={14} style={{ color: 'oklch(0.53 0.075 78)' }} />
                          <span aria-hidden="true" className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full" style={{ background: 'oklch(0.62 0.10 82)' }} />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Status Legend */}
      <div className="mt-10 p-4 rounded-lg border border-[oklch(0.84_0.018_75)] bg-[oklch(0.985_0.008_80)]">
        <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'oklch(0.52 0.022 65)' }}>Status Legend</p>
        <div className="flex flex-wrap gap-4">
          {[
            { color: 'status-dot-green', label: 'Active', desc: 'Within cadence window' },
            { color: 'status-dot-yellow', label: 'Attention', desc: 'Approaching cadence deadline' },
            { color: 'status-dot-orange', label: 'At Risk', desc: 'Communication cadence overdue' },
            { color: 'status-dot-grey', label: 'Inactive', desc: 'Past donor / no cadence set' },
          ].map(({ color, label, desc }) => (
            <div key={label} className="flex items-center gap-2">
              <span className={cn('status-dot', color)} />
              <span className="text-xs font-medium" style={{ color: 'oklch(0.22 0.018 55)' }}>{label}</span>
              <span className="text-xs" style={{ color: 'oklch(0.62 0.012 65)' }}>— {desc}</span>
            </div>
          ))}
        </div>
      </div>

      {selectedDonor && (
        <DonorModal donor={selectedDonor} onClose={() => setSelectedDonorId(null)} />
      )}
      {showAddDonor && (
        <AddDonorModal onClose={() => setShowAddDonor(false)} />
      )}
    </div>
  );
}

function UsersIcon({ size, className }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
