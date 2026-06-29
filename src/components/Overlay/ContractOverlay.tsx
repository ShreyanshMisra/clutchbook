import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, ArrowRight } from 'lucide-react';
import type { ContractContent, GameTarget } from '../../types/overlay';
import { formatCurrency } from '../../utils/format';

export type { ContractContent, GameTarget };

export interface ContractOverlayProps {
  target:          GameTarget | null;
  content:         ContractContent;
  mode?:           'web' | 'desktop';
  onOpenContract?: () => void;
}

// --- Countdown ----------------------------------------------------------

function useCountdown(windowEndsAt: number) {
  const [rem, setRem] = useState(() => Math.max(0, windowEndsAt - Date.now()));
  useEffect(() => {
    const tick = () => setRem(Math.max(0, windowEndsAt - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [windowEndsAt]);
  const s = Math.floor(rem / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

// --- Design tokens -------------------------------------------------------

const G    = '#35e08a';
const R    = '#ef4444';
const BG   = '#151518';
const BD   = '#2a2a30';
const TB   = '#16161a';
const MU   = '#8a8a92';
const MONO = "'JetBrains Mono','Roboto Mono','Courier New',monospace";

// Shared spring used across enter/exit so both directions feel identical.
const SPRING = { type: 'spring' as const, stiffness: 320, damping: 28, mass: 0.8 };

// --- Live dot ------------------------------------------------------------

function LiveDot({ color = R }: { color?: string }) {
  return (
    <motion.span
      style={{
        display: 'inline-block', width: 8, height: 8,
        borderRadius: '50%', background: color, flexShrink: 0,
        boxShadow: `0 0 8px ${color}99`,
      }}
      animate={{ opacity: [1, 0.2, 1], scale: [1, 0.75, 1] }}
      transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

// --- Main component ------------------------------------------------------

export function ContractOverlay({
  target,
  content,
  mode = 'web',
  onOpenContract,
}: ContractOverlayProps) {
  const [expanded, setExpanded] = useState(false);
  const countdown = useCountdown(content.windowEndsAt);

  useEffect(() => {
    if (!target) setExpanded(false);
  }, [target]);

  if (!target) return null;

  return (
    // Full-screen transparent root — each child positions itself independently
    // so height changes never cause the anchor point to jump.
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999 }}>

        {/* ── Collapsed tab ── */}
        <AnimatePresence>
          {!expanded && (
            <motion.button
              key="tab"
              // y:'-50%' is a Framer motion value — combines cleanly with
              // animated x so the centering never shifts as content changes.
              style={{ position: 'absolute', right: 0, top: '50%', y: '-50%',
                pointerEvents: 'auto',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', gap: 8, padding: '16px 10px',
                background: TB,
                border: `1px solid ${BD}`, borderRight: 'none',
                borderRadius: '10px 0 0 10px',
                cursor: 'pointer', width: 36,
              }}
              initial={{ opacity: 0, x: 32 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 32 }}
              transition={SPRING}
              whileHover={{ x: -4 }}
              onClick={() => setExpanded(true)}
              onMouseEnter={() => window.overlay?.setClickThrough(false)}
              onMouseLeave={() => window.overlay?.setClickThrough(true)}
              aria-label="Open contract overlay"
            >
              <LiveDot />
              <span style={{
                writingMode: 'vertical-rl', transform: 'rotate(180deg)',
                fontFamily: 'var(--font-head,system-ui)',
                fontSize: 10, fontWeight: 700,
                letterSpacing: '0.18em', textTransform: 'uppercase',
                color: R, userSelect: 'none',
              }}>
                LIVE
              </span>
            </motion.button>
          )}
        </AnimatePresence>

        {/* ── Expanded card ── */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              key="card"
              style={{ position: 'absolute', right: 0, top: '50%', y: '-50%',
                pointerEvents: 'auto',
                width: 400, background: BG,
                border: `1px solid ${BD}`, borderRight: 'none',
                borderRadius: '16px 0 0 16px',
                boxShadow: '0 12px 56px rgba(0,0,0,0.75), 0 2px 16px rgba(0,0,0,0.4)',
                overflow: 'hidden', transformOrigin: 'right center',
              }}
              initial={{ opacity: 0, x: 40, scale: 0.97 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.97 }}
              transition={SPRING}
              onMouseEnter={() => window.overlay?.setClickThrough(false)}
              onMouseLeave={() => window.overlay?.setClickThrough(true)}
            >
              {/* Header — draggable in desktop mode; X must opt out with no-drag */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px', borderBottom: `1px solid ${BD}`,
                ...(mode === 'desktop' ? ({ WebkitAppRegion: 'drag' } as React.CSSProperties) : {}),
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <LiveDot />
                  <span style={{
                    fontFamily: 'var(--font-head,system-ui)', fontSize: 11,
                    fontWeight: 700, letterSpacing: '0.15em',
                    textTransform: 'uppercase', color: R,
                  }}>LIVE</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 11, color: MU, letterSpacing: '0.04em' }}>
                    {content.format} · {content.game}
                  </span>
                  {/* no-drag is required so Electron doesn't swallow the click */}
                  <CloseBtn
                    onClick={() => setExpanded(false)}
                    desktopMode={mode === 'desktop'}
                  />
                </div>
              </div>

              {/* Body */}
              <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Objective */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: 11, color: MU, letterSpacing: '0.12em',
                    textTransform: 'uppercase', fontFamily: 'var(--font-head,system-ui)', flexShrink: 0,
                  }}>Contract:</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#fff', lineHeight: 1.35 }}>
                    {content.objective}
                  </span>
                </div>

                {/* Stat grid */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr',
                  border: `1px solid ${BD}`, borderRadius: 10, overflow: 'hidden',
                }}>
                  <StatCell label="STAKE"  value={formatCurrency(content.stake)}  accentLeft borderRight borderBottom />
                  <StatCell label="PAYOUT" value={formatCurrency(content.payout)} valueColor={G} borderBottom />
                  <StatCell label="LINE"   value={`${content.line.toFixed(2)}x`}  borderRight />
                  <StatCell label="WINDOW" value={countdown} />
                </div>

                {/* Disclosure */}
                <p style={{ fontSize: 10, color: MU, margin: 0, letterSpacing: '0.04em' }}>
                  Fair value {content.fairLine.toFixed(1)}x · house edge {content.houseEdgePct.toFixed(1)}%
                </p>

                {/* Balance row */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '9px 0', borderTop: `1px solid ${BD}`,
                }}>
                  <span style={{
                    fontSize: 11, color: MU, letterSpacing: '0.15em',
                    textTransform: 'uppercase', fontFamily: 'var(--font-head,system-ui)',
                  }}>BALANCE</span>
                  <span style={{ fontFamily: MONO, fontSize: 15, fontWeight: 600, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>
                    {formatCurrency(content.balance)}
                  </span>
                </div>

                {/* CTA */}
                <CtaButton onClick={onOpenContract} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

    </div>
  );
}

// --- Stat cell -----------------------------------------------------------

function StatCell({ label, value, valueColor, accentLeft, borderRight, borderBottom }: {
  label: string; value: string; valueColor?: string;
  accentLeft?: boolean; borderRight?: boolean; borderBottom?: boolean;
}) {
  return (
    <div style={{
      position: 'relative', padding: '11px 14px',
      display: 'flex', flexDirection: 'column', gap: 4,
      borderRight:  borderRight  ? `1px solid ${BD}` : undefined,
      borderBottom: borderBottom ? `1px solid ${BD}` : undefined,
    }}>
      {accentLeft && (
        <span style={{
          position: 'absolute', left: 0, top: 6, bottom: 6,
          width: 3, borderRadius: 3, background: G,
        }} />
      )}
      <span style={{ fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: MU, fontFamily: 'var(--font-head,system-ui)' }}>
        {label}
      </span>
      <span style={{ fontFamily: MONO, fontSize: 22, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: valueColor ?? '#fff', lineHeight: 1 }}>
        {value}
      </span>
    </div>
  );
}

// --- Close button --------------------------------------------------------

function CloseBtn({ onClick, desktopMode }: { onClick: () => void; desktopMode?: boolean }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      aria-label="Close"
      style={{
        background: hov ? 'rgba(255,255,255,0.08)' : 'transparent',
        border: 'none', cursor: 'pointer',
        color: hov ? '#fff' : MU,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 24, height: 24, borderRadius: 6,
        transition: 'color .12s, background .12s',
        flexShrink: 0,
        // Must opt out of the parent's drag region or Electron eats the click.
        ...(desktopMode ? ({ WebkitAppRegion: 'no-drag' } as React.CSSProperties) : {}),
      }}
    >
      <X size={14} />
    </button>
  );
}

// --- CTA button ----------------------------------------------------------

function CtaButton({ onClick }: { onClick?: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <motion.button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      animate={{ scale: hov ? 1.02 : 1, filter: hov ? 'brightness(1.12)' : 'brightness(1)' }}
      transition={{ duration: 0.12 }}
      style={{
        width: '100%', padding: '13px 20px',
        background: G, color: '#0c0c0e',
        border: 'none', cursor: 'pointer',
        fontFamily: 'var(--font-head,system-ui)',
        fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        borderRadius: 8,
        clipPath: 'polygon(0 0,calc(100% - 16px) 0,100% 50%,calc(100% - 16px) 100%,0 100%)',
      }}
    >
      OPEN CONTRACT <ArrowRight size={15} strokeWidth={2.5} />
    </motion.button>
  );
}
