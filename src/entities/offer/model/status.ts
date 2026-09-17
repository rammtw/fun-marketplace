import type { OfferStatus } from 'shared/api';

export type OfferStatusTone = 'neutral' | 'accent' | 'success';

/**
 * Словарь статусов лота: его читают и список продавца, и редактор.
 * Черновик виден только продавцу, активный — на витрине, архив необратим.
 */
const LABELS: Record<OfferStatus, { label: string; tone: OfferStatusTone; hint: string }> = {
  draft: { label: 'Черновик', tone: 'neutral', hint: 'Виден только вам, на витрине его нет.' },
  active: { label: 'На витрине', tone: 'success', hint: 'Лот продаётся.' },
  paused: { label: 'Снят с витрины', tone: 'accent', hint: 'Покупатели его не видят.' },
  archived: { label: 'В архиве', tone: 'neutral', hint: 'Лот убран навсегда и больше не правится.' },
};

export const OFFER_STATUSES = Object.keys(LABELS) as OfferStatus[];

export function offerStatus(status: OfferStatus): {
  label: string;
  tone: OfferStatusTone;
  hint: string;
} {
  return LABELS[status];
}
