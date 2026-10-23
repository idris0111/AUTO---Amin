import email.message
import logging
import smtplib
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.commerce import Order, OrderStatus
from app.models.notification import (
    Notification,
    NotificationChannel,
    NotificationPreference,
    NotificationType,
)
from app.models.user import User

logger = logging.getLogger(__name__)

STATUS_RU_LABELS: dict[str, str] = {
    OrderStatus.PENDING.value: "Ожидает обработки",
    OrderStatus.AWAITING_PAYMENT.value: "Ожидает оплаты",
    OrderStatus.CONFIRMED.value: "Подтверждён",
    OrderStatus.PROCESSING.value: "Передан в сборку",
    OrderStatus.PACKED.value: "Упакован",
    OrderStatus.SHIPPED.value: "Передан курьеру / В пути",
    OrderStatus.DELIVERED.value: "Доставлен",
    OrderStatus.COMPLETED.value: "Успешно выполнен",
    OrderStatus.CANCELLED.value: "Отменён",
    OrderStatus.RETURNED.value: "Возвращён на склад",
}


def get_or_create_preferences(db: Session, user_id: uuid.UUID) -> NotificationPreference:
    pref = db.scalar(
        select(NotificationPreference).where(NotificationPreference.user_id == user_id)
    )
    if pref is None:
        pref = NotificationPreference(user_id=user_id)
        db.add(pref)
        db.commit()
        db.refresh(pref)
    return pref


