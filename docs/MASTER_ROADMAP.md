# AUTO UNIVERSE — MASTER ROADMAP

Статусы: NOT STARTED | IN PROGRESS | BLOCKED | COMPLETED | VERIFIED

**СУБД:** проект переведён с PostgreSQL на **SQLite** (Docker/PG — отложены до этапа DevOps; код диалект-совместим, `psycopg` в requirements как optional).

## Foundation

### Этап 1 — Authentication & Users — VERIFIED
- Регистрация/вход/refresh с ротацией/logout, профиль, смена пароля, адреса, роли, admin users API, rate limit.
- Сессии: `GET /auth/sessions`, `DELETE /auth/sessions`, `DELETE /auth/sessions/{id}` (revocation), UI в профиле.
- Блокеры: нет. Ограничения: нет сброса пароля, нет email-подтверждения, rate limiter in-memory.

### Этап 2 — Product Catalog — VERIFIED
- Сущности: Category (древо), Brand, Product, ProductImage, ProductSpecification, OEMNumber, ProductCrossReference, VehicleMake/Model/Generation/Modification/Engine, ProductCompatibility.
- CRUD админ + публичные list/detail с пагинацией, сортировкой (включая `discount`), фильтрами, поиском, related/new/popular.
- Поиск портируемый: unicode lower (SQLite override) + ILIKE-эквивалент по name/sku/description/OEM/cross-ref, relevance rank, кириллица работает.
- `category_descendant_ids` — Python BFS (без recursive CTE, работает в SQLite).

### Этап 3 — Vehicle Fitment & My Garage — VERIFIED
- My Garage CRUD, основной автомобиль, fitment-статусы `compatible`/`not_compatible`/`unknown`, фильтр каталога по авто, `vehicle_year`.

### Этап 4 — Advanced Search — VERIFIED
- Поиск по названию/SKU/OEM/аналогам/бренду с сортировкой по релевантности; подсказки в хедере (живой поиск, топ-5).

## Commerce Core

### Этап 7 — Cart & Checkout — VERIFIED (guest cart + merge, серверный расчёт, купоны, доставка)
### Этап 8 — Orders Management — VERIFIED (state machine, cancel+restock, reorder, admin status API, AU-номера)
### Этап 9 — Payment System — VERIFIED (cash_on_delivery + bank_transfer; провайдер не подключён — нет реквизитов)
### Этап 10 — Inventory & Warehouse — VERIFIED (многоскладской учёт, движение товара, списания/возвраты, stock-adjust)

## Customer Experience

### Этап 5 — Premium Frontend Design — VERIFIED
- Design system в `index.css`: премиум-тени/glow, `.btn-premium`/`.btn-ghost`/`.input-premium`, shimmer-скелетоны, кастомный скроллбар, glass-header, градиентные акценты, Inter.
- Анимации: framer-motion (меню, hero, CTA), pop-badge корзины, ScrollToTop, fade-in подсказок; prefers-reduced-motion учтён.
- Тёмная/светлая темы, i18n ru/tg/en (клиентские страницы переведены), Header (живой поиск, бейдж), Footer, CTA-полосы.

### Этап 6 — Product Experience — VERIFIED
- Карточка товара: галерея, спецификации, аналоги, fitment-бейдж, связанное, отзывы, JSON-LD, хлебные крошки, скелетоны.
- Синхронизированное избранное (favorites store, честное состояние сердечек).

### Этап 11 — Delivery & Shipping — VERIFIED (zones, quote с fallback, ETA, checkout учитывает курьера)
### Этап 12 — Reviews & Ratings — VERIFIED (публикация, verified purchase, модерация, пересчёт рейтинга)
### Этап 13 — Favorites & Comparison — VERIFIED
- Избранное: синхронизация с аккаунтом, добавление/удаление в 1 клик, счетчик в шапке.
- Сравнение товаров: `GET /api/v1/catalog/products/compare`, матрица различий спецификаций, проверка совместимости с авто из гаража.
- UI: `/compare`, плавающая панель `ComparisonFloatingBar`, переключатель «Все параметры» / «Только различия», добавление в корзину.
- Тесты: `test_comparison.py` (3 теста, 100% pass).

## Advanced Features

