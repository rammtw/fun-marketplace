import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { installFetchMock, mockApi } from 'shared/api/test-fetch';
import { SessionProvider } from 'shared/auth';
import { GamePage } from './GamePage';

const game = {
  id: 21,
  slug: 'dota-2',
  title: 'Dota 2',
  platforms: ['pc'],
  sections: [
    { id: 66, title: 'Аккаунты', kind: 'goods', commissionBasisPoints: 700, attributeSchema: {} },
  ],
};

function offer(id: string, title: string, stock: number | null, kind = 'goods') {
  return {
    id,
    title,
    price: { amount: 100000, currency: 'RUB' },
    deliveryType: stock === null ? 'manual' : 'auto',
    stock,
    sectionId: 66,
    sectionTitle: 'Аккаунты',
    kind,
  };
}

const seller = {
  id: 'u-1',
  displayName: 'SkinLord',
  status: 'active',
  registeredAt: '2026-01-01T00:00:00+00:00',
};

/** Лот продавца в его же списке: витринный лот про продавца ничего не знает. */
function sellerOffer(id: string, title: string) {
  return {
    id,
    status: 'active',
    title,
    description: '',
    price: { amount: 100000, currency: 'RUB' },
    deliveryType: 'auto',
    stock: 3,
    isPurchasable: true,
    attributes: {},
    section: {
      id: 66,
      title: 'Аккаунты',
      kind: 'goods',
      commissionBasisPoints: 700,
      gameSlug: 'dota-2',
      gameTitle: 'Dota 2',
    },
    createdAt: '2026-09-17T12:00:00+00:00',
    updatedAt: '2026-09-17T12:00:00+00:00',
  };
}

beforeEach(() => {
  installFetchMock();
  localStorage.clear();
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/games/dota-2']}>
      <SessionProvider>
        <Routes>
          <Route path="/games/:slug" element={<GamePage />} />
        </Routes>
      </SessionProvider>
    </MemoryRouter>,
  );
}

test('распроданные лоты уходят вниз, остальной порядок не меняется', async () => {
  mockApi({
    'GET /api/games/dota-2': [200, game],
    'GET /api/games/dota-2/offers': [
      200,
      {
        items: [
          offer('o-1', 'Распроданный аккаунт', 0),
          offer('o-2', 'Свежий аккаунт', 3),
          offer('o-3', 'Буст MMR', null, 'service'),
          offer('o-4', 'Ещё один распроданный', 0),
        ],
      },
    ],
  });

  renderPage();

  const titles = await screen.findAllByRole('heading', { level: 3 });
  expect(titles.map((node) => node.textContent)).toEqual([
    'Свежий аккаунт',
    'Буст MMR',
    'Распроданный аккаунт',
    'Ещё один распроданный',
  ]);
});

test('у распроданного лота метка вместо остатка', async () => {
  mockApi({
    'GET /api/games/dota-2': [200, game],
    'GET /api/games/dota-2/offers': [
      200,
      { items: [offer('o-1', 'Распроданный аккаунт', 0), offer('o-2', 'Свежий аккаунт', 3)] },
    ],
  });

  renderPage();

  const soldOut = within(
    (await screen.findByRole('link', { name: /Распроданный аккаунт/ })) as HTMLElement,
  );
  expect(soldOut.getByText('Нет в наличии')).toBeInTheDocument();
  expect(soldOut.queryByText(/в наличии:/)).not.toBeInTheDocument();

  const inStock = within(screen.getByRole('link', { name: /Свежий аккаунт/ }));
  expect(inStock.getByText('в наличии: 3')).toBeInTheDocument();
  expect(inStock.queryByText('Нет в наличии')).not.toBeInTheDocument();
});

test('услуга без остатка распроданной не считается', async () => {
  mockApi({
    'GET /api/games/dota-2': [200, game],
    'GET /api/games/dota-2/offers': [200, { items: [offer('o-3', 'Буст MMR', null, 'service')] }],
  });

  renderPage();

  const service = within(await screen.findByRole('link', { name: /Буст MMR/ }));
  expect(service.queryByText('Нет в наличии')).not.toBeInTheDocument();
  expect(service.queryByText(/в наличии:/)).not.toBeInTheDocument();
});

test('свои лоты показываются отдельной группой', async () => {
  localStorage.setItem('universe.token', 'jwt-token');
  mockApi({
    'GET /api/auth/me': [200, seller],
    'GET /api/games/dota-2': [200, game],
    'GET /api/games/dota-2/offers': [
      200,
      { items: [offer('o-1', 'Чужой аккаунт', 3), offer('o-2', 'Мой аккаунт', 3)] },
    ],
    'GET /api/offers/mine': [200, { items: [sellerOffer('o-2', 'Мой аккаунт')] }],
  });

  renderPage();

  const mine = within(
    (await screen.findByRole('heading', { name: 'Ваши лоты' })).parentElement as HTMLElement,
  );
  expect(mine.getByRole('link', { name: /Мой аккаунт/ })).toBeInTheDocument();
  expect(mine.queryByRole('link', { name: /Чужой аккаунт/ })).not.toBeInTheDocument();

  const others = within(
    screen.getByRole('heading', { name: 'Остальные лоты' }).parentElement as HTMLElement,
  );
  expect(others.getByRole('link', { name: /Чужой аккаунт/ })).toBeInTheDocument();
});

test('гостю каталог показывается одним списком', async () => {
  mockApi({
    'GET /api/games/dota-2': [200, game],
    'GET /api/games/dota-2/offers': [200, { items: [offer('o-1', 'Чужой аккаунт', 3)] }],
  });

  renderPage();

  expect(await screen.findByRole('link', { name: /Чужой аккаунт/ })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Ваши лоты' })).not.toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Остальные лоты' })).not.toBeInTheDocument();
});

test('упавший запрос своих лотов не ломает каталог', async () => {
  localStorage.setItem('universe.token', 'jwt-token');
  mockApi({
    'GET /api/auth/me': [200, seller],
    'GET /api/games/dota-2': [200, game],
    'GET /api/games/dota-2/offers': [200, { items: [offer('o-1', 'Чужой аккаунт', 3)] }],
    'GET /api/offers/mine': [500, { detail: 'Всё сломалось' }],
  });

  renderPage();

  expect(await screen.findByRole('link', { name: /Чужой аккаунт/ })).toBeInTheDocument();
  expect(screen.queryByText('Всё сломалось')).not.toBeInTheDocument();
});

test('из каталога есть вход в заведение лота', async () => {
  mockApi({
    'GET /api/games/dota-2': [200, game],
    'GET /api/games/dota-2/offers': [200, { items: [offer('o-1', 'Чужой аккаунт', 3)] }],
  });

  renderPage();

  // Гостю кнопку тоже показываем: RequireAuth заведёт его на вход и вернёт обратно.
  const sell = await screen.findByRole('link', { name: 'Продавать' });
  expect(sell).toHaveAttribute('href', '/my/offers/new');
});
