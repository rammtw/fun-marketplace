import type { OfferSummary } from 'shared/api';

/**
 * Товар, у которого кончились единицы. У услуг остатка нет вовсе (`stock: null`) —
 * их продавец оказывает сам, и «нет в наличии» к ним неприменимо.
 */
export function isSoldOut(offer: OfferSummary): boolean {
  return offer.stock === 0;
}
