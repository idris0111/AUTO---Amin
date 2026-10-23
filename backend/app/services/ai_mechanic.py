import logging
import os
import re
import uuid
from types import SimpleNamespace
from typing import Any

from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from app.models.catalog import Category, Product, ProductImage, ProductStatus
from app.models.vehicle import (
    ProductCompatibility,
    UserVehicle,
    VehicleMake,
    VehicleModel,
)
from app.schemas.ai import (
    AiDiagnosticRequest,
    AiDiagnosticResponse,
    QuickSymptomPrompt,
    RecommendedProduct,
)
from app.services.vehicles import FitmentStatus, compute_fitment

logger = logging.getLogger(__name__)

QUICK_SYMPTOMS: list[QuickSymptomPrompt] = [
    QuickSymptomPrompt(
        id="brake_squeak",
        title="Скрип и свист при торможении",
        symptom="Скрипят тормоза при нажатии на педаль, металлический скрежет спереди",
        system_category="brake-system",
        icon="brakes",
        short_description="Износ фрикционных накладок колодок или выработка тормозного диска",
    ),
    QuickSymptomPrompt(
        id="suspension_knock",
        title="Глухой стук на неровностях",
        symptom="Глухой стук в передней подвеске при проезде лежачих полицейских и мелких ям",
        system_category="suspension",
        icon="suspension",
        short_description="Износ стоек стабилизатора, втулок или потеря демпфирования амортизатора",
    ),
    QuickSymptomPrompt(
        id="engine_misfire",
        title="Двигатель троит, Check Engine",
        symptom="Двигатель троит на холостом ходу, рывки при разгоне, мигает Check Engine",
        system_category="electronics",
        icon="engine",
        short_description="Пропуски зажигания: свечи, высоковольтные катушки или забитые форсунки",
    ),
    QuickSymptomPrompt(
        id="engine_overheat",
        title="Перегрев мотора, утечка антифриза",
        symptom="Стрелка температуры уходит в красную зону, уходит антифриз, пар из-под капота",
        system_category="engine",
        icon="thermometer",
        short_description="Критический перегрев: разгерметизация патрубка, термостат или прокладка ГБЦ",
    ),
    QuickSymptomPrompt(
        id="battery_start",
        title="Автомобиль не заводится",
        symptom="Стартер щелкает, тускнеет приборная панель, двигатель не крутит",
        system_category="electronics",
        icon="battery",
        short_description="Глубокий разряд аккумулятора или потеря контакта на клеммах",
    ),
    QuickSymptomPrompt(
        id="routine_service",
        title="Плановое ТО и замена масла",
        symptom="Подошел регламентный пробег 10 000 км, требуется замена масла и фильтров",
        system_category="filters",
        icon="oil",
        short_description="Регулярное ТО: моторное масло, масляный, воздушный и салонный фильтры",
    ),
]


def get_quick_symptoms() -> list[QuickSymptomPrompt]:
    return QUICK_SYMPTOMS


