import React, { Component, type ReactNode } from "react";
import { Link } from "react-router-dom";

interface ErrorBoundaryProps {
    children: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        // TODO: maybe replace with a error tracking service
        console.error(error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                    <h1 className="text-4xl font-bold mb-4">Something went wrong</h1>
                    <p className="text-lg text-slate-600 mb-6">An unexpected error occurred.</p>
                    <Link to="/" className="btn bg-white text-slate-800">Go Home</Link>
                </div>
            );
        }
        return this.props.children;
    }
}
