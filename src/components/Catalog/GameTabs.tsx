import { motion } from 'framer-motion';
import { Check, Lock } from 'lucide-react';
import { gameById } from '../../utils/games';

interface GameTabsProps {
  /** Game ids in display order (most recently selected / linked first). */
  order: string[];
  selected: string;
  onSelect: (id: string) => void;
  /** When provided, show a linked check / locked lock per game (H2H only). */
  linked?: string[];
}

/**
 * Segmented game switcher. The order is driven by recency (App state), and the
 * tabs animate smoothly into their new positions when that order changes.
 */
export function GameTabs({ order, selected, onSelect, linked }: GameTabsProps) {
  return (
    <div className="game-tabs" role="tablist" aria-label="Games">
      {order.map((id) => {
        const g = gameById(id);
        if (!g) return null;
        const Icon = g.icon;
        const active = selected === id;
        const showStatus = linked !== undefined;
        const isLinked = linked?.includes(id);
        return (
          <motion.button
            key={id}
            layout="position"
            transition={{ type: 'spring', stiffness: 420, damping: 34, mass: 0.7 }}
            type="button"
            role="tab"
            aria-selected={active}
            className={`game-tab ${active ? 'is-active' : ''}`}
            style={active ? { ['--accent' as string]: g.color } : undefined}
            onClick={() => onSelect(id)}
          >
            <span className="game-tab-dot" style={{ background: g.gradient }}>
              <Icon size={13} strokeWidth={2.4} color="#0a0b0f" />
            </span>
            <span>{g.name}</span>
            {showStatus && (isLinked ? (
              <Check size={13} className="text-pos" strokeWidth={3} />
            ) : (
              <Lock size={12} style={{ opacity: 0.6 }} />
            ))}
          </motion.button>
        );
      })}
    </div>
  );
}
