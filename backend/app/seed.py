"""Idempotent demo catalog seed for local development.

Run: python -m app.seed
"""
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.database import SessionLocal
from app.models.catalog import Brand, Category, OEMNumber, Product, ProductImage, ProductSpecification, ProductStatus
from app.models.user import User, UserRole
from app.models.vehicle import (
    ProductCompatibility,
    VehicleGeneration,
    VehicleMake,
    VehicleModel,
    VehicleModification,
)

IMAGES = {
    "brakes": "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3",
    "engine": "https://images.unsplash.com/photo-1487754180451-c456f719a1fc",
    "filter": "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e",
    "wheel": "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d",
    "electric": "https://images.unsplash.com/photo-1580273916550-e323be2ae537",
    "oil": "https://images.unsplash.com/photo-1607860108855-64acf2078ed9",
}


def img(key: str) -> str:
    return f"{IMAGES[key]}?auto=format&fit=crop&w=900&q=80"


def seed_shipping_zones(db: Session) -> None:
    from decimal import Decimal

    from app.models.shipping import ShippingZone

    zones = [
        ("Душанбе", "Душанбе", Decimal("30.00"), Decimal("1000.00"), 1, 2),
        ("Худжанд", "Согдийская область", Decimal("50.00"), Decimal("1500.00"), 2, 3),
        ("Боктар", "Хатлон", Decimal("50.00"), None, 2, 4),
        ("Куляб", "Хатлон", Decimal("55.00"), None, 2, 4),
        ("Хорог", "Горно-Бадахшан", Decimal("80.00"), None, 3, 7),
        ("Пенджикент", "Согдийская область", Decimal("55.00"), None, 2, 4),
    ]
    for city, region, fee, free_from, eta_min, eta_max in zones:
        exists = db.scalar(select(ShippingZone).where(ShippingZone.city == city))
        if exists:
            continue
        db.add(
            ShippingZone(
                city=city, region=region, fee=fee, free_from=free_from, eta_days_min=eta_min, eta_days_max=eta_max
            )
        )
    db.commit()


