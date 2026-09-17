import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { installFetchMock, mockApi, requestUrl } from 'shared/api/test-fetch';
import { OrdersPage } from './OrdersPage';

function order(id: string, title: string, status: string) {
  return {
    id,
    status,
    offerId: `offer-${id}`,
    title,
    price: { amount: 450000, currency: 'RUB' },
    quantity: 1,
    amount: { amount: 450000, currency: 'RUB' },
    counterparty: {
      id: 'u-2',
      displayName: 'SkinLord',
      status: 'active',
      registeredAt: '2026-01-01T00:00:00+00:00',
    },
    placedAt: '2026-09-17T12:11:23+00:00',
  };
}

const purchases = {
  items: [order('o-1', 'Буст MMR с 3000 до 4000', 'paid')],
  page: 1,
  perPage: 20,
  total: 1,
};

beforeEach(() => {
  installFetchMock();
  localStorage.setItem('universe.token', 'jwt-token');
});

function renderPage(path = '/orders') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <OrdersPage />
    </MemoryRouter>,
  );
}

test('по умолчанию показывает покупки со ссылкой на заказ', async () => {
  mockApi({ 'GET /api/orders': [200, purchases] });

  renderPage();

  const row = await screen.findByRole('link', { name: /Буст MMR/ });
  expect(row).toHaveAttribute('href', '/orders/o-1');
  expect(row).toHaveTextContent('Оплачен');
  expect(row).toHaveTextContent('Продавец: SkinLord');
  expect(requestUrl('GET', '/api/orders')).toContain('role=buyer');
});

test('переключение на продажи перезапрашивает список', async () => {
  mockApi({ 'GET /api/orders': [200, purchases] });

  renderPage();
  await screen.findByRole('link', { name: /Буст MMR/ });
  await userEvent.click(screen.getByRole('button', { name: 'Продажи' }));

  expect(await screen.findByRole('heading', { name: 'Мои продажи' })).toBeInTheDocument();
  await waitFor(() => expect(requestUrl('GET', '/api/orders')).toContain('role=seller'));
  expect(screen.getByRole('link', { name: /Буст MMR/ })).toHaveTextContent('Покупатель: SkinLord');
});

test('фильтр по статусу уходит в запрос и сбрасывает страницу', async () => {
  mockApi({ 'GET /api/orders': [200, purchases] });

  renderPage('/orders?page=3');
  await userEvent.click(await screen.findByRole('button', { name: 'Завершён' }));

  await waitFor(() => {
    const url = requestUrl('GET', '/api/orders');
    expect(url).toContain('status=completed');
    expect(url).toContain('page=1');
  });
});

test('пустой список зовёт на витрину', async () => {
  mockApi({ 'GET /api/orders': [200, { items: [], page: 1, perPage: 20, total: 0 }] });

  renderPage();

  expect(await screen.findByText(/Заказов пока нет/)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Посмотреть игры' })).toHaveAttribute('href', '/');
});

test('листает страницы, когда заказов больше страницы', async () => {
  mockApi({
    'GET /api/orders': [200, { ...purchases, total: 45 }],
  });

  renderPage();
  await screen.findByRole('link', { name: /Буст MMR/ });

  expect(screen.getByText('страница 1 из 3')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '← Назад' })).toBeDisabled();

  await userEvent.click(screen.getByRole('button', { name: 'Вперёд →' }));
  await waitFor(() => expect(requestUrl('GET', '/api/orders')).toContain('page=2'));
});
