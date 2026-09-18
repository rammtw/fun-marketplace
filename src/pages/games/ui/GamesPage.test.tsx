import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { installFetchMock, mockFetchOnce } from 'shared/api/test-fetch';
import { GamesPage } from './GamesPage';

const games = {
  items: [
    { id: 1, slug: 'dota-2', title: 'Dota 2', platforms: ['PC'] },
    { id: 2, slug: 'genshin', title: 'Genshin Impact', platforms: ['PC', 'iOS'] },
  ],
};

beforeEach(() => {
  installFetchMock();
});

function renderPage(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <GamesPage />
    </MemoryRouter>,
  );
}

test('показывает игры витрины со ссылкой на лоты', async () => {
  mockFetchOnce(200, games);
  renderPage();

  expect(await screen.findByRole('link', { name: /Dota 2/ })).toHaveAttribute(
    'href',
    '/games/dota-2',
  );
  expect(screen.getByRole('link', { name: /Genshin Impact/ })).toBeInTheDocument();
});

test('фильтрует список по запросу из адреса — названию или платформе', async () => {
  mockFetchOnce(200, games);
  renderPage('/?q=ios');

  expect(await screen.findByRole('link', { name: /Genshin Impact/ })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /Dota 2/ })).not.toBeInTheDocument();
});

test('показывает ошибку, когда витрина не ответила', async () => {
  mockFetchOnce(500, { detail: 'Витрина недоступна' });
  renderPage();

  expect(await screen.findByRole('alert')).toHaveTextContent('Витрина недоступна');
});
