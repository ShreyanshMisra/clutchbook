import type {
  Contract,
  ContractDraft,
  LobbyResponse,
  SettleResponse,
  SkillProfile,
  SoloLobbyResponse,
  SoloPool,
  TelemetrySample,
} from '../types';

// Same-origin in production (Vercel serves /api via the Python function).
// In dev, Vite proxies /api -> http://localhost:8000. Override with VITE_API_BASE.
const API_BASE = import.meta.env.VITE_API_BASE ?? '';

async function getJSON<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { signal });
  if (!res.ok) {
    const detail = await safeDetail(res);
    throw new Error(detail ?? `Request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

async function postJSON<T>(
  path: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
    const detail = await safeDetail(res);
    throw new Error(detail ?? `Request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

async function safeDetail(res: Response): Promise<string | null> {
  try {
    const data = await res.json();
    return (data?.detail as string) ?? null;
  } catch {
    return null;
  }
}

const q = (s: string) => encodeURIComponent(s);

export function fetchProfile(
  username: string,
  signal?: AbortSignal,
): Promise<SkillProfile> {
  return getJSON<SkillProfile>(`/api/profile?username=${q(username)}`, signal);
}

export function fetchLobby(
  username: string,
  signal?: AbortSignal,
): Promise<LobbyResponse> {
  return getJSON<LobbyResponse>(`/api/lobby?username=${q(username)}`, signal);
}

export function priceDraft(
  username: string,
  draft: ContractDraft,
  signal?: AbortSignal,
): Promise<Contract> {
  return postJSON<Contract>(
    `/api/contracts/price?username=${q(username)}`,
    draft,
    signal,
  );
}

export function settleContracts(
  username: string,
  contracts: Contract[],
  signal?: AbortSignal,
): Promise<SettleResponse> {
  return postJSON<SettleResponse>(
    '/api/contracts/settle',
    { username, contracts },
    signal,
  );
}

// ---- Algorithmic Solo Challenges (pooled tournaments) ----

export function fetchSoloLobby(signal?: AbortSignal): Promise<SoloLobbyResponse> {
  return getJSON<SoloLobbyResponse>('/api/solo/lobby', signal);
}

export function enterSoloPool(
  pool: SoloPool,
  playerId: string,
  state: string,
  signal?: AbortSignal,
): Promise<SoloPool> {
  return postJSON<SoloPool>(
    '/api/solo/pools/enter',
    { pool, player_id: playerId, state },
    signal,
  );
}

export function settleSoloPool(
  pool: SoloPool,
  telemetry: Record<string, TelemetrySample>,
  signal?: AbortSignal,
): Promise<SoloPool> {
  return postJSON<SoloPool>(
    '/api/solo/pools/settle',
    { pool, telemetry },
    signal,
  );
}
