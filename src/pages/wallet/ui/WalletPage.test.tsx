import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { WalletProvider } from 'entities/wallet';
import { installFetchMock, mockApi, requestBody, requestCount } from 'shared/api/test-fetch';
import { SessionProvider } from 'shared/auth';
import { redirectTo } from '../lib/redirect';
import { WalletPage } from './WalletPage';

// Уход к провайдеру — настоящая навигация, jsdom её не умеет.
jest.mock('../lib/redirect');

const buyer = {
  id: 'u-1',
  displayName: 'Покупатель',
  status: 'active',
  registeredAt: '2026-01-01T00:00:00+00:00',
};

const empty = {
  userId: 'u-1',
  available: { amount: 0, currency: 'RUB' },
  held: { amount: 0, currency: 'RUB' },
};

const funded = {
  userId: 'u-1',
  available: { amount: 50000, currency: 'RUB' },
  held: { amount: 0, currency: 'RUB' },
};

const pendingDeposit = {
  id: 'd-1',
  amount: { amount: 150050, currency: 'RUB' },
  status: 'pending',
  confirmationUrl: 'https://yookassa.test/pay/d-1',
  paymentId: 'sandbox-payment-paid-d-1',
  createdAt: '2026-09-20T10:00:00+00:00',
  completedAt: null,
};

const noHistory = {
  'GET /api/wallet/deposits': [200, { items: [] }] as [number, unknown],
  'GET /api/wallet/payouts': [200, { items: [] }] as [number, unknown],
};

beforeEach(() => {
  installFetchMock();
  jest.clearAllMocks();
  localStorage.setItem('universe.token', 'jwt-token');
});

function renderPage(path = '/wallet') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <SessionProvider>
        <WalletProvider>
          <WalletPage />
        </WalletProvider>
      </SessionProvider>
    </MemoryRouter>,
  );
}

test('пополнение заводит платёж и уводит на страницу оплаты', async () => {
  mockApi({
    'GET /api/auth/me': [200, buyer],
    'GET /api/wallet': [200, empty],
    ...noHistory,
    'POST /api/wallet/deposits': [201, pendingDeposit],
  });

  renderPage();
  await userEvent.type(await screen.findByLabelText('Пополнить на, ₽'), '1500,50');
  await userEvent.click(screen.getByRole('button', { name: 'Перейти к оплате' }));

  // Рубли уезжают копейками, а возврат ведёт обратно в кошелёк.
  await waitFor(() =>
    expect(requestBody('POST', '/api/wallet/deposits')).toEqual({
      amount: 150050,
      returnUrl: `${window.location.origin}/wallet`,
    }),
  );
  expect(redirectTo).toHaveBeenCalledWith('https://yookassa.test/pay/d-1');
});

test('вернувшись с оплаты, кошелёк дожимает статус и перечитывает баланс', async () => {
  mockApi({
    'GET /api/auth/me': [200, buyer],
    'GET /api/wallet': [200, empty],
    'GET /api/wallet/deposits': [200, { items: [pendingDeposit] }],
    'GET /api/wallet/payouts': [200, { items: [] }],
    'GET /api/wallet/deposits/d-1': [
      200,
      { ...pendingDeposit, status: 'succeeded', confirmationUrl: null, completedAt: '2026-09-20T10:01:00+00:00' },
    ],
  });

  renderPage();

  // Деньги зачисляет ручка статуса, поэтому баланс после неё перечитывается.
  expect(await screen.findByText('Зачислено')).toBeInTheDocument();
  await waitFor(() => expect(requestCount('GET', '/api/wallet')).toBe(2));
  expect(screen.queryByRole('button', { name: 'Проверить статус' })).not.toBeInTheDocument();
});

test('вывод уходит синонимом карты, а не её номером', async () => {
  mockApi({
    'GET /api/auth/me': [200, buyer],
    'GET /api/wallet': [200, funded],
    ...noHistory,
    'POST /api/wallet/payouts': [
      201,
      {
        id: 'p-1',
        amount: { amount: 20000, currency: 'RUB' },
        status: 'pending',
        cardLast4: '4242',
        createdAt: '2026-09-20T11:00:00+00:00',
        completedAt: null,
      },
    ],
  });

  renderPage();
  await userEvent.type(await screen.findByLabelText('Вывести, ₽'), '200');
  await userEvent.type(screen.getByLabelText('Синоним карты'), 'card-synonym-1');
  await userEvent.click(screen.getByRole('button', { name: 'Вывести на карту' }));

  await waitFor(() =>
    expect(requestBody('POST', '/api/wallet/payouts')).toEqual({
      amount: 20000,
      payoutToken: 'card-synonym-1',
    }),
  );
  expect(await screen.findByText(/Выплата отправлена/)).toBeInTheDocument();

  const row = within(screen.getByRole('listitem'));
  expect(row.getByText('Вывод на карту')).toBeInTheDocument();
  expect(row.getByText('В пути')).toBeInTheDocument();
  expect(row.getByText(/4242/)).toBeInTheDocument();
});

test('больше доступного вывести не даёт, не спрашивая бэкенд', async () => {
  mockApi({ 'GET /api/auth/me': [200, buyer], 'GET /api/wallet': [200, funded], ...noHistory });

  renderPage();
  // Проверка на месте опирается на загруженный баланс — дожидаемся его.
  await screen.findByText('Доступно');
  await userEvent.type(screen.getByLabelText('Вывести, ₽'), '600');
  await userEvent.type(screen.getByLabelText('Синоним карты'), 'card-synonym-1');
  await userEvent.click(screen.getByRole('button', { name: 'Вывести на карту' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('вывести больше нельзя');
  expect(requestBody('POST', '/api/wallet/payouts')).toBeUndefined();
});

test('вывод меньше минимального не отправляется', async () => {
  mockApi({ 'GET /api/auth/me': [200, buyer], 'GET /api/wallet': [200, funded], ...noHistory });

  renderPage();
  await userEvent.type(await screen.findByLabelText('Вывести, ₽'), '50');
  await userEvent.click(screen.getByRole('button', { name: 'Вывести на карту' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('Минимальная сумма вывода — 100 ₽.');
  expect(requestBody('POST', '/api/wallet/payouts')).toBeUndefined();
});

test('подставляет недостающую сумму со страницы лота', async () => {
  mockApi({ 'GET /api/auth/me': [200, buyer], 'GET /api/wallet': [200, empty], ...noHistory });

  renderPage('/wallet?need=1000000');

  expect(await screen.findByLabelText('Пополнить на, ₽')).toHaveValue('10000');
});

test('не отправляет запрос, пока сумма не похожа на число', async () => {
  mockApi({ 'GET /api/auth/me': [200, buyer], 'GET /api/wallet': [200, empty], ...noHistory });

  renderPage();
  await userEvent.type(await screen.findByLabelText('Пополнить на, ₽'), 'тысяча');
  await userEvent.click(screen.getByRole('button', { name: 'Перейти к оплате' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('Введите сумму в рублях');
  expect(requestBody('POST', '/api/wallet/deposits')).toBeUndefined();
  expect(redirectTo).not.toHaveBeenCalled();
});
