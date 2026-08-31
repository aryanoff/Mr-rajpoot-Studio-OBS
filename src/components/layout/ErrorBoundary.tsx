import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import ErrorState from "../ui/ErrorState";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex h-screen w-full items-center justify-center p-6 bg-background">
          <div className="max-w-md w-full">
            <ErrorState 
              title="Something went wrong"
              description="An unexpected application error occurred. We've logged this issue."
              actionLabel="Go to Dashboard"
              onAction={() => {
                this.setState({ hasError: false, error: null });
                window.location.href = "/dashboard";
              }}
            />
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
