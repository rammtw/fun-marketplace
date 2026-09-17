import { formatMoney } from './money';

const normalize = (value: string) => value.replace(/[  ]/g, ' ');

test('переводит копейки в рубли', () => {
  expect(normalize(formatMoney({ amount: 149900, currency: 'RUB' }))).toBe('1 499 ₽');
});

test('показывает копейки, когда они есть', () => {
  expect(normalize(formatMoney({ amount: 15050, currency: 'RUB' }))).toBe('150,5 ₽');
});

test('без валюты считает сумму рублями', () => {
  expect(normalize(formatMoney({ amount: 0 }))).toBe('0 ₽');
});