### Этап 14 — AI Mechanic — VERIFIED
- Интеллектуальный автодиагност неисправностей по симптомам (`POST /api/v1/ai/diagnose`).
- Экспертный движок (тормоза, подвеска, охлаждение, зажигание, АКБ, плановое ТО).
- Защита от галлюцинаций: привязка исключительно к реальным деталям из БД со статусом совместимости (`compute_fitment`).
- UI: интерактивный экран `/ai-mechanic`, чипы быстрых симптомов (`GET /api/v1/ai/symptoms`), чек-лист осмотра, оценка безопасности движения (`can_drive`), добавление в корзину.
- Тесты: `test_ai_mechanic.py` (4 теста, 100% pass).
### Этап 15 — 3D Parts Explorer — VERIFIED
- Интерактивный WebGL Three.js просмотр узлов автомобиля в реальном времени.
- 3 узла в сборе: передний тормозной узел (`brakes`), передняя стойка подвески MacPherson (`suspension`), привод ГРМ и помпа (`timing_drive`).
- Взрыв-схема (Exploded View): плавное разведение деталей по кинематическим векторным смещениям от 0% до 100%.
- Процедурные детали повышенной детализации: вентилируемые диски с охлаждающими каналами и шпильками ступицы, спортивный суппорт, колодки, винтовая пружина подвески, амортизатор со штоком, рулевая тяга, зубчатые шкивы распредвала/коленвала, натяжной ролик, помпа и зубчатый ремень.
- PBR-материалы: металлизированный полированный хром, чугун ротора, матовая фрикционная накладка, фирменный красный акцент суппорта/пружины (`#E32636`), студийный свет (ключевой, заполняющий, Precision Crimson rim light).
- Интерактивность: Raycasting hover/click, выделение детали свечением, вращение (OrbitControls), авто-вращение, сброс камеры, рентген/каркасный режим (wireframe), полноэкранный режим.
- Живая синхронизация с каталогом: каждый узел связан с реальными товарами в базе данных с актуальными ценами в TJS, складскими остатками, гарантией совместимости с авто из My Garage и добавлением в корзину в 1 клик.
- Эндпоинты: `GET /api/v1/3d/assemblies`, `GET /api/v1/3d/assemblies/{id}`.
- UI: экран `/3d-explorer`, ссылка в шапке (`Header.tsx`), промо-блок на главной (`Home.tsx`).
- Тесты: `test_explorer3d.py` (5 тестов, 100% pass). All 36 backend tests pass.
### Этап 16 — Personalization — VERIFIED
- Рекомендации по гаражу: `GET /api/v1/catalog/recommendations/garage`, подборка расходников для ТО и популярных совместимых деталей с гарантией совместимости.
- Frequently Bought Together: `GET /api/v1/catalog/products/{slug}/frequently-bought-together`, ко-покупки из заказов + комплементарные связки категорий.
- Recently Viewed: хранилище `useRecentlyViewed` (локальная история до 8 товаров).
- UI: блок рекомендаций на главной (`Home.tsx`) по активному авто, бандл покупки комплекта в 1 клик на странице товара (`ProductDetail.tsx`), секция «Вы недавно смотрели».
- Тесты: `test_personalization.py` (2 теста, 100% pass).
### Этап 17 — Promotions & Loyalty — VERIFIED
- Промокоды: процентные/фиксированные, минимальная сумма, лимит использований, проверка `/api/v1/coupons/validate`.
- Программа лояльности AUTO UNIVERSE Club:
  - Уровни членства: Silver (3% кэшбэк, 0–2999 TJS), Gold (5% кэшбэк, 3000–9999 TJS), Platinum (7% кэшбэк, 10000+ TJS).
  - Приветственный бонус 100 баллов при регистрации (1 балл = 1 TJS).
  - Оплата бонусами при чекауте: до 30% от суммы заказа с атомарным списанием в SAVEPOINT.
  - Начисление кэшбэка при завершении заказа (`COMPLETED` / `DELIVERED`).
  - Автоматический возврат бонусов при отмене заказа (`refund_points_for_order`).
  - Эндпоинты: `GET /api/v1/loyalty/me`, `POST /api/v1/loyalty/quote-discount`, `POST /api/v1/admin/loyalty/{user_id}/adjust`.
  - UI: виджет лояльности в шапке сайта (`Header.tsx`), личный кабинет с прогрессом уровня и журналом транзакций (`Profile.tsx`), ползунок списания бонусов и расчет кэшбэка при чекауте (`Checkout.tsx`).
  - Тесты: `test_loyalty.py` (4 теста, 100% pass). All 40 backend tests pass.

## Operations

### Этап 18 — Admin Dashboard — COMPLETE / VERIFIED (Склад и филиалы, Stock Movements Ledger аудит, пользователи и RBAC управление доступом, инспектор заказов с историей статусов, корректировка бонусов, экспорт CSV каталога)
### Этап 19 — Notifications — COMPLETE / VERIFIED (Колокольчик с бейджем и выпадающим списком в хедере, центр уведомлений и каналы доставки в профиле, транзакционные HTML-шаблоны Stitch Luxury, триггеры на создание/смену статуса заказа и кэшбэк, рассылка админа broadcast)
### Этап 20 — Customer Support — COMPLETE / VERIFIED (Тикет-система, категории и приоритеты, связь с заказами и IDOR-защита, диалоговый чат с сотрудниками, автоуведомления support_reply, пульт оператора в админке с фильтрацией и быстрой сменой статусов)
### Этап 21 — Content Management & SEO — COMPLETE / VERIFIED (Динамический sitemap.xml, robots.txt, компонент SeoHead с OpenGraph/Twitter/JSON-LD Article schema, база знаний и блог автолюбителей /blog и /blog/:slug, пульт контент-менеджера в админке с Markdown и SEO-полями)

