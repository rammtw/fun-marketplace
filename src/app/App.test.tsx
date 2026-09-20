import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { installFetchMock, mockApi, mockFetchOnce, requestUrl } from 'shared/api/test-fetch';
import { App } from './App';

const games = {
  items: [{ id: 21, slug: 'dota-2', title: 'Dota 2', platforms: ['pc', 'linux'] }],
};

const genshin = { id: 22, slug: 'genshin', title: 'Genshin Impact', platforms: ['pc'] };

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

const wallet = {
  userId: 'u-1',
  available: { amount: 371000, currency: 'RUB' },
  held: { amount: 129000, currency: 'RUB' },
};

const me = {
  id: 'u-1',
  displayName: 'Покупатель',
  status: 'active',
  registeredAt: '2026-01-01T00:00:00+00:00',
};

test('вошедшему показывают баланс и покупки, а витрина живёт под логотипом', async () => {
  localStorage.setItem('universe.token', 'jwt-token');
  mockApi({
    'GET /api/games': [200, games],
    'GET /api/offers/mine': [200, { items: [] }],
    'GET /api/auth/me': [200, me],
    'GET /api/wallet': [200, wallet],
  });

  render(<App />);

  const balance = await screen.findByRole('link', { name: /710/ });
  expect(balance).toHaveAttribute('href', '/wallet');
  expect(screen.getByRole('link', { name: 'Покупки' })).toHaveAttribute('href', '/orders');
  // На витрину ведёт логотип, отдельного пункта «Игры» в меню нет.
  expect(screen.queryByRole('link', { name: 'Игры' })).not.toBeInTheDocument();
});

test('без своих лотов пункта «Продажи» в шапке нет', async () => {
  localStorage.setItem('universe.token', 'jwt-token');
  mockApi({
    'GET /api/games': [200, games],
    'GET /api/auth/me': [200, me],
    'GET /api/wallet': [200, wallet],
    'GET /api/offers/mine': [200, { items: [] }],
  });

  render(<App />);

  await screen.findByRole('link', { name: 'Покупки' });
  await waitFor(() => expect(requestUrl('GET', '/api/offers/mine')).toBeDefined());
  expect(screen.queryByRole('link', { name: 'Продажи' })).not.toBeInTheDocument();
});

test('продавцу с лотами показывают «Продажи»', async () => {
  localStorage.setItem('universe.token', 'jwt-token');
  mockApi({
    'GET /api/games': [200, games],
    'GET /api/auth/me': [200, me],
    'GET /api/wallet': [200, wallet],
    'GET /api/offers/mine': [200, { items: [{ id: 'of-1', status: 'active' }] }],
  });

  render(<App />);

  expect(await screen.findByRole('link', { name: 'Продажи' })).toHaveAttribute(
    'href',
    '/my/offers',
  );
});

test('поиск в шапке фильтрует витрину и остаётся в адресе', async () => {
  mockApi({ 'GET /api/games': [200, { items: [...games.items, genshin] }] });

  render(<App />);

  await screen.findByRole('link', { name: /Dota 2/ });
  await userEvent.type(screen.getByLabelText('Поиск игр'), 'gen');

  expect(await screen.findByRole('link', { name: /Genshin/ })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /Dota 2/ })).not.toBeInTheDocument();
  expect(window.location.search).toBe('?q=gen');
});

test('гостю показываются вход и регистрация', async () => {
  mockFetchOnce(200, games);

  render(<App />);

  expect(await screen.findByRole('link', { name: 'Войти' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Регистрация' })).toBeInTheDocument();
});

const noAdmission = {
  rulesVersion: '1.0',
  rulesAccepted: false,
  examPassed: false,
  canSell: false,
  attempts: 0,
  acceptedAt: null,
  passedAt: null,
  retryAfter: null,
};

const rules = {
  version: '1.0',
  title: 'Правила продажи и публикации',
  body: '1.2. Перед первым лотом продавец принимает правила и сдаёт экзамен.',
  checksum: 'sha256:abc',
  questionsCount: 2,
  publishedAt: '2026-09-01T10:00:00+00:00',
};

test('без допуска форма лота уводит на правила продажи', async () => {
  localStorage.setItem('universe.token', 'jwt-token');
  window.history.pushState({}, '', '/my/offers/new');
  mockApi({
    'GET /api/auth/me': [200, me],
    'GET /api/wallet': [200, wallet],
    'GET /api/offers/mine': [200, { items: [] }],
    'GET /api/selling/admission': [200, noAdmission],
    'GET /api/selling/rules': [200, rules],
  });

  render(<App />);

  expect(
    await screen.findByRole('heading', { name: 'Как начать продавать', level: 1 }),
  ).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Новый лот' })).not.toBeInTheDocument();
});

test('с допуском форма лота открывается', async () => {
  localStorage.setItem('universe.token', 'jwt-token');
  window.history.pushState({}, '', '/my/offers/new');
  mockApi({
    'GET /api/auth/me': [200, me],
    'GET /api/wallet': [200, wallet],
    'GET /api/offers/mine': [200, { items: [] }],
    'GET /api/games': [200, games],
    'GET /api/selling/admission': [
      200,
      { ...noAdmission, rulesAccepted: true, examPassed: true, canSell: true, attempts: 1 },
    ],
  });

  render(<App />);

  expect(
    await screen.findByRole('heading', { name: 'Новый лот', level: 1 }),
  ).toBeInTheDocument();
});
