from pydantic import BaseModel
from datetime import datetime
from uuid import UUID
from decimal import Decimal
from typing import Optional

class WalletResponse(BaseModel):
    id: UUID
    user_id: UUID
    balance: Decimal
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class TransactionResponse(BaseModel):
    id: UUID
    wallet_id: UUID
    transaction_type: str
    amount: Decimal
    description: Optional[str]
    reference_id: Optional[str]
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class WithdrawRequest(BaseModel):
    amount: Decimal
    payment_method: str  # "bank_transfer" or "upi"
    bank_account: Optional[str] = None
    upi_id: Optional[str] = None

class TransactionCreate(BaseModel):
    amount: Decimal
    transaction_type: str
    description: Optional[str] = None
