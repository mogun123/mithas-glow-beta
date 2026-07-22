import razorpay
import hmac
import hashlib
from app.config import get_settings
from decimal import Decimal

settings = get_settings()

class RazorpayService:
    def __init__(self):
        self.client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
    
    def create_order(self, amount: Decimal, currency: str = "INR", notes: dict = None) -> dict:
        """Create Razorpay order"""
        try:
            order_data = {
                "amount": int(float(amount) * 100),  # Convert to paise
                "currency": currency,
                "receipt": "receipt#1",
                "notes": notes or {}
            }
            order = self.client.order.create(data=order_data)
            return order
        except Exception as e:
            raise Exception(f"Razorpay order creation failed: {str(e)}")
    
    def verify_payment_signature(self, razorpay_order_id: str, razorpay_payment_id: str, razorpay_signature: str) -> bool:
        """Verify payment signature"""
        try:
            message = f"{razorpay_order_id}|{razorpay_payment_id}"
            signature = hmac.new(
                settings.RAZORPAY_KEY_SECRET.encode(),
                message.encode(),
                hashlib.sha256
            ).hexdigest()
            return signature == razorpay_signature
        except Exception as e:
            raise Exception(f"Signature verification failed: {str(e)}")
    
    def fetch_payment(self, payment_id: str) -> dict:
        """Fetch payment details"""
        try:
            payment = self.client.payment.fetch(payment_id)
            return payment
        except Exception as e:
            raise Exception(f"Payment fetch failed: {str(e)}")
