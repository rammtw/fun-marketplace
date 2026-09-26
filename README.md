# Universe Market — фронтенд

Витрина площадки игровых товаров и услуг: список игр, каталог лотов по игре
с фильтрами по разделу и типу, карточка лота с покупкой, список своих покупок и продаж,
страница заказа с выданными ключами, кошелёк с пополнением и балансом в шапке,
рабочий стол продавца — свои лоты со статусами, заведение, правка, остаток и архив,
регистрация с подтверждением почты и вход по JWT.
API даёт соседний проект `../fun-marketplace-backend`.

## Запуск

```bash
npm install
npm start          # http://localhost:3000
```

Нужен поднятый бэкенд — в `../fun-marketplace-backend`:

```bash
make up            # API на http://localhost:8080, письма в Mailpit на :8025
make fixtures      # игры, разделы, лоты и аккаунты для витрины
```

Запросы идут относительными путями `/api/...`; в разработке dev-сервер проксирует
их на `http://localhost:8080` (`proxy` в `package.json`), поэтому CORS не нужен.
Для сборки под другой хост задайте `REACT_APP_API_URL`.

## Проверки

```bash
npm test             # jest + Testing Library, watch
npm run typecheck    # tsc --noEmit
npm run build        # production-сборка (CI=true считает предупреждения ошибками)
```

## Типы API

Типы ответов не пишутся руками, а генерируются из спеки бэкенда:

```bash
npm run api:sync     # копирует openapi.json и прогоняет openapi-typescript
```

Результат — `src/shared/api/schema.d.ts`; понятные имена для его типов собраны
в `src/shared/api/contract.ts`.

## Структура

Проект разложен по [Feature-Sliced Design](https://feature-sliced.design) v2.1:

```text
src/
  app/        провайдеры, роутер, макет и глобальные стили
  pages/      games (витрина), game (каталог лотов), offer (лот и покупка), orders, order,
              my-offers (лоты продавца), offer-editor, wallet,
              login, register, confirm-email, not-found
  entities/   wallet (баланс), order и offer (словари статусов)
  shared/     api, auth (токен и сессия), lib, ui, config
```

Слоя `features/` нет: пока нет переиспользования, которое его оправдывает. Подробности
и договорённости по проекту — в `CLAUDE.md`.
