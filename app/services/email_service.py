"""
Email Service using SendGrid
Handles user notifications, password resets, etc.
"""

import sendgrid
from sendgrid.helpers.mail import Mail, Email, To, Content
from app.config import get_settings
import logging
from typing import List, Optional

logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        self.settings = get_settings()
        self.sg = sendgrid.SendGridAPIClient(
            self.settings.SENDGRID_API_KEY
        )
    
    async def send_verification_email(
        self,
        to_email: str,
        verification_link: str,
        user_name: str
    ) -> bool:
        """Send email verification link"""
        try:
            mail = Mail(
                from_email=Email('noreply@mithasglow.com', 'Mithas Glow'),
                to_emails=To(to_email),
                subject='Verify Your Email - Mithas Glow',
                html_content=f"""
                <h2>Welcome to Mithas Glow!</h2>
                <p>Hi {user_name},</p>
                <p>Click the link below to verify your email:</p>
                <a href="{verification_link}">Verify Email</a>
                <p>This link expires in 24 hours.</p>
                """
            )
            self.sg.send(mail)
            logger.info(f"Verification email sent to {to_email}")
            return True
        except Exception as e:
            logger.error(f"Failed to send verification email: {e}")
            return False
    
    async def send_password_reset_email(
        self,
        to_email: str,
        reset_link: str,
        user_name: str
    ) -> bool:
        """Send password reset link"""
        try:
            mail = Mail(
                from_email=Email('noreply@mithasglow.com', 'Mithas Glow'),
                to_emails=To(to_email),
                subject='Reset Your Password - Mithas Glow',
                html_content=f"""
                <h2>Password Reset Request</h2>
                <p>Hi {user_name},</p>
                <p>Click the link below to reset your password:</p>
                <a href="{reset_link}">Reset Password</a>
                <p>This link expires in 1 hour.</p>
                <p>If you didn't request this, ignore this email.</p>
                """
            )
            self.sg.send(mail)
            logger.info(f"Password reset email sent to {to_email}")
            return True
        except Exception as e:
            logger.error(f"Failed to send password reset email: {e}")
            return False
    
    async def send_order_confirmation(
        self,
        to_email: str,
        order_id: str,
        order_total: float,
        items_count: int
    ) -> bool:
        """Send order confirmation email"""
        try:
            mail = Mail(
                from_email=Email('orders@mithasglow.com', 'Mithas Glow Orders'),
                to_emails=To(to_email),
                subject=f'Order Confirmation #{order_id} - Mithas Glow',
                html_content=f"""
                <h2>Order Confirmed!</h2>
                <p>Thank you for your order.</p>
                <p><strong>Order ID:</strong> {order_id}</p>
                <p><strong>Items:</strong> {items_count}</p>
                <p><strong>Total:</strong> ₹{order_total:.2f}</p>
                <p>You'll receive tracking information soon.</p>
                """
            )
            self.sg.send(mail)
            logger.info(f"Order confirmation sent to {to_email}")
            return True
        except Exception as e:
            logger.error(f"Failed to send order email: {e}")
            return False
    
    async def send_bulk_notification(
        self,
        to_emails: List[str],
        subject: str,
        html_content: str
    ) -> bool:
        """Send bulk notification emails"""
        try:
            for email in to_emails:
                mail = Mail(
                    from_email=Email('notify@mithasglow.com', 'Mithas Glow'),
                    to_emails=To(email),
                    subject=subject,
                    html_content=html_content
                )
                self.sg.send(mail)
            logger.info(f"Bulk notification sent to {len(to_emails)} users")
            return True
        except Exception as e:
            logger.error(f"Failed to send bulk emails: {e}")
            return False

# Singleton instance
_email_service: Optional[EmailService] = None

def get_email_service() -> EmailService:
    """Get or create email service instance"""
    global _email_service
    if _email_service is None:
        _email_service = EmailService()
    return _email_service
