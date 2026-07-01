import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedLayout   from './ProtectedLayout';
import WaiterDashboard   from '../pages/waiter/WaiterDashboard';

const WaiterRoutes = () => (
  <Routes>

    {/* Old /waiter/login (if ever linked) → unified login */}
    <Route path="login" element={<Navigate to="/login/waiter" replace />} />

    {/* Protected: requires JWT + waiter role */}
    <Route element={<ProtectedLayout role="waiter" />}>
      <Route index            element={<Navigate to="/waiter/dashboard" replace />} />
      <Route path="dashboard" element={<WaiterDashboard />} />
    </Route>

    {/* Fallback */}
    <Route path="*" element={<Navigate to="/waiter/dashboard" replace />} />

  </Routes>
);

export default WaiterRoutes;
