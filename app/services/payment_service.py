"""
Razorpay Payment Integration
Handles payments, refunds, and subscriptions
"""

import razorpay
from app.config import get_settings
import logging
from typing import Optional, Dict
from datetime import datetime

logger = logging.getLogger(__name__)

class PaymentService:
    def __init__(self):
        self.settings = get_settings()
        self.client = razorpay.Client(
            auth=(
                self.settings.RAZORPAY_KEY_ID,
                self.settings.RAZORPAY_KEY_SECRET
            )
        )
    
    async def create_order(
        self,
        amount: float,  # in paise (₹1 = 100 paise)
        currency: str = 'INR',
        user_id: str = None,
        notes: Dict = None
    ) -> dict:
        """Create Razorpay order"""
        try:
            order_data = {
                'amount': int(amount * 100),  # Convert to paise
                'currency': currency,
            }
            
            if notes:
                order_data['notes'] = notes
            
            order = self.client.order.create(data=order_data)
            logger.info(f"Order created: {order['id']}")
            
            return {
                "success": True,
                "order_id": order['id'],
                "amount": order['amount'] / 100,
                "currency": order['currency'],
                "created_at": datetime.fromtimestamp(order['created_at']).isoformat()
            }
        except Exception as e:
            logger.error(f"Failed to create order: {e}")
            raise
    
    async def verify_payment(
        self,
        razorpay_order_id: str,
        razorpay_payment_id: str,
        razorpay_signature: str
    ) -> bool:
        """Verify payment signature"""
        try:
            is_valid = self.client.utility.verify_payment_signature({
                'razorpay_order_id': razorpay_order_id,
                'razorpay_payment_id': razorpay_payment_id,
                'razorpay_signature': razorpay_signature
            })
            
            if is_valid:
                logger.info(f"Payment verified: {razorpay_payment_id}")
                return True
            else:
                logger.warning(f"Invalid payment signature")
                return False
        except Exception as e:
            logger.error(f"Verification failed: {e}")
            return False
    
    async def fetch_payment(self, payment_id: str) -> dict:
        """Fetch payment details"""
        try:
            payment = self.client.payment.fetch(payment_id)
            return {
                "success": True,
                "payment_id": payment['id'],
                "amount": payment['amount'] / 100,
                "status": payment['status'],
                "method": payment.get('method'),
                "created_at": datetime.fromtimestamp(payment['created_at']).isoformat()
            }
        except Exception as e:
            logger.error(f"Failed to fetch payment: {e}")
            raise
    
    async def refund_payment(
        self,
        payment_id: str,
        amount: Optional[float] = None,
        notes: Dict = None
    ) -> dict:
        """Refund a payment"""
        try:
            refund_data = {}
            
            if amount:
                refund_data['amount'] = int(amount * 100)
            
            if notes:
                refund_data['notes'] = notes
            
            refund = self.client.payment.refund(payment_id, refund_data)
            logger.info(f"Refund created: {refund['id']}")
            
            return {
                "success": True,
                "refund_id": refund['id'],
                "amount": refund['amount'] / 100,
                "status": refund['status'],
                "created_at": datetime.fromtimestamp(refund['created_at']).isoformat()
            }
        except Exception as e:
            logger.error(f"Failed to refund: {e}")
            raise
    
    async def create_subscription(
        self,
        plan_id: str,
        customer_id: str,
        quantity: int = 1
    ) -> dict:
        """Create subscription"""
        try:
            subscription = self.client.subscription.create({
                'plan_id': plan_id,
                'customer_notify': 1,
                'quantity': quantity
            })
            logger.info(f"Subscription created: {subscription['id']}")
            
            return {
                "success": True,
                "subscription_id": subscription['id'],
                "status": subscription['status']
            }
        except Exception as e:
            logger.error(f"Failed to create subscription: {e}")
            raise

# Singleton instance
_payment_service: Optional[PaymentService] = None

def get_payment_service() -> PaymentService:
    """Get or create payment service instance"""
    global _payment_service
    if _payment_service is None:
        _payment_service = PaymentService()
    return _payment_service
