"""Create catalog and vehicle fitment tables.

Revision ID: 20261020_0002
Revises: 20261014_0001
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20261020_0002"
down_revision: str | None = "20261014_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "categories",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("parent_id", sa.Uuid(), nullable=True),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("slug", sa.String(length=220), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("meta_title", sa.String(length=200), nullable=True),
        sa.Column("meta_description", sa.String(length=500), nullable=True),
        sa.Column("icon", sa.String(length=100), nullable=True),
        sa.Column("image_url", sa.String(length=500), nullable=True),
        sa.Column("position", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["parent_id"], ["categories.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug", name="uq_category_slug"),
    )
    op.create_index("ix_categories_parent_id", "categories", ["parent_id"])
    op.create_index("ix_categories_is_active", "categories", ["is_active"])

    op.create_table(
        "brands",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("slug", sa.String(length=220), nullable=False),
        sa.Column("country", sa.String(length=100), nullable=True),
        sa.Column("logo_url", sa.String(length=500), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug", name="uq_brand_slug"),
    )
    op.create_index("ix_brands_is_active", "brands", ["is_active"])

    op.create_table(
        "products",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("sku", sa.String(length=64), nullable=False),
        sa.Column("slug", sa.String(length=250), nullable=False),
        sa.Column("name", sa.String(length=300), nullable=False),
        sa.Column("brand_id", sa.Uuid(), nullable=False),
        sa.Column("category_id", sa.Uuid(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("short_description", sa.String(length=500), nullable=True),
        sa.Column("price", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("old_price", sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column("stock_quantity", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column(
            "status",
            sa.Enum("DRAFT", "ACTIVE", "ARCHIVED", name="product_status", native_enum=False, create_constraint=True),
            nullable=False,
        ),
        sa.Column("warranty_months", sa.Integer(), nullable=True),
        sa.Column("weight_kg", sa.Numeric(precision=8, scale=3), nullable=True),
        sa.Column("length_mm", sa.Integer(), nullable=True),
        sa.Column("width_mm", sa.Integer(), nullable=True),
        sa.Column("height_mm", sa.Integer(), nullable=True),
        sa.Column("country_of_origin", sa.String(length=100), nullable=True),
        sa.Column("meta_title", sa.String(length=200), nullable=True),
        sa.Column("meta_description", sa.String(length=500), nullable=True),
        sa.Column("rating_avg", sa.Numeric(precision=3, scale=2), server_default=sa.text("0"), nullable=False),
        sa.Column("rating_count", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("views_count", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["brand_id"], ["brands.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["category_id"], ["categories.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("sku", name="uq_product_sku"),
        sa.UniqueConstraint("slug", name="uq_product_slug"),
    )
    op.create_index("ix_products_brand_id", "products", ["brand_id"])
    op.create_index("ix_products_category_id", "products", ["category_id"])
    op.create_index("ix_products_status", "products", ["status"])
    op.create_index("ix_products_price", "products", ["price"])
    op.create_index("ix_products_created_at", "products", ["created_at"])

    op.create_table(
        "product_images",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("product_id", sa.Uuid(), nullable=False),
        sa.Column("url", sa.String(length=500), nullable=False),
        sa.Column("alt", sa.String(length=300), nullable=True),
        sa.Column("position", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("is_primary", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_product_images_product_id", "product_images", ["product_id"])

    op.create_table(
        "product_specifications",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("product_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("value", sa.String(length=500), nullable=False),
        sa.Column("unit", sa.String(length=50), nullable=True),
        sa.Column("position", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("product_id", "name", name="uq_product_spec_name"),
    )
    op.create_index("ix_product_specifications_product_id", "product_specifications", ["product_id"])

    op.create_table(
        "oem_numbers",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("product_id", sa.Uuid(), nullable=False),
        sa.Column("number", sa.String(length=64), nullable=False),
        sa.Column("manufacturer", sa.String(length=200), nullable=True),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("product_id", "number", name="uq_oem_product_number"),
    )
    op.create_index("ix_oem_numbers_number", "oem_numbers", ["number"])

    op.create_table(
        "product_cross_references",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("product_id", sa.Uuid(), nullable=False),
        sa.Column("number", sa.String(length=64), nullable=False),
        sa.Column("brand_name", sa.String(length=200), nullable=True),
        sa.Column("note", sa.String(length=500), nullable=True),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("product_id", "number", name="uq_cross_product_number"),
    )
    op.create_index("ix_product_cross_references_number", "product_cross_references", ["number"])

    op.create_table(
        "vehicle_makes",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("slug", sa.String(length=120), nullable=False),
        sa.Column("country", sa.String(length=100), nullable=True),
        sa.Column("logo_url", sa.String(length=500), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug", name="uq_vehicle_make_slug"),
    )
    op.create_index("ix_vehicle_makes_is_active", "vehicle_makes", ["is_active"])

    op.create_table(
        "vehicle_models",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("make_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("slug", sa.String(length=120), nullable=False),
        sa.Column("category", sa.String(length=100), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.ForeignKeyConstraint(["make_id"], ["vehicle_makes.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("make_id", "slug", name="uq_vehicle_model_slug"),
    )
    op.create_index("ix_vehicle_models_make_id", "vehicle_models", ["make_id"])
    op.create_index("ix_vehicle_models_is_active", "vehicle_models", ["is_active"])

    op.create_table(
        "vehicle_generations",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("model_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("body_code", sa.String(length=50), nullable=True),
        sa.Column("year_from", sa.Integer(), nullable=True),
        sa.Column("year_to", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["model_id"], ["vehicle_models.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("model_id", "name", name="uq_vehicle_generation_name"),
    )
    op.create_index("ix_vehicle_generations_model_id", "vehicle_generations", ["model_id"])

    op.create_table(
        "vehicle_modifications",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("generation_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("year_from", sa.Integer(), nullable=True),
        sa.Column("year_to", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["generation_id"], ["vehicle_generations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("generation_id", "name", name="uq_vehicle_modification_name"),
    )
    op.create_index("ix_vehicle_modifications_generation_id", "vehicle_modifications", ["generation_id"])

    op.create_table(
        "engines",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("modification_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("displacement_l", sa.Numeric(precision=4, scale=1), nullable=True),
        sa.Column("power_hp", sa.Integer(), nullable=True),
        sa.Column("fuel_type", sa.String(length=50), nullable=True),
        sa.ForeignKeyConstraint(["modification_id"], ["vehicle_modifications.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("modification_id", "name", name="uq_engine_name"),
    )
    op.create_index("ix_engines_modification_id", "engines", ["modification_id"])

    op.create_table(
        "product_compatibilities",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("product_id", sa.Uuid(), nullable=False),
        sa.Column("make_id", sa.Uuid(), nullable=False),
        sa.Column("model_id", sa.Uuid(), nullable=True),
        sa.Column("generation_id", sa.Uuid(), nullable=True),
        sa.Column("modification_id", sa.Uuid(), nullable=True),
        sa.Column("engine_id", sa.Uuid(), nullable=True),
        sa.Column("year_from", sa.Integer(), nullable=True),
        sa.Column("year_to", sa.Integer(), nullable=True),
        sa.Column("note", sa.String(length=500), nullable=True),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["make_id"], ["vehicle_makes.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["model_id"], ["vehicle_models.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["generation_id"], ["vehicle_generations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["modification_id"], ["vehicle_modifications.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["engine_id"], ["engines.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_product_compatibilities_product_id", "product_compatibilities", ["product_id"])
    op.create_index("ix_product_compatibilities_make_id", "product_compatibilities", ["make_id"])
    op.create_index("ix_product_compatibilities_model_id", "product_compatibilities", ["model_id"])

    op.create_table(
        "user_vehicles",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("make_id", sa.Uuid(), nullable=False),
        sa.Column("model_id", sa.Uuid(), nullable=True),
        sa.Column("generation_id", sa.Uuid(), nullable=True),
        sa.Column("modification_id", sa.Uuid(), nullable=True),
        sa.Column("engine_id", sa.Uuid(), nullable=True),
        sa.Column("year", sa.Integer(), nullable=True),
        sa.Column("vin", sa.String(length=17), nullable=True),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("is_primary", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["make_id"], ["vehicle_makes.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["model_id"], ["vehicle_models.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["generation_id"], ["vehicle_generations.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["modification_id"], ["vehicle_modifications.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["engine_id"], ["engines.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "name", name="uq_user_vehicle_name"),
    )
    op.create_index("ix_user_vehicles_user_id", "user_vehicles", ["user_id"])

    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
        op.execute(
            "ALTER TABLE products ADD COLUMN search_vector tsvector GENERATED ALWAYS AS ("
            " setweight(to_tsvector('simple', coalesce(name, '')), 'A') ||"
            " setweight(to_tsvector('simple', coalesce(sku, '')), 'A') ||"
            " setweight(to_tsvector('simple', coalesce(description, '')), 'C')"
            ") STORED"
        )
        op.execute("CREATE INDEX ix_products_search_vector ON products USING GIN (search_vector)")
        op.execute("CREATE INDEX ix_products_name_trgm ON products USING GIN (name gin_trgm_ops)")
        op.execute("CREATE INDEX ix_products_sku_trgm ON products USING GIN (sku gin_trgm_ops)")


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("DROP INDEX IF EXISTS ix_products_sku_trgm")
        op.execute("DROP INDEX IF EXISTS ix_products_name_trgm")
        op.execute("DROP INDEX IF EXISTS ix_products_search_vector")
        op.execute("ALTER TABLE products DROP COLUMN IF EXISTS search_vector")
    op.drop_table("user_vehicles")
    op.drop_table("product_compatibilities")
    op.drop_table("engines")
    op.drop_table("vehicle_modifications")
    op.drop_table("vehicle_generations")
    op.drop_table("vehicle_models")
    op.drop_table("vehicle_makes")
    op.drop_table("product_cross_references")
    op.drop_table("oem_numbers")
    op.drop_table("product_specifications")
    op.drop_table("product_images")
    op.drop_table("products")
    op.drop_table("brands")
    op.drop_table("categories")
