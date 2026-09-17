import { request } from 'shared/api';
import type { GameSummary } from 'shared/api';

export function fetchGames(signal?: AbortSignal): Promise<GameSummary[]> {
  return request<{ items?: GameSummary[] }>('/api/games', { signal }).then(
    (response) => response.items ?? [],
  );
}
