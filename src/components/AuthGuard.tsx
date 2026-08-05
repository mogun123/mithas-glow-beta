--- src/components/AuthGuard.tsx (原始)
import { ReactNode, useEffect } from "react";
import { useAuthStore } from "../../stores/auth-store";

interface AuthGuardProps {
  children: ReactNode;
  onUnauthenticated: () => void;
}

export function AuthGuard({ children, onUnauthenticated }: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    // isLoading முடிஞ்ச பிறகு மட்டும் செக் பண்ணுங்க
    if (!isLoading && !isAuthenticated) {
      onUnauthenticated();
    }
  }, [isAuthenticated, isLoading, onUnauthenticated]); // onUnauthenticated-ஐ இங்க கண்டிப்பா போடனும்

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  try {
    // isAuthenticated இல்லைனா ஒன்னும் காட்டாதீங்க (onUnauthenticated redirect பண்ணிடும்)
    if (!isAuthenticated) {
      return null;
    }

    return <>{children}</>;
  } catch (error) {
    console.error('AuthGuard error:', error instanceof Error ? error.message : JSON.stringify(error));
    return null;
  }
}

+++ src/components/AuthGuard.tsx (修改后)
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
