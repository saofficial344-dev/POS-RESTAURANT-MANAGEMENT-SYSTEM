import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedLayout   from './ProtectedLayout';
import ManagerDashboard  from '../pages/manager/ManagerDashboard';

const ManagerRoutes = () => (
  <Routes>

    {/* Old /manager/login → unified login */}
    <Route path="login" element={<Navigate to="/login/manager" replace />} />

    {/* Protected: requires JWT + manager role */}
    <Route element={<ProtectedLayout role="manager" />}>
      <Route index            element={<Navigate to="/manager/dashboard" replace />} />
      <Route path="dashboard" element={<ManagerDashboard />} />
    </Route>

    {/* Fallback */}
    <Route path="*" element={<Navigate to="/manager/dashboard" replace />} />

  </Routes>
);

export default ManagerRoutes;
