import type { WalletView } from './contract';
import { request } from './client';

/** Кошелёк читают и страница лота (хватает ли денег), и страница кошелька. */
export function fetchWallet(signal?: AbortSignal): Promise<WalletView> {
  return request<WalletView>('/api/wallet', { auth: true, signal });
}

/**
 * Пополнение — заглушка вместо платёжного провайдера: деньги зачисляются сразу.
 * Сумма уходит в копейках.
 */
export function deposit(amount: number, signal?: AbortSignal): Promise<WalletView> {
  return request<WalletView>('/api/wallet/deposit', {
    method: 'POST',
    body: { amount },
    auth: true,
    signal,
  });
}
