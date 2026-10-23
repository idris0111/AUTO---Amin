# Premium Auto Parts API — этап 1

Рабочая основа монолитного backend на FastAPI: PostgreSQL, синхронный SQLAlchemy 2.0,
Alembic, пользователи, адреса, JWT access/refresh, роли и permissions.

## Быстрый запуск

Требуются Python 3.12 и отдельная база PostgreSQL. На Windows 11 установите
Python 3.12.10 из [официального релиза](https://www.python.org/downloads/release/python-31210/)
(Windows installer, 64-bit). При установке для текущего пользователя отметьте
`Add python.exe to PATH`, откройте новое окно PowerShell и проверьте
`py -3.12 --version` и `py -3.12 -m pip --version`.

Если PostgreSQL уже установлен локально, Docker для этапа 1 не требуется.
Подключитесь к локальному серверу под администратором PostgreSQL и создайте
отдельную роль и базу приложения. Клиент Windows обычно находится в
`C:\Program Files\PostgreSQL\18\bin\psql.exe`. Введите пароль администратора
по запросу клиента, а не в командной строке. Затем замените `change-me` в
`DATABASE_URL` файла `.env` паролем роли `autoparts`.

Для нового экземпляра PostgreSQL команды выглядят так (выполняйте только если
таких роли и баз ещё нет):

```powershell
& 'C:\Program Files\PostgreSQL\18\bin\psql.exe' -h 127.0.0.1 -U postgres -d postgres
```

```sql
CREATE ROLE autoparts LOGIN;
\password autoparts
CREATE DATABASE autoparts OWNER autoparts;
CREATE DATABASE autoparts_test OWNER autoparts;
```

Команда `\password` запросит пароль без его вывода на экран и без записи в
историю SQL-команд. Для пароля со специальными символами в `DATABASE_URL`
используйте URL-кодирование.

```powershell
cd backend
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

Если файла `.env` ещё нет, скопируйте `.env.example`, замените `DATABASE_URL` и
создайте случайный `JWT_SECRET` длиной не менее 32 символов. Не помещайте `.env`
в систему контроля версий. В текущем локальном `.env` JWT-секрет уже создан;
подключение к БД ещё требует настройки учётных данных.

```powershell
alembic upgrade head
uvicorn app.main:app --reload
```

Документация API: `http://127.0.0.1:8000/docs`. Проверка процесса — `/health`,
проверка соединения с БД — `/ready`.

Первый администратор создаётся после миграции интерактивной командой (пароль не
попадает в историю shell):

```powershell
python -m app.cli create-admin --email admin@example.com
```

## API этапа 1

- `POST /api/v1/auth/register` — регистрация;
- `POST /api/v1/auth/login` — access и refresh JWT;
- `POST /api/v1/auth/refresh` — одноразовая ротация refresh-токена;
- `POST /api/v1/auth/logout` — отзыв refresh-токена;
- `GET/PATCH /api/v1/users/me` — профиль;
- `POST /api/v1/users/me/change-password` — смена пароля и отзыв всех сессий;
- `GET/POST /api/v1/addresses` — свои адреса;
- `PATCH/DELETE /api/v1/addresses/{id}` — изменение и удаление своего адреса;
- `GET /api/v1/admin/users` — список пользователей (только Admin);
- `PATCH /api/v1/admin/users/{id}` — роль и блокировка (только Admin).

Перед защищёнными запросами Swagger принимает access-токен через кнопку
**Authorize**. Refresh-токены хранятся только как SHA-256 отпечатки `jti`, а пароли
хешируются Argon2. Старый refresh-токен после обновления повторно использовать нельзя.

## Тесты

Тесты намеренно не используют production-базу. Создайте отдельную пустую базу,
например `autoparts_test`, затем задайте подключение:

```powershell
$env:TEST_DATABASE_URL='postgresql+psycopg://autoparts:password@localhost:5432/autoparts_test'
python -m pytest -v
```

Тестовая база должна быть пустой, а её имя должно заканчиваться на `_test`.
Запуск откажется удалять уже существующие таблицы. Таблицы, созданные этой
тестовой сессией, удаляются после её завершения. Никогда не указывайте в
`TEST_DATABASE_URL` базу с нужными данными.

## Что дальше

Этап 2 по исходному плану: категории, бренды, иерархия автомобилей, товары,
совместимость, поиск/фильтры и тесты каталога. Docker, Redis и Celery относятся к
последующим этапам и пока намеренно не добавлены.