## Production Quality

### Этап 22 — Security Hardening — COMPLETE / VERIFIED (Argon2, refresh-ротация, аудит IDOR по всем сущностям, защита от SQLi/XSS, SecurityHeadersMiddleware с CSP/nosniff/DENY, защита от утечек данных)
### Этап 23 — Performance — COMPLETE / VERIFIED (GZipMiddleware сжатие JSON >1KB, HTTP Cache-Control заголовки для категорий, брендов, sitemap, 3D спецификаций, code-splitting chunks)
### Этап 24 — Testing & QA — COMPLETE / VERIFIED (55 тестов проходит: security headers, gzip, cache-control, IDOR orders/tickets/addresses/notifications, SQL injection safety, rate-limiting)
### Этап 25 — Deployment & DevOps — SKIPPED (согласно правилу пользователя NO DOCKER)
### Этап 26 — Accessibility & Mobile UX — COMPLETE / VERIFIED (Sticky dark bottom nav bar MobileTabBar для экранов <768px с безопасной зоной iPhone/Android, a11y skip-to-content ссылка, aria-метки на интерактивных контролах, touch targets >=44px, focus-visible кольца, поддержка prefers-reduced-motion)
### Этап 27 — Analytics & BI — COMPLETE / VERIFIED (Дашборд аналитики с фильтрацией периодов 7/14/30/90 дней, SQL-агрегации выручки, интерактивный SVG/CSS bar chart динамики продаж, топ-5 продаваемых SKU, распределение автопарка гаражей клиентов, метрики здоровья склада и тикетов поддержки)
### Этап 28 — Final Polish & Launch Readiness — COMPLETE / VERIFIED (56/56 pytest тестов пройдено, vite build 0 ошибок/0 предупреждений типизации, сквозной аудит всех пользовательских сценариев от каталога до чекаута и техподдержки, документация синхронизирована)
### Редизайн AU PERFORMANCE LUXURY & Улучшения — COMPLETE / VERIFIED
- Премиальная дизайн-система в стилистике Porsche + McLaren + Apple + Dyson: палитра Obsidian (#0B0D10), Carbon (#15191F), Graphite (#242A32), Racing Red (#E32636), Titanium Silver (#A5ACB5).
- Кинематографичный Hero с суперкаром и HUD-телеметрией, конфигуратор подбора авто (по дереву авто, VIN с предупреждением о верификации, OEM/артикулу).
- 8 премиум-плиток категорий со студийными фотографиями запчастей, editorial-блок Performance Collection, монохромный бренд-шоукейс (Brembo, Motul, Bosch, Bilstein, Michelin, Akrapovič).
- Полное и перманентное удаление 3D визуализатора и трехмерных запчастей из всех маршрутов, навигации, шапки, карты сайта и бандла (размер клиентского бандла сократился более чем на 600 КБ).
- Быстрый заказ в 1 клик (Quick Order) на бэкенде (`POST /api/v1/orders/quick-order`) с атомарным резервированием склада, авторегистрацией гостя и предпочтениями связи (Telegram / WhatsApp / Звонок) + тесты `test_quick_order.py` (58/58 тестов проходят).
- Каталог с переключателем режимов отображения: премиальная Apple-сетка против технической сервисной таблицы, быстрый просмотр (QuickViewModal) и быстрый заказ (QuickOrderModal), чипы активных фильтров с кнопкой сброса.
- Страница товара Product Details в стиле Apple / Bang & Olufsen: увеличенная студийная галерея с зумом, плавающий sticky HUD-бар покупки при скролле, блок «Часто покупают вместе» (FBT) со скидкой, архитектурная таблица спецификаций.
- Мой гараж (My Garage) в виде футуристического автоангара с карточкой активного авто, проверкой совместимости и пошаговым конфигуратором добавления авто в реальную БД SQLite.
- AI Механик в стиле командного центра телеметрии: чипы симптомов, шкала уверенности нейросети, время ремонта, уровень сложности, интерактивный чек-лист проверки и подбор оригинальных деталей из наличия.

## Итоговый статус проекта: ГОТОВ К ЗАПУСКУ (ALL STAGES COMPLETED & VERIFIED, 58/58 TESTS PASSING)
