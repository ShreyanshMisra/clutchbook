import { Check, Lock } from 'lucide-react';
import { GAMES } from '../../utils/games';

interface GameTabsProps {
  selected: string;
  onSelect: (id: string) => void;
  /** Game ids that are linked/unlocked (interactive). */
  linked: string[];
}

/** Segmented game switcher across the top of the Catalog. */
export function GameTabs({ selected, onSelect, linked }: GameTabsProps) {
  return (
    <div className="game-tabs" role="tablist" aria-label="Games">
      {GAMES.map((g) => {
        const Icon = g.icon;
        const isLinked = linked.includes(g.id);
        const active = selected === g.id;
        return (
          <button
            key={g.id}
            type="button"
            role="tab"
            aria-selected={active}
            className={`game-tab ${active ? 'is-active' : ''}`}
            style={active ? { ['--accent' as string]: g.color } : undefined}
            onClick={() => onSelect(g.id)}
          >
            <span className="game-tab-dot" style={{ background: g.gradient }}>
              <Icon size={13} strokeWidth={2.4} color="#0a0b0f" />
            </span>
            <span>{g.name}</span>
            {isLinked ? (
              <Check size={13} className="text-pos" strokeWidth={3} />
            ) : (
              <Lock size={12} style={{ opacity: 0.6 }} />
            )}
          </button>
        );
      })}
    </div>
  );
}
