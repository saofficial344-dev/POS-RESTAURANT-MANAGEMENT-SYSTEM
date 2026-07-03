import { Routes, Route, Navigate } from 'react-router-dom';
import { PlatformAuthProvider } from '../context/PlatformAuthContext';
import PlatformProtectedLayout from './PlatformProtectedLayout';
import PlatformLogin           from '../pages/PlatformLogin';
import PlatformDashboard       from '../pages/PlatformDashboard';
import PlatformRestaurants     from '../pages/PlatformRestaurants';
import PlatformRestaurantDetail from '../pages/PlatformRestaurantDetail';
import PlatformAnalytics       from '../pages/PlatformAnalytics';
import PlatformAuditLogs       from '../pages/PlatformAuditLogs';
import PlatformApiKeys         from '../pages/PlatformApiKeys';
import PlatformSupport         from '../pages/PlatformSupport';
import PlatformPlans           from '../pages/PlatformPlans';
import PlatformSubscriptions   from '../pages/PlatformSubscriptions';
import PlatformInvoices        from '../pages/PlatformInvoices';
import PlatformPayments        from '../pages/PlatformPayments';
import PlatformBilling         from '../pages/PlatformBilling';
import PlatformFeatureFlags        from '../pages/PlatformFeatureFlags';
import PlatformCreateRestaurant    from '../pages/PlatformCreateRestaurant';
import PlatformDeletedRestaurants  from '../pages/PlatformDeletedRestaurants';

const PlatformRoutes = () => (
  <PlatformAuthProvider>
    <Routes>
      {/* Public */}
      <Route path="login" element={<PlatformLogin />} />

      {/* Protected — all under PlatformProtectedLayout */}
      <Route element={<PlatformProtectedLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard"               element={<PlatformDashboard />} />
        <Route path="restaurants"             element={<PlatformRestaurants />} />
        <Route path="restaurants/create"      element={<PlatformCreateRestaurant />} />
        <Route path="restaurants/deleted"     element={<PlatformDeletedRestaurants />} />
        <Route path="restaurants/:id"         element={<PlatformRestaurantDetail />} />
        <Route path="analytics"               element={<PlatformAnalytics />} />
        <Route path="audit-logs"              element={<PlatformAuditLogs />} />
        <Route path="api-keys"                element={<PlatformApiKeys />} />
        <Route path="support"                 element={<PlatformSupport />} />
        <Route path="plans"                   element={<PlatformPlans />} />
        <Route path="subscriptions"           element={<PlatformSubscriptions />} />
        <Route path="invoices"                element={<PlatformInvoices />} />
        <Route path="payments"               element={<PlatformPayments />} />
        <Route path="billing"                element={<PlatformBilling />} />
        <Route path="feature-flags"           element={<PlatformFeatureFlags />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Routes>
  </PlatformAuthProvider>
);

export default PlatformRoutes;
