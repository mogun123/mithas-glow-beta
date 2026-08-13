import React from 'react';
import { Inbox, UserX } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

interface MessageRequestsProps {
  requests: Array<{
    id: string;
    conversation_id: string;
    requester_profile?: {
      full_name: string;
      avatar_url: string | null;
    };
    last_message?: string;
    created_at: string;
  }>;
  onAccept: (conversationId: string) => void;
  onDecline: (conversationId: string) => void;
  loading?: boolean;
}

export function MessageRequests({ 
  requests, 
  onAccept, 
  onDecline,
  loading = false 
}: MessageRequestsProps) {
  if (requests.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Inbox className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <h3 className="font-semibold text-gray-700 mb-1">No Message Requests</h3>
          <p className="text-sm text-gray-500">
            When someone sends you a message and you're not connected, it'll appear here
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((request) => (
        <Card key={request.id} className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Avatar className="h-12 w-12 flex-shrink-0">
                {request.requester_profile?.avatar_url ? (
                  <AvatarImage 
                    src={request.requester_profile.avatar_url} 
                    alt={request.requester_profile.full_name} 
                  />
                ) : (
                  <AvatarFallback className="bg-gradient-to-br from-pink-200 to-purple-200 text-white font-semibold">
                    {request.requester_profile?.full_name?.charAt(0).toUpperCase() || '?'}
                  </AvatarFallback>
                )}
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-900 truncate">
                  {request.requester_profile?.full_name || 'Unknown User'}
                </h4>
                <p className="text-sm text-gray-500 truncate mt-0.5">
                  {request.last_message || 'Sent a message request'}
                </p>
                
                <div className="flex gap-2 mt-3">
                  <Button
                    onClick={() => onAccept(request.conversation_id)}
                    disabled={loading}
                    className="flex-1 bg-pink-600 hover:bg-pink-700 text-white"
                    size="sm"
                  >
                    Accept
                  </Button>
                  <Button
                    onClick={() => onDecline(request.conversation_id)}
                    disabled={loading}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    Decline
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
