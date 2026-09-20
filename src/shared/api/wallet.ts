import type { DepositView, PayoutView, WalletView } from './contract';
import { request } from './client';

/**
 * Кошелёк: баланс, пополнение через ЮKassa и вывод на карту. Суммы везде
 * в копейках. Деньги не зачисляются и не списываются ответом на создание
 * операции: она рождается в `pending`, а исход приносит ручка статуса —
 * она же спрашивает провайдера и проводит зачисление.
 */

/** Баланс читают и страница лота (хватает ли денег), и страница кошелька. */
export function fetchWallet(signal?: AbortSignal): Promise<WalletView> {
  return request<WalletView>('/api/wallet', { auth: true, signal });
}

/**
 * Завести платёж. В ответе `confirmationUrl` — адрес провайдера, куда человека
 * отправляют платить; `returnUrl` обязан вести на домен площадки, чужой не
 * пройдёт (422). Провайдер не ответил — 502, запрос имеет смысл повторить.
 */
export function createDeposit(amount: number, returnUrl?: string): Promise<DepositView> {
  return request<DepositView>('/api/wallet/deposits', {
    method: 'POST',
    body: { amount, returnUrl },
    auth: true,
  });
}

export function fetchDeposits(signal?: AbortSignal): Promise<DepositView[]> {
  return request<{ items?: DepositView[] }>('/api/wallet/deposits', {
    auth: true,
    signal,
  }).then((response) => response.items ?? []);
}

/**
 * Статус пополнения. Пока оно в `pending`, ручка спрашивает провайдера и, если
 * платёж прошёл, зачисляет деньги — поэтому её опрашивает клиент, вернувшийся
 * с оплаты, и ждать уведомления провайдера не нужно.
 */
export function fetchDeposit(id: string, signal?: AbortSignal): Promise<DepositView> {
  return request<DepositView>(`/api/wallet/deposits/${encodeURIComponent(id)}`, {
    auth: true,
    signal,
  });
}

/**
 * Вывод на карту. `payoutToken` — синоним карты из виджета ЮKassa: номер карты
 * через площадку не проходит, в базе остаются четыре последние цифры. Сумма
 * сразу уходит в удержание, при отказе провайдера (502) удержание снимается,
 * а 409 значит, что свободных денег не хватило.
 */
export function createPayout(amount: number, payoutToken: string): Promise<PayoutView> {
  return request<PayoutView>('/api/wallet/payouts', {
    method: 'POST',
    body: { amount, payoutToken },
    auth: true,
  });
}

export function fetchPayouts(signal?: AbortSignal): Promise<PayoutView[]> {
  return request<{ items?: PayoutView[] }>('/api/wallet/payouts', {
    auth: true,
    signal,
  }).then((response) => response.items ?? []);
}

/** Статус выплаты: деньги либо списываются окончательно, либо возвращаются в доступные. */
export function fetchPayout(id: string, signal?: AbortSignal): Promise<PayoutView> {
  return request<PayoutView>(`/api/wallet/payouts/${encodeURIComponent(id)}`, {
    auth: true,
    signal,
  });
}
