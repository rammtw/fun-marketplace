import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { installFetchMock, mockApi, mockFetchOnce, requestBody } from 'shared/api/test-fetch';
import { RegisterPage } from './RegisterPage';

const policy = {
  version: '1.0',
  title: 'Политика обработки персональных данных',
  body: 'Оператор обрабатывает почту и псевдоним.',
  checksum: 'a1b2',
  publishedAt: '2026-01-01T00:00:00+00:00',
};

const created = {
  id: 'u-1',
  displayName: 'Новичок',
  status: 'pending',
  registeredAt: '2026-09-18T10:00:00+00:00',
};

beforeEach(() => {
  installFetchMock();
});

function renderPage() {
  return render(
    <MemoryRouter>
      <RegisterPage />
    </MemoryRouter>,
  );
}

async function fillCredentials() {
  await userEvent.type(screen.getByLabelText('Почта'), 'newbie@universe.test');
  await userEvent.type(screen.getByLabelText('Имя на площадке'), 'Новичок');
  await userEvent.type(screen.getByLabelText('Пароль'), 'password1');
}

function submit() {
  return userEvent.click(screen.getByRole('button', { name: 'Зарегистрироваться' }));
}

test('отправляет редакцию политики и выбранные согласия', async () => {
  mockApi({
    'GET /api/privacy/policy': [200, policy],
    'POST /api/auth/register': [201, created],
  });

  renderPage();
  await screen.findByRole('link', { name: /редакция 1\.0/ });
  await fillCredentials();
  await userEvent.click(screen.getByRole('checkbox', { name: /Даю согласие на обработку/ }));
  await userEvent.click(screen.getByRole('checkbox', { name: /новинках и акциях/ }));
  await submit();

  await screen.findByText('Почти готово');
  expect(requestBody('POST', '/api/auth/register')).toEqual({
    email: 'newbie@universe.test',
    displayName: 'Новичок',
    password: 'password1',
    policyVersion: '1.0',
    personalDataConsent: true,
    marketingConsent: true,
  });
});

test('без обязательного согласия не ходит на бэкенд', async () => {
  mockApi({ 'GET /api/privacy/policy': [200, policy] });

  renderPage();
  await screen.findByRole('link', { name: /редакция 1\.0/ });
  await fillCredentials();
  await submit();

  expect(await screen.findByText('Без согласия аккаунт не завести')).toBeInTheDocument();
  expect(requestBody('POST', '/api/auth/register')).toBeUndefined();
});

test('переизданная политика просит согласиться заново', async () => {
  // Порядок запросов здесь задан сценарием: политика, регистрация, политика.
  mockFetchOnce(200, policy);
  mockFetchOnce(409);
  mockFetchOnce(200, { ...policy, version: '1.1', body: 'Редакция 1.1.' });

  renderPage();
  await screen.findByRole('link', { name: /редакция 1\.0/ });
  await fillCredentials();
  await userEvent.click(screen.getByRole('checkbox', { name: /Даю согласие на обработку/ }));
  await submit();

  expect(await screen.findByRole('alert')).toHaveTextContent('теперь действует редакция 1.1');
  expect(screen.getByRole('link', { name: /редакция 1\.1/ })).toBeInTheDocument();
  expect(screen.getByRole('checkbox', { name: /Даю согласие на обработку/ })).not.toBeChecked();
});

test('409 при действующей редакции — это занятая почта', async () => {
  mockFetchOnce(200, policy);
  mockFetchOnce(409);
  mockFetchOnce(200, policy);

  renderPage();
  await screen.findByRole('link', { name: /редакция 1\.0/ });
  await fillCredentials();
  await userEvent.click(screen.getByRole('checkbox', { name: /Даю согласие на обработку/ }));
  await submit();

  expect(await screen.findByRole('alert')).toHaveTextContent('Эта почта уже занята');
});

test('без политики регистрироваться нечем', async () => {
  mockApi({ 'GET /api/privacy/policy': [500] });

  renderPage();

  expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось загрузить политику');
  expect(screen.getByRole('button', { name: 'Зарегистрироваться' })).toBeDisabled();
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
});

test('текст политики лежит на отдельной странице, а не в форме', async () => {
  mockApi({ 'GET /api/privacy/policy': [200, policy] });

  renderPage();

  const link = await screen.findByRole('link', { name: /редакция 1\.0/ });
  expect(link).toHaveAttribute('href', '/privacy');
  // Новая вкладка: иначе заполненная форма потеряется по дороге к тексту.
  expect(link).toHaveAttribute('target', '_blank');
  expect(screen.queryByText(policy.body)).not.toBeInTheDocument();
  expect(screen.queryByRole('checkbox', { name: /профиль в открытой части/ })).not.toBeInTheDocument();
});
