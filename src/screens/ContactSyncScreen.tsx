import React, { useState } from 'react';
import { ArrowLeft, UserPlus, Upload } from 'lucide-react';
import { ContactList } from '../components/chat/ContactList';
import type { Database } from '../../lib/database.types';

interface ContactSyncScreenProps {
  onNavigateBack: () => void;
}

type ContactSync = Database['public']['Tables']['contact_sync']['Row'];

export function ContactSyncScreen({ onNavigateBack }: ContactSyncScreenProps) {
  const [contacts, setContacts] = useState<ContactSync[]>([]);
  const [syncing, setSyncing] = useState(false);

  const handleSyncContacts = async () => {
    setSyncing(true);
    
    try {
      // Browser contact access is limited - show file upload fallback
      // In production, this would use native contact picker or CSV/VCF upload
      alert('Contact sync requires native app integration. For web, please upload a CSV or VCF file.');
      
      // TODO: Implement actual contact sync with privacy-preserving hash
      // 1. Request contacts (native) or file upload (web)
      // 2. Normalize phone numbers
      // 3. Create SHA-256 hashes client-side
      // 4. Send only hashes to backend
      // 5. Match against existing user phone hashes
      // 6. Return matched users
      
    } catch (error) {
      console.error('Failed to sync contacts:', error);
    } finally {
      setSyncing(false);
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
          <h1 className="text-lg font-bold text-purple-900 flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Glow Contact
          </h1>
          <p className="text-xs text-gray-500">Find friends on MITHAS GLOW</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-4 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5">
            <h3 className="font-bold text-purple-900 mb-2 text-lg">
              Sync Your Contacts
            </h3>
            <p className="text-sm text-purple-700 mb-5 leading-relaxed">
              Find which of your contacts are already on MITHAS GLOW. 
              We only store secure hashes of phone numbers - never the actual numbers.
            </p>
            <button
              onClick={handleSyncContacts}
              disabled={syncing}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
            >
              <Upload className="w-4 h-4 mr-2" />
              {syncing ? 'Syncing...' : 'Sync Contacts'}
            </button>
          </div>
        </div>

        <ContactList
          contacts={contacts.map(c => ({
            id: c.id,
            contact_name: c.contact_name,
            matched_user_id: c.matched_user_id,
            created_at: c.created_at
          }))}
          onSyncContacts={handleSyncContacts}
          syncing={syncing}
        />

        <div className="mt-4 p-5 bg-purple-50 border border-purple-200 rounded-2xl">
          <h4 className="font-bold text-purple-900 text-sm mb-3">
            How it works
          </h4>
          <ol className="text-xs text-purple-800 space-y-2 list-decimal list-inside font-medium">
            <li>We access your device contacts (with permission)</li>
            <li>Phone numbers are normalized and hashed locally</li>
            <li>Only SHA-256 hashes are sent to our servers</li>
            <li>We match hashes against existing MITHAS GLOW users</li>
            <li>Show you which contacts are on the platform</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
