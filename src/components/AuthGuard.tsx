import { ReactNode, useEffect } from "react";
import { useGlobalStore } from "../lib/globalStore";

interface AuthGuardProps {
  children: ReactNode;
  onUnauthenticated: () => void;
}

export function AuthGuard({ children, onUnauthenticated }: AuthGuardProps) {
  const user = useGlobalStore((state) => state.user);
  const isLoading = useGlobalStore((state) => state.isLoading);

  const isAuthenticated = !!user;

  useEffect(() => {
    // Only check after loading is complete
    if (!isLoading && !isAuthenticated) {
      onUnauthenticated();
    }
  }, [isAuthenticated, isLoading, onUnauthenticated]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  try {
    // If not authenticated, render nothing (onUnauthenticated will handle redirect)
    if (!isAuthenticated) {
      return null;
    }

    return <>{children}</>;
  } catch (error) {
    console.error('AuthGuard error:', error instanceof Error ? error.message : JSON.stringify(error));
    return null;
  }
}
