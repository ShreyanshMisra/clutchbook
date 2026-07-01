import { AnimatePresence, motion } from 'framer-motion';
import { PartyPopper, RotateCcw, TrendingDown, X } from 'lucide-react';
import type { SettlementResult } from '../../types';
import { formatCurrency } from '../../utils/format';

interface SettlementModalProps {
  result: SettlementResult | null;
  onClose: () => void;
}

const CONFETTI = ['#7c6cf0', '#3ad6dd', '#b6ff6c', '#f0c468', '#e8654f', '#5e9bf0'];

export function SettlementModal({ result, onClose }: SettlementModalProps) {
  const won = result?.outcome === 'won';
  const refunded = result?.outcome === 'refunded';
  const net = result ? result.payout - result.entry : 0;
  const tone = won ? 'var(--pos)' : refunded ? 'var(--text-muted)' : 'var(--crimson)';
  const heading = won ? 'You won!' : refunded ? 'Refunded' : 'You lost';

  return (
    <AnimatePresence>
      {result && (
        <motion.div
          className="settle-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="settle-card"
            initial={{ scale: 0.85, y: 16, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            style={{ ['--tone' as string]: tone }}
          >
            {won && (
              <div className="settle-confetti" aria-hidden>
                {Array.from({ length: 16 }).map((_, i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                    animate={{ opacity: 0, x: (Math.random() - 0.5) * 320, y: (Math.random() - 0.9) * 260, rotate: Math.random() * 360 }}
                    transition={{ duration: 1.1, delay: i * 0.015, ease: 'easeOut' }}
                    style={{ background: CONFETTI[i % CONFETTI.length] }}
                  />
                ))}
              </div>
            )}

            <button type="button" className="btn btn-ghost settle-close" onClick={onClose} aria-label="Close"><X size={16} /></button>

            <div className="settle-icon" style={{ color: tone }}>
              {won ? <PartyPopper size={30} /> : refunded ? <RotateCcw size={26} /> : <TrendingDown size={28} />}
            </div>

            <div className="uppercase-head" style={{ fontSize: '0.72rem', letterSpacing: '0.1em', color: tone, fontWeight: 700 }}>
              {heading}
            </div>

            <div className="font-head tabular" style={{ fontSize: '2.6rem', fontWeight: 800, lineHeight: 1, color: tone }}>
              {won ? `+${formatCurrency(net)}` : refunded ? formatCurrency(result.payout) : `-${formatCurrency(result.entry)}`}
            </div>

            <div className="text-muted" style={{ fontSize: '0.9rem', textAlign: 'center', maxWidth: 320, lineHeight: 1.45 }}>
              {result.reason}
            </div>

            <div className="text-faint" style={{ fontSize: '0.76rem' }}>
              {won
                ? `Payout ${formatCurrency(result.payout)} · staked ${formatCurrency(result.entry)}`
                : refunded
                  ? 'Your entry was returned in full.'
                  : `Staked ${formatCurrency(result.entry)}`}
            </div>

            <button type="button" className="btn btn-primary" style={{ marginTop: 6, gap: 8, padding: '10px 22px' }} onClick={onClose}>
              Continue
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
