/**
 * Specialized Error Fallbacks for different components
 * Provides better UX for specific error scenarios
 */

import { AlertTriangle, WifiOff, Database, RefreshCw, Home } from 'lucide-react';

interface FallbackProps {
  error?: Error;
  onRetry?: () => void;
  onGoHome?: () => void;
}

// API Error Fallback
export function APIErrorFallback({ error, onRetry }: FallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
        <WifiOff className="w-8 h-8 text-orange-500" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Connection Error</h3>
      <p className="text-gray-600 mb-4">
        {error?.message || "Unable to connect to our services. Please check your internet connection."}
      </p>
      <button
        onClick={onRetry}
        className="px-6 py-2 bg-orange-500 text-white rounded-full hover:bg-orange-600 transition-colors flex items-center gap-2"
      >
        <RefreshCw className="w-4 h-4" />
        Try Again
      </button>
    </div>
  );
}

// Database Error Fallback
export function DatabaseErrorFallback({ error, onRetry }: FallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
        <Database className="w-8 h-8 text-red-500" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Database Error</h3>
      <p className="text-gray-600 mb-4">
        {error?.message || "We're having trouble accessing your data. Please try again in a moment."}
      </p>
      <button
        onClick={onRetry}
        className="px-6 py-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors flex items-center gap-2"
      >
        <RefreshCw className="w-4 h-4" />
        Retry
      </button>
    </div>
  );
}

// Feed Error Fallback
export function FeedErrorFallback({ error, onRetry, onGoHome }: FallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center min-h-[400px]">
      <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
        <AlertTriangle className="w-8 h-8 text-purple-500" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Feed Loading Error</h3>
      <p className="text-gray-600 mb-6 max-w-md">
        {error?.message || "We couldn't load your feed. This might be a temporary issue."}
      </p>
      <div className="flex gap-3">
        <button
          onClick={onRetry}
          className="px-6 py-2 bg-purple-500 text-white rounded-full hover:bg-purple-600 transition-colors flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh Feed
        </button>
        {onGoHome && (
          <button
            onClick={onGoHome}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 transition-colors flex items-center gap-2"
          >
            <Home className="w-4 h-4" />
            Go Home
          </button>
        )}
      </div>
    </div>
  );
}

// Profile Error Fallback
export function ProfileErrorFallback({ error, onRetry }: FallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
        <AlertTriangle className="w-8 h-8 text-blue-500" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Profile Error</h3>
      <p className="text-gray-600 mb-4">
        {error?.message || "We couldn't load your profile information."}
      </p>
      <button
        onClick={onRetry}
        className="px-6 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors flex items-center gap-2"
      >
        <RefreshCw className="w-4 h-4" />
        Reload Profile
      </button>
    </div>
  );
}

// Generic Error Fallback for smaller components
export function GenericErrorFallback({ error, onRetry }: FallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center p-4 text-center">
      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
        <AlertTriangle className="w-6 h-6 text-gray-500" />
      </div>
      <p className="text-sm text-gray-600 mb-3">
        {error?.message || "Something went wrong"}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-sm px-4 py-1 bg-gray-500 text-white rounded-full hover:bg-gray-600 transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}
