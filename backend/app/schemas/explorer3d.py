from pydantic import BaseModel, ConfigDict
from app.schemas.catalog import ProductListItem


class AssemblyNodePart(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    node_id: str
    name: str
    description: str
    category_slug: str
    exploded_offset: list[float]  # [x, y, z] direction vector for exploded animation
    matching_product: ProductListItem | None = None


class AssemblySummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    subsystem: str
    description: str
    parts_count: int
    difficulty: str


class AssemblyDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    subsystem: str
    description: str
    nodes: list[AssemblyNodePart]
    camera_initial: dict[str, float]
    vehicle_fitment_summary: str | None = None

