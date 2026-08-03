from fastapi import WebSocket
from typing import Dict, List, Set
import json
from uuid import UUID

class ConnectionManager:
    def __init__(self):
        # {conversation_id: {user_id: websocket}}
        self.active_connections: Dict[UUID, Dict[UUID, WebSocket]] = {}
        self.user_conversations: Dict[UUID, Set[UUID]] = {}
    
    async def connect(self, conversation_id: UUID, user_id: UUID, websocket: WebSocket):
        """Register a websocket connection"""
        await websocket.accept()
        
        if conversation_id not in self.active_connections:
            self.active_connections[conversation_id] = {}
        
        self.active_connections[conversation_id][user_id] = websocket
        
        if user_id not in self.user_conversations:
            self.user_conversations[user_id] = set()
        self.user_conversations[user_id].add(conversation_id)
        
        # Notify other user that this user is online
        await self.broadcast_to_conversation(
            conversation_id,
            {
                "type": "user_online",
                "user_id": str(user_id),
                "timestamp": __import__('datetime').datetime.utcnow().isoformat()
            },
            exclude_user=user_id
        )
    
    def disconnect(self, conversation_id: UUID, user_id: UUID):
        """Unregister a websocket connection"""
        if conversation_id in self.active_connections:
            self.active_connections[conversation_id].pop(user_id, None)
            if not self.active_connections[conversation_id]:
                del self.active_connections[conversation_id]
        
        if user_id in self.user_conversations:
            self.user_conversations[user_id].discard(conversation_id)
    
    async def broadcast_to_conversation(
        self,
        conversation_id: UUID,
        data: dict,
        exclude_user: UUID = None
    ):
        """Broadcast message to all users in a conversation"""
        if conversation_id in self.active_connections:
            for user_id, connection in self.active_connections[conversation_id].items():
                if exclude_user and user_id == exclude_user:
                    continue
                try:
                    await connection.send_json(data)
                except Exception as e:
                    print(f"Error sending message: {e}")
    
    async def send_personal_message(self, user_id: UUID, conversation_id: UUID, data: dict):
        """Send message to specific user in conversation"""
        if conversation_id in self.active_connections:
            connection = self.active_connections[conversation_id].get(user_id)
            if connection:
                try:
                    await connection.send_json(data)
                except Exception as e:
                    print(f"Error sending personal message: {e}")
    
    def is_user_online(self, conversation_id: UUID, user_id: UUID) -> bool:
        """Check if user is online in conversation"""
        if conversation_id not in self.active_connections:
            return False
        return user_id in self.active_connections[conversation_id]

manager = ConnectionManager()