def render_luxury_email_html(
    title: str,
    greeting: str,
    content_html: str,
    action_url: str | None = None,
    action_label: str | None = None,
) -> str:
    """Generates a responsive Stitch Luxury Dark Automotive HTML email."""
    button_html = ""
    if action_url and action_label:
        button_html = f"""
        <div style="margin: 32px 0 24px; text-align: center;">
            <a href="{action_url}" style="background-color: #E32636; color: #FFFFFF; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block; letter-spacing: 0.5px; box-shadow: 0 4px 14px rgba(227, 38, 54, 0.4);">
                {action_label} →
            </a>
        </div>
        """

    return f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0B0D10; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #EDEDED; line-height: 1.6;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0B0D10; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #15191F; border: 1px solid #252B33; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                    <!-- Brand Header -->
                    <tr>
                        <td style="padding: 28px 36px; border-bottom: 1px solid #252B33; background: linear-gradient(180deg, #1A1F26 0%, #15191F 100%);">
                            <table width="100%">
                                <tr>
                                    <td>
                                        <div style="font-size: 20px; font-weight: 900; letter-spacing: 1px; color: #FFFFFF;">
                                            AUTO<span style="color: #E32636;">UNIVERSE</span>
                                        </div>
                                        <div style="font-size: 11px; text-transform: uppercase; color: #8A92A6; letter-spacing: 2px; margin-top: 2px;">
                                            Премиальные автозапчасти в Таджикистане
                                        </div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <!-- Main Body -->
                    <tr>
                        <td style="padding: 36px 36px 28px;">
                            <h1 style="margin: 0 0 16px; font-size: 20px; font-weight: 700; color: #FFFFFF;">{greeting}</h1>
                            <div style="font-size: 14px; color: #B0B7C3; margin-bottom: 24px;">
                                {content_html}
                            </div>
                            {button_html}
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 24px 36px; background-color: #0F1216; border-top: 1px solid #252B33; font-size: 12px; color: #6C727F; text-align: center;">
                            <p style="margin: 0 0 8px;">AutoUniverse — Официальный импортер премиальных автозапчастей в Душанбе и регионах РТ.</p>
                            <p style="margin: 0;">Клиентская поддержка: +992 (90) 000-00-00 · support@autouniverse.tj</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>"""


def send_transactional_email(to_email: str, subject: str, html_body: str) -> bool:
    """Delivers transactional email via SMTP if configured, or logs safely in offline/dev mode."""
    settings = get_settings()
    smtp_enabled = getattr(settings, "smtp_enabled", False)

    if not smtp_enabled:
        logger.info(
            f"[Notification Email] [Offline/Dev] To: {to_email} | Subject: '{subject}'"
        )
        return True

    try:
        msg = email.message.EmailMessage()
        msg["Subject"] = subject
        msg["From"] = getattr(settings, "smtp_from_email", "noreply@autouniverse.tj")
        msg["To"] = to_email
        msg.set_content("Для просмотра этого сообщения требуется почтовый клиент с поддержкой HTML.")
        msg.add_alternative(html_body, subtype="html")

        host = getattr(settings, "smtp_host", "localhost")
        port = getattr(settings, "smtp_port", 587)
        user = getattr(settings, "smtp_user", None)
        pwd = getattr(settings, "smtp_password", None)

        with smtplib.SMTP(host, port, timeout=10) as server:
            server.starttls()
            if user and pwd:
                server.login(user, pwd)
            server.send_message(msg)
        return True
    except Exception as exc:
        logger.warning(f"Failed to deliver SMTP notification to {to_email}: {exc}")
        return False


def create_notification(
    db: Session,
    user_id: uuid.UUID,
    type: NotificationType,
    title: str,
    message: str,
    link: str | None = None,
    data: dict[str, Any] | None = None,
) -> Notification:
    """Saves notification in database and triggers email delivery if user has preference enabled."""
    pref = get_or_create_preferences(db, user_id)

    # 1. In-App notification
    allow_in_app = True
    allow_email = False

    if type in (NotificationType.ORDER_CREATED, NotificationType.ORDER_STATUS_CHANGED):
        allow_in_app = pref.order_updates_in_app
        allow_email = pref.order_updates_email
    elif type == NotificationType.LOYALTY_BONUS:
        allow_in_app = pref.loyalty_in_app
        allow_email = pref.loyalty_email
    elif type == NotificationType.PRICE_ALERT:
        allow_in_app = pref.promotions_in_app
        allow_email = pref.promotions_email

    notif = Notification(
        user_id=user_id,
        type=type,
        channel=NotificationChannel.IN_APP,
        title=title,
        message=message,
        link=link,
        data=data,
        is_read=False,
    )
    if allow_in_app:
        db.add(notif)
        db.commit()
        db.refresh(notif)

    # 2. Email notification
    if allow_email:
        user = db.scalar(select(User).where(User.id == user_id))
        if user and user.email:
            greeting = f"Здравствуйте, {user.first_name}!" if user.first_name else "Здравствуйте!"
            html = render_luxury_email_html(
                title=title,
                greeting=greeting,
                content_html=f"<p>{message}</p>",
                action_url=link,
                action_label="Посмотреть подробнее" if link else None,
            )
            send_transactional_email(to_email=user.email, subject=title, html_body=html)

    return notif


def notify_order_created(db: Session, order: Order) -> None:
    if not order.user_id:
        return

    title = f"Заказ #{order.number} успешно принят"
    message = (
        f"Ваш заказ на сумму {order.total} {order.currency} принят в обработку. "
        f"Способ доставки: {order.shipping_method}. Мы уведомим вас о готовности к отгрузке."
    )
    create_notification(
        db=db,
        user_id=order.user_id,
        type=NotificationType.ORDER_CREATED,
        title=title,
        message=message,
        link=f"/orders/{order.id}",
        data={"order_id": str(order.id), "order_number": order.number, "total": str(order.total)},
    )


def notify_order_status_changed(
    db: Session,
    order: Order,
    old_status: OrderStatus,
    new_status: OrderStatus,
    note: str | None = None,
) -> None:
    if not order.user_id:
        return

    status_name = STATUS_RU_LABELS.get(
        new_status.value if hasattr(new_status, "value") else str(new_status),
        str(new_status),
    )
    title = f"Заказ #{order.number}: {status_name}"
    msg_parts = [f"Статус вашего заказа изменился на: «{status_name}»."]
    if note:
        msg_parts.append(f"Комментарий службы комплектации: {note}")

    create_notification(
        db=db,
        user_id=order.user_id,
        type=NotificationType.ORDER_STATUS_CHANGED,
        title=title,
        message=" ".join(msg_parts),
        link=f"/orders/{order.id}",
        data={
            "order_id": str(order.id),
            "order_number": order.number,
            "old_status": old_status.value if hasattr(old_status, "value") else str(old_status),
            "new_status": new_status.value if hasattr(new_status, "value") else str(new_status),
        },
    )


def notify_loyalty_points(
    db: Session,
    user_id: uuid.UUID,
    amount: int,
    new_balance: int,
    reason: str,
) -> None:
    if amount > 0:
        title = f"Вам начислено +{amount} бонусов"
        message = f"Начисление: {reason}. Ваш текущий баланс: {new_balance} баллов."
    else:
        title = f"Списание бонусов: {amount} баллов"
        message = f"Операция: {reason}. Текущий остаток: {new_balance} баллов."

    create_notification(
        db=db,
        user_id=user_id,
        type=NotificationType.LOYALTY_BONUS,
        title=title,
        message=message,
        link="/profile",
        data={"amount": amount, "new_balance": new_balance, "reason": reason},
    )


def broadcast_notification(
    db: Session,
    title: str,
    message: str,
    link: str | None = None,
    target_role: str | None = None,
) -> int:
    stmt = select(User.id).where(User.is_active == True)
    if target_role:
        stmt = stmt.where(User.role == target_role)

    user_ids = list(db.scalars(stmt))
    count = 0
    now = datetime.now(timezone.utc)
    notifs = []
    for uid in user_ids:
        notifs.append(
            Notification(
                user_id=uid,
                type=NotificationType.SYSTEM,
                channel=NotificationChannel.IN_APP,
                title=title,
                message=message,
                link=link,
                is_read=False,
                created_at=now,
            )
        )
        count += 1

    if notifs:
        db.add_all(notifs)
        db.commit()

    return count