# Expert automotive domain patterns
DIAGNOSTIC_RULES = [
    {
        "category_slugs": ["brake-system"],
        "keywords": [
            "тормоз", "колодк", "диск", "скрип", "скрежет", "свист",
            "педаль", "провалива", "бьет руль при торможен", "суппорт", "биение",
        ],
        "system_affected": "Тормозная система",
        "primary_diagnosis": "Износ тормозных колодок или выработка/деформация тормозных дисков",
        "urgency": "high",
        "can_drive": True,
        "causes": [
            "Предельный износ фрикционного слоя тормозных колодок (сработал звуковой индикатор износа)",
            "Неравномерный износ, перегрев или борозды на рабочей поверхности тормозного диска",
            "Закисание направляющих суппорта (колодки не отходят до конца от диска)",
            "Попадание грязи, песка или мелких камней между защитным кожухом и диском",
        ],
        "safety_warning": "Внимание! Снижение эффективности торможения увеличивает тормозной путь. Эксплуатация с толщиной колодок менее 2 мм категорически не рекомендуется.",
        "steps": [
            "Визуально проверьте толщину остаточного фрикционного слоя колодок (критический порог — 2-3 мм).",
            "Осмотрите рабочую поверхность диска на наличие синего оттенка (перегрев) и глубоких кольцевых борозд.",
            "Проверьте ход направляющих пальцев суппорта и целостность резиновых пыльников.",
            "Проверьте уровень тормозной жидкости в бачке под капотом.",
        ],
        "repair_time": "1-2 часа",
        "difficulty": "medium",
        "part_reason": "Комплект колодок и дисков для восстановления расчетной эффективности торможения.",
        "advice": "Рекомендуется менять тормозные колодки комплектом на всю ось (переднюю или заднюю). При установке новых колодок обязательно очистите посадочные места и смажьте направляющие суппорта термостойкой пастой.",
    },
    {
        "category_slugs": ["suspension"],
        "keywords": [
            "подвеск", "стук", "гремит", "кочк", "ям", "амортизатор",
            "стойк", "рычаг", "сайлентблок", "шаров", "тянет в сторон",
            "рулев", "руль", "люфт", "плавает", "лежач",
        ],
        "system_affected": "Подвеска и рулевое управление",
        "primary_diagnosis": "Люфт элементов подвески (стойки стабилизатора / шаровые) или износ амортизаторов",
        "urgency": "medium",
        "can_drive": True,
        "causes": [
            "Разбиты шаровые шарниры стоек стабилизатора поперечной устойчивости (наиболее частая причина глухого стука)",
            "Потеря демпфирующих свойств или разгерметизация передних амортизаторов (вытекание гидравлической жидкости)",
            "Увеличенный люфт рулевых наконечников или рулевой тяги",
            "Расслоение резины сайлентблоков нижних поперечных рычагов подвески",
        ],
        "safety_warning": "При критическом износе рулевых наконечников или шаровых опор возможен внезапный отрыв колеса при маневрировании на скорости.",
        "steps": [
            "Вывесите автомобиль на подъемнике и проверьте осевой и радиальный люфт колеса руками (на 9-15 и 12-18 часов).",
            "Осмотрите корпус амортизаторов на предмет масляных подтеков и запотевания штока.",
            "Монтажкой проверьте упругость сайлентблоков рычагов и отсутствие надрывов резины.",
            "Проверьте рулевую рейку и тяги на отсутствие стуков при покачивании руля на заглушенном авто.",
        ],
        "repair_time": "2-3 часа",
        "difficulty": "medium",
        "part_reason": "Компоненты подвески оригинального качества для устранения стуков и возвращения курсовой устойчивости.",
        "advice": "После любой замены элементов рулевого управления и рычагов подвески обязательно выполните регулировку углов установки колес (сход-развал 3D).",
    },
    {
        "category_slugs": ["engine", "oils"],
        "keywords": [
            "перегрев", "кипит", "антифриз", "тосол", "гбц", "температур",
            "пар", "термостат", "помпа", "радиатор", "уходит антифриз",
        ],
        "system_affected": "Система охлаждения и ДВС",
        "primary_diagnosis": "Разгерметизация системы охлаждения, заклинивание термостата или повреждение прокладки ГБЦ",
        "urgency": "critical",
        "can_drive": False,
        "causes": [
            "Утечка охлаждающей жидкости через лопнувший патрубок, штуцер или бачок радиатора",
            "Заклинивание клапана термостата в закрытом положении (жидкость циркулирует только по малому кругу)",
            "Отказ или проворот крыльчатки водяного насоса (помпы)",
            "Прогар прокладки головки блока цилиндров (ГБЦ) с попаданием выхлопных газов в охлаждающий контур",
        ],
        "safety_warning": "ОПАСНОСТЬ! Не открывайте крышку радиатора или расширительного бачка на горячем двигателе во избежание тяжелых ожогов паром под давлением! Движение с перегретым двигателем приведет к короблению ГБЦ и заклиниванию мотора.",
        "steps": [
            "Заглушите двигатель и дайте ему полностью остыть (не менее 30-40 минут).",
            "Осмотрите пространство под автомобилем и патрубки на наличие цветных следов подтекания антифриза.",
            "Проверьте уровень охлаждающей жидкости в расширительном бачке.",
            "Проверьте состояние моторного масла по щупу: наличие белой эмульсии указывает на пробой прокладки ГБЦ в масляные каналы.",
        ],
        "repair_time": "2-5 часов",
        "difficulty": "hard",
        "part_reason": "Запчасти контура охлаждения и прокладки двигателя для устранения критического перегрева.",
        "advice": "Не продолжайте движение самостоятельно при активном перегреве. Вызовите эвакуатор для доставки автомобиля в сервисный центр.",
    },
    {
        "category_slugs": ["electronics", "engine"],
        "keywords": [
            "троит", "чек", "check engine", "свеч", "катушк", "пропуск",
            "глохнет", "дергает", "зажигани", "провал", "неровн", "искра",
        ],
        "system_affected": "Система зажигания и управления двигателем",
        "primary_diagnosis": "Пропуски воспламенения топливовоздушной смеси (износ свечей или пробой катушки зажигания)",
        "urgency": "medium",
        "can_drive": True,
        "causes": [
            "Выработка межэлектродного зазора или разрушение керамического изолятора свечей зажигания",
            "Межвитковое замыкание или пробой наконечника индивидуальной катушки зажигания",
            "Подсос неучтенного воздуха во впускном тракте (через прокладку впускного коллектора)",
            "Загрязнение дроссельной заслонки или форсунок впрыска топлива",
        ],
        "safety_warning": "Длительная езда с пропусками зажигания приводит к перегреву и разрушению каталитического нейтрализатора несгоревшим топливом.",
        "steps": [
            "Подключите диагностический сканер OBD-II и прочитайте код ошибки (P0300 — множественные пропуски, P0301-P0304 — пропуск в конкретном цилиндре).",
            "Выкрутите свечи и проверьте зазор щупом, а также цвет нагара (черный нагар — богатая смесь, белый — бедная, кирпичный — норма).",
            "Переставьте подозрительную катушку в соседний цилиндр: если ошибка сместится, катушка неисправна.",
            "Очистите дроссельный узел специальным очистителем от масляного нагара.",
        ],
        "repair_time": "1 час",
        "difficulty": "easy",
        "part_reason": "Свечи зажигания и компоненты системы зажигания для стабильной искры и ровной работы цилиндров.",
        "advice": "Для современных моторов рекомендуются иридиевые или платиновые свечи зажигания. Они обеспечивают стабильный запуск в морозы и выдерживают пробег до 60 000 - 80 000 км.",
    },
    {
        "category_slugs": ["electronics"],
        "keywords": [
            "аккумулятор", "акб", "не заводится", "стартер щелкает", "сел",
            "разрядился", "батарея", "генератор", "клемм", "гаснут", "щелкает",
        ],
        "system_affected": "Электрооборудование и пусковая система",
        "primary_diagnosis": "Глубокий разряд, сульфатация аккумуляторной батареи (АКБ) или окисление клемм",
        "urgency": "high",
        "can_drive": False,
        "causes": [
            "Естественный износ и потеря емкости свинцово-кислотной АКБ (срок службы свыше 3-4 лет)",
            "Окисление или ослабление затяжки силовых клемм аккумулятора",
            "Неисправность диодного моста или щеточного узла генератора (отсутствие зарядки во время езды)",
            "Утечка тока в бортовой сети в режиме покоя (нештатная сигнализация, подсветка бардачка)",
        ],
        "safety_warning": "Не замыкайте клеммы аккумулятора металлическими предметами. При установке новой АКБ соблюдайте полярность во избежание выгорания блоков предохранителей и ЭБУ.",
        "steps": [
            "Замерьте мультиметром напряжение на клеммах аккумулятора при выключенном зажигании (менее 12.0 В — глубокий разряд, 12.6-12.7 В — норма).",
            "Осмотрите клеммы на наличие белого налета окислов, зачистите мелкозернистой наждачной бумагой.",
            "Замерьте напряжение зарядки при заведенном двигателе (должно быть в диапазоне 13.8 - 14.4 В).",
            "Проверьте плотность крепления силового провода массы к кузову автомобиля.",
        ],
        "repair_time": "30-45 минут",
        "difficulty": "easy",
        "part_reason": "Надежная пусковая аккумуляторная батарея с высоким пусковым током для уверенного пуска в любых условиях.",
        "advice": "При подборе аккумулятора обращайте внимание на полярность (прямая или обратная), габаритные размеры корпуса и величину пускового тока (EN).",
    },
    {
        "category_slugs": ["filters", "oils"],
        "keywords": [
            "то", "масло", "фильтр", "регламент", "пробег", "замена масла",
            "маслян", "воздушн", "салонн", "обслуживан", "черное масло",
        ],
        "system_affected": "Система смазки и фильтрации (Плановое ТО)",
        "primary_diagnosis": "Наступление интервала планового технического обслуживания (ТО)",
        "urgency": "low",
        "can_drive": True,
        "causes": [
            "Выработка ресурса моторного масла по пробегу (обычно 8 000 - 10 000 км в городских условиях)",
            "Загрязнение фильтрующей шторы масляного фильтра продуктами сгорания и износа",
            "Снижение пропускной способности воздушного фильтра двигателя (увеличение расхода топлива)",
            "Запыление салонного фильтра (запотевание стекол и неприятный запах в салоне)",
        ],
        "safety_warning": "Превышение интервала замены масла свыше 15 000 км ускоряет закоксовывание поршневых колец и износ вкладышей коленвала.",
        "steps": [
            "Проверьте уровень моторного масла на щупе на ровной поверхности на остывшем двигателе.",
            "Оцените цвет и прозрачность масла: густой смолистый осадок требует немедленной замены.",
            "Осмотрите корпус воздушного фильтра на предмет скопления листвы и дорожной пыли.",
            "Проверьте состояние салонного фильтра за перчаточным ящиком.",
        ],
        "repair_time": "1 час",
        "difficulty": "easy",
        "part_reason": "Расходные материалы для планового обслуживания двигателя и систем фильтрации.",
        "advice": "Для условий Таджикистана с высокими летними температурами и запыленностью рекомендуется менять моторное масло каждые 7 000 - 8 000 км пробега.",
    },
]


