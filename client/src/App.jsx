import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAppStore } from './store/useAppStore';

// Views
import Login from './views/Login';
import SalesView from './views/Sales';
import ProductsView from './views/Products';
import CustomersView from './views/Customers';

// Legacy Views (kept as is for now, assuming they work with legacy UI components)
// We might need to handle their dependencies if they break.
const Reportes = React.lazy(() => import('./views/Reportes'));
const BusinessSettings = React.lazy(() => import('./views/BusinessSettings'));

// Layouts
import { MainLayout } from './components/layout/MainLayout';

// Components
import { Loader2 } from 'lucide-react';

const RequireAuth = ({ children }) => {
    const token = useAppStore(state => state.token);
    const location = useLocation();

    if (!token) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return <MainLayout>{children}</MainLayout>;
};

const PublicOnly = ({ children }) => {
    const token = useAppStore(state => state.token);
    if (token) {
        return <Navigate to="/ventas" replace />;
    }
    return children;
};

const LoadingFallback = () => (
    <div className="flex items-center justify-center h-screen bg-[var(--bg)] text-[var(--muted-foreground)]">
        <Loader2 className="h-8 w-8 animate-spin" />
    </div>
);

function App() {
    const { theme } = useAppStore();

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    return (
        <BrowserRouter>
            <React.Suspense fallback={<LoadingFallback />}>
                <Routes>
                    <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />

                    <Route path="/" element={<Navigate to="/ventas" replace />} />

                    <Route path="/ventas" element={
                        <RequireAuth>
                            <SalesView />
                        </RequireAuth>
                    } />

                    <Route path="/productos" element={
                        <RequireAuth>
                            <ProductsView />
                        </RequireAuth>
                    } />

                    <Route path="/clientes" element={
                        <RequireAuth>
                            <CustomersView />
                        </RequireAuth>
                    } />

                    <Route path="/reportes" element={
                        <RequireAuth>
                            <Reportes />
                        </RequireAuth>
                    } />

                    <Route path="/config" element={
                        <RequireAuth>
                            <BusinessSettings />
                        </RequireAuth>
                    } />

                    <Route path="*" element={<Navigate to="/ventas" replace />} />
                </Routes>
            </React.Suspense>
        </BrowserRouter>
    );
}

export default App;
