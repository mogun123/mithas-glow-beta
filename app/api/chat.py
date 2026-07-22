from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, or_, and_
from uuid import UUID
from datetime import datetime

from app.database import get_db
from app.models import ChatConversation, ChatMessage, User
from app.schemas.chat import (
    ChatMessageCreate, ChatMessageResponse, ChatConversationResponse
)
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/api/chat", tags=["chat"])

@router.get("/conversations", response_model=list[ChatConversationResponse])
async def get_conversations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get user's conversations"""
    result = await db.execute(
        select(ChatConversation).where(
            or_(
                ChatConversation.user_1_id == current_user.id,
                ChatConversation.user_2_id == current_user.id
            )
        ).order_by(desc(ChatConversation.last_message_at))
    )
    conversations = result.scalars().all()
    
    return [ChatConversationResponse.from_orm(conv) for conv in conversations]

@router.post("/conversations/{user_id}", response_model=ChatConversationResponse)
async def start_conversation(
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Start or get conversation with user"""
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot start conversation with yourself"
        )
    
    # Check if conversation exists
    result = await db.execute(
        select(ChatConversation).where(
            or_(
                and_(
                    ChatConversation.user_1_id == current_user.id,
                    ChatConversation.user_2_id == user_id
                ),
                and_(
                    ChatConversation.user_1_id == user_id,
                    ChatConversation.user_2_id == current_user.id
                )
            )
        )
    )
    conversation = result.scalars().first()
    
    if conversation:
        return ChatConversationResponse.from_orm(conversation)
    
    # Create new conversation
    user_1_id = min(current_user.id, user_id)
    user_2_id = max(current_user.id, user_id)
    
    new_conversation = ChatConversation(
        user_1_id=user_1_id,
        user_2_id=user_2_id
    )
    
    db.add(new_conversation)
    await db.commit()
    await db.refresh(new_conversation)
    
    return ChatConversationResponse.from_orm(new_conversation)

@router.get("/conversations/{conversation_id}/messages", response_model=list[ChatMessageResponse])
async def get_messages(
    conversation_id: UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get conversation messages"""
    # Verify user is part of conversation
    conv_result = await db.execute(
        select(ChatConversation).where(ChatConversation.id == conversation_id)
    )
    conversation = conv_result.scalars().first()
    
    if not conversation or (
        conversation.user_1_id != current_user.id and
        conversation.user_2_id != current_user.id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized"
        )
    
    # Get messages
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.conversation_id == conversation_id)
        .order_by(desc(ChatMessage.created_at))
        .offset(skip)
        .limit(limit)
    )
    messages = result.scalars().all()
    messages.reverse()  # Reverse to get oldest first
    
    return [ChatMessageResponse.from_orm(msg) for msg in messages]

@router.post("/conversations/{conversation_id}/messages", response_model=ChatMessageResponse, status_code=status.HTTP_201_CREATED)
async def send_message(
    conversation_id: UUID,
    message_data: ChatMessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Send message"""
    # Verify user is part of conversation
    conv_result = await db.execute(
        select(ChatConversation).where(ChatConversation.id == conversation_id)
    )
    conversation = conv_result.scalars().first()
    
    if not conversation or (
        conversation.user_1_id != current_user.id and
        conversation.user_2_id != current_user.id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized"
        )
    
    # Create message
    new_message = ChatMessage(
        conversation_id=conversation_id,
        sender_id=current_user.id,
        content=message_data.content,
        message_type=message_data.message_type,
        media_url=message_data.media_url
    )
    
    db.add(new_message)
    
    # Update conversation last message time
    conversation.last_message_at = datetime.utcnow()
    db.add(conversation)
    
    await db.commit()
    await db.refresh(new_message)
    
    return ChatMessageResponse.from_orm(new_message)

@router.put("/messages/{message_id}/read", response_model=ChatMessageResponse)
async def mark_message_read(
    message_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Mark message as read"""
    result = await db.execute(
        select(ChatMessage).where(ChatMessage.id == message_id)
    )
    message = result.scalars().first()
    
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found"
        )
    
    message.is_read = True
    db.add(message)
    await db.commit()
    await db.refresh(message)
    
    return ChatMessageResponse.from_orm(message)

@router.get("/conversations/{conversation_id}/unread-count")
async def get_unread_count(
    conversation_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get unread message count"""
    result = await db.execute(
        select(ChatMessage).where(
            (ChatMessage.conversation_id == conversation_id) &
            (ChatMessage.sender_id != current_user.id) &
            (ChatMessage.is_read == False)
        )
    )
    messages = result.scalars().all()
    
    return {"unread_count": len(messages)}
