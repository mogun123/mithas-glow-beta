import React, { useState } from 'react';
import { ArrowLeft, Shield, UserX } from 'lucide-react';

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
        <button
          onClick={onNavigateBack}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        
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
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center mt-4">
            <UserX className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <h3 className="font-semibold text-gray-700 mb-1">No Blocked Users</h3>
            <p className="text-sm text-gray-500">
              Users you block will appear here. They won't be able to message you or see your profile.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {blockedUsers.map((blocked) => (
              <div key={blocked.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
                
                {/* Avatar Replacement */}
                <div className="h-12 w-12 rounded-full flex-shrink-0 bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden">
                  {blocked.blocked_profile.avatar_url ? (
                    <img 
                      src={blocked.blocked_profile.avatar_url} 
                      alt={blocked.blocked_profile.full_name} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-gray-500 font-bold text-lg">
                      {blocked.blocked_profile.full_name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900 truncate">
                    {blocked.blocked_profile.full_name}
                  </h4>
                  <p className="text-xs text-gray-500">
                    Blocked {new Date(blocked.created_at).toLocaleDateString()}
                  </p>
                </div>
                
                <button
                  onClick={() => handleUnblock(blocked.id)}
                  disabled={unblocking === blocked.id}
                  className="px-4 py-2 border border-red-200 text-red-600 rounded-xl hover:bg-red-50 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Unblock
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-2xl">
          <p className="text-xs text-red-700 leading-relaxed">
            <strong className="font-bold">Note:</strong> When you block someone, they can't send you messages, see your profile, 
            or find you in search. You can unblock them anytime.
          </p>
        </div>
      </div>
    </div>
  );
}
