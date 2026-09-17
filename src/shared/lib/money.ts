import type { Money } from 'shared/api';

// Форматтеры дорогие в создании, а валюта на площадке почти всегда одна.
const formatters = new Map<string, Intl.NumberFormat>();

function formatterFor(currency: string): Intl.NumberFormat {
  const cached = formatters.get(currency);
  if (cached) {
    return cached;
  }

  const formatter = new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  formatters.set(currency, formatter);

  return formatter;
}

/**
 * Сумма приходит в минорных единицах (копейках) — в рубли её переводит
 * только показ, никакая арифметика по дороге на float не переходит.
 */
export function formatMoney(money: Money): string {
  const currency = money.currency ?? 'RUB';

  return formatterFor(currency).format(money.amount / 100);
}

/** Цена за штуку на количество: считаем в копейках, во float не уходим. */
export function multiplyMoney(money: Money, factor: number): Money {
  return { amount: money.amount * factor, currency: money.currency };
}

export function subtractMoney(from: Money, amount: Money): Money {
  return { amount: from.amount - amount.amount, currency: from.currency };
}

/**
 * Введённые рубли в копейки. Float живёт ровно один шаг — до округления,
 * дальше сумма целая.
 */
export function parseAmountToMinor(input: string): number | null {
  const normalized = input.replace(/\s/g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return null;
  }

  return Math.round(Number(normalized) * 100);
}
