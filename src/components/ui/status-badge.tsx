type StatusType = 'PENDING' | 'VERIFIED' | 'MANUALLY_REVIEWED';

const config: Record<StatusType, { label: string; bg: string; text: string; icon: string }> = {
  PENDING: {
    label: 'Pending',
    bg: 'bg-amber-100',
    text: 'text-amber-800',
    icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  VERIFIED: {
    label: 'Verified',
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  MANUALLY_REVIEWED: {
    label: 'Reviewed',
    bg: 'bg-green-100',
    text: 'text-green-800',
    icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  },
};

export default function StatusBadge({ status }: { status: StatusType }) {
  const { label, bg, text, icon } = config[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${bg} ${text}`}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={icon} />
      </svg>
      {label}
    </span>
  );
}