def _match_diagnostic_rule(symptom_text: str) -> dict[str, Any]:
    text_norm = symptom_text.lower()
    best_rule = None
    best_score = 0

    for rule in DIAGNOSTIC_RULES:
        score = 0
        for kw in rule["keywords"]:
            if kw in text_norm:
                score += 1
        if score > best_score:
            best_score = score
            best_rule = rule

    if best_rule and best_score > 0:
        return best_rule

    # Default fallback rule if no exact match is found
    return {
        "category_slugs": ["brake-system", "suspension", "engine", "filters"],
        "keywords": [],
        "system_affected": "Комплексная диагностика узлов",
        "primary_diagnosis": "Требуется углубленный инструментальный осмотр на автосервисе",
        "urgency": "medium",
        "can_drive": True,
        "causes": [
            "Скрытая неисправность механического узла, требующая визуального осмотра на подъемнике",
            "Естественный эксплуатационный износ компонентов ходовой части или навесного оборудования",
            "Электронная ошибка датчика, требующая считывания диагностическим сканером",
        ],
        "safety_warning": "При возникновении посторонних звуков или нестабильного поведения автомобиля соблюдайте повышенную осторожность и снизьте скорость движения.",
        "steps": [
            "Зафиксируйте точные условия проявления проблемы (скорость, температура, угол поворота руля).",
            "Осмотрите подкапотное пространство на предмет подтеков технических жидкостей.",
            "Проверьте давление в шинах и затяжку колесных болтов.",
            "Обратитесь на специализированную станцию технического обслуживания для диагностики.",
        ],
        "repair_time": "1-3 часа",
        "difficulty": "medium",
        "part_reason": "Сертифицированные детали с гарантией для устранения выявленных дефектов.",
        "advice": "Используйте поиск по каталогу по VIN-номеру или выберите ваш автомобиль в Гараже для точного подбора деталей со 100% гарантией совместимости.",
    }


