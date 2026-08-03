import React from 'react';
import { ModalProvider } from '../context/ModalContext';
import { ErrorBoundary } from './ErrorBoundary';

interface AppWrapperProps {
  children: React.ReactNode;
}

export const AppWrapper: React.FC<AppWrapperProps> = ({ children }) => {
  return (
    <ErrorBoundary>
      <ModalProvider>
        {children}
      </ModalProvider>
    </ErrorBoundary>
  );
};
