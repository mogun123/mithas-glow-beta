from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import insert
from uuid import UUID
from datetime import datetime

from app.models.notification import Notification

class NotificationService:
    """Service for creating notifications"""
    
    @staticmethod
    async def create_notification(
        db: AsyncSession,
        user_id: UUID,
        title: str,
        message: str,
        notification_type: str,
        related_id: UUID = None
    ) -> Notification:
        """Create a notification for user"""
        notification = Notification(
            user_id=user_id,
            title=title,
            message=message,
            notification_type=notification_type,
            related_id=related_id,
            is_read=False
        )
        db.add(notification)
        await db.commit()
        await db.refresh(notification)
        return notification
    
    @staticmethod
    async def send_order_notification(
        db: AsyncSession,
        user_id: UUID,
        order_id: UUID,
        message: str = "Your order has been confirmed"
    ):
        """Send order notification"""
        return await NotificationService.create_notification(
            db=db,
            user_id=user_id,
            title="Order Confirmation",
            message=message,
            notification_type="order",
            related_id=order_id
        )
    
    @staticmethod
    async def send_booking_notification(
        db: AsyncSession,
        user_id: UUID,
        booking_id: UUID,
        message: str = "Your booking is confirmed"
    ):
        """Send booking notification"""
        return await NotificationService.create_notification(
            db=db,
            user_id=user_id,
            title="Booking Confirmation",
            message=message,
            notification_type="booking",
            related_id=booking_id
        )
    
    @staticmethod
    async def send_message_notification(
        db: AsyncSession,
        user_id: UUID,
        message: str,
        sender_name: str
    ):
        """Send message notification"""
        return await NotificationService.create_notification(
            db=db,
            user_id=user_id,
            title=f"New message from {sender_name}",
            message=message,
            notification_type="message"
        )
