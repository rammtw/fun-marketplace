import type { GameDetails, GameSummary } from './contract';
import { request } from './client';

/** Каталог читают и витрина, и редактор лота — ему нужны разделы со схемой атрибутов. */

export function fetchGames(signal?: AbortSignal): Promise<GameSummary[]> {
  return request<{ items?: GameSummary[] }>('/api/games', { signal }).then(
    (response) => response.items ?? [],
  );
}

export function fetchGame(slug: string, signal?: AbortSignal): Promise<GameDetails> {
  return request<GameDetails>(`/api/games/${encodeURIComponent(slug)}`, { signal });
}
