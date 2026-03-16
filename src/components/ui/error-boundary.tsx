"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  sectionName?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="bg-surface-1 border border-border rounded-lg p-6 text-center">
          <p className="text-sm text-text-secondary mb-2">
            {this.props.sectionName
              ? `Failed to load ${this.props.sectionName}`
              : "Something went wrong"}
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="text-xs text-accent hover:underline"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
