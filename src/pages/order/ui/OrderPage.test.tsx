import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { installFetchMock, mockApi, requestBody } from 'shared/api/test-fetch';
import { SessionProvider } from 'shared/auth';
import { OrderPage } from './OrderPage';

const NOTE = 'Буст закончен: 4012 MMR, скриншот в переписке.';

const money = (amount: number) => ({ amount, currency: 'RUB' });

function user(id: string, displayName: string) {
  return { id, displayName, status: 'active', registeredAt: '2026-01-01T00:00:00+00:00' };
}

const paid = {
  id: 'o-1',
  status: 'paid',
  offerId: 'of-1',
  buyerId: 'u-buyer',
  sellerId: 'u-seller',
  offer: { title: 'Буст MMR с 3000 до 4000', price: money(450000), sectionId: 66, attributes: {} },
  quantity: 1,
  amount: money(450000),
  commission: money(31500),
  payout: money(418500),
  placedAt: '2026-09-17T12:11:23+00:00',
  paidAt: '2026-09-17T12:11:23+00:00',
  deliveredAt: null,
  deliveredItems: [],
  deliveryNote: null,
};

const delivered = {
  ...paid,
  status: 'delivered',
  deliveredAt: '2026-09-18T09:30:00+00:00',
  deliveryNote: NOTE,
};

beforeEach(() => {
  installFetchMock();
  localStorage.setItem('universe.token', 'jwt-token');
});

function renderPage() {
  return render(
    <SessionProvider>
      <MemoryRouter initialEntries={['/orders/o-1']}>
        <Routes>
          <Route path="/orders/:id" element={<OrderPage />} />
        </Routes>
      </MemoryRouter>
    </SessionProvider>,
  );
}

test('продавец отмечает заказ выданным, и страница показывает выдачу', async () => {
  mockApi({
    'GET /api/auth/me': [200, user('u-seller', 'SkinLord')],
    'GET /api/orders/o-1': [200, paid],
    'POST /api/orders/o-1/deliver': [200, delivered],
  });

  renderPage();

  const note = await screen.findByLabelText('Что вы передали покупателю');
  await userEvent.type(note, NOTE);
  await userEvent.click(screen.getByRole('button', { name: 'Отметить выданным' }));

  expect(await screen.findByText('Что вы передали')).toBeInTheDocument();
  expect(requestBody('POST', '/api/orders/o-1/deliver')).toEqual({ note: NOTE });
  // «Выдан» есть и в строке даты выдачи, поэтому сверяем именно значок статуса.
  expect(screen.getByText('Выдан', { selector: 'span' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Отметить выданным' })).not.toBeInTheDocument();
});

test('пустая выдача на бэкенд не уходит', async () => {
  mockApi({
    'GET /api/auth/me': [200, user('u-seller', 'SkinLord')],
    'GET /api/orders/o-1': [200, paid],
  });

  renderPage();

  const note = await screen.findByLabelText('Что вы передали покупателю');
  await userEvent.type(note, '   ');

  expect(screen.getByRole('button', { name: 'Отметить выданным' })).toBeDisabled();
});

test('конфликт статуса перечитывает заказ и объясняет, что случилось', async () => {
  mockApi({
    'GET /api/auth/me': [200, user('u-seller', 'SkinLord')],
    'GET /api/orders/o-1': [200, paid],
    'POST /api/orders/o-1/deliver': [
      409,
      { detail: 'Заказ в статусе «delivered», ожидался «paid».' },
    ],
  });

  renderPage();

  await userEvent.type(await screen.findByLabelText('Что вы передали покупателю'), NOTE);
  await userEvent.click(screen.getByRole('button', { name: 'Отметить выданным' }));

  expect(await screen.findByRole('alert')).toHaveTextContent(/ожидался «paid»/);
  await waitFor(() =>
    expect(
      (global.fetch as jest.Mock).mock.calls.filter(
        ([input, init]) =>
          String(input).endsWith('/api/orders/o-1') && (init?.method ?? 'GET') === 'GET',
      ),
    ).toHaveLength(2),
  );
});

test('покупателю выдачи не предлагают: он ждёт продавца, а потом читает выдачу', async () => {
  mockApi({
    'GET /api/auth/me': [200, user('u-buyer', 'Gamer')],
    'GET /api/orders/o-1': [200, paid],
  });

  const page = renderPage();

  expect(await screen.findByText(/удерживаются в эскроу/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Отметить выданным' })).not.toBeInTheDocument();
  page.unmount();

  mockApi({
    'GET /api/auth/me': [200, user('u-buyer', 'Gamer')],
    'GET /api/orders/o-1': [200, delivered],
  });
  renderPage();

  expect(await screen.findByText('Что передал продавец')).toBeInTheDocument();
  expect(screen.getByText(NOTE)).toBeInTheDocument();
});
