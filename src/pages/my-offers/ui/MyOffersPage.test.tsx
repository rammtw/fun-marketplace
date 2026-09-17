import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { installFetchMock, mockApi, requestBody, requestUrl } from 'shared/api/test-fetch';
import { MyOffersPage } from './MyOffersPage';

function offer(overrides: Record<string, unknown> = {}) {
  return {
    id: 'o-1',
    status: 'draft',
    title: 'Аккаунт Divine 5',
    description: 'Калибровка пройдена.',
    price: { amount: 1290000, currency: 'RUB' },
    deliveryType: 'auto',
    stock: 2,
    isPurchasable: false,
    attributes: { mmr: 5800 },
    section: {
      id: 53,
      title: 'Аккаунты',
      kind: 'goods',
      commissionBasisPoints: 700,
      gameSlug: 'dota-2',
      gameTitle: 'Dota 2',
    },
    createdAt: '2026-09-17T12:00:00+00:00',
    updatedAt: '2026-09-17T12:00:00+00:00',
    ...overrides,
  };
}

beforeEach(() => {
  installFetchMock();
  localStorage.setItem('universe.token', 'jwt-token');
});

function renderPage(path = '/my/offers') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <MyOffersPage />
    </MemoryRouter>,
  );
}

test('показывает лоты во всех статусах, включая черновики', async () => {
  mockApi({ 'GET /api/offers/mine': [200, { items: [offer()] }] });

  renderPage();

  expect(await screen.findByRole('heading', { name: 'Аккаунт Divine 5' })).toBeInTheDocument();
  // «Черновик» есть и среди фильтров, поэтому ищем метку в самой карточке.
  const card = screen.getByRole('article');
  expect(within(card).getByText('Черновик')).toBeInTheDocument();
  expect(within(card).getByText('остаток: 2')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Изменить' })).toHaveAttribute(
    'href',
    '/my/offers/o-1/edit',
  );
});

test('публикация черновика уходит правкой статуса', async () => {
  mockApi({
    'GET /api/offers/mine': [200, { items: [offer()] }],
    'PATCH /api/offers/o-1': [200, offer({ status: 'active' })],
  });

  renderPage();
  await userEvent.click(await screen.findByRole('button', { name: 'Опубликовать' }));

  await waitFor(() => expect(requestBody('PATCH', '/api/offers/o-1')).toEqual({ status: 'active' }));
});

test('снятие с витрины доступно опубликованному лоту', async () => {
  mockApi({
    'GET /api/offers/mine': [200, { items: [offer({ status: 'active', isPurchasable: true })] }],
    'PATCH /api/offers/o-1': [200, offer({ status: 'paused' })],
  });

  renderPage();
  await userEvent.click(await screen.findByRole('button', { name: 'Снять с витрины' }));

  await waitFor(() => expect(requestBody('PATCH', '/api/offers/o-1')).toEqual({ status: 'paused' }));
});

test('архив спрашивает подтверждение и уходит удалением', async () => {
  mockApi({
    'GET /api/offers/mine': [200, { items: [offer()] }],
    'DELETE /api/offers/o-1': [204],
  });

  renderPage();
  await userEvent.click(await screen.findByRole('button', { name: 'В архив' }));

  expect(screen.getByText('В архив насовсем?')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Да, в архив' }));

  await waitFor(() => expect(requestUrl('DELETE', '/api/offers/o-1')).toBeDefined());
});

test('фильтр по статусу уходит в запрос', async () => {
  mockApi({ 'GET /api/offers/mine': [200, { items: [] }] });

  renderPage();
  await userEvent.click(await screen.findByRole('button', { name: 'В архиве' }));

  await waitFor(() => expect(requestUrl('GET', '/api/offers/mine')).toContain('status=archived'));
  expect(await screen.findByText('Лотов в этом статусе нет.')).toBeInTheDocument();
});
