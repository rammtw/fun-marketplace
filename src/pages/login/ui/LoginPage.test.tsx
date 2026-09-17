import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { installFetchMock, mockFetchOnce } from 'shared/api/test-fetch';
import { SessionProvider } from 'shared/auth';
import { LoginPage } from './LoginPage';

beforeEach(() => {
  installFetchMock();
  localStorage.clear();
});

function renderPage() {
  return render(
    <MemoryRouter>
      <SessionProvider>
        <LoginPage />
      </SessionProvider>
    </MemoryRouter>,
  );
}

async function fillAndSubmit() {
  await userEvent.type(screen.getByLabelText('Почта'), 'buyer@universe.test');
  await userEvent.type(screen.getByLabelText('Пароль'), 'password');
  await userEvent.click(screen.getByRole('button', { name: 'Войти' }));
}

test('сохраняет токен после входа', async () => {
  mockFetchOnce(200, { token: 'jwt-token' });
  mockFetchOnce(200, {
    id: 'u-1',
    displayName: 'Покупатель',
    status: 'active',
    registeredAt: '2026-01-01T00:00:00+00:00',
  });

  renderPage();
  await fillAndSubmit();

  await waitFor(() => expect(localStorage.getItem('universe.token')).toBe('jwt-token'));
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('показывает текст отказа с бэкенда и предлагает переслать письмо', async () => {
  mockFetchOnce(401, { code: 401, message: 'Подтвердите почту по ссылке из письма.' });

  renderPage();
  await fillAndSubmit();

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Подтвердите почту по ссылке из письма.',
  );
  expect(screen.getByRole('button', { name: 'Выслать письмо заново' })).toBeInTheDocument();
  expect(localStorage.getItem('universe.token')).toBeNull();
});
