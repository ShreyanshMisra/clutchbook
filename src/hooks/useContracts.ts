import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchCatalog, settleContracts } from '../utils/apiClient';
import { loadState, saveState } from '../utils/storage';
import { track } from '../utils/telemetry';
import type { Contract, SettleResult } from '../types';

const STORAGE_KEY = 'contracts';
const POLL_INTERVAL_MS = 15_000;

const round2 = (n: number) => Math.round(n * 100) / 100;

interface UseContractsArgs {
  username: string | null;
  onSettle: (contract: Contract, result: SettleResult) => void;
}

interface UseContracts {
  contracts: Contract[];
  active: Contract[];
  settled: Contract[];
  catalog: Contract[];
  catalogLoading: boolean;
  catalogError: string | null;
  refreshCatalog: () => void;
  activate: (offered: Contract, stake: number) => Contract;
  resetAll: () => void;
}

/**
 * Owns the user's contracts (localStorage) plus the OFFERED catalog and the
 * settlement poll loop. Settlement is server-authoritative: we POST the user's
 * ACTIVE contracts and the server grades them against the user's real games.
 * The poll cadence + abort handling are shaped so a server-side worker can
 * replace the client loop without a UI rewrite (roadmap §1.5).
 */
export function useContracts({ username, onSettle }: UseContractsArgs): UseContracts {
  const [contracts, setContracts] = useState<Contract[]>(() =>
    loadState<Contract[]>(STORAGE_KEY, []),
  );
  const [catalog, setCatalog] = useState<Contract[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  useEffect(() => {
    saveState(STORAGE_KEY, contracts);
  }, [contracts]);

  const active = useMemo(
    () => contracts.filter((c) => c.state === 'ACTIVE' || c.state === 'RESOLVING'),
    [contracts],
  );
  const settled = useMemo(
    () => contracts.filter((c) => c.state === 'SETTLED' || c.state === 'EXPIRED'),
    [contracts],
  );

  // ---- Catalog ----
  const refreshCatalog = useCallback(() => {
    if (!username) return;
    setCatalogLoading(true);
    setCatalogError(null);
    fetchCatalog(username)
      .then((res) => {
        setCatalog(res.contracts);
        track('catalog_refreshed', { username, count: res.contracts.length });
      })
      .catch((err: Error) => setCatalogError(err.message || 'Failed to load catalog'))
      .finally(() => setCatalogLoading(false));
  }, [username]);

  useEffect(() => {
    if (username) refreshCatalog();
    else setCatalog([]);
  }, [username, refreshCatalog]);

  // ---- Activation ----
  const activate = useCallback((offered: Contract, stake: number): Contract => {
    const contract: Contract = {
      ...offered,
      stake: round2(stake),
      projected_payout: round2(stake * offered.line.decimal),
      state: 'ACTIVE',
      activated_at: Date.now(),
      resolved_at: null,
      qualifying_game_ids: [],
      progress: null,
      outcome: null,
    };
    setContracts((prev) => [contract, ...prev]);
    track('contract_activated', { kind: offered.objective.kind, speed: offered.speed, stake });
    return contract;
  }, []);

  const resetAll = useCallback(() => setContracts([]), []);

  // ---- Settlement poll loop ----
  const ref = useRef({ contracts, username, onSettle });
  ref.current = { contracts, username, onSettle };
  const inFlight = useRef(false);

  const settleOnce = useCallback(async (signal?: AbortSignal) => {
    const { contracts: all, username: user, onSettle: notify } = ref.current;
    if (!user || inFlight.current) return;
    const live = all.filter((c) => c.state === 'ACTIVE' || c.state === 'RESOLVING');
    if (live.length === 0) return;

    inFlight.current = true;
    try {
      const { results } = await settleContracts(user, live, signal);
      if (signal?.aborted) return;
      const byId = new Map(results.map((r) => [r.id, r]));

      // Compute transitions from the current snapshot, fire callbacks once.
      const transitions: { contract: Contract; result: SettleResult }[] = [];

      setContracts((prev) =>
        prev.map((c) => {
          const r = byId.get(c.id);
          if (!r || (c.state !== 'ACTIVE' && c.state !== 'RESOLVING')) return c;
          if (r.state === 'SETTLED' || r.state === 'EXPIRED') {
            const updated: Contract = {
              ...c,
              state: r.state,
              outcome: r.outcome,
              resolved_at: r.resolved_at,
              qualifying_game_ids: r.qualifying_game_ids,
              progress: r.progress,
            };
            transitions.push({ contract: updated, result: r });
            return updated;
          }
          return {
            ...c,
            qualifying_game_ids: r.qualifying_game_ids,
            progress: r.progress,
          };
        }),
      );

      for (const t of transitions) {
        track('contract_resolved', { outcome: t.result.outcome, payout: t.result.payout });
        notify(t.contract, t.result);
      }
    } catch {
      // Leave contracts ACTIVE; retry on the next poll.
    } finally {
      inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void settleOnce(controller.signal);
    const id = window.setInterval(() => void settleOnce(controller.signal), POLL_INTERVAL_MS);
    return () => {
      controller.abort();
      window.clearInterval(id);
    };
  }, [settleOnce]);

  return {
    contracts,
    active,
    settled,
    catalog,
    catalogLoading,
    catalogError,
    refreshCatalog,
    activate,
    resetAll,
  };
}
