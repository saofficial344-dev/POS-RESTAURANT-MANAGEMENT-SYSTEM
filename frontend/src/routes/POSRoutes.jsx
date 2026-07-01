import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedLayout  from './ProtectedLayout';
import CashierDashboard from '../pages/pos/CashierDashboard';
import POSEntry         from '../pages/pos/POSEntry';
import CashierMenu      from '../pages/cashier/Menu';
import CashierBills     from '../pages/cashier/Bills';
import PrintBill        from '../pages/cashier/PrintBill';

const POSRoutes = () => (
  <Routes>

    {/* Old /pos/login → redirect to unified login */}
    <Route path="login" element={<Navigate to="/login/cashier" replace />} />

    {/* Protected: requires JWT + cashier role */}
    <Route element={<ProtectedLayout role="cashier" />}>
      <Route index            element={<Navigate to="/pos/menu" replace />} />
      <Route path="dashboard" element={<CashierDashboard />} />
      <Route path="entry"     element={<POSEntry />} />
      <Route path="menu"      element={<CashierMenu />} />
      <Route path="bills"     element={<CashierBills />} />
    </Route>

    {/* Print view: no sidebar layout */}
    <Route path="print/:id" element={<PrintBill />} />

    {/* Fallback */}
    <Route path="*" element={<Navigate to="/pos/menu" replace />} />

  </Routes>
);

export default POSRoutes;
