import React from 'react';

export class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary caught an error", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
                    <div className="bg-white p-8 rounded shadow-md max-w-lg text-center">
                        <h2 className="text-2xl font-bold text-red-600 mb-4">Algo salió mal</h2>
                        <p className="text-gray-600 mb-6">La aplicación encontró un error inesperado.</p>
                        <details className="bg-gray-100 p-4 rounded text-left text-xs text-gray-700 overflow-auto max-h-40 mb-6">
                            {this.state.error && this.state.error.toString()}
                        </details>
                        <button
                            onClick={() => window.location.reload()}
                            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                        >
                            Recargar Aplicación
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
