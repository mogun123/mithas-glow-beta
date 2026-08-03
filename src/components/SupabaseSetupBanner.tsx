import { AlertCircle, ExternalLink, X } from 'lucide-react';
import { useState } from 'react';
import { isSupabaseConfigured, getSupabaseStatus } from '../lib/supabase';

export function SupabaseSetupBanner() {
  const [dismissed, setDismissed] = useState(false);
  const status = getSupabaseStatus();

  // Don't show banner if already configured or dismissed
  if (status.configured || dismissed) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">
              Running in Demo Mode - Supabase Not Configured
            </p>
            <p className="text-xs opacity-90">
              Authentication features disabled. Add your Supabase credentials to enable.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="https://github.com/yourusername/mithas-glow#supabase-setup"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition text-sm font-medium whitespace-nowrap"
          >
            Setup Guide
            <ExternalLink className="w-4 h-4" />
          </a>
          <button
            onClick={() => setDismissed(true)}
            className="p-1.5 hover:bg-white/20 rounded-lg transition"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
