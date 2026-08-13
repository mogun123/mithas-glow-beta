import React, { useState } from 'react';
import { ArrowLeft, Shield, UserX } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

interface BlockedUsersScreenProps {
  onNavigateBack: () => void;
}

type BlockedUser = {
  id: string;
  blocked_profile: {
    full_name: string;
    avatar_url: string | null;
  };
  created_at: string;
};

export function BlockedUsersScreen({ onNavigateBack }: BlockedUsersScreenProps) {
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [unblocking, setUnblocking] = useState<string | null>(null);

  const handleUnblock = async (userId: string) => {
    setUnblocking(userId);
    try {
      // TODO: Delete block relationship
      // await db.from('chat_blocks').delete().eq('blocker_id', currentUserId).eq('blocked_id', userId);
      setBlockedUsers(prev => prev.filter(u => u.blocked_profile.id !== userId));
    } catch (error) {
      console.error('Failed to unblock user:', error);
    } finally {
      setUnblocking(null);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={onNavigateBack}
          className="flex-shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        
        <div className="flex-1">
          <h1 className="text-lg font-bold text-red-900 flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Blocked Users
          </h1>
          <p className="text-xs text-gray-500">Manage your blocked users</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {blockedUsers.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <UserX className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <h3 className="font-semibold text-gray-700 mb-1">No Blocked Users</h3>
              <p className="text-sm text-gray-500">
                Users you block will appear here. They won't be able to message you or see your profile.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {blockedUsers.map((blocked) => (
              <Card key={blocked.id}>
                <CardContent className="p-4 flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    {blocked.blocked_profile.avatar_url ? (
                      <AvatarImage 
                        src={blocked.blocked_profile.avatar_url} 
                        alt={blocked.blocked_profile.full_name} 
                      />
                    ) : (
                      <AvatarFallback className="bg-gray-200 text-gray-500 font-semibold">
                        {blocked.blocked_profile.full_name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 truncate">
                      {blocked.blocked_profile.full_name}
                    </h4>
                    <p className="text-xs text-gray-500">
                      Blocked {new Date(blocked.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <Button
                    onClick={() => handleUnblock(blocked.id)}
                    disabled={unblocking === blocked.id}
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    Unblock
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-xs text-red-700">
            <strong>Note:</strong> When you block someone, they can't send you messages, see your profile, 
            or find you in search. You can unblock them anytime.
          </p>
        </div>
      </div>
    </div>
  );
}
