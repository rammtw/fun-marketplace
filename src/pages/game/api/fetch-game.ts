import { request } from 'shared/api';
import type { GameDetails } from 'shared/api';

export function fetchGame(slug: string, signal?: AbortSignal): Promise<GameDetails> {
  return request<GameDetails>(`/api/games/${encodeURIComponent(slug)}`, { signal });
}
