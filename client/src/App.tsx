import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useUserStore } from './store/userStore';
import { useCartStore } from './store/cartStore';
import { initSyncManager } from './lib/syncManager';
import { initSyncEngineV2 } from './lib/syncEngineV2';
import { initGlobalErrorHandler, setCorrelationId } from './lib/structuredLogger';
import { getHealthMonitor } from './lib/healthMonitor';
import { attemptCrashRecovery, attemptCartRollback, safeQueueReplay, runIntegrityCheck } from './lib/snapshotManager';
import { restoreOfflineSession } from './lib/offlineAuth';
import { performanceTelemetry } from './lib/performanceTelemetry';
import { interactionTracker } from './lib/interactionTracker';
import { deviceDetector } from './lib/deviceDetector';
import { configureBudget, initBudgetMonitor } from './lib/performanceBudget';
import { offlineRecoveryEngine } from './lib/offlineRecoveryEngine';
import { dataConsistency } from './lib/dataConsistency';
import { hardwareAdapter } from './lib/hardwareAdapter';
import { productionDiagnostics } from './lib/productionDiagnostics';
import { incidentForensics } from './lib/incidentForensics';
import { degradedModeEngine } from './lib/degradedModeEngine';
import { storageLifecycleManager } from './lib/storageLifecycleManager';
import { syncStateMachine } from './lib/syncStateMachine';
import { productionGovernor } from './lib/productionGovernor';
import { PerformanceOverlay } from './components/dev/PerformanceOverlay';

// Core views
import Login from './views/Login';
const SalesView = React.lazy(() => import('./views/Sales'));
const ProductsView = React.lazy(() => import('./views/Products'));
const CustomersView = React.lazy(() => import('./views/Customers'));

// Commercial Pages
import { Landing } from './pages/Landing';
import { Pricing } from './pages/Pricing';
import { Support } from './pages/Support';
import { Roadmap } from './pages/Roadmap';

// Other views
const MyBusiness = React.lazy(() => import('./views/Reportes'));
const BusinessSettings = React.lazy(() => import('./views/BusinessSettings'));
const CashControlView = React.lazy(() => import('./views/CashControl'));
const UsersView = React.lazy(() => import('./views/Users'));
const AuditsView = React.lazy(() => import('./views/Audits'));
const OnboardingWizard = React.lazy(() => import('./views/OnboardingWizard'));
const AboutView = React.lazy(() => import('./views/About'));
const BackupsView = React.lazy(() => import('./views/Backups'));
const DownloadView = React.lazy(() => import('./views/Download'));
const MetricsDashboard = React.lazy(() => import('./views/admin/MetricsDashboard'));
const SupportTickets = React.lazy(() => import('./views/SupportTickets'));
const Subscription = React.lazy(() => import('./views/Subscription'));
const EnterpriseReports = React.lazy(() => import('./views/admin/EnterpriseReports'));
const AiInsights = React.lazy(() => import('./views/AiInsights'));
const ThemeStudio = React.lazy(() => import('./views/ThemeStudio'));
const Branding = React.lazy(() => import('./views/Branding'));

// Layout
import { AppShell } from './components/layout/AppShell';
import { DynamicBranding } from './components/common/DynamicBranding';
import { LoadingFallback } from './components/common/LoadingFallback';
import { POSErrorBoundary, ScannerErrorBoundary, AdminErrorBoundary, ReportsErrorBoundary, SelfHealingBoundary } from './components/error/ErrorBoundaries';

const RequireAuth = ({ children, requiredPermission }: { children: React.ReactNode; requiredPermission?: string }) => {
  const token = useUserStore(state => state.token);
  const hasPermission = useUserStore(state => state.hasPermission);
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/ventas" replace />;
  }
  return <AppShell>{children}</AppShell>;
};

const PublicOnly = ({ children }: { children: React.ReactNode }) => {
  const token = useUserStore(state => state.token);
  if (token) return <Navigate to="/ventas" replace />;
  return <>{children}</>;
};

