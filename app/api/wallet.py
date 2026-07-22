from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from uuid import UUID
from decimal import Decimal
from datetime import datetime

from app.database import get_db
from app.models.wallet import Wallet, Transaction
from app.models.user import User
from app.schemas.wallet import (
    WalletResponse, TransactionResponse, WithdrawRequest,
    TransactionCreate
)
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/api/wallet", tags=["wallet"])

@router.get("/", response_model=WalletResponse)
async def get_wallet(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get user's wallet"""
    result = await db.execute(
        select(Wallet).where(Wallet.user_id == current_user.id)
    )
    wallet = result.scalars().first()
    
    if not wallet:
        # Create wallet if doesn't exist
        wallet = Wallet(user_id=current_user.id, balance=Decimal(0))
        db.add(wallet)
        await db.commit()
        await db.refresh(wallet)
    
    return WalletResponse.from_orm(wallet)

@router.get("/transactions", response_model=list[TransactionResponse])
async def get_transactions(
    current_user: User = Depends(get_current_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    transaction_type: str = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """Get transaction history"""
    wallet_result = await db.execute(
        select(Wallet).where(Wallet.user_id == current_user.id)
    )
    wallet = wallet_result.scalars().first()
    
    if not wallet:
        return []
    
    query = select(Transaction).where(Transaction.wallet_id == wallet.id)
    
    if transaction_type:
        query = query.where(Transaction.transaction_type == transaction_type)
    
    result = await db.execute(
        query.order_by(desc(Transaction.created_at))
        .offset(skip)
        .limit(limit)
    )
    transactions = result.scalars().all()
    
    return [TransactionResponse.from_orm(txn) for txn in transactions]

@router.post("/add-funds")
async def add_funds(
    amount: Decimal,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Add funds to wallet (for payment processing)"""
    if amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Amount must be positive"
        )
    
    wallet_result = await db.execute(
        select(Wallet).where(Wallet.user_id == current_user.id)
    )
    wallet = wallet_result.scalars().first()
    
    if not wallet:
        wallet = Wallet(user_id=current_user.id, balance=Decimal(0))
        db.add(wallet)
        await db.flush()
    
    # Add transaction
    transaction = Transaction(
        wallet_id=wallet.id,
        transaction_type="credit",
        amount=amount,
        description="Funds added",
        status="pending"
    )
    
    db.add(transaction)
    await db.commit()
    
    return {
        "status": "pending",
        "amount": float(amount),
        "transaction_id": str(transaction.id)
    }

@router.post("/withdraw")
async def withdraw_funds(
    request: WithdrawRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Withdraw funds from wallet"""
    if request.amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Amount must be positive"
        )
    
    wallet_result = await db.execute(
        select(Wallet).where(Wallet.user_id == current_user.id)
    )
    wallet = wallet_result.scalars().first()
    
    if not wallet:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wallet not found"
        )
    
    if wallet.balance < request.amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Insufficient balance"
        )
    
    # Create withdrawal transaction
    transaction = Transaction(
        wallet_id=wallet.id,
        transaction_type="debit",
        amount=request.amount,
        description=f"Withdrawal to {request.payment_method}",
        status="processing",
        reference_id=request.bank_account or request.upi_id
    )
    
    wallet.balance -= request.amount
    
    db.add(transaction)
    db.add(wallet)
    await db.commit()
    await db.refresh(transaction)
    
    return {
        "status": "processing",
        "amount": float(request.amount),
        "transaction_id": str(transaction.id),
        "message": "Withdrawal request submitted"
    }

@router.post("/transfer")
async def transfer_funds(
    recipient_id: UUID,
    amount: Decimal,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Transfer funds between users"""
    if amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Amount must be positive"
        )
    
    # Get sender wallet
    sender_wallet_result = await db.execute(
        select(Wallet).where(Wallet.user_id == current_user.id)
    )
    sender_wallet = sender_wallet_result.scalars().first()
    
    if not sender_wallet or sender_wallet.balance < amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Insufficient balance"
        )
    
    # Get recipient wallet
    recipient_wallet_result = await db.execute(
        select(Wallet).where(Wallet.user_id == recipient_id)
    )
    recipient_wallet = recipient_wallet_result.scalars().first()
    
    if not recipient_wallet:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recipient wallet not found"
        )
    
    # Debit from sender
    debit_txn = Transaction(
        wallet_id=sender_wallet.id,
        transaction_type="debit",
        amount=amount,
        description=f"Transfer to user {recipient_id}",
        status="completed",
        reference_id=str(recipient_id)
    )
    
    # Credit to recipient
    credit_txn = Transaction(
        wallet_id=recipient_wallet.id,
        transaction_type="credit",
        amount=amount,
        description=f"Transfer from user {current_user.id}",
        status="completed",
        reference_id=str(current_user.id)
    )
    
    sender_wallet.balance -= amount
    recipient_wallet.balance += amount
    
    db.add(debit_txn)
    db.add(credit_txn)
    db.add(sender_wallet)
    db.add(recipient_wallet)
    await db.commit()
    
    return {
        "status": "completed",
        "amount": float(amount),
        "recipient_id": str(recipient_id)
    }

@router.get("/transactions/{transaction_id}", response_model=TransactionResponse)
async def get_transaction(
    transaction_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get transaction details"""
    result = await db.execute(
        select(Transaction).where(Transaction.id == transaction_id)
    )
    transaction = result.scalars().first()
    
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )
    
    # Verify user owns this transaction
    wallet_result = await db.execute(
        select(Wallet).where(Wallet.id == transaction.wallet_id)
    )
    wallet = wallet_result.scalars().first()
    
    if wallet.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized"
        )
    
    return TransactionResponse.from_orm(transaction)
