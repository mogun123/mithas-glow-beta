import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react';
import { logger } from '../../lib/logger';

interface Props {
  children: ReactNode;
  moduleName: string;
  errorMessage?: string | null;
  onRetry?: () => void;
  onBack?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundaryWrapper extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error(`Error caught in ${this.props.moduleName} boundary:`, error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-white/70 backdrop-blur-xl border border-white rounded-3xl shadow-xl text-center m-4">
          <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-100">
            <AlertCircle className="w-8 h-8 text-rose-500" />
          </div>
          <h3 className="text-xl font-extrabold text-slate-900 mb-2 tracking-tight">Oops! Module Failed</h3>
          <p className="text-sm text-slate-600 mb-6 font-medium">
            {this.props.errorMessage || `We couldn't load the ${this.props.moduleName} module right now.`}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            {this.props.onRetry && (
              <button 
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  this.props.onRetry!();
                }}
                className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white font-bold rounded-xl shadow-md hover:scale-105 transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> Retry Loading
              </button>
            )}
            {this.props.onBack && (
              <button 
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  this.props.onBack!();
                }}
                className="w-full sm:w-auto px-5 py-2.5 bg-white text-slate-700 border border-slate-200 font-bold rounded-xl shadow-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" /> Go Back
              </button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