function App() {
  const hydrate = useCartStore(state => state.hydrate);

  useEffect(() => {
    setCorrelationId(crypto.randomUUID?.() || 'app-' + Date.now());
    initGlobalErrorHandler();

    let cleanupFns: (() => void)[] = [];

    const bootstrap = async () => {
      try {
        const session = await restoreOfflineSession();
        if (session) {
          useUserStore.getState().login(session.user, session.token);
        }

        hydrate();
        initSyncManager();
        initSyncEngineV2();
        getHealthMonitor().init();
        await hardwareAdapter.init();

        const cleanupBudget = initBudgetMonitor();
        if (cleanupBudget) cleanupFns.push(cleanupBudget);

        const [recovery, offlineRecovery, cartRollback, integrity, consistencyCheck] = await Promise.allSettled([
          attemptCrashRecovery(),
          offlineRecoveryEngine.runRecovery(),
          attemptCartRollback(),
          runIntegrityCheck(),
          dataConsistency.runFullCheck(),
        ]);

        if (recovery.status === 'fulfilled' && recovery.value.recovered && recovery.value.restoredItems > 0) {
          console.log(`[Recovery] Restored ${recovery.value.restoredItems} items`);
        }

        if (offlineRecovery.status === 'fulfilled') {
          const or = offlineRecovery.value;
          if (or.recovered) {
            productionDiagnostics.recordRecovery(true);
          } else if (or.errors.length > 0) {
            productionDiagnostics.recordRecovery(false);
          }
        }

        if (integrity.status === 'fulfilled') {
          const int = integrity.value;
          if (!int.queueConsistent || !int.snapshotValid) {
            await safeQueueReplay();
          }
        }

        if (consistencyCheck.status === 'fulfilled' && consistencyCheck.value.overall !== 'pass') {
          const repaired = await dataConsistency.repairInvalidState();
          if (repaired > 0) console.log(`[Consistency] Repaired ${repaired} items`);
        }

        incidentForensics.recordEvent('recovery', { action: 'system_bootstrap', success: true });

        syncStateMachine.init();
        productionGovernor.init();
        degradedModeEngine.init();
        storageLifecycleManager.init();

        const diagnosticInterval = setInterval(() => {
          productionDiagnostics.captureSnapshot();
        }, 300000);
        (window as any).__diagnosticInterval = diagnosticInterval;

        const onlineHandler = () => incidentForensics.setConnectivity('online');
        const offlineHandler = () => {
          incidentForensics.setConnectivity('offline');
          incidentForensics.recordEvent('critical_error', { error: 'Network offline' });
        };
        window.addEventListener('online', onlineHandler);
        window.addEventListener('offline', offlineHandler);

        const unsubscribeDegraded = degradedModeEngine.subscribe((info) => {
          incidentForensics.setDegradedMode(info.status);
          if (info.status !== 'normal') {
            productionDiagnostics.recordError(new Error(`Status: ${info.status}`));
          }
        });

        let clickThrottle = 0;
        const clickHandler = (e: MouseEvent) => {
          const now = Date.now();
          if (now - clickThrottle < 100) return;
          clickThrottle = now;
          const target = e.target instanceof HTMLElement ? e.target.tagName + (e.target.id ? '#' + e.target.id : '') : 'unknown';
          interactionTracker.trackClick(target);
        };
        document.addEventListener('click', clickHandler, { passive: true });

        cleanupFns.push(
          () => window.removeEventListener('online', onlineHandler),
          () => window.removeEventListener('offline', offlineHandler),
          () => unsubscribeDegraded(),
          () => document.removeEventListener('click', clickHandler),
        );
      } catch (e) {
        console.error('[Init] Error:', e);
        productionDiagnostics.recordError(e as Error);
      }
    };

    bootstrap();

    return () => {
      cleanupFns.forEach(fn => fn());
      cleanupFns = [];
      getHealthMonitor().destroy();
      syncStateMachine.destroy();
      productionGovernor.destroy();
      degradedModeEngine.destroy();
      storageLifecycleManager.destroy();
      if ((window as any).__diagnosticInterval) clearInterval((window as any).__diagnosticInterval);
    };
  }, [hydrate]);

  return (
    <>
      <DynamicBranding />
      <PerformanceOverlay />
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
              <POSErrorBoundary><SalesView /></POSErrorBoundary>
            </RequireAuth>
          } />

          <Route path="/productos" element={
            <RequireAuth requiredPermission="products:view">
              <SelfHealingBoundary domain="Products"><ProductsView /></SelfHealingBoundary>
            </RequireAuth>
          } />

          <Route path="/clientes" element={
            <RequireAuth requiredPermission="customers:view">
              <SelfHealingBoundary domain="Customers"><CustomersView /></SelfHealingBoundary>
            </RequireAuth>
          } />

          <Route path="/reportes" element={
            <RequireAuth requiredPermission="reports:view">
              <ReportsErrorBoundary><MyBusiness /></ReportsErrorBoundary>
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

          <Route path="/about" element={<RequireAuth><AboutView /></RequireAuth>} />
          <Route path="/backups" element={<RequireAuth requiredPermission="settings:view"><BackupsView /></RequireAuth>} />
          <Route path="/admin/metrics" element={<RequireAuth><AdminErrorBoundary><MetricsDashboard /></AdminErrorBoundary></RequireAuth>} />
          <Route path="/soporte" element={<RequireAuth><SupportTickets /></RequireAuth>} />
          <Route path="/billing" element={<RequireAuth><Subscription /></RequireAuth>} />
          <Route path="/admin/enterprise" element={<RequireAuth><EnterpriseReports /></RequireAuth>} />
          <Route path="/insights" element={<RequireAuth><AiInsights /></RequireAuth>} />
          <Route path="/theme-studio" element={<RequireAuth><ThemeStudio /></RequireAuth>} />
          <Route path="/branding" element={<RequireAuth requiredPermission="settings:view"><Branding /></RequireAuth>} />
          <Route path="/download" element={<RequireAuth><DownloadView /></RequireAuth>} />

          <Route path="*" element={<Navigate to="/ventas" replace />} />
        </Routes>
      </React.Suspense>
    </>
  );
}

export default App;
