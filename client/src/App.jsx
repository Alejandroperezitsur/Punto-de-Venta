import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useUserStore } from './store/userStore';
import { useCartStore } from './store/cartStore';
import { initSyncManager } from './lib/syncManager';
import { initSyncEngineV2 } from './lib/syncEngineV2';
import { initGlobalErrorHandler, setCorrelationId } from './lib/structuredLogger';
import { getHealthMonitor } from './lib/healthMonitor';
import { attemptCrashRecovery, attemptCartRollback, safeQueueReplay, runIntegrityCheck } from './lib/snapshotManager';

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
const MyBusiness = React.lazy(() => import('./views/Reportes'));
const BusinessSettings = React.lazy(() => import('./views/BusinessSettings'));
const CashControlView = React.lazy(() => import('./views/CashControl'));
const UsersView = React.lazy(() => import('./views/Users'));
const AuditsView = React.lazy(() => import('./views/Audits'));
const OnboardingWizard = React.lazy(() => import('./views/OnboardingWizard'));
const AboutView = React.lazy(() => import('./views/About'));
const BackupsView = React.lazy(() => import('./views/Backups'));
const MetricsDashboard = React.lazy(() => import('./views/admin/MetricsDashboard'));
const SupportTickets = React.lazy(() => import('./views/SupportTickets'));
const Subscription = React.lazy(() => import('./views/Subscription'));
const EnterpriseReports = React.lazy(() => import('./views/admin/EnterpriseReports'));
const AiInsights = React.lazy(() => import('./views/AiInsights'));
const ThemeStudio = React.lazy(() => import('./views/ThemeStudio'));
const Branding = React.lazy(() => import('./views/Branding'));

// Layouts
import { MainLayout } from './components/layout/MainLayout';
import { DynamicBranding } from './components/common/DynamicBranding';

const RequireAuth = ({ children, requiredPermission }) => {
    const token = useUserStore(state => state.token);
    const hasPermission = useUserStore(state => state.hasPermission);
    const location = useLocation();

    if (!token) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (requiredPermission && !hasPermission(requiredPermission)) {
        return <Navigate to="/ventas" replace />;
    }

    return <MainLayout>{children}</MainLayout>;
};

const PublicOnly = ({ children }) => {
    const token = useUserStore(state => state.token);
    if (token) {
        return <Navigate to="/ventas" replace />;
    }
    return children;
};

import { LoadingFallback } from './components/common/LoadingFallback';

// const LoadingFallback = () => <Splash />; // Replaced with enhanced component

function App() {
    const hydrate = useCartStore(state => state.hydrate);

    useEffect(() => {
        // Initialize all enterprise subsystems
        setCorrelationId(crypto.randomUUID?.() || 'app-' + Date.now());
        initGlobalErrorHandler();
        hydrate();
        initSyncManager(); // delegates to syncEngineV2
        initSyncEngineV2();
        getHealthMonitor().init();

        // Attempt crash recovery on startup
        const init = async () => {
            try {
                const recovery = await attemptCrashRecovery();
                if (recovery.recovered && recovery.restoredItems > 0) {
                    console.log(`[Recovery] Restored ${recovery.restoredItems} items from snapshot`);
                }
                const cartRollback = await attemptCartRollback();
                if (cartRollback.rolledBack) {
                    console.log(`[Recovery] Cart rolled back: ${cartRollback.reason}`);
                }
                const integrity = await runIntegrityCheck();
                if (!integrity.queueConsistent || !integrity.snapshotValid) {
                    console.warn(`[Integrity] Issues found: ${integrity.details.join(', ')}`);
                    await safeQueueReplay();
                }
            } catch (e) {
                console.error('[Init] Recovery error:', e);
            }
        };
        init();

        // Cleanup on unmount
        return () => {
            getHealthMonitor().destroy();
        };
    }, [hydrate]);

    return (
        <>
            <DynamicBranding />
            <React.Suspense fallback={<LoadingFallback />}>
                <Routes>
                    <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
                    <Route path="/setup" element={<PublicOnly><OnboardingWizard /></PublicOnly>} />

                    <Route path="/landing" element={<PublicOnly><Landing /></PublicOnly>} />
                    <Route path="/pricing" element={<Pricing />} />
                    <Route path="/support" element={<Support />} />
                    <Route path="/roadmap" element={<Roadmap />} />

                    <Route path="/" element={<Navigate to="/ventas" replace />} />

                    <Route path="/ventas" element={
                        <RequireAuth requiredPermission="sales:view">
                            <SalesView />
                        </RequireAuth>
                    } />

                    <Route path="/productos" element={
                        <RequireAuth requiredPermission="products:view">
                            <ProductsView />
                        </RequireAuth>
                    } />

                    <Route path="/clientes" element={
                        <RequireAuth requiredPermission="customers:view">
                            <CustomersView />
                        </RequireAuth>
                    } />

                    <Route path="/reportes" element={
                        <RequireAuth requiredPermission="reports:view">
                            <MyBusiness />
                        </RequireAuth>
                    } />

                    <Route path="/config" element={
                        <RequireAuth requiredPermission="settings:view">
                            <BusinessSettings />
                        </RequireAuth>
                    } />

                    <Route path="/caja" element={
                        <RequireAuth requiredPermission="cash:view">
                            <CashControlView />
                        </RequireAuth>
                    } />

                    <Route path="/usuarios" element={
                        <RequireAuth requiredPermission="users:view">
                            <UsersView />
                        </RequireAuth>
                    } />

                    <Route path="/audits" element={
                        <RequireAuth requiredPermission="audits:view">
                            <AuditsView />
                        </RequireAuth>
                    } />

                    <Route path="/about" element={
                        <RequireAuth>
                            <AboutView />
                        </RequireAuth>
                    } />

                    <Route path="/backups" element={
                        <RequireAuth requiredPermission="settings:view">
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

                    <Route path="/insights" element={
                        <RequireAuth>
                            <AiInsights />
                        </RequireAuth>
                    } />

                    <Route path="/theme-studio" element={
                        <RequireAuth>
                            <ThemeStudio />
                        </RequireAuth>
                    } />

                    <Route path="/branding" element={
                        <RequireAuth requiredPermission="settings:view">
                            <Branding />
                        </RequireAuth>
                    } />

                    <Route path="*" element={<Navigate to="/ventas" replace />} />
                </Routes>
            </React.Suspense>
        </>
    );
}

export default App;
