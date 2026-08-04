import { Component, ReactNode } from 'react';

import { AlertTriangle, RefreshCw } from 'lucide-react';



interface Props {

  children: ReactNode;

  fallback?: ReactNode;

}



interface State {

  hasError: boolean;

  error: Error | null;

}



export class ErrorBoundary extends Component<Props, State> {

  constructor(props: Props) {

    super(props);

    this.state = { hasError: false, error: null };

  }



  static getDerivedStateFromError(error: Error): State {

    return { hasError: true, error };

  }



  componentDidCatch(error: Error, errorInfo: any) {

    console.error('ErrorBoundary caught an error:', error, errorInfo);

  }



  handleReset = () => {

    this.setState({ hasError: false, error: null });

    window.location.reload();

  };



  render() {

    if (this.state.hasError) {

      if (this.props.fallback) {

        return this.props.fallback;

      }



      return (

        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-pink-50 via-purple-50 to-yellow-50">

          <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 text-center">

            <div className="w-20 h-20 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">

              <AlertTriangle className="w-10 h-10 text-red-500" />

            </div>

            

            <h1 className="text-2xl text-gray-900 mb-3">Oops! Something went wrong</h1>

            

            <p className="text-gray-600 mb-6">

              We encountered an unexpected error. Don't worry, your data is safe.

            </p>

            

            {this.state.error && (

              <div className="mb-6 p-4 bg-gray-50 rounded-xl text-left">

                <p className="text-xs text-gray-500 break-words">

                  {this.state.error.message}

                </p>

              </div>

            )}

            

            <button

              onClick={this.handleReset}

              className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white py-3 rounded-full hover:shadow-lg transition-all flex items-center justify-center gap-2"

            >

              <RefreshCw className="w-5 h-5" />

              Reload App

            </button>

          </div>

        </div>

      );

    }



    return this.props.children;

  }

}

