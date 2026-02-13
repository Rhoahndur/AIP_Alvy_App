type MatchResult = 'MATCH' | 'MISMATCH' | 'PARTIAL' | 'NOT_FOUND';

const config: Record<MatchResult, { label: string; bg: string; text: string; icon: string }> = {
  MATCH: {
    label: 'Match',
    bg: 'bg-green-100',
    text: 'text-green-800',
    icon: 'M5 13l4 4L19 7',
  },
  MISMATCH: {
    label: 'Mismatch',
    bg: 'bg-red-100',
    text: 'text-red-800',
    icon: 'M6 18L18 6M6 6l12 12',
  },
  PARTIAL: {
    label: 'Partial',
    bg: 'bg-amber-100',
    text: 'text-amber-800',
    icon: 'M5 12h14',
  },
  NOT_FOUND: {
    label: 'Not Found',
    bg: 'bg-gray-100',
    text: 'text-gray-600',
    icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01',
  },
};

export default function MatchIndicator({ result, confidence }: { result: MatchResult; confidence?: number }) {
  const { label, bg, text, icon } = config[result];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${bg} ${text}`}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={icon} />
      </svg>
      {label}
      {confidence !== undefined && (
        <span className="opacity-70">({Math.round(confidence * 100)}%)</span>
      )}
    </span>
  );
}
