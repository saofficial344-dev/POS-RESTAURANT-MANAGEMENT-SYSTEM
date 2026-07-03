import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedLayout    from './ProtectedLayout';
import AdminDashboard     from '../pages/admin/AdminDashboard';
import AdminMenu          from '../pages/admin/Menu';
import CategoryItems      from '../pages/admin/CategoryItems';
import AdminBills         from '../pages/admin/Bills';
import UserManagement     from '../pages/admin/UserManagement';
import Tables             from '../pages/admin/Tables';
import Orders             from '../pages/admin/Orders';
import BranchManagement   from '../pages/admin/BranchManagement';
import SubscriptionPage   from '../pages/admin/SubscriptionPage';
import BillingHistory     from '../pages/admin/BillingHistory';
import ManualPayment      from '../pages/admin/ManualPayment';
import ChangePassword     from '../pages/admin/ChangePassword';

const AdminRoutes = () => (
  <Routes>

    {/* Old /admin/login URL → redirect to unified login */}
    <Route path="login" element={<Navigate to="/login/admin" replace />} />

    {/* Force password change — outside ProtectedLayout so the mustChangePassword gate allows access */}
    <Route path="change-password" element={<ChangePassword />} />

    {/* Protected: requires JWT + admin role */}
    <Route element={<ProtectedLayout role="admin" />}>
      <Route index                   element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="dashboard"        element={<AdminDashboard />} />
      <Route path="orders"           element={<Orders />} />
      <Route path="menu"             element={<AdminMenu />} />
      <Route path="menu/:categoryId" element={<CategoryItems />} />
      <Route path="bills"            element={<AdminBills />} />
      <Route path="users"            element={<UserManagement />} />
      <Route path="tables"           element={<Tables />} />
      <Route path="branches"          element={<BranchManagement />} />
      <Route path="subscription"      element={<SubscriptionPage />} />
      <Route path="billing"           element={<BillingHistory />} />
      <Route path="payments"          element={<ManualPayment />} />
    </Route>

    {/* Fallback */}
    <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />

  </Routes>
);

export default AdminRoutes;
