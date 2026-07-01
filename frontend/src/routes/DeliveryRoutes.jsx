import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedLayout    from './ProtectedLayout';
import DeliveryDashboard  from '../pages/delivery/DeliveryDashboard';

const DeliveryRoutes = () => (
  <Routes>

    {/* Old /delivery/login → unified login */}
    <Route path="login" element={<Navigate to="/login/delivery" replace />} />

    {/* Protected: requires JWT + delivery role */}
    <Route element={<ProtectedLayout role="delivery" />}>
      <Route index            element={<Navigate to="/delivery/dashboard" replace />} />
      <Route path="dashboard" element={<DeliveryDashboard />} />
    </Route>

    {/* Fallback */}
    <Route path="*" element={<Navigate to="/delivery/dashboard" replace />} />

  </Routes>
);

export default DeliveryRoutes;
