"""Create content articles table and seed initial automotive guides.

Revision ID: 20261022_0011
Revises: 20261022_0010
"""
from collections.abc import Sequence
import json
import uuid

import sqlalchemy as sa
from alembic import op

revision: str = "20261022_0011"
down_revision: str | None = "20261022_0010"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    articles_table = op.create_table(
        "articles",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("slug", sa.String(length=160), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("excerpt", sa.Text(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("cover_image", sa.String(length=500), nullable=True),
        sa.Column("category", sa.String(length=32), nullable=False, server_default="guide"),
        sa.Column("tags", sa.JSON(), nullable=False, server_default=sa.text("'[]'")),
        sa.Column("is_published", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("views_count", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("reading_time_minutes", sa.Integer(), nullable=False, server_default=sa.text("5")),
        sa.Column("seo_title", sa.String(length=255), nullable=True),
        sa.Column("seo_description", sa.String(length=500), nullable=True),
        sa.Column("seo_keywords", sa.String(length=500), nullable=True),
        sa.Column("author_id", sa.Uuid(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["author_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug", name="uq_articles_slug"),
    )
    op.create_index("ix_articles_slug", "articles", ["slug"])
    op.create_index("ix_articles_category", "articles", ["category"])
    op.create_index("ix_articles_is_published", "articles", ["is_published"])
    op.create_index("ix_articles_published_at", "articles", ["published_at"])

    # Seed initial rich automotive knowledge-base articles
    sample_articles = [
        {
            "id": uuid.uuid4(),
            "slug": "vybor-tormoznyh-diskov-i-kolodok",
            "title": "Как правильно выбрать тормозные диски и колодки в условиях Таджикистана",
            "excerpt": "Жаркий климат долины и затяжные спуски с горных перевалов создают экстремальные нагрузки на тормозную систему. Разбираем коэффициенты трения, вентиляцию и премиальные бренды (Brembo, Ferodo, TRW).",
            "content": """## Экстремальные условия эксплуатации в Центральной Азии

Температура асфальта в Душанбе и Худжанде летом нередко превышает +50°C, а при поездках через Анзобский перевал тормоза работают в режиме непрерывного теплового нагрева. При выборе тормозных дисков и фрикционных накладок необходимо учитывать не только соответствие OEM-номеру, но и термостойкость материалов.

### 1. Типы тормозных дисков
- **Вентилируемые диски:** Обязательный стандарт для передней оси. Внутренние радиальные каналы создают эффект центробежного насоса, прокачивая воздух и охлаждая металл на 30% эффективнее цельных дисков.
- **Перфорированные диски (Drilled):** Сквозные отверстия отводят образующиеся газы и водяную пленку, повышая начальный отклик (initial bite). Идеальны для динамичного вождения и спортивных седанов.
- **Слотированные диски (Slotted):** Канавки очищают поверхность фрикциона от окалины и предотвращают застекление колодок.

### 2. Состав фрикционной смеси колодок
- **Керамические (Ceramic / Low-Metallic):** Минимальное пылеобразование, отсутствие скрипов и стабильность при нагреве до 650°C. Оптимальны для премиальных автомобилей (BMW, Mercedes-Benz, Lexus).
- **Полуметаллические (Semi-Metallic):** Высокая теплопроводность и агрессивное замедление при умеренной стоимости.

### Рекомендации от экспертов Auto Universe:
1. Всегда меняйте тормозные диски и колодки **попарно на одной оси**.
2. В первые 300 км пробега избегайте резких торможений в пол для правильной притирки.
3. Очищайте направляющие суппортов и используйте высокотемпературную смазку на керамической основе.""",
            "cover_image": "https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=1200&q=80",
            "category": "guide",
            "tags": json.dumps(["тормоза", "brembo", "безопасность", "жара", "горы"], ensure_ascii=False),
            "is_published": True,
            "views_count": 342,
            "reading_time_minutes": 6,
            "seo_title": "Выбор тормозных дисков и колодок в Таджикистане | Блог Auto Universe",
            "seo_description": "Экспертное руководство по выбору тормозных колодок и вентилируемых дисков для горной местности и высоких температур.",
            "seo_keywords": "тормозные колодки душанбе, тормозные диски, brembo, trw, замена тормозов таджикистан",
        },
        {
            "id": uuid.uuid4(),
            "slug": "reglament-to-svechi-i-katushki",
            "title": "Регламент ТО: признаки износа свечей зажигания и катушек",
            "excerpt": "Троение мотора, потеря тяги на подъемах и увеличенный расход топлива — первые вестники проблем в системе зажигания. Рассказываем о ресурсе иридиевых и платиновых свечей.",
            "content": """## Влияние качества топлива и температуры на искрообразование

Свеча зажигания работает в камере сгорания под давлением до 60 атмосфер и температуре до 2500°C. Малейшее увеличение искрового зазора увеличивает нагрузку на вторичную обмотку катушки зажигания, что приводит к ее пробою.

### Симптомы неисправности:
1. **Затрудненный пуск** холодного или горячего двигателя;
2. **Пропуски зажигания (Misfires)** под нагрузкой при разгоне;
3. **Вибрация и подергивания** на холостом ходу;
4. **Ошибки Check Engine** (коды P0300 - P0308).

### Металлы электродов и ресурс:
- **Никелевые (стандарт):** Ресурс 20 000 – 30 000 км;
- **Платиновые (Platinum):** Ресурс 50 000 – 70 000 км;
- **Иридиевые (Iridium Laser / Tough):** Сверхтонкий центральный электрод (0.4–0.6 мм), стабильная искра, ресурс 80 000 – 100 000 км.

Воспользуйтесь нашим интерактивным инструментом **AI Механик** для быстрой онлайн-диагностики кодов ошибок!""",
            "cover_image": "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=1200&q=80",
            "category": "maintenance",
            "tags": json.dumps(["двигатель", "свечи", "ngk", "bosch", "диагностика"], ensure_ascii=False),
            "is_published": True,
            "views_count": 218,
            "reading_time_minutes": 4,
            "seo_title": "Регламент ТО: замена свечей и катушек зажигания | Auto Universe",
            "seo_description": "Как определить износ свечей зажигания, отличия иридиевых свечей и правила защиты катушек от пробоя.",
            "seo_keywords": "свечи зажигания душанбе, иридиевые свечи ngk, катушка зажигания, пропуски зажигания",
        },
        {
            "id": uuid.uuid4(),
            "slug": "maslo-5w30-vs-5w40-leto-zima",
            "title": "Сравнение моторных масел 5W-30 и 5W-40 для жаркого лета и горных перевалов",
            "excerpt": "Какая вязкость лучше защитит двигатель от масляного голодания при +45°C? Сравниваем кинематическую вязкость HTHS, допуски автопроизводителей и синтетические базы PAO.",
            "content": """## Что значат цифры по классификации SAE J300?

Первая цифра с буквой **W (Winter)** обозначает низкотемпературную текучесть масла. Для Душанбе и большинства регионов Таджикистана класс 5W гарантирует легкий пуск до -30°C. 

Главная дискуссия разворачивается вокруг второй цифры — **30 или 40**.

### Кинематическая вязкость при рабочей температуре 100°C:
- **SAE 30:** 9.3 — 12.5 мм²/с. Меньше гидродинамическое сопротивление, ниже расход топлива, но тоньше масляная пленка.
- **SAE 40:** 12.5 — 16.3 мм²/с. Более прочная и устойчивая пленка при критических термических перегрузках в пробках и на перевалах.

### Когда выбирать 5W-40:
1. Пробег автомобиля более 150 000 км (увеличенные зазоры вкладышей коленвала);
2. Турбированные моторы при агрессивной езде;
3. Длительная эксплуатация летом в условиях городского трафика с кондиционером.

В каталоге Auto Universe представлена оригинальная сертифицированная продукция с прямыми поставками от официальных дистрибьюторов.""",
            "cover_image": "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=1200&q=80",
            "category": "review",
            "tags": json.dumps(["моторное масло", "вязкость", "motul", "liqui moly", "лето"], ensure_ascii=False),
            "is_published": True,
            "views_count": 489,
            "reading_time_minutes": 5,
            "seo_title": "Моторное масло 5W-30 или 5W-40 для жары и гор | Экспертиза Auto Universe",
            "seo_description": "Подробный анализ вязкостей моторных масел для жаркого климата Таджикистана. HTHS, допуски и рекомендации экспертов.",
            "seo_keywords": "моторное масло душанбе, 5w40 купить, 5w30 motul, масло для жары таджикистан",
        },
        {
            "id": uuid.uuid4(),
            "slug": "diagnostika-podveski-svoimi-rukami",
            "title": "Стуки и люфты подвески: самостоятельная первичная диагностика",
            "excerpt": "Узнайте, как по характеру звука определить неисправность: стойки стабилизатора, шаровые опоры, сайлентблоки или амортизаторы.",
            "content": """## Классификация шумов ходовой части

Перед тем как отправляться на автосервис, полезно понимать природу посторонних звуков в подвеске. Это защитит от навязывания лишних работ и поможет точнее описать проблему мастеру.

### 1. Звук «стиральной доски» на мелких кочках
- **Виновник:** Стойки и втулки стабилизатора поперечной устойчивости (линки).
- **Опасность:** Средняя, управляемость в поворотах ухудшается.
- **Диагностика:** Раскачайте стоящий автомобиль за рейлинги или верх кузова поперек оси движения.

### 2. Глухой металлический удар при переезде лежачих полицейских
- **Виновник:** Опорные подшипники или штоки амортизаторов.
- **Опасность:** Высокая, риск ухудшения сцепления колес с дорогой и увеличения тормозного пути.

### 3. Скрип при повороте руля на месте
- **Виновник:** Износ шаровых опор или опорных подшипников стоек.
- **Опасность:** Критическая при разрушении пальца шаровой опоры.

Проверьте интерактивный **3D Просмотрщик запчастей** на нашем сайте, чтобы увидеть устройство стойки McPherson в разрезе!""",
            "cover_image": "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80",
            "category": "diy",
            "tags": json.dumps(["подвеска", "амортизаторы", "стойки", "diy", "ходовая"], ensure_ascii=False),
            "is_published": True,
            "views_count": 175,
            "reading_time_minutes": 4,
            "seo_title": "Диагностика стуков в подвеске авто | Auto Universe DIY",
            "seo_description": "Как определить поломку ходовой части автомобиля по звуку и поведению на дороге.",
            "seo_keywords": "стучит подвеска, диагностика ходовой душанбе, сайлентблоки, стойки стабилизатора",
        },
    ]

    op.bulk_insert(articles_table, sample_articles)


def downgrade() -> None:
    op.drop_index("ix_articles_published_at", table_name="articles")
    op.drop_index("ix_articles_is_published", table_name="articles")
    op.drop_index("ix_articles_category", table_name="articles")
    op.drop_index("ix_articles_slug", table_name="articles")
    op.drop_table("articles")

