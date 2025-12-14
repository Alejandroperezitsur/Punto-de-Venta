import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAppStore } from './store/useAppStore';

// Views
import Login from './views/Login';
import SalesView from './views/Sales';
import ProductsView from './views/Products';
import CustomersView from './views/Customers';

// Commercial Pages
import { Landing } from './pages/Landing';
import { Pricing } from './pages/Pricing';
import { Support } from './pages/Support';
import { Roadmap } from './pages/Roadmap';

// Legacy Views (kept as is for now, assuming they work with legacy UI components)
// We might need to handle their dependencies if they break.
const Reportes = React.lazy(() => import('./views/Reportes'));
const BusinessSettings = React.lazy(() => import('./views/BusinessSettings'));
const CashControlView = React.lazy(() => import('./views/CashControl'));
const UsersView = React.lazy(() => import('./views/Users'));
const AuditsView = React.lazy(() => import('./views/Audits'));
const OnboardingWizard = React.lazy(() => import('./views/OnboardingWizard'));
const AboutView = React.lazy(() => import('./views/About'));
const AboutView = React.lazy(() => import('./views/About'));
const BackupsView = React.lazy(() => import('./views/Backups'));
const MetricsDashboard = React.lazy(() => import('./views/admin/MetricsDashboard'));
const SupportTickets = React.lazy(() => import('./views/SupportTickets'));
const Subscription = React.lazy(() => import('./views/Subscription'));
const EnterpriseReports = React.lazy(() => import('./views/admin/EnterpriseReports'));

// Layouts
import { MainLayout } from './components/layout/MainLayout';
import { DynamicBranding } from './components/common/DynamicBranding';

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

import { Splash } from './components/common/Splash';

const LoadingFallback = () => <Splash />;

function App() {
    const { theme } = useAppStore();

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    return (
        <BrowserRouter>
            <DynamicBranding />
            <React.Suspense fallback={<LoadingFallback />}>
                <Routes>
                    <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
                    <Route path="/setup" element={<PublicOnly><OnboardingWizard /></PublicOnly>} />

                    {/* Commercial Routes */}
                    <Route path="/landing" element={<PublicOnly><Landing /></PublicOnly>} />
                    <Route path="/pricing" element={<Pricing />} />
                    <Route path="/support" element={<Support />} />
                    <Route path="/roadmap" element={<Roadmap />} />

                    <Route path="/" element={<PublicOnly><Landing /></PublicOnly>} />

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

                    <Route path="/caja" element={
                        <RequireAuth>
                            <CashControlView />
                        </RequireAuth>
                    } />

                    <Route path="/usuarios" element={
                        <RequireAuth>
                            <UsersView />
                        </RequireAuth>
                    } />

                    <Route path="/audits" element={
                        <RequireAuth>
                            <AuditsView />
                        </RequireAuth>
                    } />

                    <Route path="/about" element={
                        <RequireAuth>
                            <AboutView />
                        </RequireAuth>
                    } />

                    <Route path="/backups" element={
                        <RequireAuth>
                            <BackupsView />
                        </RequireAuth>
                    } />

                    <Route path="/admin/metrics" element={
                        <RequireAuth>
                            <MetricsDashboard />
                        </RequireAuth>
                    } />

                    <Route path="/soporte" element={
                        <RequireAuth>
                            <SupportTickets />
                        </RequireAuth>
                    } />

                    <Route path="/billing" element={
                        <RequireAuth>
                            <Subscription />
                        </RequireAuth>
                    } />

                    <Route path="/admin/enterprise" element={
                        <RequireAuth>
                            <EnterpriseReports />
                        </RequireAuth>
                    } />

                    <Route path="*" element={<Navigate to="/ventas" replace />} />
                </Routes>
            </React.Suspense>
        </BrowserRouter>
    );
}

export default App;