def _resolve_vehicle(
    db: Session,
    request: AiDiagnosticRequest,
) -> tuple[Any | None, str | None]:
    """Resolves vehicle information into a duck-typed vehicle object and a formatted title."""
    if request.vehicle_id:
        uv = db.get(UserVehicle, request.vehicle_id)
        if uv:
            parts = [uv.name]
            if uv.make:
                parts.append(uv.make.name)
            if uv.model:
                parts.append(uv.model.name)
            if uv.year:
                parts.append(f"({uv.year})")
            return uv, " ".join(parts)

    if request.make_id:
        make = db.get(VehicleMake, request.make_id)
        model = db.get(VehicleModel, request.model_id) if request.model_id else None
        title_parts = []
        if make:
            title_parts.append(make.name)
        if model:
            title_parts.append(model.name)
        if request.year:
            title_parts.append(f"({request.year})")

        dummy_vehicle = SimpleNamespace(
            make_id=request.make_id,
            model_id=request.model_id,
            generation_id=request.generation_id,
            modification_id=request.modification_id,
            engine_id=request.engine_id,
            year=request.year,
        )
        return dummy_vehicle, " ".join(title_parts) if title_parts else None

    return None, None


def _find_recommended_products(
    db: Session,
    category_slugs: list[str],
    vehicle_obj: Any | None,
    limit: int = 4,
) -> list[RecommendedProduct]:
    """Searches real products in DB matching category slugs, computes vehicle fitment,

    and returns RecommendedProduct list with honest stock and prices in TJS.
    """
    categories = list(
        db.scalars(select(Category).where(Category.slug.in_(category_slugs)))
    )
    if not categories:
        # Fallback to any active products if categories are missing
        categories = list(db.scalars(select(Category).limit(3)))

    cat_ids = [c.id for c in categories]
    cat_by_id = {c.id: c for c in categories}

    query = (
        select(Product)
        .options(
            selectinload(Product.brand),
            selectinload(Product.category),
            selectinload(Product.images),
        )
        .where(
            Product.status == ProductStatus.ACTIVE,
            Product.category_id.in_(cat_ids),
        )
        .order_by(Product.stock_quantity.desc(), Product.rating_avg.desc())
        .limit(20)
    )

    products = list(db.scalars(query))
    if not products:
        # Fallback to general active products if category is empty
        products = list(
            db.scalars(
                select(Product)
                .options(
                    selectinload(Product.brand),
                    selectinload(Product.category),
                    selectinload(Product.images),
                )
                .where(Product.status == ProductStatus.ACTIVE)
                .limit(limit)
            )
        )

    results: list[RecommendedProduct] = []

    for prod in products:
        # Compute fitment status
        if vehicle_obj is not None:
            fit_status = compute_fitment(db, prod.id, vehicle_obj).value
        else:
            fit_status = FitmentStatus.UNKNOWN.value

        # Formulate human reason
        cat = cat_by_id.get(prod.category_id, prod.category)
        cat_name = cat.name if cat else "Автозапчасти"
        cat_slug = cat.slug if cat else "general"

        if fit_status == "compatible":
            reason = f"Гарантированная совместимость с вашим автомобилем · {prod.brand.name if prod.brand else ''}"
        elif fit_status == "not_compatible":
            reason = f"Аналогичный компонент из категории {cat_name} (требует проверки совместимости)"
        else:
            reason = f"Рекомендованная деталь узла ({cat_name}) · {prod.brand.name if prod.brand else ''}"

        img_url = prod.images[0].url if prod.images else None

        results.append(
            RecommendedProduct(
                id=prod.id,
                name=prod.name,
                slug=prod.slug,
                sku=prod.sku,
                price=prod.price,
                old_price=prod.old_price,
                stock_quantity=prod.stock_quantity,
                rating_avg=prod.rating_avg,
                brand_name=prod.brand.name if prod.brand else "Оригинал",
                category_name=cat_name,
                category_slug=cat_slug,
                image_url=img_url,
                fitment_status=fit_status,
                relevance_reason=reason,
            )
        )

    # Sort results: compatible products first, then in-stock
    results.sort(
        key=lambda p: (
            0 if p.fitment_status == "compatible" else 1,
            0 if p.stock_quantity > 0 else 1,
        )
    )

    return results[:limit]


