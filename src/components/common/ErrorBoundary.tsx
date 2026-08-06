/**
 * Enterprise Error Boundary
 * Premium Glassmorphism fallback UI with retry functionality
 * One module crash must NOT crash the entire dashboard
 */

import { Component, ErrorInfo, ReactNode, useState, useCallback } from 'react';
import { AlertTriangle, RefreshCw, Home, XCircle } from 'lucide-react';
import { logger } from '../../lib/logger';

interface Props {
  children: ReactNode;
  moduleName: string;
  onRetry?: () => void;
  onBack?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logger.error(`ErrorBoundary caught error in ${this.props.moduleName}`, error, {
      componentStack: errorInfo.componentStack,
    });
    
    this.setState({ error, errorInfo });
  }

  handleRetry = useCallback(() => {
    logger.info(`Retrying ${this.props.moduleName}`);
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  }, [this.props.onRetry, this.props.moduleName]);

  handleBack = useCallback(() => {
    logger.info(`Navigating back from ${this.props.moduleName}`);
    if (this.props.onBack) {
      this.props.onBack();
    }
  }, [this.props.onBack, this.props.moduleName]);

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-white/70 backdrop-blur-xl border border-white/50 rounded-3xl shadow-xl p-8 text-center animate-in fade-in zoom-in duration-300">
            {/* Error Icon with Premium Gradient */}
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-rose-100 to-orange-100 border border-white/60 flex items-center justify-center shadow-lg">
              <AlertTriangle className="w-10 h-10 text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-orange-500" />
            </div>

            {/* Error Title */}
            <h2 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">
              Oops! Something went wrong
            </h2>

            {/* Module Name */}
            <p className="text-sm text-slate-600 font-bold mb-1">
              in {this.props.moduleName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </p>

            {/* Friendly Error Message */}
            <p className="text-sm text-slate-700 font-medium mb-6 leading-relaxed px-4">
              Don't worry, we've got this. The rest of your dashboard is working perfectly.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              <button
                onClick={this.handleRetry}
                className="w-full px-6 py-3.5 bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white font-bold rounded-full shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-5 h-5" />
                Try Again
              </button>

              <button
                onClick={this.handleBack}
                className="w-full px-6 py-3.5 bg-white/80 text-slate-700 font-bold rounded-full border border-purple-200 hover:bg-white hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2"
              >
                <Home className="w-5 h-5" />
                Back to Dashboard
              </button>
            </div>

            {/* Error Details (Dev Only) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="text-xs font-bold text-slate-500 cursor-pointer hover:text-slate-700 transition-colors">
                  Technical Details
                </summary>
                <div className="mt-3 p-4 bg-slate-900/90 rounded-xl overflow-x-auto">
                  <pre className="text-[10px] text-rose-300 font-mono whitespace-pre-wrap break-words">
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack && (
                      <>\n\n{this.state.errorInfo.componentStack}</>
                    )}
                  </pre>
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook-based Error Boundary Wrapper for functional components
 */
interface ErrorBoundaryWrapperProps {
  children: ReactNode;
  moduleName: string;
  onRetry?: () => void;
  onBack?: () => void;
}

export function ErrorBoundaryWrapper({ 
  children, 
  moduleName, 
  onRetry, 
  onBack 
}: ErrorBoundaryWrapperProps): ReactNode {
  const [key, setKey] = useState(0);

  const handleRetry = useCallback(() => {
    setKey(prev => prev + 1);
    if (onRetry) {
      onRetry();
    }
  }, [onRetry]);

  return (
    <ErrorBoundary
      key={key}
      moduleName={moduleName}
      onRetry={handleRetry}
      onBack={onBack}
    >
      {children}
    </ErrorBoundary>
  );
}

export default ErrorBoundary;
