from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
import json
from datetime import datetime

from app.database import get_db
from app.models import ChatConversation, ChatMessage, User
from app.core.dependencies import get_current_user
from app.services.websocket_manager import manager

router = APIRouter(prefix="/api/ws", tags=["websocket"])

@router.websocket("/chat/{conversation_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    conversation_id: UUID,
    token: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """WebSocket endpoint for real-time chat"""
    from app.core.security import decode_access_token
    
    # Verify token
    payload = decode_access_token(token)
    if not payload:
        await websocket.close(code=4001, reason="Unauthorized")
        return
    
    user_id_str: str = payload.get("sub")
    if not user_id_str:
        await websocket.close(code=4001, reason="Invalid token")
        return
    
    try:
        user_id = UUID(user_id_str)
    except:
        await websocket.close(code=4001, reason="Invalid user ID")
        return
    
    # Verify conversation exists and user is participant
    conv_result = await db.execute(
        select(ChatConversation).where(ChatConversation.id == conversation_id)
    )
    conversation = conv_result.scalars().first()
    
    if not conversation or (
        conversation.user_1_id != user_id and
        conversation.user_2_id != user_id
    ):
        await websocket.close(code=4003, reason="Forbidden")
        return
    
    # Connect user
    await manager.connect(conversation_id, user_id, websocket)
    
    try:
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            message_type = message_data.get("type", "message")
            
            if message_type == "message":
                # Save message to database
                new_message = ChatMessage(
                    conversation_id=conversation_id,
                    sender_id=user_id,
                    content=message_data.get("content", ""),
                    message_type="text",
                    media_url=message_data.get("media_url")
                )
                db.add(new_message)
                
                # Update conversation last message time
                conversation.last_message_at = datetime.utcnow()
                db.add(conversation)
                await db.commit()
                await db.refresh(new_message)
                
                # Broadcast to conversation
                await manager.broadcast_to_conversation(
                    conversation_id,
                    {
                        "type": "message",
                        "id": str(new_message.id),
                        "sender_id": str(user_id),
                        "content": new_message.content,
                        "media_url": new_message.media_url,
                        "timestamp": new_message.created_at.isoformat(),
                        "is_read": False
                    }
                )
            
            elif message_type == "typing":
                # Broadcast typing status
                await manager.broadcast_to_conversation(
                    conversation_id,
                    {
                        "type": "typing",
                        "user_id": str(user_id),
                        "is_typing": message_data.get("is_typing", True)
                    },
                    exclude_user=user_id
                )
            
            elif message_type == "read":
                # Mark message as read
                message_id = message_data.get("message_id")
                if message_id:
                    msg_result = await db.execute(
                        select(ChatMessage).where(ChatMessage.id == UUID(message_id))
                    )
                    message = msg_result.scalars().first()
                    if message:
                        message.is_read = True
                        db.add(message)
                        await db.commit()
                        
                        # Broadcast read status
                        await manager.broadcast_to_conversation(
                            conversation_id,
                            {
                                "type": "message_read",
                                "message_id": str(message_id)
                            }
                        )
    
    except WebSocketDisconnect:
        manager.disconnect(conversation_id, user_id)
        # Notify other user that this user is offline
        await manager.broadcast_to_conversation(
            conversation_id,
            {
                "type": "user_offline",
                "user_id": str(user_id),
                "timestamp": datetime.utcnow().isoformat()
            }
        )
    
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(conversation_id, user_id)
