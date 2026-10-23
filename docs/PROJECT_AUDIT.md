# AUTO UNIVERSE — PROJECT AUDIT

Дата аудита: 2026-10-20 (initial), ревизия 2026-10-21 (SQLite + frontend premium).

## Текущий стек

- Backend: FastAPI 0.115, SQLAlchemy 2.0 (синхронный), Alembic, Pydantic 2, PyJWT, Argon2 (pwdlib), **SQLite** (`backend/data/autouniverse.db`; PostgreSQL — optional, код диалект-совместим).
- Frontend: `frontend/` — React 19 + Vite + TypeScript + Tailwind v4 + TanStack Query + Zustand + framer-motion + i18next (ru/tg/en).
- Infra: нет Docker/CI/Nginx. Python venv `backend/.venv` (3.12.15). Git не инициализирован.
- Инструменты: ruff (backend), `npm run build` (frontend), 21 pytest.

## Этап 1 — Authentication & Users: VERIFIED

- JWT access/refresh с одноразовой ротацией refresh (jti в БД), Argon2, dummy-hash.
- Роли CUSTOMER/MANAGER/ADMIN, permission-based access, rate limiting логина (in-memory).
- Профиль, смена пароля (отзыв сессий), адреса (default — частичный unique index), admin users API.
- **Добавлено 21.10:** эндпоинты сессий: `GET /auth/sessions` (список активных), `DELETE /auth/sessions` (отзыв всех), `DELETE /auth/sessions/{id}` (отзыв одной) + тест `test_session_management`.

Замечания (некритичные): rate limiter in-memory; нет сброса пароля/email-подтверждения; CORS `allow_methods=["*"]` приемлем для Bearer-auth.

## Фронтенд: аудит 21.10 — архитектура рабочая, полировка выполнена

Сильные стороны (сохранены):
- Роутинг с lazy-загрузкой и Suspense, react-query с дефолтами, zustand-сторы (auth/cart/garage/app/favorites).
- Состояния loading (скелетоны)/error/empty на всех ключевых страницах; гостевая корзина + merge, честные фитмент-статусы, JSON-LD на карточке.
- Дизайн-система: тёмная/светлая тема на CSS-переменных, премиальная палитра (#0B0D10 / #E32636).

Выявлено и исправлено в ревизии 21.10:
- Мёртвое/ложное состояние: сердечки избранного всегда начинались с `false` → введён `favorites store`, синхронный с сервером.
- Жёстко зашитые русские строки на клиентских страницах → i18n-ключи для Catalog/ProductCard/ProductDetail/Reviews/Home/Footer (~90 ключей).
- Отсутствие live-подсказок поиска → debounce-подсказки в Header (топ-5 товаров).
- Отсутствие ScrollToTop, слабая полировка → премиум design system (тени/glow/skeletons/glass), анимации framer-motion, CTA-полосы.
- Отсутствие реальных секций акций/гаража на главной → секция «Скидки и акции» (серверная сортировка `discount`), баннер гаража.
- Сортировки каталога без «по скидке» → `sort=discount` добавлена в backend и UI.

Оставшееся (не блокер): полный перевод админки/профиля, a11y-аудит, страница сравнения товаров.

## Этапы: статусы

См. `MASTER_ROADMAP.md`: 1–4, 7–9, 11–13 (favorites), 17 (coupons) — VERIFIED; 5–6 — VERIFIED (премиум-полировка); 10, 14–16, 19–20, 23, 25, 27 — NOT STARTED; 18, 21, 22, 24, 26 — IN PROGRESS.

## Окружение для разработки

- **БД: SQLite** — `backend/data/autouniverse.db` (создаётся автоматически; WAL, foreign_keys=ON, busy_timeout).
- PostgreSQL больше не требуется; для будущего Docker/PG миграции совместимы (`if dialect == postgresql` в 0002, `render_as_batch` для SQLite).
- Тесты используют отдельный временный SQLite-файл (см. `tests/conftest.py`).

## Архитектурные решения

- Модульный монолит FastAPI, REST `/api/v1/...`, слои models/schemas/routers/services.
- Поиск: диалект-независимый (lower/like + relevance Case + unicode-переопределение в SQLite) вместо PG FTS — единое поведение в dev/test/SQLite.
- SPA-френдовый SEO: JSON-LD/мета из API; полный SSR — до появления Node-хостинга в требованиях.