def seed() -> None:
    with SessionLocal() as db:
        if db.scalar(select(Brand).limit(1)) is not None:
            seed_shipping_zones(db)
            print("Catalog already seeded, skipping")
            return

        categories: dict[str, Category] = {}
        for name, slug, description in [
            ("Тормозная система", "brake-system", "Колодки, диски, суппорты, шланги"),
            ("Двигатель", "engine", "Поршни, прокладки, ремни, цепи"),
            ("Фильтры", "filters", "Масляные, воздушные, топливные, салонные"),
            ("Подвеска и рулевое", "suspension", "Амортизаторы, рычаги, сайлентблоки"),
            ("Электрика", "electronics", "Свечи, датчики, аккумуляторы"),
            ("Масла и жидкости", "oils", "Моторные масла, антифриз, тормозная жидкость"),
        ]:
            category = Category(name=name, slug=slug, description=description, position=len(categories))
            db.add(category)
            categories[slug] = category
        db.flush()

        brands: dict[str, Brand] = {}
        for name, slug, country in [
            ("Bosch", "bosch", "Германия"),
            ("Mann-Filter", "mann-filter", "Германия"),
            ("Brembo", "brembo", "Италия"),
            ("Sachs", "sachs", "Германия"),
            ("Lemförder", "lemforder", "Германия"),
            ("NGK", "ngk", "Япония"),
            ("Castrol", "castrol", "Великобритания"),
            ("Valeo", "valeo", "Франция"),
        ]:
            brand = Brand(name=name, slug=slug, country=country)
            db.add(brand)
            brands[slug] = brand
        db.flush()

        def product(
            *, name: str, sku: str, slug: str, brand: str, category: str, price: str,
            old_price: str | None, stock: int, description: str, image: str,
            specs: list[tuple[str, str]], oem: str | None = None, cross: str | None = None,
            warranty: int | None = 24,
        ) -> Product:
            item = Product(
                name=name, sku=sku, slug=slug, brand_id=brands[brand].id,
                category_id=categories[category].id, price=Decimal(price),
                old_price=Decimal(old_price) if old_price else None,
                stock_quantity=stock, status=ProductStatus.ACTIVE,
                description=description, warranty_months=warranty,
            )
            item.images.append(ProductImage(url=image, alt=name, is_primary=True, position=0))
            for position, (spec_name, spec_value) in enumerate(specs):
                item.specifications.append(ProductSpecification(name=spec_name, value=spec_value, position=position))
            if oem:
                item.oem_numbers.append(OEMNumber(number=oem))
            if cross:
                from app.models.catalog import ProductCrossReference

                item.cross_references.append(ProductCrossReference(number=cross, brand_name="Аналог"))
            db.add(item)
            return item

        products = [
            product(
                name="Колодки тормозные передние Brembo P 85 116",
                sku="BR-P85116", slug="brembo-p-85-116-front-pads", brand="brembo",
                category="brake-system", price="640.00", old_price="790.00", stock=18,
                description="Комплект передних тормозных колодок Brembo с датчиком износа. Металлокерамический состав, стабильное трение в широком диапазоне температур, низкая пылеобразование.",
                image=img("brakes"),
                specs=[["Ось", "Передняя"], ["Тип фрикциона", "Металлокерамика"], ["Комплект", "4 колодки"]],
                oem="04465-33471", cross="P85116",
            ),
            product(
                name="Диски тормозные передние вентилируемые Brembo 09.C394.11",
                sku="BR-09C39411", slug="brembo-09-c394-11-front-discs", brand="brembo",
                category="brake-system", price="1180.00", old_price="1390.00", stock=8,
                description="Вентилируемые тормозные диски диаметром 296 мм. Покрытие антикоррозийным составом, балансировка для снижения вибраций.",
                image=img("wheel"),
                specs=[["Диаметр", "296 мм"], ["Толщина", "28 мм"], ["Тип", "Вентилируемые"]],
                oem="43512-0K080",
            ),
            product(
                name="Фильтр масляный MANN-FILTER W 712/95",
                sku="MFL-W71295", slug="mann-w-712-95-oil-filter", brand="mann-filter",
                category="filters", price="45.00", old_price=None, stock=64,
                description="Масляный фильтр MANN-FILTER с противодренажным клапаном и надёжной шайбой уплотнения. Обеспечивает полную фильтрацию при холодном пуске.",
                image=img("filter"),
                specs=[["Тип", "Масляный"], ["Резьба", "3/4-16 UNF"], ["Диаметр", "93 мм"]],
                oem="15208-65F0A",
            ),
            product(
                name="Фильтр воздушный MANN-FILTER C 24 164",
                sku="MFL-C24164", slug="mann-c-24-164-air-filter", brand="mann-filter",
                category="filters", price="98.00", old_price="120.00", stock=41,
                description="Воздушный фильтр высокой производительности. Панельный элемент с прочным корпусом, стабильная пропускная способность на весь срок службы.",
                image=img("filter"),
                specs=[["Тип", "Воздушный"], ["Форма", "Панельный"], ["Высота", "67 мм"]],
                oem="28113-3X000",
            ),
            product(
                name="Свечи зажигания NGK BKR6EIX-11 (4 шт.)",
                sku="NGK-BKR6EIX11", slug="ngk-bkr6eix-11-plug-set", brand="ngk",
                category="electronics", price="320.00", old_price=None, stock=30,
                description="Иридиевые свечи зажигания NGK. Стабильное искрообразование, увеличенный ресурс до 60 000 км, лёгкий запуск двигателя.",
                image=img("electric"),
                specs=[["Тип", "Иридий"], ["Зазор", "1.1 мм"], ["Количество", "4 шт."]],
                oem="12290-5M000", cross="ILZKBR7B11",
            ),
            product(
                name="Амортизатор передний Sachs 315 042",
                sku="SCH-315042", slug="sachs-315-042-front-shock", brand="sachs",
                category="suspension", price="890.00", old_price="1050.00", stock=12,
                description="Газомасляный амортизатор Sachs для комфортной и устойчивой езды. Заводская калибровка под штатную подвеску.",
                image=img("wheel"),
                specs=[["Тип", "Газомасляный"], ["Ось", "Передняя"], ["Сторона", "Универсальная"]],
                oem="55310-2S000",
            ),
            product(
                name="Рулевая тяга Lemförder 33527 01",
                sku="LMF-3352701", slug="lemforder-33527-01-tie-rod", brand="lemforder",
                category="suspension", price="265.00", old_price=None, stock=25,
                description="Рулевая тяга Lemförder с шаровым пальцом. Высокопрочная кованая конструкция, защитный пыльник из натурального каучука.",
                image=img("engine"),
                specs=[["Сторона", "Правая"], ["Резьба", "M14x1.5"], ["Длина", "348 мм"]],
                oem="56826-1K000",
            ),
            product(
                name="Масло моторное Castrol Edge 5W-30 LL, 4 л",
                sku="CST-EDGE5W30-4", slug="castrol-edge-5w-30-4l", brand="castrol",
                category="oils", price="275.00", old_price="320.00", stock=50,
                description="Синтетическое моторное масло Castrol Edge с технологией Fluid TTI. Снижение износа, стабильное давление масла при высоких нагрузках.",
                image=img("oil"),
                specs=[["Вязкость", "5W-30"], ["Объём", "4 л"], ["Спецификация", "ACEA C3 / API SN"]],
                warranty=None,
            ),
            product(
                name="Аккумулятор Bosch S4 60 А·ч, 540 A",
                sku="BSH-S4-60AH", slug="bosch-s4-60ah-battery", brand="bosch",
                category="electronics", price="740.00", old_price=None, stock=9,
                description="Необслуживаемый аккумулятор Bosch S4 с усиленной конструкцией решётки. Надёжный пуск при низких температурах, двойная защита от коррозии.",
                image=img("electric"),
                specs=[["Ёмкость", "60 А·ч"], ["Пусковой ток", "540 A"], ["Полярность", "Обратная"]],
                warranty=24,
            ),
            product(
                name="Прокладка головки блока цилиндров Victor Reinz 61-41065-00",
                sku="VRN-614106500", slug="victor-reinz-61-41065-00-gasket", brand="valeo",
                category="engine", price="410.00", old_price="490.00", stock=14,
                description="Комплект прокладок ГБЦ Victor Reinz. Термостойкие материалы, точная геометрия посадочных мест, устойчивость к химическим средам.",
                image=img("engine"),
                specs=[["Материал", "Металлокомпозит"], ["Комплект", "Полный"], ["Цилиндров", "4"]],
                oem="11115-17010",
            ),
            product(
                name="Ремень ГРМ Gates PowerGrip 5631XS",
                sku="GAT-5631XS", slug="gates-5631xs-timing-belt", brand="sachs",
                category="engine", price="355.00", old_price=None, stock=22,
                description="Ремень привода ГРМ Gates с низким уровнем шума и высокой износостойкостью. Армированный нейлоновый корд, фторкаучуковое покрытие.",
                image=img("engine"),
                specs=[["Длина", "1262 мм"], ["Ширина", "25 мм"], ["Зубья", "139"]],
                oem="13568-19050",
            ),
            product(
                name="Колодки тормозные задние Brembo P 85 076",
                sku="BR-P85076", slug="brembo-p-85-076-rear-pads", brand="brembo",
                category="brake-system", price="520.00", old_price=None, stock=0,
                description="Задние тормозные колодки Brembo для дисковых тормозных систем. Ровное прилегание, минимальная остаточная вибрация.",
                image=img("brakes"),
                specs=[["Ось", "Задняя"], ["Тип фрикциона", "Полуорганика"], ["Комплект", "4 колодки"]],
                oem="04466-0K210",
            ),
        ]

        makes: dict[str, VehicleMake] = {}
        for name, slug, country in [
            ("Toyota", "toyota", "Япония"),
            ("Nissan", "nissan", "Япония"),
            ("Hyundai", "hyundai", "Республика Корея"),
            ("Chevrolet", "chevrolet", "США"),
            ("Mercedes-Benz", "mercedes-benz", "Германия"),
            ("Lexus", "lexus", "Япония"),
        ]:
            make = VehicleMake(name=name, slug=slug, country=country)
            db.add(make)
            makes[slug] = make
        db.flush()

        def vehicle(make: str, model_name: str, model_slug: str, gen_name: str, year_from: int, year_to: int) -> VehicleModel:
            model = VehicleModel(make_id=makes[make].id, name=model_name, slug=model_slug)
            db.add(model)
            db.flush()
            generation = VehicleGeneration(model_id=model.id, name=gen_name, year_from=year_from, year_to=year_to)
            db.add(generation)
            db.flush()
            modification = VehicleModification(generation_id=generation.id, name="Базовая модификация")
            db.add(modification)
            db.flush()
            from app.models.vehicle import Engine

            db.add(Engine(modification_id=modification.id, name="2.0 AT", displacement_l=Decimal("2.0"), power_hp=150, fuel_type="Бензин"))
            return model

        camry = vehicle("toyota", "Camry", "camry", "XV70", 2017, 2024)
        corolla = vehicle("toyota", "Corolla", "corolla", "E210", 2018, 2025)
        qashqai = vehicle("nissan", "Qashqai", "qashqai", "J11", 2014, 2021)
        sonata = vehicle("hyundai", "Sonata", "sonata", "DN8", 2019, 2024)
        malibu = vehicle("chevrolet", "Malibu", "malibu", "G7", 2016, 2023)
        es300h = vehicle("lexus", "ES", "es", "XE30", 2018, 2024)

        compat = [
            (products[0], [camry, corolla]),
            (products[1], [camry]),
            (products[2], [camry, corolla, sonata]),
            (products[3], [qashqai, malibu]),
            (products[4], [camry, corolla, sonata, es300h]),
            (products[5], [sonata, malibu]),
            (products[6], [qashqai, camry]),
            (products[8], [camry, corolla, qashqai, sonata, malibu, es300h]),
        ]
        for product_item, models in compat:
            for model in models:
                db.add(
                    ProductCompatibility(
                        product_id=product_item.id,
                        make_id=model.make_id,
                        model_id=model.id,
                    )
                )

        if not db.scalar(select(User).where(User.email == "admin@autouniverse.tj")):
            db.add(
                User(
                    email="admin@autouniverse.tj",
                    password_hash=hash_password("ChangeMeAdmin123!"),
                    first_name="Store",
                    last_name="Administrator",
                    role=UserRole.ADMIN,
                )
            )

        seed_shipping_zones(db)
        print(f"Seeded {len(products)} products, {len(brands)} brands, {len(categories)} categories")


if __name__ == "__main__":
    seed()
