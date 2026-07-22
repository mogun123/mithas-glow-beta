/**
 * Error Boundary Hook for Functional Components
 * Provides error handling utilities for React components
 */

import React, { useState, useCallback, useRef } from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: any;
}

export function useErrorBoundary() {
  const [errorState, setErrorState] = useState<ErrorBoundaryState>({
    hasError: false,
    error: null,
    errorInfo: null,
  });

  const resetError = useCallback(() => {
    setErrorState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  }, []);

  const captureError = useCallback((error: Error, errorInfo?: any) => {
    console.error('Error captured by useErrorBoundary:', error, errorInfo);
    setErrorState({
      hasError: true,
      error,
      errorInfo,
    });
  }, []);

  // Wrapper for async functions to catch errors
  const withErrorHandling = useCallback(
    async <T, Args extends any[]>(
      fn: (...args: Args) => Promise<T>,
      ...args: Args
    ): Promise<T | null> => {
      try {
        return await fn(...args);
      } catch (error) {
        captureError(error as Error);
        return null;
      }
    },
    [captureError]
  );

  // Wrapper for sync functions to catch errors
  const withSyncErrorHandling = useCallback(
    <T, Args extends any[]>(
      fn: (...args: Args) => T,
      ...args: Args
    ): T | null => {
      try {
        return fn(...args);
      } catch (error) {
        captureError(error as Error);
        return null;
      }
    },
    [captureError]
  );

  return {
    hasError: errorState.hasError,
    error: errorState.error,
    errorInfo: errorState.errorInfo,
    resetError,
    captureError,
    withErrorHandling,
    withSyncErrorHandling,
  };
}

/**
 * Higher-order component for error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  FallbackComponent?: React.ComponentType<{ error: Error; retry: () => void }>
) {
  return function WrappedComponent(props: P) {
    const { hasError, error, resetError } = useErrorBoundary();

    if (hasError && error) {
      if (FallbackComponent) {
        return React.createElement(FallbackComponent, { error, retry: resetError });
      }

      // Default fallback
      return React.createElement(
        'div',
        { className: 'p-4 text-center' },
        React.createElement('h3', { className: 'text-lg font-semibold text-red-600 mb-2' }, 'Something went wrong'),
        React.createElement('p', { className: 'text-gray-600 mb-4' }, error.message),
        React.createElement(
          'button',
          {
            onClick: resetError,
            className: 'px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600',
          },
          'Try Again'
        )
      );
    }

    return React.createElement(Component, props);
  };
}

/**
 * Safe async state hook with error handling
 */
export function useSafeAsyncState<T>(
  initialValue: T,
  asyncFn?: () => Promise<T>
) {
  const [state, setState] = useState<T>(initialValue);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { captureError } = useErrorBoundary();

  const execute = useCallback(async () => {
    if (!asyncFn) return;

    setLoading(true);
    setError(null);

    try {
      const result = await asyncFn();
      setState(result);
    } catch (err) {
      const error = err as Error;
      setError(error);
      captureError(error);
    } finally {
      setLoading(false);
    }
  }, [asyncFn, captureError]);

  return {
    state,
    setState,
    loading,
    error,
    execute,
    resetError: () => {
      setError(null);
      setState(initialValue);
    },
  };
}
