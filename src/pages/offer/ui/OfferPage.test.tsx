import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { WalletProvider } from 'entities/wallet';
import { installFetchMock, mockApi, requestBody } from 'shared/api/test-fetch';
import { SessionProvider } from 'shared/auth';
import { OfferPage } from './OfferPage';

const OFFER_ID = '01a0ae7d-a166-7214-bed8-7e85ab4f9f51';

const offer = {
  id: OFFER_ID,
  title: 'Аккаунт Divine 5, 5800 MMR',
  description: 'Калибровка пройдена, почта передаётся.',
  price: { amount: 1290000, currency: 'RUB' },
  deliveryType: 'auto',
  stock: 1,
  isPurchasable: true,
  attributes: { mmr: 5800, region: 'cis' },
  section: {
    id: 53,
    title: 'Аккаунты',
    kind: 'goods',
    commissionBasisPoints: 700,
    gameSlug: 'dota-2',
    gameTitle: 'Dota 2',
  },
  seller: {
    id: 'u-2',
    displayName: 'Продавец',
    status: 'active',
    registeredAt: '2026-01-01T00:00:00+00:00',
  },
};

const buyer = {
  id: 'u-1',
  displayName: 'Покупатель',
  status: 'active',
  registeredAt: '2026-01-01T00:00:00+00:00',
};

beforeEach(() => {
  installFetchMock();
  localStorage.clear();
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={[`/offers/${OFFER_ID}`]}>
      <SessionProvider>
        <WalletProvider>
          <Routes>
            <Route path="/offers/:id" element={<OfferPage />} />
            <Route path="/orders/:id" element={<h1>Заказ оформлен</h1>} />
          </Routes>
        </WalletProvider>
      </SessionProvider>
    </MemoryRouter>,
  );
}

test('гостю предлагают войти вместо покупки', async () => {
  mockApi({ [`GET /api/offers/${OFFER_ID}`]: [200, offer] });

  renderPage();

  expect(await screen.findByRole('button', { name: 'Войти и купить' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Купить' })).not.toBeInTheDocument();
});

test('покупка списывает деньги и ведёт на заказ', async () => {
  localStorage.setItem('universe.token', 'jwt-token');
  mockApi({
    'GET /api/auth/me': [200, buyer],
    [`GET /api/offers/${OFFER_ID}`]: [200, offer],
    'GET /api/wallet': [
      200,
      {
        userId: 'u-1',
        available: { amount: 2000000, currency: 'RUB' },
        held: { amount: 0, currency: 'RUB' },
      },
    ],
    'POST /api/orders': [201, { id: 'order-1' }],
  });

  renderPage();
  await userEvent.click(await screen.findByRole('button', { name: 'Купить' }));

  await waitFor(() => expect(screen.getByRole('heading', { name: 'Заказ оформлен' })).toBeInTheDocument());
  expect(requestBody('POST', '/api/orders')).toEqual({ offerId: OFFER_ID, quantity: 1 });
});

test('при нехватке денег зовёт пополнить кошелёк', async () => {
  localStorage.setItem('universe.token', 'jwt-token');
  mockApi({
    'GET /api/auth/me': [200, buyer],
    [`GET /api/offers/${OFFER_ID}`]: [200, offer],
    'GET /api/wallet': [
      200,
      {
        userId: 'u-1',
        available: { amount: 290000, currency: 'RUB' },
        held: { amount: 0, currency: 'RUB' },
      },
    ],
  });

  renderPage();

  const deposit = await screen.findByRole('link', { name: 'Пополнить кошелёк' });
  // 12 900 ₽ минус 2 900 ₽ на счету.
  expect(deposit).toHaveAttribute('href', '/wallet?need=1000000');
  expect(screen.getByRole('status')).toHaveTextContent('Не хватает');
});
