import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { WalletProvider } from 'entities/wallet';
import { installFetchMock, mockApi, requestBody } from 'shared/api/test-fetch';
import { SessionProvider } from 'shared/auth';
import { WalletPage } from './WalletPage';

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

beforeEach(() => {
  installFetchMock();
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

test('пополняет счёт в копейках, а вводят рубли', async () => {
  mockApi({
    'GET /api/auth/me': [200, buyer],
    'GET /api/wallet': [200, empty],
    'POST /api/wallet/deposit': [
      200,
      { ...empty, available: { amount: 150050, currency: 'RUB' } },
    ],
  });

  renderPage();
  await userEvent.type(await screen.findByLabelText('Пополнить на, ₽'), '1500,50');
  await userEvent.click(screen.getByRole('button', { name: 'Пополнить' }));

  await waitFor(() => expect(requestBody('POST', '/api/wallet/deposit')).toEqual({ amount: 150050 }));
  expect(await screen.findByText('Счёт пополнен.')).toBeInTheDocument();
});

test('подставляет недостающую сумму со страницы лота', async () => {
  mockApi({ 'GET /api/auth/me': [200, buyer], 'GET /api/wallet': [200, empty] });

  renderPage('/wallet?need=1000000');

  expect(await screen.findByLabelText('Пополнить на, ₽')).toHaveValue('10000');
});

test('не отправляет запрос, пока сумма не похожа на число', async () => {
  mockApi({ 'GET /api/auth/me': [200, buyer], 'GET /api/wallet': [200, empty] });

  renderPage();
  await userEvent.type(await screen.findByLabelText('Пополнить на, ₽'), 'тысяча');
  await userEvent.click(screen.getByRole('button', { name: 'Пополнить' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('Введите сумму в рублях');
  expect(requestBody('POST', '/api/wallet/deposit')).toBeUndefined();
});
