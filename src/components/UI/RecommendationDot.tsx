import { Sparkles } from 'lucide-react';
import type { Recommendation } from '../../utils/recommend';

const TONE: Record<string, string> = {
  green: 'var(--pos)',
  yellow: 'var(--amber)',
  red: 'var(--crimson)',
  gray: 'var(--text-faint)',
};

/**
 * Small AI recommendation traffic-light for a card, pinned bottom-right. Hover
 * (or focus) reveals a popover explaining the call.
 */
export function RecommendationDot({ rec }: { rec: Recommendation }) {
  const tone = TONE[rec.level] ?? 'var(--text-faint)';
  return (
    <span className="rec-dot" tabIndex={0} aria-label={`AI recommendation: ${rec.label}`}>
      <span className="rec-dot-light" style={{ background: tone, boxShadow: `0 0 0 3px color-mix(in srgb, ${tone} 22%, transparent)` }} />
      <span className="rec-pop">
        <span className="flex items-center gap-1" style={{ color: tone, fontWeight: 700, fontSize: '0.72rem' }}>
          <Sparkles size={12} /> AI pick · {rec.label}
        </span>
        <span className="text-faint" style={{ fontSize: '0.74rem', lineHeight: 1.4 }}>{rec.reason}</span>
      </span>
    </span>
  );
}
