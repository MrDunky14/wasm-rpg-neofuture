import { Component, ReactNode, ErrorInfo } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
  errorStack: string | null | undefined;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
      errorStack: undefined,
    };
  }

  static getDerivedStateFromError(error: Error): Pick<State, 'hasError' | 'errorMessage'> {
    return { hasError: true, errorMessage: error.toString() };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error Boundary caught:', error, errorInfo.componentStack);
    this.setState({
      errorStack: errorInfo.componentStack,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      errorMessage: '',
      errorStack: undefined,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-transparent text-white flex items-center justify-center p-4">
          <div className="game-panel rounded-xl p-8 text-center border border-danger/20 max-w-2xl">
            <h1 className="font-pixel text-2xl text-danger mb-4 tracking-wider">
              ⚠️ SOMETHING WENT WRONG
            </h1>
            
            <p className="text-gray-300 mb-6">
              An unexpected error occurred. Try refreshing the page or go back to the main menu.
            </p>

            {this.state.errorMessage && (
              <div className="mb-6 p-4 bg-slate-900/50 rounded border border-slate-700/50 text-left">
                <p className="font-mono text-xs text-danger mb-2">Error Details:</p>
                <p className="font-mono text-xs text-gray-400 break-words">
                  {this.state.errorMessage}
                </p>
                {import.meta.env.DEV && this.state.errorStack && (
                  <p className="font-mono text-xs text-gray-500 mt-2 max-h-[200px] overflow-auto">
                    {this.state.errorStack}
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <button 
                className="pixel-btn"
                onClick={this.handleReset}
              >
                Try Again
              </button>
              <button 
                className="pixel-btn-ghost"
                onClick={() => window.location.href = '/'}
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
