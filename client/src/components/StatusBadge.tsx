// THV Status Badge component
import { DonorStatus } from '@/lib/types';
import { statusLabel, statusColorClass, statusBgClass, statusTextColor, cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: DonorStatus;
  size?: 'sm' | 'md';
}

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
        statusBgClass(status),
        statusTextColor(status)
      )}
    >
      <span className={cn('status-dot', statusColorClass(status))} style={{ width: 7, height: 7 }} />
      {statusLabel(status)}
    </span>
  );
}

