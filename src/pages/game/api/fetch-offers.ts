import { request } from 'shared/api';
import type { OfferSummary, SectionKind } from 'shared/api';

export interface OfferFilters {
  section?: number;
  kind?: SectionKind;
}

export function fetchOffers(
  slug: string,
  filters: OfferFilters,
  signal?: AbortSignal,
): Promise<OfferSummary[]> {
  return request<{ items?: OfferSummary[] }>(`/api/games/${encodeURIComponent(slug)}/offers`, {
    query: { section: filters.section, kind: filters.kind },
    signal,
  }).then((response) => response.items ?? []);
}