async def run_ai_diagnostic(
    db: Session,
    request: AiDiagnosticRequest,
) -> AiDiagnosticResponse:
    """Core diagnostic service. Combines automotive knowledge rule engine with

    real database product recommendations and optional LLM context refinement.
    """
    rule = _match_diagnostic_rule(request.symptom)
    vehicle_obj, vehicle_summary = _resolve_vehicle(db, request)

    recommended_products = _find_recommended_products(
        db=db,
        category_slugs=rule["category_slugs"],
        vehicle_obj=vehicle_obj,
        limit=4,
    )

    confidence = 0.94 if rule["keywords"] else 0.70

    advice = rule["advice"]
    if vehicle_summary:
        advice = f"Диагностировано для автомобиля {vehicle_summary}. " + advice

    return AiDiagnosticResponse(
        query_symptom=request.symptom,
        vehicle_summary=vehicle_summary,
        system_affected=rule["system_affected"],
        urgency=rule["urgency"],
        primary_diagnosis=rule["primary_diagnosis"],
        confidence_score=confidence,
        possible_causes=rule["causes"],
        safety_warning=rule.get("safety_warning"),
        can_drive=rule["can_drive"],
        diagnostic_steps=rule["steps"],
        estimated_repair_time=rule["repair_time"],
        difficulty=rule["difficulty"],
        recommended_products=recommended_products,
        advice=advice,
        is_ai_enhanced=False,
    )

