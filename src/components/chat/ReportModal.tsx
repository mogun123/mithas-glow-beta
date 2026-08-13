import React, { useState } from 'react';
import { Flag, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

interface ReportModalProps {
  targetUserId?: string;
  conversationId?: string;
  messageId?: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  open: boolean;
}

const PRESET_REASONS = [
  'Spam or unwanted messages',
  'Harassment or bullying',
  'Inappropriate content',
  'Fake profile or impersonation',
  'Scam or fraud',
  'Other'
];

export function ReportModal({ 
  targetUserId, 
  conversationId, 
  messageId,
  onConfirm, 
  onCancel, 
  open 
}: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');

  if (!open) return null;

  const handleSubmit = () => {
    const reason = selectedReason === 'Other' ? customReason : selectedReason;
    if (reason.trim()) {
      onConfirm(reason);
      setSelectedReason('');
      setCustomReason('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
            <Flag className="w-5 h-5 text-orange-600" />
          </div>
          <h3 className="font-semibold text-gray-900">Report User/Content</h3>
        </div>
        
        <div className="flex items-start gap-2 mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-orange-800">
            Reports are anonymous and reviewed by our moderation team. False reports may result in account restrictions.
          </p>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select a reason
          </label>
          <div className="space-y-2">
            {PRESET_REASONS.map((reason) => (
              <button
                key={reason}
                onClick={() => setSelectedReason(reason)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  selectedReason === reason
                    ? 'bg-orange-100 text-orange-800 border border-orange-300'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
              >
                {reason}
              </button>
            ))}
          </div>
        </div>
        
        {selectedReason === 'Other' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Please specify
            </label>
            <Input
              type="text"
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Describe the issue..."
              className="w-full"
            />
          </div>
        )}
        
        <div className="flex gap-3">
          <Button
            onClick={onCancel}
            variant="outline"
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedReason || (selectedReason === 'Other' && !customReason.trim())}
            className="flex-1 bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50"
          >
            Submit Report
          </Button>
        </div>
      </div>
    </div>
  );
}
