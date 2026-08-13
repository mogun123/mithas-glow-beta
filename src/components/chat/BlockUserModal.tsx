import React from 'react';
import { Shield, MessageSquare } from 'lucide-react';
import { Button } from '../ui/button';

interface BlockUserModalProps {
  userName: string;
  onConfirm: () => void;
  onCancel: () => void;
  open: boolean;
}

export function BlockUserModal({ userName, onConfirm, onCancel, open }: BlockUserModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <Shield className="w-5 h-5 text-red-600" />
          </div>
          <h3 className="font-semibold text-gray-900">Block User?</h3>
        </div>
        
        <p className="text-sm text-gray-600 mb-6">
          You're about to block <strong>{userName}</strong>. They won't be able to send you messages or see your profile. 
          This action can be undone later.
        </p>
        
        <div className="flex gap-3">
          <Button
            onClick={onCancel}
            variant="outline"
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
          >
            Block User
          </Button>
        </div>
      </div>
    </div>
  );
}
