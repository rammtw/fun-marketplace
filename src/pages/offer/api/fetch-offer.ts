import { request } from 'shared/api';
import type { OfferDetails } from 'shared/api';

export function fetchOffer(id: string, signal?: AbortSignal): Promise<OfferDetails> {
  return request<OfferDetails>(`/api/offers/${encodeURIComponent(id)}`, { signal });
}
