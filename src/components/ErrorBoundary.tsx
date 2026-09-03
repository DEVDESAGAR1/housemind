import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  errorMessage?: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: undefined,
  };

  public static getDerivedStateFromError(error: unknown): State {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
        ? error
        : 'An unexpected rendering error occurred.';
    return { hasError: true, errorMessage: message };
  }

  public componentDidCatch(error: unknown, errorInfo: ErrorInfo) {
    const message = error instanceof Error ? error.message : String(error ?? 'Unknown error');
    // Log with warn to allow debugging without triggering duplicate synthetic fatal errors
    console.warn('[HOUSEMIND_BOUNDARY] Handled rendering anomaly in view:', {
      error: message,
      componentStack: errorInfo?.componentStack || 'No component stack available',
    });
  }

  public componentDidUpdate(prevProps: Props) {
    // Automatically recover when navigation changes children
    if (this.state.hasError && prevProps.children !== this.props.children) {
      this.setState({ hasError: false, errorMessage: undefined });
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, errorMessage: undefined });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 rounded-2xl border border-rose-200 bg-rose-50/70 text-center max-w-lg mx-auto my-12 space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {this.props.fallbackTitle || 'Section Display Anomaly'}
            </h3>
            <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto">
              An unexpected display issue occurred while rendering this section. Your underlying data is completely safe in the household vault.
            </p>
            {this.state.errorMessage && (
              <div className="mt-2 text-[11px] font-mono text-rose-700 bg-rose-100/60 p-2 rounded-lg max-w-md mx-auto overflow-x-auto text-left">
                {this.state.errorMessage}
              </div>
            )}
          </div>
          <div className="pt-2 flex items-center justify-center gap-2">
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Try Again
            </button>
            <button
              onClick={() => {
                this.setState({ hasError: false, errorMessage: undefined });
                window.location.href = '/';
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold shadow-sm transition cursor-pointer"
            >
              <Home className="w-3.5 h-3.5 text-slate-500" />
              Reload View
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

