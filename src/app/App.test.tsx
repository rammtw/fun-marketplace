import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { installFetchMock, mockFetchOnce } from 'shared/api/test-fetch';
import { App } from './App';

const games = {
  items: [{ id: 21, slug: 'dota-2', title: 'Dota 2', platforms: ['pc', 'linux'] }],
};

const game = {
  id: 21,
  slug: 'dota-2',
  title: 'Dota 2',
  platforms: ['pc', 'linux'],
  sections: [
    {
      id: 53,
      title: 'Аккаунты',
      kind: 'goods',
      commissionBasisPoints: 700,
      attributeSchema: {},
    },
  ],
};

const offers = {
  items: [
    {
      id: '01a0ae7d-a166-7214-bed8-7e85ab4f9f51',
      title: 'Аккаунт Divine 5, 5800 MMR',
      price: { amount: 1290000, currency: 'RUB' },
      deliveryType: 'auto',
      stock: 1,
      sectionId: 53,
      sectionTitle: 'Аккаунты',
      kind: 'goods',
    },
  ],
};

beforeEach(() => {
  installFetchMock();
  localStorage.clear();
  window.history.pushState({}, '', '/');
});

test('с витрины можно перейти в каталог лотов игры', async () => {
  mockFetchOnce(200, games); // витрина
  mockFetchOnce(200, game); // карточка игры
  mockFetchOnce(200, offers); // лоты игры

  render(<App />);

  await userEvent.click(await screen.findByRole('link', { name: /Dota 2/ }));

  expect(await screen.findByRole('heading', { name: 'Dota 2', level: 1 })).toBeInTheDocument();
  expect(await screen.findByText('Аккаунт Divine 5, 5800 MMR')).toBeInTheDocument();
  // 1 290 000 копеек — это 12 900 ₽.
  expect(
    screen.getByText((text) => text.replace(/[\u00a0\u202f]/g, ' ') === '12 900 ₽'),
  ).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Аккаунты' })).toBeInTheDocument();
});

test('гостю показываются вход и регистрация', async () => {
  mockFetchOnce(200, games);

  render(<App />);

  expect(await screen.findByRole('link', { name: 'Войти' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Регистрация' })).toBeInTheDocument();
});
