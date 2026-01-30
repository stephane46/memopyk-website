import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class MapErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('🗺️ Map Error Boundary caught error:', error, errorInfo);
    // Could send to error tracking service here
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F2EBDC] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
            <div className="text-center">
              <div className="text-6xl mb-4">🗺️</div>
              <h1 className="text-2xl font-bold text-[#2A4759] mb-2">
                Map Failed to Load
              </h1>
              <p className="text-gray-600 mb-6">
                We encountered an issue loading the interactive map.
                Please try refreshing the page.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="bg-[#D67C4A] hover:bg-[#c5703e] text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Reload Page
              </button>
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-4 text-left">
                  <summary className="cursor-pointer text-sm text-gray-500">
                    Error Details (dev only)
                  </summary>
                  <pre className="mt-2 p-4 bg-gray-100 rounded text-xs overflow-auto">
                    {this.state.error.toString()}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
