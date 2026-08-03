/**
 * Supabase Configuration Diagnostics
 * Shows detailed information about Supabase configuration status
 */

import { Info, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { getSupabaseStatus } from '../lib/supabase';

export function SupabaseDiagnostics() {
  const status = getSupabaseStatus();
  
  // Get raw environment variables
  const rawUrl = typeof import.meta !== 'undefined' && import.meta.env 
    ? import.meta.env.VITE_SUPABASE_URL 
    : undefined;
  const rawKey = typeof import.meta !== 'undefined' && import.meta.env 
    ? import.meta.env.VITE_SUPABASE_ANON_KEY 
    : undefined;

  const isPlaceholderUrl = rawUrl === 'https://your-project.supabase.co' || !rawUrl;
  const isPlaceholderKey = rawKey === 'your-anon-key-here' || !rawKey;

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-white rounded-xl shadow-2xl border-2 border-purple-200 p-4 z-50 max-h-[80vh] overflow-y-auto">
      <div className="flex items-center gap-2 mb-4">
        <Info className="w-5 h-5 text-purple-600" />
        <h3 className="font-semibold text-gray-900">Supabase Configuration Status</h3>
      </div>

      <div className="space-y-3 text-sm">
        {/* Overall Status */}
        <div className="flex items-start gap-2">
          {status.configured ? (
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          ) : (
            <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          )}
          <div>
            <p className="font-medium text-gray-900">Overall Status</p>
            <p className={status.configured ? "text-green-600" : "text-red-600"}>
              {status.message}
            </p>
          </div>
        </div>

        {/* URL Check */}
        <div className="flex items-start gap-2">
          {rawUrl && !isPlaceholderUrl ? (
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          ) : (
            <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          )}
          <div>
            <p className="font-medium text-gray-900">VITE_SUPABASE_URL</p>
            {rawUrl ? (
              <>
                <p className="text-gray-600 font-mono text-xs break-all">
                  {isPlaceholderUrl ? '⚠️ Placeholder value' : rawUrl.substring(0, 50) + '...'}
                </p>
                {isPlaceholderUrl && (
                  <p className="text-red-600 text-xs mt-1">
                    Replace with your actual Supabase project URL
                  </p>
                )}
              </>
            ) : (
              <p className="text-red-600">Not set</p>
            )}
          </div>
        </div>

        {/* Key Check */}
        <div className="flex items-start gap-2">
          {rawKey && !isPlaceholderKey ? (
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          ) : (
            <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          )}
          <div>
            <p className="font-medium text-gray-900">VITE_SUPABASE_ANON_KEY</p>
            {rawKey ? (
              <>
                <p className="text-gray-600 font-mono text-xs">
                  {isPlaceholderKey ? '⚠️ Placeholder value' : `${rawKey.substring(0, 20)}...`}
                </p>
                {isPlaceholderKey && (
                  <p className="text-red-600 text-xs mt-1">
                    Replace with your actual Supabase anon key
                  </p>
                )}
              </>
            ) : (
              <p className="text-red-600">Not set</p>
            )}
          </div>
        </div>

        {/* Instructions */}
        {!status.configured && (
          <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs space-y-2">
                <p className="font-medium text-amber-900">Configuration Required</p>
                
                {isPlaceholderUrl || isPlaceholderKey ? (
                  <>
                    <p className="text-amber-800">
                      Your .env.local file has placeholder values.
                    </p>
                    <p className="text-amber-800 font-medium">Quick Fix:</p>
                    <ol className="list-decimal ml-4 space-y-1 text-amber-800">
                      <li>Go to <a href="https://supabase.com" target="_blank" className="underline">supabase.com</a></li>
                      <li>Create a new project (free)</li>
                      <li>Go to Settings → API</li>
                      <li>Copy your Project URL and anon key</li>
                      <li>Update .env.local with real values</li>
                      <li>Restart dev server (Ctrl+C, npm run dev)</li>
                    </ol>
                  </>
                ) : (
                  <>
                    <p className="text-amber-800 font-medium">
                      Environment variables not loaded
                    </p>
                    <p className="text-amber-800">
                      If you just edited .env.local:
                    </p>
                    <ol className="list-decimal ml-4 space-y-1 text-amber-800">
                      <li>Stop the dev server (Ctrl+C or Cmd+C)</li>
                      <li>Run: npm run dev</li>
                      <li>Refresh this page</li>
                    </ol>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Success Message */}
        {status.configured && (
          <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-medium text-green-900">✅ Supabase Configured!</p>
                <p className="text-green-800 mt-1">
                  Your app is connected to Supabase. All authentication features are enabled.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Debug Info */}
        <details className="mt-4">
          <summary className="cursor-pointer text-xs text-gray-600 hover:text-gray-900">
            Show Debug Info
          </summary>
          <div className="mt-2 p-2 bg-gray-100 rounded text-xs font-mono space-y-1">
            <p>import.meta.env exists: {typeof import.meta !== 'undefined' && import.meta.env ? 'Yes' : 'No'}</p>
            <p>URL defined: {rawUrl ? 'Yes' : 'No'}</p>
            <p>Key defined: {rawKey ? 'Yes' : 'No'}</p>
            <p>Is placeholder URL: {isPlaceholderUrl ? 'Yes' : 'No'}</p>
            <p>Is placeholder Key: {isPlaceholderKey ? 'Yes' : 'No'}</p>
            <p>Configured: {status.configured ? 'Yes' : 'No'}</p>
          </div>
        </details>
      </div>
    </div>
  );
}
