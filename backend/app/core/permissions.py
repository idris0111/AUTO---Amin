"""Role -> permission mapping (single source of truth for RBAC).

Permissions are checked on the backend by ``app.dependencies.require_permission``;
the list is also exposed to the frontend via ``UserRead.permissions`` so the UI can
hide sections the user cannot use (the backend still enforces every check).
"""

import enum

from app.models.user import UserRole


class Permission(str, enum.Enum):
    MANAGE_CATALOG = "manage_catalog"
    VIEW_ORDERS = "view_orders"
    MANAGE_ORDERS = "manage_orders"
    MANAGE_INVENTORY = "manage_inventory"
    MANAGE_PROMOTIONS = "manage_promotions"
    MANAGE_REVIEWS = "manage_reviews"
    MANAGE_USERS = "manage_users"
    MANAGE_STAFF_ROLES = "manage_staff_roles"
    VIEW_STATISTICS = "view_statistics"
    MANAGE_SUPPORT = "manage_support"
    MANAGE_CONTENT = "manage_content"


ROLE_PERMISSIONS: dict[UserRole, frozenset[Permission]] = {
    UserRole.CUSTOMER: frozenset(),
    UserRole.SUPPORT: frozenset({Permission.VIEW_ORDERS, Permission.MANAGE_REVIEWS, Permission.MANAGE_SUPPORT}),
    UserRole.CONTENT_MANAGER: frozenset({Permission.MANAGE_CATALOG, Permission.MANAGE_REVIEWS, Permission.MANAGE_CONTENT}),
    UserRole.WAREHOUSE_MANAGER: frozenset({Permission.MANAGE_INVENTORY, Permission.VIEW_ORDERS}),
    UserRole.ORDER_MANAGER: frozenset(
        {Permission.VIEW_ORDERS, Permission.MANAGE_ORDERS, Permission.VIEW_STATISTICS, Permission.MANAGE_SUPPORT}
    ),
    # Legacy generic manager role kept for existing accounts.
    UserRole.MANAGER: frozenset(
        {
            Permission.MANAGE_CATALOG,
            Permission.VIEW_ORDERS,
            Permission.MANAGE_ORDERS,
            Permission.MANAGE_INVENTORY,
            Permission.MANAGE_PROMOTIONS,
            Permission.MANAGE_REVIEWS,
            Permission.VIEW_STATISTICS,
            Permission.MANAGE_SUPPORT,
            Permission.MANAGE_CONTENT,
        }
    ),
    UserRole.ADMIN: frozenset(set(Permission) - {Permission.MANAGE_STAFF_ROLES}),
    UserRole.SUPER_ADMIN: frozenset(Permission),
}

# Roles that only a holder of MANAGE_STAFF_ROLES (super admin) may grant or revoke.
PRIVILEGED_ROLES = frozenset({UserRole.ADMIN, UserRole.SUPER_ADMIN})


def permissions_for(role: UserRole) -> frozenset[Permission]:
    return ROLE_PERMISSIONS.get(role, frozenset())


def is_staff(role: UserRole) -> bool:
    return bool(permissions_for(role))

