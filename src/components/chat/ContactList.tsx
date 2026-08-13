import React from 'react';
import { Users, UserPlus } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { cn } from '../ui/utils';

interface ContactSyncProps {
  contacts: Array<{
    id: string;
    contact_name: string | null;
    matched_user_id: string | null;
    created_at: string;
  }>;
  onSyncContacts: () => void;
  syncing?: boolean;
}

export function ContactList({ contacts, onSyncContacts, syncing = false }: ContactSyncProps) {
  const matchedContacts = contacts.filter(c => c.matched_user_id);
  const unmatchedContacts = contacts.filter(c => !c.matched_user_id);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-purple-900 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Synced Contacts ({matchedContacts.length})
            </h3>
            <Button
              onClick={onSyncContacts}
              disabled={syncing}
              className="bg-purple-600 hover:bg-purple-700 text-white"
              size="sm"
            >
              <UserPlus className="w-4 h-4 mr-1" />
              {syncing ? 'Syncing...' : 'Sync Contacts'}
            </Button>
          </div>

          {contacts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No contacts synced yet</p>
              <p className="text-xs mt-1">Tap "Sync Contacts" to find friends on MITHAS GLOW</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {matchedContacts.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-gradient-to-br from-purple-200 to-pink-200 text-white font-semibold">
                      {(contact.contact_name || 'C').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{contact.contact_name || 'Contact'}</p>
                    <p className="text-xs text-green-600">On MITHAS GLOW</p>
                  </div>
                </div>
              ))}

              {unmatchedContacts.length > 0 && (
                <>
                  <div className="pt-2 border-t border-purple-100">
                    <p className="text-xs text-gray-500 mb-2">Not on MITHAS GLOW yet</p>
                  </div>
                  {unmatchedContacts.slice(0, 5).map((contact) => (
                    <div
                      key={contact.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg opacity-75"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-gray-200 text-gray-500 font-semibold">
                          {(contact.contact_name || 'C').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium text-gray-700">{contact.contact_name || 'Contact'}</p>
                        <p className="text-xs text-gray-400">Invite them to join</p>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <p className="text-xs text-purple-700">
          <strong>Privacy Notice:</strong> We only store secure hashes of phone numbers. 
          Raw phone numbers are never stored or transmitted. Your contacts remain private.
        </p>
      </div>
    </div>
  );
}
